'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { createProfileLink, deleteProfileLink, listProfileLinks, updateProfileLink } from '@/lib/api';
import type { ProfileLink } from '@/lib/types';

const storageKey = 'freshseeker-profile-links';
const migrationKey = 'freshseeker-profile-links-migrated';

type LegacyProfileLink = {
  id: string;
  name: string;
  url: string;
  updatedAt: string;
};

function isProfileLink(value: unknown): value is LegacyProfileLink {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<LegacyProfileLink>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.url === 'string' &&
    typeof item.updatedAt === 'string'
  );
}

function isLegacyProfileLink(value: unknown): value is { key: string; label: string; url: string; updatedAt: string } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as { key?: unknown; label?: unknown; url?: unknown; updatedAt?: unknown };
  return (
    typeof item.key === 'string' &&
    typeof item.label === 'string' &&
    typeof item.url === 'string' &&
    typeof item.updatedAt === 'string'
  );
}

function loadLinks() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (isProfileLink(item)) {
        return [item];
      }

      if (isLegacyProfileLink(item)) {
        return [
          {
            id: item.key,
            name: item.label,
            url: item.url,
            updatedAt: item.updatedAt,
          },
        ];
      }

      return [];
    });
  } catch {
    return [];
  }
}

function markLegacyLinksMigrated() {
  window.localStorage.setItem(migrationKey, 'true');
}

function legacyLinksMigrated() {
  return window.localStorage.getItem(migrationKey) === 'true';
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function ProfileLinksManager() {
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    listProfileLinks()
      .then(async (data) => {
        if (!active) {
          return;
        }

        if (data.length === 0 && !legacyLinksMigrated()) {
          const legacyLinks = loadLinks();
          if (legacyLinks.length > 0) {
            const migratedLinks = await Promise.all(
              legacyLinks.flatMap((link) => {
                const normalizedUrl = normalizeUrl(link.url);
                if (!normalizedUrl) {
                  return [];
                }

                return [
                  createProfileLink({
                    name: link.name,
                    url: normalizedUrl,
                  }),
                ];
              }),
            );
            markLegacyLinksMigrated();
            if (active) {
              setLinks(migratedLinks);
              setNotice('Local links were synced to your account.');
              setLoaded(true);
            }
            return;
          }
        }

        markLegacyLinksMigrated();
        setLinks(data);
        setNotice('');
        setLoaded(true);
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice(error instanceof Error ? error.message : 'Failed to load links.');
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const recentLinks = useMemo(() => links.slice(0, 3), [links]);

  const resetForm = () => {
    setName('');
    setUrl('');
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextName = name.trim();
    const nextUrl = normalizeUrl(url);
    if (!nextName || !nextUrl) {
      setNotice('Name and link are required.');
      return;
    }

    const payload = {
      name: nextName,
      url: nextUrl,
    };

    try {
      const savedLink = editingId ? await updateProfileLink(editingId, payload) : await createProfileLink(payload);
      setLinks((current) =>
        editingId ? current.map((link) => (link.id === editingId ? savedLink : link)) : [savedLink, ...current],
      );
      setNotice(editingId ? 'Link updated.' : 'Link saved.');
      resetForm();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to save link.');
    }
  };

  const handleEdit = (link: ProfileLink) => {
    setName(link.name);
    setUrl(link.url);
    setEditingId(link.id);
    setNotice('');
  };

  const handleDelete = (linkId: string) => {
    startTransition(() => {
      deleteProfileLink(linkId)
        .then(() => {
          setLinks((current) => current.filter((link) => link.id !== linkId));
          if (editingId === linkId) {
            resetForm();
          }
          setNotice('Link deleted.');
        })
        .catch((error: unknown) => {
          setNotice(error instanceof Error ? error.message : 'Failed to delete link.');
        });
    });
  };

  const handleCopy = async (link: ProfileLink) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setNotice(`${link.name} copied.`);
    } catch {
      setNotice('Copy failed. Select the link and copy it manually.');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.18),transparent_22%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/70 transition hover:bg-white/10"
              >
                Back to jobs
              </Link>
              <Link
                href="/templates"
                className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/70 transition hover:bg-white/10"
              >
                Templates
              </Link>
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Keep every useful link ready for applications.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              Add any link with a clear name, then open or copy it whenever a job application asks.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[320px]">
            <StatCard label="Saved links" value={links.length} tone="from-teal-300 to-cyan-300" />
            <StatCard label="Recent" value={recentLinks.length} tone="from-amber-300 to-orange-400" />
          </div>
        </div>
      </header>

      <section className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-white/10 bg-[var(--panel)] p-6 shadow-glow backdrop-blur-xl sm:p-8"
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">{editingId ? 'Edit link' : 'Add link'}</h2>
              <p className="mt-1 text-sm text-white/65">Save a named link like Resume, GitHub, LeetCode, or anything else.</p>
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-white/80">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Resume"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-teal-300/60 focus:bg-white/8"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-white/80">
              Link
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/profile"
                type="url"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-teal-300/60 focus:bg-white/8"
              />
            </label>
          </div>

          {notice ? (
            <div className="mt-4 rounded-2xl border border-teal-400/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-50">
              {notice}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-500 to-amber-400 px-5 py-3.5 text-sm font-semibold text-white transition duration-200 hover:scale-[1.01] hover:shadow-[0_18px_50px_rgba(20,184,166,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingId ? 'Update link' : 'Save link'}
          </button>
        </form>

        <div className="rounded-[28px] border border-white/10 bg-[var(--panel-strong)] p-6 shadow-glow backdrop-blur-xl sm:p-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">Saved links</h2>
            <p className="mt-1 text-sm text-white/65">Open, copy, edit, or remove any link from one place.</p>
          </div>

          <div className="mt-6 grid gap-4">
            {!loaded ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center text-sm text-white/55">
                Loading links...
              </div>
            ) : links.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center text-sm text-white/55">
                No links saved yet. Add one from the form and it will appear here.
              </div>
            ) : (
              links.map((link, index) => (
                <article
                  key={link.id}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div
                        className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${
                          index % 3 === 0
                            ? 'from-teal-300 to-cyan-300'
                            : index % 3 === 1
                              ? 'from-amber-300 to-orange-400'
                              : 'from-pink-300 to-rose-300'
                        }`}
                      />
                      <h3 className="mt-4 text-lg font-semibold text-white">{link.name}</h3>
                      <p className="mt-2 break-all text-sm leading-6 text-white/70">{link.url}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">
                        Updated {formatUpdatedAt(link.updatedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(link)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(link)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(link.id)}
                        disabled={isPending}
                        className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
    </main>
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
