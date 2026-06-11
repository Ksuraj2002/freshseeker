import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
export function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
}
export function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) {
        return false;
    }
    const hashBuffer = Buffer.from(hash, 'hex');
    const derivedBuffer = scryptSync(password, salt, 64);
    return hashBuffer.length === derivedBuffer.length && timingSafeEqual(hashBuffer, derivedBuffer);
}
