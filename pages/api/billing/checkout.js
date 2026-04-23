import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Nicht angemeldet.' });

  // TODO: implement Stripe checkout session creation
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const checkoutSession = await stripe.checkout.sessions.create({...});
  // return res.status(200).json({ url: checkoutSession.url });

  return res.status(501).json({ message: 'Stripe noch nicht konfiguriert.' });
}
