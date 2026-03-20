// Webhook Dispatcher — Delivers events to merchant endpoints with HMAC signing

import crypto from 'crypto';
import {
  getActiveWebhooksForEvent,
  createWebhookDelivery,
  updateWebhookDelivery,
  incrementWebhookFailure,
  resetWebhookFailure,
  getMerchantByAddressHash,
  hashAddress,
} from './database';

const WEBHOOK_TIMEOUT_MS = 10_000;

/**
 * Sign a webhook payload using HMAC-SHA256
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Fire webhook events to all registered endpoints for a merchant
 */
export async function dispatchWebhookEvent(
  merchantId: string,
  event: string,
  data: Record<string, any>
): Promise<void> {
  const webhooks = await getActiveWebhooksForEvent(merchantId, event);
  if (webhooks.length === 0) return;

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID(),
  };
  const payloadStr = JSON.stringify(payload);

  for (const wh of webhooks) {
    const delivery = await createWebhookDelivery({
      webhook_id: wh.id,
      event,
      payload,
    });

    try {
      const signature = signPayload(payloadStr, wh.secret_hash);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      const res = await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VeilReceipt-Signature': `sha256=${signature}`,
          'X-VeilReceipt-Event': event,
          'X-VeilReceipt-Delivery': delivery.id,
        },
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        await updateWebhookDelivery(delivery.id, 'delivered', res.status);
        await resetWebhookFailure(wh.id);
      } else {
        await updateWebhookDelivery(delivery.id, 'failed', res.status);
        await incrementWebhookFailure(wh.id);
      }
    } catch (err) {
      console.error(`Webhook delivery failed for ${wh.url}:`, err);
      await updateWebhookDelivery(delivery.id, 'failed', null);
      await incrementWebhookFailure(wh.id);
    }
  }
}

/**
 * Dispatch payment.confirmed event when a purchase is confirmed on-chain
 */
export async function notifyPaymentConfirmed(merchantAddressHash: string, paymentData: {
  purchase_commitment: string;
  tx_id: string;
  amount: number;
  token_type: number;
  payment_mode: string;
  session_id?: string;
}): Promise<void> {
  const merchant = await getMerchantByAddressHash(merchantAddressHash);
  if (!merchant) return;

  await dispatchWebhookEvent(merchant.id, 'payment.confirmed', {
    purchase_commitment: paymentData.purchase_commitment,
    tx_id: paymentData.tx_id,
    amount: paymentData.amount,
    currency: paymentData.token_type === 0 ? 'credits' : paymentData.token_type === 1 ? 'usdcx' : 'usad',
    payment_mode: paymentData.payment_mode,
    session_id: paymentData.session_id || null,
  });
}

/**
 * Dispatch escrow events
 */
export async function notifyEscrowEvent(merchantAddressHash: string, event: 'escrow.created' | 'escrow.completed' | 'refund.processed', data: Record<string, any>): Promise<void> {
  const merchant = await getMerchantByAddressHash(merchantAddressHash);
  if (!merchant) return;
  await dispatchWebhookEvent(merchant.id, event, data);
}
