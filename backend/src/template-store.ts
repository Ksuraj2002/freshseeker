import { randomUUID } from 'crypto';
import { MessageTemplateModel } from './models/MessageTemplate.js';

export type TemplateCategory = 'recruiter' | 'referral' | 'about-me';

export type MessageTemplateRecord = {
  id: string;
  userId: string;
  title: string;
  category: TemplateCategory;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageTemplateInput = {
  title: string;
  category: TemplateCategory;
  message: string;
};

export interface MessageTemplateStore {
  list(userId: string): Promise<MessageTemplateRecord[]>;
  create(userId: string, input: MessageTemplateInput): Promise<MessageTemplateRecord>;
  update(userId: string, id: string, input: MessageTemplateInput): Promise<MessageTemplateRecord | null>;
  delete(userId: string, id: string): Promise<boolean>;
}

function mapMongoTemplate(template: {
  _id: { toString(): string };
  userId: string;
  title: string;
  category: TemplateCategory;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}): MessageTemplateRecord {
  return {
    id: template._id.toString(),
    userId: template.userId,
    title: template.title,
    category: template.category,
    message: template.message,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function createMemoryStore(): MessageTemplateStore {
  const templates: MessageTemplateRecord[] = [];

  return {
    async list(userId) {
      return templates
        .filter((template) => template.userId === userId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    async create(userId, input) {
      const now = new Date().toISOString();
      const template: MessageTemplateRecord = {
        id: randomUUID(),
        userId,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      templates.unshift(template);
      return template;
    },
    async update(userId, id, input) {
      const template = templates.find((entry) => entry.userId === userId && entry.id === id);
      if (!template) {
        return null;
      }

      template.title = input.title;
      template.category = input.category;
      template.message = input.message;
      template.updatedAt = new Date().toISOString();
      return template;
    },
    async delete(userId, id) {
      const index = templates.findIndex((template) => template.userId === userId && template.id === id);
      if (index === -1) {
        return false;
      }

      templates.splice(index, 1);
      return true;
    },
  };
}

function createMongoStore(): MessageTemplateStore {
  return {
    async list(userId) {
      const templates = await MessageTemplateModel.find({ userId }).sort({ updatedAt: -1 });
      return templates.map(mapMongoTemplate);
    },
    async create(userId, input) {
      const template = await MessageTemplateModel.create({ userId, ...input });
      return mapMongoTemplate(template);
    },
    async update(userId, id, input) {
      const template = await MessageTemplateModel.findOneAndUpdate({ _id: id, userId }, input, { new: true });
      return template ? mapMongoTemplate(template) : null;
    },
    async delete(userId, id) {
      const template = await MessageTemplateModel.findOneAndDelete({ _id: id, userId });
      return Boolean(template);
    },
  };
}

export function createMessageTemplateStore() {
  return process.env.MONGO_URI ? createMongoStore() : createMemoryStore();
}
