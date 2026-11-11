import { getManualPaymentNotificationConfig } from './manualPaymentNotificationConfig.js';
import { ManualPaymentNotificationError } from './manualPaymentNotificationTypes.js';

type AuthenticatedUser = {
  id: string;
  email: string | null;
};

type ManualPaymentProofRecord = {
  id: string;
  order_id: string;
  customer_id: string;
  payment_method: string;
  transaction_reference: string | null;
  verification_status: string;
  admin_note: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  payment_screenshot_url: string | null;
};

type OrderRecord = {
  id: string;
  order_number: string;
  total: number;
  currency: string;
  shipping_address_snapshot: unknown;
};

function accessTokenError(): ManualPaymentNotificationError {
  return new ManualPaymentNotificationError(
    'AUTH_REQUIRED',
    'Please sign in again to continue.',
    401,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSnapshotValue(snapshot: unknown, key: string): string {
  if (!isRecord(snapshot)) return '';
  const value = snapshot[key];
  return typeof value === 'string' ? value : '';
}

async function authenticateUser(accessToken: string): Promise<AuthenticatedUser> {
  const config = getManualPaymentNotificationConfig();
  let response: Response;
  try {
    response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw accessTokenError();
  }
  if (!response.ok) throw accessTokenError();

  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object' || !('id' in payload) || typeof payload.id !== 'string') {
    throw accessTokenError();
  }
  const email = 'email' in payload && typeof payload.email === 'string' ? payload.email : null;
  return { id: payload.id, email };
}

async function serviceRequest<T>(
  resource: string,
  query: URLSearchParams,
  init: RequestInit = {},
): Promise<T> {
  const config = getManualPaymentNotificationConfig();
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${resource}?${query.toString()}`,
    {
      ...init,
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new ManualPaymentNotificationError(
      'EMAIL_DELIVERY_FAILED',
      'Payment notification details could not be loaded.',
      502,
    );
  }
  return (await response.json()) as T;
}

async function loadProof(proofId: string): Promise<ManualPaymentProofRecord> {
  const query = new URLSearchParams({
    select:
      'id,order_id,customer_id,payment_method,transaction_reference,verification_status,admin_note,uploaded_at,verified_at,payment_screenshot_url',
    id: `eq.${proofId}`,
    limit: '1',
  });
  const rows = await serviceRequest<ManualPaymentProofRecord[]>(
    'manual_payment_proofs',
    query,
  );
  if (!rows[0]) {
    throw new ManualPaymentNotificationError('NOT_FOUND', 'Payment proof was not found.', 404);
  }
  return rows[0];
}

async function loadOrder(orderId: string): Promise<OrderRecord> {
  const query = new URLSearchParams({
    select: 'id,order_number,total,currency,shipping_address_snapshot',
    id: `eq.${orderId}`,
    limit: '1',
  });
  const rows = await serviceRequest<OrderRecord[]>('orders', query);
  if (!rows[0]) {
    throw new ManualPaymentNotificationError('NOT_FOUND', 'Payment order was not found.', 404);
  }
  return rows[0];
}

async function assertAdmin(accessToken: string): Promise<void> {
  const config = getManualPaymentNotificationConfig();
  let response: Response;
  try {
    response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/is_catalog_admin`, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ManualPaymentNotificationError(
      'FORBIDDEN',
      'Administrator access could not be verified.',
      403,
    );
  }
  if (!response.ok || (await response.json().catch(() => false)) !== true) {
    throw new ManualPaymentNotificationError(
      'FORBIDDEN',
      'Administrator access is required.',
      403,
    );
  }
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  idempotencyKey: string,
): Promise<void> {
  const config = getManualPaymentNotificationConfig();
  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: config.resendFromEmail,
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ManualPaymentNotificationError(
      'EMAIL_DELIVERY_FAILED',
      'The payment notification email could not be sent.',
      502,
    );
  }
  if (!response.ok) {
    throw new ManualPaymentNotificationError(
      'EMAIL_DELIVERY_FAILED',
      'The payment notification email could not be sent.',
      502,
    );
  }
}

