import { randomUUID } from 'crypto';
import { ProfileLinkModel } from './models/ProfileLink.js';

export type ProfileLinkRecord = {
  id: string;
  userId: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileLinkInput = {
  name: string;
  url: string;
};

export interface ProfileLinkStore {
  list(userId: string): Promise<ProfileLinkRecord[]>;
  create(userId: string, input: ProfileLinkInput): Promise<ProfileLinkRecord>;
  update(userId: string, id: string, input: ProfileLinkInput): Promise<ProfileLinkRecord | null>;
  delete(userId: string, id: string): Promise<boolean>;
}

function mapMongoProfileLink(link: {
  _id: { toString(): string };
  userId: string;
  name: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}): ProfileLinkRecord {
  return {
    id: link._id.toString(),
    userId: link.userId,
    name: link.name,
    url: link.url,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

function createMemoryStore(): ProfileLinkStore {
  const links: ProfileLinkRecord[] = [];

  return {
    async list(userId) {
      return links
        .filter((link) => link.userId === userId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    async create(userId, input) {
      const now = new Date().toISOString();
      const link: ProfileLinkRecord = {
        id: randomUUID(),
        userId,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      links.unshift(link);
      return link;
    },
    async update(userId, id, input) {
      const link = links.find((entry) => entry.userId === userId && entry.id === id);
      if (!link) {
        return null;
      }

      link.name = input.name;
      link.url = input.url;
      link.updatedAt = new Date().toISOString();
      return link;
    },
    async delete(userId, id) {
      const index = links.findIndex((link) => link.userId === userId && link.id === id);
      if (index === -1) {
        return false;
      }

      links.splice(index, 1);
      return true;
    },
  };
}

function createMongoStore(): ProfileLinkStore {
  return {
    async list(userId) {
      const links = await ProfileLinkModel.find({ userId }).sort({ updatedAt: -1 });
      return links.map(mapMongoProfileLink);
    },
    async create(userId, input) {
      const link = await ProfileLinkModel.create({ userId, ...input });
      return mapMongoProfileLink(link);
    },
    async update(userId, id, input) {
      const link = await ProfileLinkModel.findOneAndUpdate({ _id: id, userId }, input, { new: true });
      return link ? mapMongoProfileLink(link) : null;
    },
    async delete(userId, id) {
      const link = await ProfileLinkModel.findOneAndDelete({ _id: id, userId });
      return Boolean(link);
    },
  };
}

export function createProfileLinkStore() {
  return process.env.MONGO_URI ? createMongoStore() : createMemoryStore();
}
