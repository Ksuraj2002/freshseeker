import { Schema, model, type InferSchemaType } from 'mongoose';

const jobSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'applied'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export type JobDocument = InferSchemaType<typeof jobSchema>;
export const JobModel = model('Job', jobSchema);
