import express, { Request, Response } from 'express';
import {
  createCheckoutSession,
  createBillingPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
  getBillingStatus,
} from './stripe.service';
import { TierSlug } from './tiers';

const router = express.Router();

const VALID_TIERS: TierSlug[] = ['pro', 'growth', 'team'];

/** POST /api/billing/checkout */
router.post('/checkout', express.json(), async (req: Request, res: Response) => {
  try {
    const { orgId, tierSlug, email, orgName, successUrl, cancelUrl } = req.body;

    if (!orgId || !tierSlug || !email || !orgName) {
      return res.status(400).json({ error: 'orgId, tierSlug, email, and orgName are required' });
    }
    if (!VALID_TIERS.includes(tierSlug)) {
      return res.status(400).json({ error: `tierSlug must be one of: ${VALID_TIERS.join(', ')}` });
    }

    const defaultSuccess = `${process.env.FRONTEND_URL || 'https://vibe-web-tau.vercel.app'}/billing?success=true`;
    const defaultCancel = `${process.env.FRONTEND_URL || 'https://vibe-web-tau.vercel.app'}/billing?canceled=true`;

    const checkoutUrl = await createCheckoutSession(
      orgId,
      tierSlug as TierSlug,
      email,
      orgName,
      successUrl || defaultSuccess,
      cancelUrl || defaultCancel,
    );

    res.json({ checkoutUrl });
  } catch (err: any) {
    console.error('[billing/checkout] error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/** POST /api/billing/portal */
router.post('/portal', express.json(), async (req: Request, res: Response) => {
  try {
    const { orgId } = req.body;
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }

    const portalUrl = await createBillingPortalSession(orgId);
    res.json({ portalUrl });
  } catch (err: any) {
    console.error('[billing/portal] error:', err.message);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/** POST /api/billing/webhook — raw body, no auth middleware */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    try {
      const event = constructWebhookEvent(req.body as Buffer, sig);
      await handleWebhookEvent(event);
      res.json({ received: true });
    } catch (err: any) {
      console.error('[billing/webhook] signature verification failed:', err.message);
      res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  },
);

/** GET /api/billing/status */
router.get('/status', express.json(), async (req: Request, res: Response) => {
  try {
    const orgId = req.query.orgId as string;
    if (!orgId) {
      return res.status(400).json({ error: 'orgId query parameter is required' });
    }

    const status = await getBillingStatus(orgId);
    res.json(status);
  } catch (err: any) {
    console.error('[billing/status] error:', err.message);
    res.status(500).json({ error: 'Failed to get billing status' });
  }
});

export default router;
