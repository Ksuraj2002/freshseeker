import mongoose from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDb(uri: string) {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri);
  }

  return connectionPromise;
}
