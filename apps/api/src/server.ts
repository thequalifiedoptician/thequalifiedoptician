import { createApp } from './app/app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.port, () => {
  console.info(`AlSera API listening on port ${env.port}.`);
});
