import { Schema, model, type InferSchemaType } from 'mongoose';

const profileLinkSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export type ProfileLinkDocument = InferSchemaType<typeof profileLinkSchema>;
export const ProfileLinkModel = model('ProfileLink', profileLinkSchema);
