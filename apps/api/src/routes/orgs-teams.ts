import { Router, Request, Response } from 'express';
import express from 'express';
import { storage } from '../storage';

const router = Router();

// POST /orgs - Create a new organization
router.post('/orgs', express.json(), async (req: Request, res: Response) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Missing required fields: name, slug' });
    }
    const org = await storage.createOrganization({ name, slug });
    res.status(201).json(org);
  } catch (error: any) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: `Failed to create organization: ${error.message}` });
  }
});

// GET /orgs - List all organizations
router.get('/orgs', async (_req: Request, res: Response) => {
  try {
    const orgs = await storage.listOrganizations();
    res.json(orgs);
  } catch (error: any) {
    console.error('Error listing organizations:', error);
    res.status(500).json({ error: 'Failed to list organizations' });
  }
});

// GET /orgs/:id - Get organization details
router.get('/orgs/:id', async (req: Request, res: Response) => {
  try {
    const org = await storage.getOrganization(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (error: any) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// POST /orgs/:orgId/teams - Create a team within an organization
router.post('/orgs/:orgId/teams', express.json(), async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { name, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Missing required fields: name, slug' });
    }
    const org = await storage.getOrganization(orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const team = await storage.createTeam({ org_id: orgId, name, slug });
    res.status(201).json(team);
  } catch (error: any) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: `Failed to create team: ${error.message}` });
  }
});

// GET /orgs/:orgId/teams - List teams in an organization
router.get('/orgs/:orgId/teams', async (req: Request, res: Response) => {
  try {
    const teams = await storage.listTeams(req.params.orgId);
    res.json(teams);
  } catch (error: any) {
    console.error('Error listing teams:', error);
    res.status(500).json({ error: 'Failed to list teams' });
  }
});

// POST /teams/:teamId/members - Add a team member
router.post('/teams/:teamId/members', express.json(), async (req: Request, res: Response) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    await storage.addTeamMember(req.params.teamId, user_id, role || 'member');
    res.json({ message: 'Member added' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

export default router;
