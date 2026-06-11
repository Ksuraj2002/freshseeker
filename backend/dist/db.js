import mongoose from 'mongoose';
let connectionPromise = null;
export async function connectDb(uri) {
    if (!connectionPromise) {
        connectionPromise = mongoose.connect(uri);
    }
    return connectionPromise;
}
