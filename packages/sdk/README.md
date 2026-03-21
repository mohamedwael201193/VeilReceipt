# @veilreceipt/sdk

TypeScript SDK for integrating **VeilReceipt** — private, ZK-powered payments on Aleo — into any application.

## Installation

```bash
npm install @veilreceipt/sdk
```

## Quick Start

```ts
import { VeilReceipt } from '@veilreceipt/sdk';

const veil = new VeilReceipt({
  baseUrl: 'https://api.veilreceipt.com',
  apiKey: 'vr_live_...',
});

// Resolve a payment link
const link = await veil.resolvePaymentLink('a1b2c3d4');
console.log(link.label, link.amount, link.currency);

// Get a payment session
const session = await veil.getPaymentSession('sess_abc123');

// Verify a purchase on-chain
const result = await veil.verifyPurchase('field1234...');
console.log(result.on_chain_verified);
```

## Features

- **Payment Sessions** — Create and complete checkout sessions
- **Payment Links** — Shareable one-time, recurring, or open-amount payment links
- **Products** — CRUD operations for merchant product catalog
- **Receipts** — Store and retrieve ZK receipt metadata
- **Escrow** — Built-in escrow with buyer protection
- **On-chain Verification** — Verify purchases on Aleo testnet
- **Delegated Proving** — Submit transitions for server-side proof generation
- **API Keys & Webhooks** — Full merchant integration management

## Payment Links

```ts
// Create a payment link (merchant auth required)
const link = await veil.createPaymentLink({
  link_hash: 'abc123...',
  amount: 5_000_000, // microcredits
  currency: 'credits',
  link_type: 'recurring',
  label: 'Monthly Subscription',
  description: 'Pay monthly',
  tx_id: 'at1...',
});

// Resolve by hash (public, no auth)
const publicLink = await veil.resolvePaymentLink('abc123...');

// Record fulfillment
await veil.fulfillPaymentLink(link.id, {
  link_id: link.id,
  purchase_commitment: 'field...',
  buyer_address_hash: 'hash...',
  amount: 5_000_000,
  tx_id: 'at1...',
  payment_mode: 'private',
});

// Close a link
await veil.closePaymentLink(link.id);
```

## Escrow

```ts
// Create escrow
const escrow = await veil.createEscrow({
  purchaseCommitment: 'field...',
  buyerAddress: 'aleo1...',
  merchantAddress: 'aleo1...',
  total: 10_000_000,
  txId: 'at1...',
});

// Complete or refund
await veil.resolveEscrow(escrow.escrow.id, 'complete', 'at1...');
```

## Webhooks

```ts
// Register a webhook
const wh = await veil.createWebhook(
  'https://yourserver.com/webhooks/veil',
  ['payment.confirmed', 'link.fulfilled', 'escrow.resolved']
);
console.log('Signing secret:', wh.signing_secret);
```

## Error Handling

```ts
import { VeilReceipt, VeilReceiptError } from '@veilreceipt/sdk';

try {
  await veil.getPaymentSession('invalid');
} catch (err) {
  if (err instanceof VeilReceiptError) {
    console.error(`API Error ${err.status}: ${err.message}`);
  }
}
```

## Configuration

| Option    | Type     | Default | Description                          |
| --------- | -------- | ------- | ------------------------------------ |
| `baseUrl` | `string` | —       | VeilReceipt API base URL (required)  |
| `apiKey`  | `string` | —       | API key from merchant dashboard      |
| `token`   | `string` | —       | JWT token for session auth           |
| `timeout` | `number` | 30000   | Request timeout in milliseconds      |

## License

MIT
