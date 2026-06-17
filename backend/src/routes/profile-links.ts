import { Router } from 'express';
import { z } from 'zod';
import { getSessionFromRequest } from '../auth/session.js';
import type { ProfileLinkStore } from '../profile-link-store.js';

const profileLinkInputSchema = z.object({
  name: z.string().trim().min(1),
  url: z.string().trim().url(),
});

export default function createProfileLinksRouter(profileLinkStore: ProfileLinkStore) {
  const router = Router();

  router.use((req, res, next) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      res.status(401).json({ message: 'Please sign in to sync profile links.' });
      return;
    }

    res.locals.userId = session.sub;
    next();
  });

  router.get('/', async (_req, res, next) => {
    try {
      const links = await profileLinkStore.list(res.locals.userId);
      res.json(links);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const payload = profileLinkInputSchema.parse(req.body);
      const link = await profileLinkStore.create(res.locals.userId, payload);
      res.status(201).json(link);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const payload = profileLinkInputSchema.parse(req.body);
      const link = await profileLinkStore.update(res.locals.userId, req.params.id, payload);
      if (!link) {
        res.status(404).json({ message: 'Profile link not found' });
        return;
      }

      res.json(link);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const deleted = await profileLinkStore.delete(res.locals.userId, req.params.id);
      if (!deleted) {
        res.status(404).json({ message: 'Profile link not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
