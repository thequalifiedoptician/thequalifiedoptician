import { Router } from 'express';
import {
  notifyProofReview,
  notifyProofSubmitted,
} from './manualPaymentNotificationController.js';

export function createManualPaymentNotificationRoutes(): Router {
  const router = Router();

  router.post('/proof-submitted', (request, response, next) => {
    void notifyProofSubmitted(request, response).catch(next);
  });
  router.post('/proof-review', (request, response, next) => {
    void notifyProofReview(request, response).catch(next);
  });

  return router;
}
