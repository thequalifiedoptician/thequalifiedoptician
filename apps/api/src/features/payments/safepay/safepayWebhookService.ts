import type { VerifiedPaymentEvent } from '../paymentTypes.js';
import { getSafepayConfig, type SafepayConfig } from './safepayConfig.js';
import { supabaseRequest, SupabaseRestError } from './safepayService.js';
import { SafepayIntegrationError } from './safepayTypes.js';

type RecordedEvent = {
  event_row_id: string;
  is_duplicate: boolean;
  current_status: string;
};

type ClaimedEvent = {
  event_row_id: string;
  provider_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
};

function processingErrorCode(error: unknown): string {
  if (error instanceof SafepayIntegrationError) return error.code;
  if (error instanceof SupabaseRestError) return `SUPABASE_HTTP_${error.status}`;
  return 'WEBHOOK_PROCESSING_FAILED';
}

export class SafepayWebhookService {
  constructor(private readonly config: SafepayConfig) {}

  async recordVerifiedEvent(event: VerifiedPaymentEvent): Promise<RecordedEvent> {
    const payload = event.metadata.webhookPayload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new SafepayIntegrationError(
        'INVALID_WEBHOOK_PAYLOAD',
        'Safepay webhook payload is invalid.',
        400,
      );
    }

    const recorded = await supabaseRequest<RecordedEvent[]>(
      this.config,
      'rpc/record_safepay_webhook_event',
      new URLSearchParams(),
      {
        method: 'POST',
        body: JSON.stringify({
          p_provider_event_id: event.eventId,
          p_event_type: event.eventType,
          p_payload: payload,
        }),
      },
    );
    if (!recorded[0]) {
      throw new SafepayIntegrationError(
        'WEBHOOK_PROCESSING_FAILED',
        'The verified payment event could not be stored.',
        503,
      );
    }
    return recorded[0];
  }

  async processBatch(batchSize = 10): Promise<void> {
    for (let index = 0; index < batchSize; index += 1) {
      const claimed = await supabaseRequest<ClaimedEvent[]>(
        this.config,
        'rpc/claim_safepay_webhook_event',
        new URLSearchParams(),
        { method: 'POST', body: '{}' },
      );
      const event = claimed[0];
      if (!event) return;

      try {
        const result = await supabaseRequest<Record<string, unknown>>(
          this.config,
          'rpc/process_safepay_webhook_event',
          new URLSearchParams(),
          { method: 'POST', body: JSON.stringify({ p_event_row_id: event.event_row_id }) },
        );
        if (
          result.result === 'paid_order_inventory_shortfall_requires_reconciliation' ||
          result.result === 'paid_payment_for_inactive_order_requires_reconciliation' ||
          result.result === 'paid_payment_for_already_advanced_order_requires_reconciliation'
        ) {
          console.error('Safepay webhook requires manual reconciliation.', {
            eventId: event.provider_event_id,
            result: result.result,
          });
        } else {
          console.info('Safepay webhook processed.', {
            eventId: event.provider_event_id,
            result: result.result,
          });
        }
      } catch (error) {
        const errorCode = processingErrorCode(error);
        console.error('Safepay webhook processing failed.', {
          eventId: event.provider_event_id,
          errorCode,
        });
        try {
          await supabaseRequest<unknown>(
            this.config,
            'rpc/retry_safepay_webhook_event',
            new URLSearchParams(),
            {
              method: 'POST',
              body: JSON.stringify({
                p_event_row_id: event.event_row_id,
                p_error_code: errorCode,
              }),
            },
          );
        } catch (retryError) {
          console.error('Safepay webhook retry could not be scheduled.', {
            eventId: event.provider_event_id,
            errorCode: processingErrorCode(retryError),
          });
        }
      }
    }
  }
}

let wakeWorker: (() => void) | null = null;

export function kickSafepayWebhookWorker(): void {
  wakeWorker?.();
}

export function startSafepayWebhookWorker(): void {
  if (!process.env.SAFEPAY_WEBHOOK_SECRET?.trim()) {
    console.warn('Safepay webhook worker was not started: webhook configuration is missing.');
    return;
  }

  let config: SafepayConfig;
  try {
    config = getSafepayConfig();
  } catch (error) {
    console.error('Safepay webhook worker could not start.', {
      errorCode: processingErrorCode(error),
    });
    return;
  }

  const service = new SafepayWebhookService(config);
  let processing = false;
  const drainQueue = () => {
    if (processing) return;
    processing = true;
    void service
      .processBatch()
      .catch((error: unknown) => {
        console.error('Safepay webhook queue poll failed.', {
          errorCode: processingErrorCode(error),
        });
      })
      .finally(() => {
        processing = false;
      });
  };

  wakeWorker = drainQueue;
  const timer = setInterval(drainQueue, 2_000);
  timer.unref();
  drainQueue();
}
