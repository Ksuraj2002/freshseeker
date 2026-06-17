import { Schema, model, type InferSchemaType } from 'mongoose';

const messageTemplateSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['recruiter', 'referral', 'about-me'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export type MessageTemplateDocument = InferSchemaType<typeof messageTemplateSchema>;
export const MessageTemplateModel = model('MessageTemplate', messageTemplateSchema);
