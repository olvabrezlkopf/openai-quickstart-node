export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // TODO: verify Stripe webhook signature and process events
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const sig = req.headers['stripe-signature'];
  // const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

  // Handle events:
  // - checkout.session.completed → create/update Subscription
  // - customer.subscription.updated → update Subscription status
  // - customer.subscription.deleted → mark as CANCELED
  // - invoice.payment_failed → set PAST_DUE, send dunning email

  return res.status(200).json({ received: true });
}
