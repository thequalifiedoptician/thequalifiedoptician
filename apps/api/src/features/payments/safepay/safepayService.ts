import { createHash } from 'node:crypto';
import { PaymentProviderRegistry, PaymentService } from '../paymentService.js';
import type { CreatePaymentSessionInput } from '../paymentTypes.js';
import { getSafepayConfig, type SafepayConfig } from './safepayConfig.js';
import { SafepayProvider } from './safepayProvider.js';
import { SUPPORTED_SAFEPAY_CURRENCIES } from './safepayValidation.js';
import {
  SafepayIntegrationError,
  type SafepayPaymentStatusResult,
  type SafepaySessionResult,
} from './safepayTypes.js';

type OrderRecord = {
  id: string;
  total: number;
  currency: string;
  status: string;
  reservation_expires_at: string;
};

type PaymentRecord = {
  id: string;
  order_id: string;
  provider_id: string;
  method_id: string;
  status: SafepayPaymentStatusResult['status'];
  amount: number;
  currency: string;
  provider_reference: string | null;
  provider_token_reference: string | null;
  idempotency_key: string;
  checkout_url: string | null;
  created_at: string;
  updated_at: string;
};

export class SupabaseRestError extends Error {
  constructor(readonly status: number) {
    super('Supabase REST request failed.');
    this.name = 'SupabaseRestError';
  }
}

