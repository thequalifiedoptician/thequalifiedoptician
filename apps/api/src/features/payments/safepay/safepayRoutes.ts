import { Router } from 'express';
import { createSafepaySession, getSafepayPaymentStatus } from './safepayController.js';
import { receiveSafepayWebhook } from './safepayWebhookController.js';

export function createSafepayRoutes(): Router {
  const router = Router();

  router.post('/safepay/create-session', (request, response, next) => {
    void createSafepaySession(request, response).catch(next);
  });
  router.post('/safepay/webhook', (request, response, next) => {
    void receiveSafepayWebhook(request, response).catch(next);
  });
  router.get('/:paymentId/status', (request, response, next) => {
    void getSafepayPaymentStatus(request, response).catch(next);
  });

  return router;
}
