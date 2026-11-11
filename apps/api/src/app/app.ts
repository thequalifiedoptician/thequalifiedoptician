import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { env } from '../config/env.js';
import { createSafepayRoutes } from '../features/payments/safepay/safepayRoutes.js';
import { SafepayIntegrationError } from '../features/payments/safepay/safepayTypes.js';
import { createManualPaymentNotificationRoutes } from '../features/payments/manual/manualPaymentNotificationRoutes.js';
import { ManualPaymentNotificationError } from '../features/payments/manual/manualPaymentNotificationTypes.js';

const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const knownError =
    error instanceof SafepayIntegrationError || error instanceof ManualPaymentNotificationError
      ? error
      : null;
  const statusCode = knownError?.statusCode ?? 500;
  const code = knownError?.code ?? 'INTERNAL_SERVER_ERROR';
  const message = knownError?.message ?? 'An unexpected error occurred.';
  response.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
};

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));
  app.use(
    '/api/v1/payments/safepay/webhook',
    express.raw({ type: 'application/json', limit: '256kb', inflate: false }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get(['/health', '/api/health'], (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1/payments', createSafepayRoutes());
  app.use('/api/v1/manual-payments', createManualPaymentNotificationRoutes());

  app.use('/api/v1', (_request, response) => {
    response.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found.',
      },
    });
  });

  app.use(errorHandler);

  return app;
}
