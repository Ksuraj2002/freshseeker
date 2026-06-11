import { Router } from 'express';
import { z } from 'zod';
import type { JobStore } from '../store.js';

const router = Router();

const jobInputSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  url: z.string().url(),
  notes: z.string().optional().default(''),
});

export default function createJobsRouter(jobStore: JobStore) {
  router.get('/', async (req, res, next) => {
    try {
      const status = req.query.status as string | undefined;
      const jobs = await jobStore.list(status === 'pending' || status === 'applied' ? status : 'all');
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const payload = jobInputSchema.parse(req.body);
      const job = await jobStore.create(payload);
      res.status(201).json(job);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/apply', async (req, res, next) => {
    try {
      const job = await jobStore.setStatus(req.params.id, 'applied');
      if (!job) {
        res.status(404).json({ message: 'Job not found' });
        return;
      }
      res.json(job);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/pending', async (req, res, next) => {
    try {
      const job = await jobStore.setStatus(req.params.id, 'pending');
      if (!job) {
        res.status(404).json({ message: 'Job not found' });
        return;
      }
      res.json(job);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const deleted = await jobStore.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: 'Job not found' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
