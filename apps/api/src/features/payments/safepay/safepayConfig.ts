import { env } from '../../../config/env.js';
import type { SafepayEnvironment } from './safepayTypes.js';
import { SafepayIntegrationError } from './safepayTypes.js';

const API_ORIGINS: Record<SafepayEnvironment, string> = {
  sandbox: 'https://sandbox.api.getsafepay.com',
  production: 'https://api.getsafepay.com',
};

const CHECKOUT_ORIGINS: Record<SafepayEnvironment, string> = {
  sandbox: 'https://sandbox.api.getsafepay.com/checkout/pay',
  production: 'https://getsafepay.com/checkout/pay',
};

export type SafepayConfig = {
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  environment: SafepayEnvironment;
  apiBaseUrl: string;
  checkoutBaseUrl: string;
  webAppUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
};

function required(value: string, name: string): string {
  if (!value) {
    throw new SafepayIntegrationError(
      'MISSING_CONFIGURATION',
      `The server is missing required payment configuration (${name}).`,
      503,
    );
  }
  return value;
}

export function getSafepayConfig(): SafepayConfig {
  const environmentValue = process.env.SAFEPAY_ENVIRONMENT?.trim() ?? '';
  if (environmentValue !== 'sandbox' && environmentValue !== 'production') {
    throw new SafepayIntegrationError(
      'MISSING_CONFIGURATION',
      'SAFEPAY_ENVIRONMENT must be set to sandbox or production.',
      503,
    );
  }
  const environment: SafepayEnvironment = environmentValue;
  const configuredApiUrl = required(
    process.env.SAFEPAY_API_BASE_URL?.trim() ?? '',
    'SAFEPAY_API_BASE_URL',
  );
  let apiBaseUrl: URL;
  try {
    apiBaseUrl = new URL(configuredApiUrl);
  } catch {
    throw new SafepayIntegrationError(
      'MISSING_CONFIGURATION',
      'SAFEPAY_API_BASE_URL must be an absolute Safepay API URL.',
      503,
    );
  }
  if (
    apiBaseUrl.origin !== API_ORIGINS[environment] ||
    apiBaseUrl.pathname !== '/' ||
    apiBaseUrl.search ||
    apiBaseUrl.hash
  ) {
    throw new SafepayIntegrationError(
      'MISSING_CONFIGURATION',
      'SAFEPAY_API_BASE_URL does not match the selected Safepay environment.',
      503,
    );
  }

  const webAppUrlValue = required(env.webAppUrl, 'WEB_APP_URL');
  let webAppUrl: URL;
  try {
    webAppUrl = new URL(webAppUrlValue);
  } catch {
    throw new SafepayIntegrationError(
      'MISSING_CONFIGURATION',
      'WEB_APP_URL must be an absolute URL.',
      503,
    );
  }
  if (
    webAppUrl.username ||
    webAppUrl.password ||
    webAppUrl.search ||
    webAppUrl.hash ||
    webAppUrl.pathname !== '/'
  ) {
    throw new SafepayIntegrationError(
      'MISSING_CONFIGURATION',
      'WEB_APP_URL must not contain credentials, a query, or a fragment.',
      503,
    );
  }
  if (environment === 'production' && webAppUrl.protocol !== 'https:') {
    throw new SafepayIntegrationError(
      'MISSING_CONFIGURATION',
      'WEB_APP_URL must use HTTPS in the production environment.',
      503,
    );
  }

  return {
    publicKey: required(process.env.SAFEPAY_PUBLIC_KEY?.trim() ?? '', 'SAFEPAY_PUBLIC_KEY'),
    secretKey: required(process.env.SAFEPAY_SECRET_KEY?.trim() ?? '', 'SAFEPAY_SECRET_KEY'),
    webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET?.trim() ?? '',
    environment,
    apiBaseUrl: apiBaseUrl.origin,
    checkoutBaseUrl: CHECKOUT_ORIGINS[environment],
    webAppUrl: webAppUrl.origin,
    supabaseUrl: required(env.supabaseUrl, 'SUPABASE_URL').replace(/\/+$/u, ''),
    supabaseAnonKey: required(env.supabaseAnonKey, 'SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: required(env.supabaseServiceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY'),
  };
}
