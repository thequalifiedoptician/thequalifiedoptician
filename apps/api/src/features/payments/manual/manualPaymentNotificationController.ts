import type { Request, Response } from 'express';
import {
  getAccessTokenFromHeader,
  sendProofReviewNotification,
  sendProofSubmittedNotifications,
} from './manualPaymentNotificationService.js';
import { ManualPaymentNotificationError } from './manualPaymentNotificationTypes.js';

function getProofId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
  ) {
    throw new ManualPaymentNotificationError(
      'INVALID_REQUEST',
      'A valid payment proof is required.',
      400,
    );
  }
  return value;
}

export async function notifyProofSubmitted(request: Request, response: Response): Promise<void> {
  const accessToken = getAccessTokenFromHeader(request.header('authorization'));
  const proofId = getProofId(request.body?.proofId);
  await sendProofSubmittedNotifications(proofId, accessToken);
  response.status(202).json({ data: { sent: true } });
}

export async function notifyProofReview(request: Request, response: Response): Promise<void> {
  const accessToken = getAccessTokenFromHeader(request.header('authorization'));
  const proofId = getProofId(request.body?.proofId);
  await sendProofReviewNotification(proofId, accessToken);
  response.status(202).json({ data: { sent: true } });
}
