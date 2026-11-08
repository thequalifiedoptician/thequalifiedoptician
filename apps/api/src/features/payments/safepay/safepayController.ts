import type { Request, Response } from 'express';
import { getSafepayConfig } from './safepayConfig.js';
import { authenticateSafepayUser, SafepayPaymentService } from './safepayService.js';
import { parseCreateSessionBody } from './safepayValidation.js';
import { SafepayIntegrationError } from './safepayTypes.js';

function getAccessToken(request: Request): string {
  const authorization = request.header('authorization');
  const match = authorization?.match(/^Bearer ([^\s]+)$/iu);
  if (!match) {
    throw new SafepayIntegrationError(
      'AUTH_REQUIRED',
      'Please sign in again to continue to payment.',
      401,
    );
  }
  return match[1];
}

function getPaymentId(value: string | string[]): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
  ) {
    throw new SafepayIntegrationError('NOT_FOUND', 'Payment was not found.', 404);
  }
  return value;
}

export async function createSafepaySession(request: Request, response: Response): Promise<void> {
  const accessToken = getAccessToken(request);
  const { orderId } = parseCreateSessionBody(request.body);
  const config = getSafepayConfig();
  const userId = await authenticateSafepayUser(config, accessToken);
  const result = await new SafepayPaymentService(config).createSession(orderId, userId);
  response.status(201).json({ data: result });
}

export async function getSafepayPaymentStatus(request: Request, response: Response): Promise<void> {
  const accessToken = getAccessToken(request);
  const paymentId = getPaymentId(request.params.paymentId ?? '');
  const config = getSafepayConfig();
  const userId = await authenticateSafepayUser(config, accessToken);
  const result = await new SafepayPaymentService(config).getPaymentStatus(paymentId, userId);
  response.status(200).json({ data: result });
}
