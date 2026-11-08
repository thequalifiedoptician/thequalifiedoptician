import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import type { SafepayConfig } from './safepayConfig.js';
import { SafepayProvider } from './safepayProvider.js';
import { parseSafepayWebhookPayload } from './safepayValidation.js';

const config: SafepayConfig = {
  publicKey: 'sandbox-public-key',
  secretKey: 'server-secret-key',
  webhookSecret: 'webhook-shared-secret',
  environment: 'sandbox',
  apiBaseUrl: 'https://sandbox.api.getsafepay.com',
  checkoutBaseUrl: 'https://sandbox.api.getsafepay.com/checkout/pay',
  webAppUrl: 'https://shop.example.test',
  supabaseUrl: 'https://project.example.test',
  supabaseAnonKey: 'public-anon-key',
  supabaseServiceRoleKey: 'server-service-key',
};

const successfulPaymentBody = Buffer.from(
  JSON.stringify({
    token: 'evt_9a08c99a-1730-4bdb-a76c-8fd761c90fbd',
    type: 'payment.succeeded',
    version: '2.0.0',
    merchant_api_key: 'secret-value-that-must-not-be-persisted',
    data: {
      tracker: 'track_49e80e86-a8c0-4a2e-8aa1-491ac0689446',
      amount: 25,
      currency: 'USD',
      customer_email: 'buyer@example.test',
    },
  }),
);

test('verifies Safepay HMAC-SHA512 against exact raw bytes', async () => {
  const provider = new SafepayProvider(config);
  const signature = createHmac('sha512', config.webhookSecret)
    .update(successfulPaymentBody)
    .digest('hex');

  assert.equal(
    await provider.verifyWebhookSignature({
      rawBody: successfulPaymentBody,
      signature,
      headers: { 'x-sfpy-signature': signature },
    }),
    true,
  );
  assert.equal(
    await provider.verifyWebhookSignature({
      rawBody: Buffer.concat([successfulPaymentBody, Buffer.from(' ')]),
      signature,
      headers: {},
    }),
    false,
  );
  assert.equal(
    await provider.verifyWebhookSignature({
      rawBody: successfulPaymentBody,
      signature: 'invalid',
      headers: {},
    }),
    false,
  );
});

test('parses payment events and removes sensitive fields before persistence', () => {
  const event = parseSafepayWebhookPayload(successfulPaymentBody);
  const payload = event.metadata.webhookPayload as Record<string, unknown>;
  const data = payload.data as Record<string, unknown>;

  assert.equal(event.eventId, 'evt_9a08c99a-1730-4bdb-a76c-8fd761c90fbd');
  assert.equal(event.eventType, 'payment.succeeded');
  assert.equal(event.providerReference, 'track_49e80e86-a8c0-4a2e-8aa1-491ac0689446');
  assert.equal(event.status, 'paid');
  assert.equal(event.amount, 25);
  assert.equal(event.currency, 'USD');
  assert.equal('merchant_api_key' in payload, false);
  assert.equal('customer_email' in data, false);
});

test('rejects a successful-payment event without amount and currency', () => {
  const body = Buffer.from(
    JSON.stringify({
      token: 'evt_9a08c99a-1730-4bdb-a76c-8fd761c90fbd',
      type: 'payment.succeeded',
      data: { tracker: 'track_49e80e86-a8c0-4a2e-8aa1-491ac0689446' },
    }),
  );

  assert.throws(() => parseSafepayWebhookPayload(body), {
    code: 'INVALID_WEBHOOK_PAYLOAD',
  });
});

test('parses failed-payment events without provider amount or currency', () => {
  const body = Buffer.from(
    JSON.stringify({
      token: 'evt_9a08c99a-1730-4bdb-a76c-8fd761c90fbd',
      type: 'payment.failed',
      data: { tracker: 'track_49e80e86-a8c0-4a2e-8aa1-491ac0689446' },
    }),
  );

  const event = parseSafepayWebhookPayload(body);
  assert.equal(event.status, 'failed');
  assert.equal(event.amount, 0);
  assert.equal(event.currency, 'USD');
});
