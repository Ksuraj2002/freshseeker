import type { Request } from 'express';
import { parseCookies } from './cookies.js';
import { verifySessionToken } from './token.js';

export const authCookieName = 'job_orbit_session';
export const jwtSecret = process.env.AUTH_JWT_SECRET ?? 'job-orbit-dev-secret';

export function getSessionFromRequest(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[authCookieName];
  if (!token) {
    return null;
  }

  return verifySessionToken(token, jwtSecret);
}
