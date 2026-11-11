import { env } from '../../../config/env.js';
import { ManualPaymentNotificationError } from './manualPaymentNotificationTypes.js';

export type ManualPaymentNotificationConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  resendApiKey: string;
  resendFromEmail: string;
  adminEmail: string;
  webAppUrl: string;
};

function required(value: string, key: string): string {
  if (!value) {
    throw new ManualPaymentNotificationError(
      'MISSING_CONFIGURATION',
      `Manual payment email configuration is incomplete (${key}).`,
      503,
    );
  }
  return value;
}

export function getManualPaymentNotificationConfig(): ManualPaymentNotificationConfig {
  const webAppUrl = required(env.webAppUrl, 'WEB_APP_URL');
  try {
    const url = new URL(webAppUrl);
    if (url.username || url.password || url.search || url.hash) throw new Error();
  } catch {
    throw new ManualPaymentNotificationError(
      'MISSING_CONFIGURATION',
      'WEB_APP_URL must be an absolute URL without credentials, query, or fragment.',
      503,
    );
  }

  const resendFromEmail = required(env.resendFromEmail, 'RESEND_FROM_EMAIL');
  const adminEmail = required(env.manualPaymentsAdminEmail, 'MANUAL_PAYMENT_ADMIN_EMAIL');
  if (
    !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u.test(resendFromEmail.replace(/^.*<([^<>]+)>$/u, '$1')) ||
    !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u.test(adminEmail)
  ) {
    throw new ManualPaymentNotificationError(
      'MISSING_CONFIGURATION',
      'The configured payment notification email addresses are invalid.',
      503,
    );
  }

  return {
    supabaseUrl: required(env.supabaseUrl, 'SUPABASE_URL').replace(/\/+$/u, ''),
    supabaseAnonKey: required(env.supabaseAnonKey, 'SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: required(env.supabaseServiceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY'),
    resendApiKey: required(env.resendApiKey, 'RESEND_API_KEY'),
    resendFromEmail,
    adminEmail,
    webAppUrl: new URL(webAppUrl).origin,
  };
}