function uuidFrom(value: string): string {
  const hex = createHash('sha256').update(`alsera:safepay:${value}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function apiUrl(config: SafepayConfig, resource: string, query: URLSearchParams): string {
  return `${config.supabaseUrl}/rest/v1/${resource}?${query.toString()}`;
}

export async function supabaseRequest<T>(
  config: SafepayConfig,
  resource: string,
  query: URLSearchParams,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(apiUrl(config, resource, query), {
    ...init,
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status === 409) {
      throw new SupabaseRestError(response.status);
    }
    throw new SafepayIntegrationError(
      'PAYMENT_CREATION_FAILED',
      'Payment details could not be saved securely. Please try again.',
      502,
    );
  }
  if (response.status === 204) return [] as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new SafepayIntegrationError(
      'INVALID_PROVIDER_RESPONSE',
      'The payment service returned an invalid response.',
      502,
    );
  }
}

export async function authenticateSafepayUser(
  config: SafepayConfig,
  accessToken: string,
): Promise<string> {
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
    throw new SafepayIntegrationError(
      'AUTH_REQUIRED',
      'Your sign-in could not be verified. Please sign in again.',
      401,
    );
  }
  if (!response.ok) {
    throw new SafepayIntegrationError(
      'AUTH_REQUIRED',
      'Please sign in again to continue to payment.',
      401,
    );
  }
  const user: unknown = await response.json().catch(() => null);
  if (
    !user ||
    typeof user !== 'object' ||
    !('id' in user) ||
    typeof user.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(user.id)
  ) {
    throw new SafepayIntegrationError(
      'AUTH_REQUIRED',
      'Please sign in again to continue to payment.',
      401,
    );
  }
  return user.id;
}

export class SafepayPaymentService {
  private readonly config: SafepayConfig;
  private readonly paymentService: PaymentService;

  constructor(config = getSafepayConfig()) {
    this.config = config;
    const registry = new PaymentProviderRegistry();
    registry.register(new SafepayProvider(config));
    this.paymentService = new PaymentService(registry);
  }

  async createSession(orderId: string, userId: string): Promise<SafepaySessionResult> {
    const orderQuery = new URLSearchParams({
      select: 'id,total,currency,status,reservation_expires_at',
      id: `eq.${orderId}`,
      user_id: `eq.${userId}`,
      limit: '1',
    });
    const orders = await supabaseRequest<OrderRecord[]>(this.config, 'orders', orderQuery, {
      method: 'GET',
    });
    const order = orders[0];
    if (!order) {
      throw new SafepayIntegrationError(
        'INVALID_ORDER',
        'We could not find this order in your account.',
        404,
      );
    }
    const expiresAt = new Date(order.reservation_expires_at).getTime();
    if (
      order.status !== 'pending_payment' ||
      !Number.isFinite(Number(order.total)) ||
      Number(order.total) <= 0 ||
      !SUPPORTED_SAFEPAY_CURRENCIES.has(order.currency) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      throw new SafepayIntegrationError(
        'INVALID_ORDER',
        'This order is no longer eligible for payment. Please contact support.',
        409,
      );
    }

    const paidPaymentQuery = new URLSearchParams({
      select: 'id',
      order_id: `eq.${order.id}`,
      status: 'eq.paid',
      limit: '1',
    });
    const paidPayments = await supabaseRequest<Array<{ id: string }>>(
      this.config,
      'payments',
      paidPaymentQuery,
      { method: 'GET' },
    );
    if (paidPayments.length > 0) {
      throw new SafepayIntegrationError('ALREADY_PAID', 'This order has already been paid.', 409);
    }

    const paymentKey = uuidFrom(order.id);
    const paymentQuery = new URLSearchParams({
      select:
        'id,order_id,provider_id,method_id,status,amount,currency,provider_reference,provider_token_reference,idempotency_key,checkout_url,created_at,updated_at',
      order_id: `eq.${order.id}`,
      idempotency_key: `eq.${paymentKey}`,
      limit: '1',
    });
    const previousPayments = await supabaseRequest<PaymentRecord[]>(
      this.config,
      'payments',
      paymentQuery,
      { method: 'GET' },
    );
    const previousPayment = previousPayments[0];
    if (previousPayment?.status === 'paid') {
      throw new SafepayIntegrationError('ALREADY_PAID', 'This order has already been paid.', 409);
    }
    if (previousPayment?.checkout_url && previousPayment.status === 'pending') {
      return this.toSessionResult(previousPayment);
    }
    if (previousPayment?.status === 'processing') {
      const processingAge = Date.now() - new Date(previousPayment.updated_at).getTime();
      if (!Number.isFinite(processingAge) || processingAge < 60_000) {
        throw new SafepayIntegrationError(
          'SESSION_IN_PROGRESS',
          'A payment session is already being prepared. Please wait a minute before retrying.',
          409,
        );
      }
    }

    const paymentData = {
      order_id: order.id,
      provider_id: 'safepay',
      method_id: 'safepay',
      status: 'processing',
      amount: order.total,
      currency: order.currency,
      idempotency_key: paymentKey,
      metadata: { session_state: 'creating' },
    };
    let payment: PaymentRecord;
    if (previousPayment) {
      const updateQuery = new URLSearchParams({ id: `eq.${previousPayment.id}` });
      const updated = await supabaseRequest<PaymentRecord[]>(this.config, 'payments', updateQuery, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(paymentData),
      });
      payment = updated[0];
    } else {
      try {
        const created = await supabaseRequest<PaymentRecord[]>(
          this.config,
          'payments',
          new URLSearchParams(),
          {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(paymentData),
          },
        );
        payment = created[0];
      } catch (requestError) {
        if (!(requestError instanceof SupabaseRestError) || requestError.status !== 409) {
          throw new SafepayIntegrationError(
            'PAYMENT_CREATION_FAILED',
            'Payment details could not be saved securely. Please try again.',
            502,
          );
        }
        const concurrentPayments = await supabaseRequest<PaymentRecord[]>(
          this.config,
          'payments',
          paymentQuery,
          { method: 'GET' },
        );
        const concurrentPayment = concurrentPayments[0];
        if (concurrentPayment?.checkout_url && concurrentPayment.status === 'pending') {
          return this.toSessionResult(concurrentPayment);
        }
        throw new SafepayIntegrationError(
          'SESSION_IN_PROGRESS',
          'A payment session is already being prepared. Please wait a moment before retrying.',
          409,
        );
      }
    }
    if (!payment?.id) {
      throw new SafepayIntegrationError(
        'SESSION_IN_PROGRESS',
        'A payment session is already being prepared. Please wait a moment before retrying.',
        409,
      );
    }

    const providerInput: CreatePaymentSessionInput = {
      orderId: order.id,
      amount: Number(order.total),
      currency: order.currency,
      idempotencyKey: paymentKey,
      returnUrl: `${this.config.webAppUrl}/checkout/confirmation/${encodeURIComponent(order.id)}`,
    };

    let providerSession;
    try {
      providerSession = await this.paymentService.createSession('safepay', providerInput);
    } catch (error) {
      if (!(error instanceof SafepayIntegrationError && error.code === 'SESSION_IN_PROGRESS')) {
        await this.updateFailed(payment.id);
      }
      throw error instanceof SafepayIntegrationError
        ? error
        : new SafepayIntegrationError(
            'PAYMENT_CREATION_FAILED',
            'Safepay could not create a payment session. Please try again.',
            502,
          );
    }
    if (!providerSession.redirectUrl || !providerSession.providerTokenReference) {
      await this.updateFailed(payment.id);
      throw new SafepayIntegrationError(
        'INVALID_PROVIDER_RESPONSE',
        'Safepay returned an invalid payment session response.',
        502,
      );
    }

    try {
      await supabaseRequest<Array<{ id: string }>>(
        this.config,
        'payment_transactions',
        new URLSearchParams(),
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            payment_id: payment.id,
            provider_id: 'safepay',
            status: 'pending',
            amount: order.total,
            currency: order.currency,
            transaction_reference: providerSession.providerTokenReference,
            metadata: { transaction_type: 'hosted_checkout_session' },
          }),
        },
      );
    } catch (error) {
      if (!(error instanceof SupabaseRestError) || error.status !== 409) {
        throw error;
      }
      const existingSessionQuery = new URLSearchParams({
        select: 'id',
        payment_id: `eq.${payment.id}`,
        provider_id: 'eq.safepay',
        transaction_reference: `eq.${providerSession.providerTokenReference}`,
        limit: '1',
      });
      const existingSessions = await supabaseRequest<Array<{ id: string }>>(
        this.config,
        'payment_transactions',
        existingSessionQuery,
        { method: 'GET' },
      );
      if (!existingSessions[0]) {
        throw new SafepayIntegrationError(
          'PAYMENT_CREATION_FAILED',
          'The Safepay session reference could not be stored securely.',
          502,
        );
      }
    }

    const updateQuery = new URLSearchParams({ id: `eq.${payment.id}` });
    const saved = await supabaseRequest<PaymentRecord[]>(this.config, 'payments', updateQuery, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'pending',
        provider_reference: providerSession.providerTokenReference,
        provider_token_reference: providerSession.providerTokenReference,
        checkout_url: providerSession.redirectUrl,
        metadata: { session_state: 'created' },
      }),
    });
    if (!saved[0]) {
      throw new SafepayIntegrationError(
        'PAYMENT_CREATION_FAILED',
        'The payment session could not be saved. Please contact support before retrying.',
        502,
      );
    }
    return this.toSessionResult(saved[0]);
  }

  async getPaymentStatus(paymentId: string, userId: string): Promise<SafepayPaymentStatusResult> {
    const paymentQuery = new URLSearchParams({
      select: 'id,order_id,status,amount,currency,created_at',
      id: `eq.${paymentId}`,
      provider_id: 'eq.safepay',
      limit: '1',
    });
    const payments = await supabaseRequest<
      Array<
        Pick<PaymentRecord, 'id' | 'order_id' | 'status' | 'amount' | 'currency' | 'created_at'>
      >
    >(this.config, 'payments', paymentQuery, { method: 'GET' });
    const payment = payments[0];
    if (!payment) {
      throw new SafepayIntegrationError('NOT_FOUND', 'Payment was not found.', 404);
    }
    const orderQuery = new URLSearchParams({
      select: 'id',
      id: `eq.${payment.order_id}`,
      user_id: `eq.${userId}`,
      limit: '1',
    });
    const ownedOrders = await supabaseRequest<Array<{ id: string }>>(
      this.config,
      'orders',
      orderQuery,
      { method: 'GET' },
    );
    if (!ownedOrders[0]) {
      throw new SafepayIntegrationError('NOT_FOUND', 'Payment was not found.', 404);
    }
    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.created_at,
    };
  }

  private async updateFailed(paymentId: string): Promise<void> {
    await supabaseRequest<unknown>(
      this.config,
      'payments',
      new URLSearchParams({ id: `eq.${paymentId}` }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'failed', metadata: { session_state: 'failed' } }),
      },
    );
  }

  private toSessionResult(payment: PaymentRecord): SafepaySessionResult {
    if (!payment.checkout_url) {
      throw new SafepayIntegrationError(
        'SESSION_IN_PROGRESS',
        'A payment session is still being prepared. Please try again shortly.',
        409,
      );
    }
    return {
      paymentId: payment.id,
      status: payment.status,
      checkoutUrl: payment.checkout_url,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.created_at,
    };
  }
}