export async function sendProofSubmittedNotifications(
  proofId: string,
  accessToken: string,
): Promise<void> {
  const user = await authenticateUser(accessToken);
  const proof = await loadProof(proofId);
  if (
    proof.customer_id !== user.id ||
    proof.verification_status !== 'pending_verification' ||
    !proof.uploaded_at ||
    !proof.payment_screenshot_url
  ) {
    throw new ManualPaymentNotificationError(
      'FORBIDDEN',
      'This payment proof is not available for notification.',
      403,
    );
  }

  const [order, config] = await Promise.all([
    loadOrder(proof.order_id),
    Promise.resolve(getManualPaymentNotificationConfig()),
  ]);
  const snapshot = order.shipping_address_snapshot;
  const customerName = getSnapshotValue(snapshot, 'full_name') || 'Customer';
  const customerEmail =
    getSnapshotValue(snapshot, 'email') ||
    user.email ||
    '';
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u.test(customerEmail)) {
    throw new ManualPaymentNotificationError(
      'EMAIL_DELIVERY_FAILED',
      'The customer email address is unavailable.',
      502,
    );
  }
  const shippingAddress = [
    getSnapshotValue(snapshot, 'street_address'),
    getSnapshotValue(snapshot, 'apartment'),
    getSnapshotValue(snapshot, 'city'),
    getSnapshotValue(snapshot, 'region'),
    getSnapshotValue(snapshot, 'postal_code'),
    getSnapshotValue(snapshot, 'country'),
  ]
    .filter(Boolean)
    .join(', ');
  const method = proof.payment_method === 'easypaisa' ? 'EasyPaisa' : 'JazzCash';
  const orderTotal = `${order.currency} ${Number(order.total).toFixed(2)}`;
  const adminPanelUrl = `${config.webAppUrl}/admin/payments/pending`;

  const adminHtml = `
    <h1>New Manual Payment Received</h1>
    <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
    <p><strong>Customer email:</strong> ${escapeHtml(customerEmail)}</p>
    <p><strong>Order number:</strong> ${escapeHtml(order.order_number)}</p>
    <p><strong>Payment method:</strong> ${escapeHtml(method)}</p>
    <p><strong>Order total:</strong> ${escapeHtml(orderTotal)}</p>
    <p><strong>Shipping address:</strong> ${escapeHtml(shippingAddress || 'Not provided')}</p>
    <p><strong>Transaction reference:</strong> ${escapeHtml(proof.transaction_reference || 'Not provided')}</p>
    <p><a href="${escapeHtml(adminPanelUrl)}">Open the admin payment review queue</a></p>
  `;
  const customerHtml = `
    <p>Thank you.</p>
    <p>We have received your payment proof.</p>
    <p>Our team will verify it shortly.</p>
    <p>Order ${escapeHtml(order.order_number)}</p>
  `;

  await Promise.all([
    sendEmail(
      config.adminEmail,
      'New Manual Payment Received',
      adminHtml,
      `manual-proof-${proof.id}-${proof.uploaded_at}-admin`,
    ),
    sendEmail(
      customerEmail,
      'Payment Proof Received',
      customerHtml,
      `manual-proof-${proof.id}-${proof.uploaded_at}-customer`,
    ),
  ]);
}

export async function sendProofReviewNotification(
  proofId: string,
  accessToken: string,
): Promise<void> {
  await assertAdmin(accessToken);
  const proof = await loadProof(proofId);
  if (!['rejected', 'reupload_requested'].includes(proof.verification_status)) {
    throw new ManualPaymentNotificationError(
      'INVALID_REQUEST',
      'This payment proof does not need a replacement screenshot.',
      409,
    );
  }

  const order = await loadOrder(proof.order_id);
  const snapshot = order.shipping_address_snapshot;
  const customerEmail = getSnapshotValue(snapshot, 'email');
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u.test(customerEmail)) {
    throw new ManualPaymentNotificationError(
      'EMAIL_DELIVERY_FAILED',
      'The customer email address is unavailable.',
      502,
    );
  }
  const adminNote = proof.admin_note
    ? `<p>Review note: ${escapeHtml(proof.admin_note)}</p>`
    : '';
  await sendEmail(
    customerEmail,
    'Please upload a new payment screenshot',
    `<p>Please upload a new payment screenshot.</p>${adminNote}<p>Order ${escapeHtml(order.order_number)}</p>`,
    `manual-proof-review-${proof.id}-${proof.verified_at}`,
  );
}

export function getAccessTokenFromHeader(authorization: string | undefined): string {
  const match = authorization?.match(/^Bearer ([^\s]+)$/iu);
  if (!match) throw accessTokenError();
  return match[1];
}
