create or replace function public.process_safepay_webhook_event_inline(p_event_row_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.payment_events%rowtype;
  result_value jsonb;
  error_state text;
begin
  select events.*
  into event_row
  from public.payment_events as events
  where events.id = p_event_row_id
  for update;

  if not found or not event_row.signature_verified then
    raise exception using message = 'SAFEPAY_EVENT_NOT_FOUND_OR_UNVERIFIED';
  end if;

  if event_row.processing_status in ('processed', 'ignored') then
    return event_row.processing_result || jsonb_build_object('duplicate', true);
  end if;

  if event_row.processing_status = 'failed' and event_row.next_attempt_at is null then
    return event_row.processing_result || jsonb_build_object('terminal', true);
  end if;

  if event_row.processing_status = 'processing'
    and event_row.lease_expires_at > now() then
    return jsonb_build_object('result', 'processing_in_progress');
  end if;

  if event_row.processing_attempts >= 8 then
    update public.payment_events
    set processing_status = 'failed',
        next_attempt_at = null,
        lease_expires_at = null,
        last_error = 'WEBHOOK_PROCESSING_RETRY_EXHAUSTED',
        processing_result = jsonb_build_object('result', 'processing_retry_exhausted')
    where id = event_row.id;
    return jsonb_build_object('result', 'processing_retry_exhausted');
  end if;

  update public.payment_events
  set processing_status = 'processing',
      processing_attempts = processing_attempts + 1,
      lease_expires_at = now() + interval '1 minute',
      next_attempt_at = null,
      last_error = null
  where id = event_row.id;

  begin
    result_value := public.process_safepay_webhook_event(event_row.id);
    return result_value;
  exception when others then
    get stacked diagnostics error_state = returned_sqlstate;

    update public.payment_events
    set processing_status = case
          when event_row.processing_attempts + 1 >= 8 then 'failed'
          else 'received'
        end,
        next_attempt_at = case
          when event_row.processing_attempts + 1 >= 8 then null
          else now()
        end,
        lease_expires_at = null,
        last_error = 'SQLSTATE:' || left(error_state, 5),
        processing_result = jsonb_build_object(
          'result',
          case
            when event_row.processing_attempts + 1 >= 8
              then 'processing_retry_exhausted'
            else 'processing_retry_scheduled'
          end
        )
    where id = event_row.id;

    return jsonb_build_object(
      'result',
      case
        when event_row.processing_attempts + 1 >= 8
          then 'processing_retry_exhausted'
        else 'processing_retry_scheduled'
      end
    );
  end;
end;
$$;

revoke all on function public.process_safepay_webhook_event_inline(uuid)
  from public, anon, authenticated;
grant execute on function public.process_safepay_webhook_event_inline(uuid)
  to service_role;
