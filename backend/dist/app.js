import cors from 'cors';
import express from 'express';
import createAuthRouter from './routes/auth.js';
import createJobsRouter from './routes/jobs.js';
export function createApp(jobStore, authStore) {
    const app = express();
    app.use(cors({
        origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
        credentials: true,
    }));
    app.use(express.json());
    app.get('/health', (_req, res) => {
        res.json({ ok: true });
    });
    app.use('/api/auth', createAuthRouter(authStore));
    app.use('/api/jobs', createJobsRouter(jobStore));
    app.use((error, _req, res, _next) => {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        res.status(400).json({ message });
    });
    return app;
}
