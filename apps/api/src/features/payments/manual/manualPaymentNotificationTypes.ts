export type ManualPaymentNotificationErrorCode =
  | 'AUTH_REQUIRED'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'MISSING_CONFIGURATION'
  | 'EMAIL_DELIVERY_FAILED';

export class ManualPaymentNotificationError extends Error {
  constructor(
    readonly code: ManualPaymentNotificationErrorCode,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ManualPaymentNotificationError';
  }
}
