import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import type { AuthStore } from '../auth-store.js';
import { publicUserFromStored } from '../auth-store.js';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { createStateToken, signSessionToken, verifySessionToken } from '../auth/token.js';
import { parseCookies, serializeCookie } from '../auth/cookies.js';

const authCookieName = 'job_orbit_session';
const oauthStateCookieName = 'job_orbit_oauth_state';
const jwtSecret = process.env.AUTH_JWT_SECRET ?? 'job-orbit-dev-secret';
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function appendCookie(res: Response, cookie: string) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }

  if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
    return;
  }

  res.setHeader('Set-Cookie', [existing.toString(), cookie]);
}

function issueSession(res: Response, user: Awaited<ReturnType<AuthStore['createLocalUser']>>) {
  const token = signSessionToken(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      avatarUrl: user.avatarUrl || undefined,
    },
    jwtSecret
  );
  appendCookie(res, serializeCookie(authCookieName, token, { maxAge: 60 * 60 * 24 * 7 }));
}

function clearSession(res: Response) {
  appendCookie(res, serializeCookie(authCookieName, '', { maxAge: 0 }));
}

function setOAuthState(res: Response, state: string) {
  appendCookie(res, serializeCookie(oauthStateCookieName, state, { maxAge: 10 * 60 }));
}

function clearOAuthState(res: Response) {
  appendCookie(res, serializeCookie(oauthStateCookieName, '', { maxAge: 0 }));
}

function getQueryValue(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return '';
}

function redirectFrontend(res: Response, query: Record<string, string>) {
  const url = new URL(frontendUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  res.redirect(302, url.toString());
}

function redirectAuthError(res: Response, reason: string) {
  redirectFrontend(res, { auth: 'error', reason });
}

function getSessionFromRequest(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[authCookieName];
  if (!token) {
    return null;
  }

  return verifySessionToken(token, jwtSecret);
}

async function exchangeGoogleCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${backendUrl}/api/auth/google/callback`,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Google token exchange failed');
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error('Google access token missing');
  }

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error('Google profile request failed');
  }

  return (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
}

function buildGoogleAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${backendUrl}/api/auth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

export default function createAuthRouter(authStore: AuthStore) {
  const router = Router();

  router.get('/providers', (_req, res) => {
    res.json({
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    });
  });

  router.get('/me', (req, res) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      res.json({ user: null });
      return;
    }

    res.json({
      user: {
        id: session.sub,
        name: session.name,
        email: session.email,
        provider: session.provider,
        avatarUrl: session.avatarUrl ?? '',
      },
    });
  });

  router.post('/signup', async (req, res, next) => {
    try {
      const payload = signupSchema.parse(req.body);
      const user = await authStore.createLocalUser({
        name: payload.name.trim(),
        email: payload.email.trim(),
        passwordHash: hashPassword(payload.password),
      });
      issueSession(res, user);
      res.status(201).json({
        user: publicUserFromStored(user),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const payload = loginSchema.parse(req.body);
      const user = await authStore.findByEmail(payload.email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      if (!verifyPassword(payload.password, user.passwordHash)) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      issueSession(res, user);
      res.json({
        user: publicUserFromStored(user),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', (_req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  router.get('/google', (req, res) => {
    const state = createStateToken();
    const authUrl = buildGoogleAuthUrl(state);
    if (!authUrl) {
      redirectAuthError(res, 'google_not_configured');
      return;
    }

    setOAuthState(res, state);
    res.redirect(302, authUrl);
  });

  router.get('/google/callback', async (req, res) => {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const returnedState = getQueryValue(req.query.state);
      const code = getQueryValue(req.query.code);
      if (!returnedState || !code || cookies[oauthStateCookieName] !== returnedState) {
        redirectAuthError(res, 'google_state_mismatch');
        return;
      }

      clearOAuthState(res);

      const profile = await exchangeGoogleCode(code);
      if (!profile.sub || !profile.email) {
        redirectAuthError(res, 'google_profile_incomplete');
        return;
      }

      const storedUser = await authStore.upsertOAuthUser({
        provider: 'google',
        providerId: profile.sub,
        name: profile.name || 'Google User',
        email: profile.email,
        avatarUrl: profile.picture || '',
      });

      issueSession(res, storedUser);
      redirectFrontend(res, { auth: 'success', provider: 'google' });
    } catch (error) {
      redirectAuthError(res, error instanceof Error ? error.message : 'google_oauth_failed');
    }
  });

  return router;
}
