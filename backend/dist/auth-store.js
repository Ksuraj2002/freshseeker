import { randomUUID } from 'crypto';
import { UserModel } from './models/User.js';
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function toPublicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        avatarUrl: user.avatarUrl,
    };
}
function mapMongoUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash ?? '',
        provider: user.provider,
        providerId: user.providerId ?? '',
        avatarUrl: user.avatarUrl ?? '',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}
function createMemoryStore() {
    const usersById = new Map();
    const usersByEmail = new Map();
    const usersByOAuth = new Map();
    const saveUser = (user) => {
        usersById.set(user.id, user);
        usersByEmail.set(normalizeEmail(user.email), user);
        if (user.provider !== 'local' && user.providerId) {
            usersByOAuth.set(`${user.provider}:${user.providerId}`, user);
        }
        return user;
    };
    return {
        async findByEmail(email) {
            return usersByEmail.get(normalizeEmail(email)) ?? null;
        },
        async findById(id) {
            return usersById.get(id) ?? null;
        },
        async createLocalUser(input) {
            const existing = usersByEmail.get(normalizeEmail(input.email));
            if (existing) {
                throw new Error('An account with this email already exists');
            }
            const now = new Date().toISOString();
            return saveUser({
                id: randomUUID(),
                name: input.name,
                email: normalizeEmail(input.email),
                passwordHash: input.passwordHash,
                provider: 'local',
                providerId: '',
                avatarUrl: '',
                createdAt: now,
                updatedAt: now,
            });
        },
        async upsertOAuthUser(input) {
            const normalizedEmail = normalizeEmail(input.email);
            const oauthKey = `${input.provider}:${input.providerId}`;
            const existing = usersByOAuth.get(oauthKey) ?? usersByEmail.get(normalizedEmail);
            const now = new Date().toISOString();
            if (existing) {
                const updated = {
                    ...existing,
                    name: input.name || existing.name,
                    email: normalizedEmail,
                    provider: input.provider,
                    providerId: input.providerId,
                    avatarUrl: input.avatarUrl ?? existing.avatarUrl,
                    updatedAt: now,
                };
                return saveUser(updated);
            }
            return saveUser({
                id: randomUUID(),
                name: input.name,
                email: normalizedEmail,
                passwordHash: '',
                provider: input.provider,
                providerId: input.providerId,
                avatarUrl: input.avatarUrl ?? '',
                createdAt: now,
                updatedAt: now,
            });
        },
    };
}
function createMongoStore() {
    return {
        async findByEmail(email) {
            const user = await UserModel.findOne({ email: normalizeEmail(email) });
            return user ? mapMongoUser(user) : null;
        },
        async findById(id) {
            const user = await UserModel.findById(id);
            return user ? mapMongoUser(user) : null;
        },
        async createLocalUser(input) {
            const email = normalizeEmail(input.email);
            const existing = await UserModel.findOne({ email });
            if (existing) {
                throw new Error('An account with this email already exists');
            }
            const user = await UserModel.create({
                name: input.name,
                email,
                passwordHash: input.passwordHash,
                provider: 'local',
                providerId: '',
                avatarUrl: '',
            });
            return mapMongoUser(user);
        },
        async upsertOAuthUser(input) {
            const email = normalizeEmail(input.email);
            const existing = await UserModel.findOne({
                $or: [{ provider: input.provider, providerId: input.providerId }, { email }],
            });
            if (existing) {
                existing.name = input.name || existing.name;
                existing.email = email;
                existing.provider = input.provider;
                existing.providerId = input.providerId;
                existing.avatarUrl = input.avatarUrl ?? existing.avatarUrl ?? '';
                await existing.save();
                return mapMongoUser(existing);
            }
            const user = await UserModel.create({
                name: input.name,
                email,
                passwordHash: '',
                provider: input.provider,
                providerId: input.providerId,
                avatarUrl: input.avatarUrl ?? '',
            });
            return mapMongoUser(user);
        },
    };
}
export function createAuthStore() {
    return process.env.MONGO_URI ? createMongoStore() : createMemoryStore();
}
export function publicUserFromStored(user) {
    return toPublicUser(user);
}
