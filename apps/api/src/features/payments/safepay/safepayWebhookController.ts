import type { Request, Response } from 'express';
import {
  PaymentProviderRegistry,
  PaymentService,
  PaymentWebhookSignatureError,
} from '../paymentService.js';
import { getSafepayConfig } from './safepayConfig.js';
import { SafepayProvider } from './safepayProvider.js';
import { SafepayWebhookService, kickSafepayWebhookWorker } from './safepayWebhookService.js';
import { SafepayIntegrationError } from './safepayTypes.js';

export async function receiveSafepayWebhook(request: Request, response: Response): Promise<void> {
  if (!Buffer.isBuffer(request.body) || request.body.byteLength === 0) {
    throw new SafepayIntegrationError(
      'INVALID_WEBHOOK_PAYLOAD',
      'Safepay webhook payload must be a non-empty JSON body.',
      400,
    );
  }

  const config = getSafepayConfig();
  if (!config.webhookSecret) {
    throw new SafepayIntegrationError(
      'MISSING_CONFIGURATION',
      'The Safepay webhook shared secret is not configured on the server.',
      503,
    );
  }

  const signature = request.header('X-SFPY-SIGNATURE') ?? '';
  const providerRegistry = new PaymentProviderRegistry();
  providerRegistry.register(new SafepayProvider(config));

  let event;
  try {
    event = await new PaymentService(providerRegistry).verifyWebhook('safepay', {
      rawBody: request.body,
      signature,
      headers: { 'x-sfpy-signature': signature },
    });
  } catch (error) {
    if (error instanceof PaymentWebhookSignatureError) {
      console.warn('Safepay webhook signature verification failed.');
      throw new SafepayIntegrationError(
        'INVALID_SIGNATURE',
        'Safepay webhook signature is invalid.',
        400,
      );
    }
    if (error instanceof SafepayIntegrationError) {
      console.warn('Safepay webhook payload validation failed.', { errorCode: error.code });
      throw error;
    }
    console.warn('Safepay webhook payload validation failed.');
    throw new SafepayIntegrationError(
      'INVALID_WEBHOOK_PAYLOAD',
      'Safepay webhook payload is invalid.',
      400,
    );
  }

  const recorded = await new SafepayWebhookService(config).recordVerifiedEvent(event);
  response.status(200).json({
    data: {
      accepted: true,
      duplicate: recorded.is_duplicate,
    },
  });
  kickSafepayWebhookWorker();
}
