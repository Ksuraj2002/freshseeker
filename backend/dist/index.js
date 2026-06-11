import 'dotenv/config';
import { createApp } from './app.js';
import { createAuthStore } from './auth-store.js';
import { connectDb } from './db.js';
import { createJobStore } from './store.js';
const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    await connectDb(mongoUri);
}
const app = createApp(createJobStore(), createAuthStore());
app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
    console.log(mongoUri ? 'Using MongoDB persistence.' : 'Using in-memory job storage. Set MONGO_URI for persistence.');
});
