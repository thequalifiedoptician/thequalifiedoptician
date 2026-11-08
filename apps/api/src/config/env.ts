import 'dotenv/config';

function parsePort(value: string | undefined): number {
  if (value === undefined || value === '') {
    return 3001;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function parseOrigins(value: string | undefined): string[] {
  const origins = (value ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must contain at least one allowed origin.');
  }

  return origins;
}

export const env = {
  port: parsePort(process.env.PORT),
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  supabaseUrl: process.env.SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY?.trim() ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '',
  webAppUrl: process.env.WEB_APP_URL?.trim() ?? '',
};
