import { randomUUID } from 'crypto';
import { JobModel } from './models/Job.js';
function mapMongoJob(job) {
    return {
        _id: job._id.toString(),
        title: job.title,
        company: job.company,
        url: job.url,
        notes: job.notes ?? '',
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
    };
}
function createMemoryStore() {
    const jobs = [];
    return {
        async list(status = 'all') {
            return jobs
                .filter((job) => status === 'all' || job.status === status)
                .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
        },
        async create(input) {
            const now = new Date().toISOString();
            const job = {
                _id: randomUUID(),
                title: input.title,
                company: input.company,
                url: input.url,
                notes: input.notes ?? '',
                status: 'pending',
                createdAt: now,
                updatedAt: now,
            };
            jobs.unshift(job);
            return job;
        },
        async setStatus(id, status) {
            const job = jobs.find((entry) => entry._id === id);
            if (!job) {
                return null;
            }
            job.status = status;
            job.updatedAt = new Date().toISOString();
            return job;
        },
        async delete(id) {
            const index = jobs.findIndex((job) => job._id === id);
            if (index === -1) {
                return false;
            }
            jobs.splice(index, 1);
            return true;
        },
    };
}
function createMongoStore() {
    return {
        async list(status = 'all') {
            const filter = status === 'all' ? {} : { status };
            const jobs = await JobModel.find(filter).sort({ updatedAt: -1 });
            return jobs.map(mapMongoJob);
        },
        async create(input) {
            const job = await JobModel.create({
                ...input,
                notes: input.notes ?? '',
                status: 'pending',
            });
            return mapMongoJob(job);
        },
        async setStatus(id, status) {
            const job = await JobModel.findByIdAndUpdate(id, { status }, { new: true });
            return job ? mapMongoJob(job) : null;
        },
        async delete(id) {
            const job = await JobModel.findByIdAndDelete(id);
            return Boolean(job);
        },
    };
}
export function createJobStore() {
    if (process.env.MONGO_URI) {
        return createMongoStore();
    }
    return createMemoryStore();
}
