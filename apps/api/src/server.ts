import { createApp } from './app/app.js';
import { env } from './config/env.js';
import { startSafepayWebhookWorker } from './features/payments/safepay/safepayWebhookService.js';

const app = createApp();

app.listen(env.port, () => {
  console.info(`AlSera API listening on port ${env.port}.`);
  startSafepayWebhookWorker();
});
