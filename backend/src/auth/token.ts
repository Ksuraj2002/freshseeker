import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  provider: 'local' | 'google';
  avatarUrl?: string;
  iat: number;
  exp: number;
};

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function signSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds = 60 * 60 * 24 * 7
) {
  const now = Math.floor(Date.now() / 1000);
  const sessionPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const payloadPart = encodeBase64Url(JSON.stringify(sessionPayload));
  const signature = createHmac('sha256', secret).update(payloadPart).digest('base64url');
  return `${payloadPart}.${signature}`;
}

export function verifySessionToken(token: string, secret: string) {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret).update(payloadPart).digest('base64url');
  const receivedSignature = Buffer.from(signaturePart);
  const calculatedSignature = Buffer.from(expectedSignature);

  if (receivedSignature.length !== calculatedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(receivedSignature, calculatedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createStateToken() {
  return randomBytes(24).toString('base64url');
}
