import { Router } from 'express';
import { z } from 'zod';
import { getSessionFromRequest } from '../auth/session.js';
import type { MessageTemplateStore } from '../template-store.js';

const templateInputSchema = z.object({
  title: z.string().trim().min(1),
  category: z.enum(['recruiter', 'referral', 'about-me']),
  message: z.string().trim().min(1),
});

export default function createTemplatesRouter(templateStore: MessageTemplateStore) {
  const router = Router();

  router.use((req, res, next) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      res.status(401).json({ message: 'Please sign in to sync templates.' });
      return;
    }

    res.locals.userId = session.sub;
    next();
  });

  router.get('/', async (_req, res, next) => {
    try {
      const templates = await templateStore.list(res.locals.userId);
      res.json(templates);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const payload = templateInputSchema.parse(req.body);
      const template = await templateStore.create(res.locals.userId, payload);
      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const payload = templateInputSchema.parse(req.body);
      const template = await templateStore.update(res.locals.userId, req.params.id, payload);
      if (!template) {
        res.status(404).json({ message: 'Template not found' });
        return;
      }

      res.json(template);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const deleted = await templateStore.delete(res.locals.userId, req.params.id);
      if (!deleted) {
        res.status(404).json({ message: 'Template not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
