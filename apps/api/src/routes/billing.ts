import express, { Response } from 'express';
import { storage } from '../storage';

const router = express.Router();

/** GET /api/billing/usage/:orgId */
router.get('/usage/:orgId', async (req: express.Request, res: Response) => {
  try {
    const orgId = req.params.orgId;
    const rows = await storage.getBillingUsage(orgId);
    const totalSpend = rows.reduce((sum, r) => sum + r.cost_usd, 0);
    const budgetLimit = await storage.getTenantBudget(orgId);

    res.json({
      orgId,
      totalSpend,
      budgetLimit,
      rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get billing usage' });
  }
});

/** GET /api/billing/export/:orgId */
router.get('/export/:orgId', async (req: express.Request, res: Response) => {
  try {
    const orgId = req.params.orgId;
    const rows = await storage.getBillingExport(orgId);

    const header = 'date,model,input_tokens,output_tokens,cost_usd,task_id\n';
    const body = rows
      .map((r) => {
        const date = r.initiated_at.split('T')[0];
        const cost = computeCost(r.llm_model, r.llm_prompt_tokens, r.llm_completion_tokens);
        return [date, r.llm_model, r.llm_prompt_tokens, r.llm_completion_tokens, cost.toFixed(6), r.task_id].join(',');
      })
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="billing-${orgId}.csv"`);
    res.send(header + body);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export billing data' });
  }
});

/** POST /api/billing/budget/:orgId */
router.post('/budget/:orgId', async (req: express.Request, res: Response) => {
  try {
    const { limitUSD } = req.body as { limitUSD?: unknown };
    if (typeof limitUSD !== 'number' || limitUSD < 0) {
      return res.status(400).json({ error: 'limitUSD must be a non-negative number' });
    }

    await storage.setTenantBudget(req.params.orgId, limitUSD);
    res.json({ orgId: req.params.orgId, limitUSD, message: 'Budget ceiling updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to set budget' });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  claude: { input: 3.0,  output: 15.0 },
  gpt:    { input: 10.0, output: 30.0 },
};

function computeCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = MODEL_RATES[model] ?? MODEL_RATES.claude;
  return (promptTokens / 1_000_000) * rates.input + (completionTokens / 1_000_000) * rates.output;
}

export default router;
