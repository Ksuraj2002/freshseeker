export function parseCookies(cookieHeader) {
    if (!cookieHeader) {
        return {};
    }
    return cookieHeader.split(';').reduce((cookies, part) => {
        const separatorIndex = part.indexOf('=');
        if (separatorIndex === -1) {
            return cookies;
        }
        const key = part.slice(0, separatorIndex).trim();
        const value = part.slice(separatorIndex + 1).trim();
        if (key) {
            cookies[key] = decodeURIComponent(value);
        }
        return cookies;
    }, {});
}
export function serializeCookie(name, value, options = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    if (options.maxAge !== undefined) {
        parts.push(`Max-Age=${options.maxAge}`);
    }
    parts.push(`Path=${options.path ?? '/'}`);
    if (options.httpOnly !== false) {
        parts.push('HttpOnly');
    }
    parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);
    if (options.secure || process.env.NODE_ENV === 'production') {
        parts.push('Secure');
    }
    return parts.join('; ');
}
