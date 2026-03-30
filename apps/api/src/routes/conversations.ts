import { Router, Request, Response } from 'express';
import express from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

/** Extract user_id from JWT Authorization header, falling back to body field. */
function extractUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && JWT_SECRET) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET, { algorithms: ['HS256'] }) as Record<string, unknown>;
      return (payload.sub as string) ?? null;
    } catch { /* fall through */ }
  }
  return (req.body?.created_by as string) ?? null;
}

const router = Router();

// POST /projects/:id/conversations - Create a new conversation
router.post('/projects/:id/conversations', express.json(), async (req: Request, res: Response) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { title } = req.body;
    const created_by = extractUserId(req) ?? undefined;
    const conversation = await storage.createConversation({
      project_id: req.params.id,
      title,
      created_by,
    });
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /projects/:id/conversations - List conversations for a project
router.get('/projects/:id/conversations', async (req: Request, res: Response) => {
  try {
    const conversations = await storage.listConversations(req.params.id);
    res.json(conversations);
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// GET /conversations/:id - Get a conversation with messages
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await storage.getConversation(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const messages = await storage.getMessages(req.params.id);
    res.json({ ...conversation, messages });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// POST /conversations/:id/messages - Add a message to a conversation
router.post('/conversations/:id/messages', express.json(), async (req: Request, res: Response) => {
  try {
    const conversation = await storage.getConversation(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const { role, content, job_id, metadata } = req.body;
    if (!role || !content) return res.status(400).json({ error: 'role and content are required' });

    const message = await storage.addMessage({
      conversation_id: req.params.id,
      role,
      content,
      job_id,
      metadata,
    });
    res.status(201).json(message);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// PATCH /conversations/:id - Update conversation title
router.patch('/conversations/:id', express.json(), async (req: Request, res: Response) => {
  try {
    const conversation = await storage.getConversation(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    await storage.updateConversationTitle(req.params.id, title);
    res.json({ ...conversation, title });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

export default router;
