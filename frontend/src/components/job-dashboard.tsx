'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createJob, deleteJob, listJobs, markJobApplied, markJobPending } from '@/lib/api';
import type { Job, JobStatus } from '@/lib/types';

const filters: Array<{ label: string; value: JobStatus | 'all' }> = [
  { label: 'All roles', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Applied', value: 'applied' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function JobDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    listJobs(filter)
      .then((data) => {
        if (active) {
          setJobs(data);
          setError('');
          setLoaded(true);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load jobs');
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [filter]);

  const pendingCount = useMemo(() => jobs.filter((job) => job.status === 'pending').length, [jobs]);
  const appliedCount = useMemo(() => jobs.filter((job) => job.status === 'applied').length, [jobs]);

  const resetForm = () => {
    setTitle('');
    setCompany('');
    setUrl('');
    setNotes('');
  };

  const refresh = (nextFilter: JobStatus | 'all' = filter) => {
    startTransition(() => {
      listJobs(nextFilter)
        .then((data) => {
          setJobs(data);
          setError('');
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load jobs');
        });
    });
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !company.trim() || !url.trim()) {
      setError('Title, company, and link are required.');
      return;
    }

    try {
      setError('');
      await createJob({
        title: title.trim(),
        company: company.trim(),
        url: url.trim(),
        notes: notes.trim() || undefined,
      });
      resetForm();
      refresh('all');
      setFilter('all');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    }
  };

  const handleToggle = async (job: Job) => {
    try {
      await (job.status === 'applied' ? markJobPending(job._id) : markJobApplied(job._id));
      refresh(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job');
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      refresh(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.28),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.18),transparent_22%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-white/70">
              Freshseeker
            </p>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Keep every application in one place and move wins into applied.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              Store job links, mark roles as applied with one click, and filter your pipeline without losing momentum.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard label="Total saved" value={jobs.length} tone="from-sky-400 to-cyan-300" />
            <StatCard label="Pending" value={pendingCount} tone="from-amber-300 to-orange-400" />
            <StatCard label="Applied" value={appliedCount} tone="from-emerald-300 to-lime-400" />
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={handleCreate}
          className="rounded-[28px] border border-white/10 bg-[var(--panel)] p-6 shadow-glow backdrop-blur-xl sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">Add a job</h2>
            <p className="mt-1 text-sm text-white/65">Drop in the role, company, and link so you can revisit it later.</p>
          </div>

          <div className="grid gap-4">
            <Field label="Job title" value={title} onChange={setTitle} placeholder="Senior Frontend Engineer" />
            <Field label="Company" value={company} onChange={setCompany} placeholder="Acme Labs" />
            <Field label="Job link" value={url} onChange={setUrl} placeholder="https://company.com/jobs/..." type="url" />
            <label className="grid gap-2 text-sm font-medium text-white/80">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Interview deadline, recruiter name, anything useful"
                className="min-h-28 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60 focus:bg-white/8"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 px-5 py-3.5 text-sm font-semibold text-white transition duration-200 hover:scale-[1.01] hover:shadow-[0_18px_50px_rgba(124,58,237,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save job
          </button>
        </form>

        <div className="rounded-[28px] border border-white/10 bg-[var(--panel-strong)] p-6 shadow-glow backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Your pipeline</h2>
              <p className="mt-1 text-sm text-white/65">
                Filter by status and move roles between pending and applied.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/5 p-1">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === item.value
                      ? 'bg-white text-slate-950 shadow-lg'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {!loaded ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center text-sm text-white/55">
                Loading your saved jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center text-sm text-white/55">
                No jobs match this filter yet. Add one from the form and start tracking.
              </div>
            ) : (
              jobs.map((job) => (
                <article
                  key={job._id}
                  className="group rounded-[24px] border border-white/10 bg-white/5 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${
                              job.status === 'applied'
                                ? 'bg-emerald-500/15 text-emerald-200'
                                : 'bg-amber-500/15 text-amber-200'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-white/62">{job.company}</p>
                      </div>

                      {job.notes ? <p className="max-w-xl text-sm leading-6 text-white/72">{job.notes}</p> : null}

                      <div className="flex flex-wrap items-center gap-3 text-sm text-white/55">
                        <span>{formatDate(job.createdAt)}</span>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-violet-200 transition hover:text-violet-100"
                        >
                          Open link
                          <span aria-hidden>↗</span>
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                      <button
                        type="button"
                        onClick={() => handleToggle(job)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
                      >
                        {job.status === 'applied' ? 'Move to pending' : 'Mark applied'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(job._id)}
                        className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
      <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${tone}`} />
      <p className="mt-4 text-sm text-white/65">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-white/80">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400/60 focus:bg-white/8"
      />
    </label>
  );
}
