import { randomUUID } from 'crypto';
import { UserModel } from './models/User.js';

export type AuthProvider = 'local' | 'google';

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  provider: AuthProvider;
  providerId: string;
  avatarUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  leetcodeUrl: string;
  codechefUrl: string;
  resumes: { name: string; url: string }[];
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = Pick<StoredUser, 'id' | 'name' | 'email' | 'provider' | 'avatarUrl'>;

export type LocalSignupInput = {
  name: string;
  email: string;
  passwordHash: string;
};

export type OAuthUserInput = {
  provider: Exclude<AuthProvider, 'local'>;
  providerId: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

export interface AuthStore {
  findByEmail(email: string): Promise<StoredUser | null>;
  findById(id: string): Promise<StoredUser | null>;
  createLocalUser(input: LocalSignupInput): Promise<StoredUser>;
  upsertOAuthUser(input: OAuthUserInput): Promise<StoredUser>;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    avatarUrl: user.avatarUrl,
  };
}

function mapResumes(value: unknown): StoredUser['resumes'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((resume) => {
    if (!resume || typeof resume !== 'object') {
      return [];
    }

    const item = resume as { name?: unknown; url?: unknown };
    if (typeof item.name !== 'string' || typeof item.url !== 'string') {
      return [];
    }

    return [{ name: item.name, url: item.url }];
  });
}

function mapMongoUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  passwordHash?: string;
  provider: AuthProvider;
  providerId?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  leetcodeUrl?: string;
  codechefUrl?: string;
  resumes?: unknown;
  createdAt: Date;
  updatedAt: Date;
}): StoredUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash ?? '',
    provider: user.provider,
    providerId: user.providerId ?? '',
    avatarUrl: user.avatarUrl ?? '',
    linkedinUrl: user.linkedinUrl ?? '',
    githubUrl: user.githubUrl ?? '',
    leetcodeUrl: user.leetcodeUrl ?? '',
    codechefUrl: user.codechefUrl ?? '',
    resumes: mapResumes(user.resumes),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function createMemoryStore(): AuthStore {
  const usersById = new Map<string, StoredUser>();
  const usersByEmail = new Map<string, StoredUser>();
  const usersByOAuth = new Map<string, StoredUser>();

  const saveUser = (user: StoredUser) => {
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
        linkedinUrl: '',
        githubUrl: '',
        leetcodeUrl: '',
        codechefUrl: '',
        resumes: [],
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
        const updated: StoredUser = {
          ...existing,
          name: input.name || existing.name,
          email: normalizedEmail,
          provider: input.provider,
          providerId: input.providerId,
          avatarUrl: input.avatarUrl ?? existing.avatarUrl,
          linkedinUrl: existing.linkedinUrl ?? '',
          githubUrl: existing.githubUrl ?? '',
          leetcodeUrl: existing.leetcodeUrl ?? '',
          codechefUrl: existing.codechefUrl ?? '',
          resumes: existing.resumes ?? [],
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
        linkedinUrl: '',
        githubUrl: '',
        leetcodeUrl: '',
        codechefUrl: '',
        resumes: [],
        createdAt: now,
        updatedAt: now,
      });
    },
  };
}

function createMongoStore(): AuthStore {
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

export function publicUserFromStored(user: StoredUser): PublicUser {
  return toPublicUser(user);
}
