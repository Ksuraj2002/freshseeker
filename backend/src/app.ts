import cors from 'cors';
import express from 'express';
import createAuthRouter from './routes/auth.js';
import createJobsRouter from './routes/jobs.js';
import createProfileLinksRouter from './routes/profile-links.js';
import createTemplatesRouter from './routes/templates.js';
import type { AuthStore } from './auth-store.js';
import type { JobStore } from './store.js';
import type { MessageTemplateStore } from './template-store.js';
import type { ProfileLinkStore } from './profile-link-store.js';



export function createApp(
  jobStore: JobStore,
  authStore: AuthStore,
  templateStore: MessageTemplateStore,
  profileLinkStore: ProfileLinkStore
) {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', createAuthRouter(authStore));
  app.use('/api/jobs', createJobsRouter(jobStore));
  app.use('/api/templates', createTemplatesRouter(templateStore));
  app.use('/api/profile-links', createProfileLinksRouter(profileLinkStore));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    res.status(400).json({ message });
  });

  return app;
}
