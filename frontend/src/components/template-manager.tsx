'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type TemplateCategory = 'recruiter' | 'referral' | 'about-me';

type MessageTemplate = {
  id: string;
  title: string;
  category: TemplateCategory;
  message: string;
  updatedAt: string;
};

const storageKey = 'freshseeker-message-templates';

const categories: Array<{ label: string; value: TemplateCategory | 'all'; hint: string }> = [
  { label: 'All templates', value: 'all', hint: 'Everything saved' },
  { label: 'Recruiter', value: 'recruiter', hint: 'Cold outreach and follow-ups' },
  { label: 'Referral', value: 'referral', hint: 'Referral asks and reminders' },
  { label: 'About me', value: 'about-me', hint: 'Short bios and intros' },
];

const categoryLabels: Record<TemplateCategory, string> = {
  recruiter: 'Recruiter',
  referral: 'Referral',
  'about-me': 'About me',
};

function isTemplate(value: unknown): value is MessageTemplate {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<MessageTemplate>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.message === 'string' &&
    typeof item.updatedAt === 'string' &&
    (item.category === 'recruiter' || item.category === 'referral' || item.category === 'about-me')
  );
}

function loadTemplates() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isTemplate) : [];
  } catch {
    return [];
  }
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function TemplateManager() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [filter, setFilter] = useState<TemplateCategory | 'all'>('all');
  const [category, setCategory] = useState<TemplateCategory>('recruiter');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setTemplates(loadTemplates());
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(storageKey, JSON.stringify(templates));
    }
  }, [loaded, templates]);

  const visibleTemplates = useMemo(
    () => templates.filter((template) => filter === 'all' || template.category === filter),
    [filter, templates],
  );

  const counts = useMemo(
    () => ({
      recruiter: templates.filter((template) => template.category === 'recruiter').length,
      referral: templates.filter((template) => template.category === 'referral').length,
      aboutMe: templates.filter((template) => template.category === 'about-me').length,
    }),
    [templates],
  );

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setCategory('recruiter');
    setEditingId(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !message.trim()) {
      setNotice('Template title and message are required.');
      return;
    }

    const nextTemplate: MessageTemplate = {
      id: editingId ?? crypto.randomUUID(),
      title: title.trim(),
      category,
      message: message.trim(),
      updatedAt: new Date().toISOString(),
    };

    setTemplates((current) =>
      editingId
        ? current.map((template) => (template.id === editingId ? nextTemplate : template))
        : [nextTemplate, ...current],
    );
    setFilter(category);
    setNotice(editingId ? 'Template updated.' : 'Template saved.');
    resetForm();
  };

  const handleEdit = (template: MessageTemplate) => {
    setTitle(template.title);
    setCategory(template.category);
    setMessage(template.message);
    setEditingId(template.id);
    setNotice('');
  };

  const handleDelete = (templateId: string) => {
    setTemplates((current) => current.filter((template) => template.id !== templateId));
    if (editingId === templateId) {
      resetForm();
    }
    setNotice('Template deleted.');
  };

  const handleCopy = async (template: MessageTemplate) => {
    try {
      await navigator.clipboard.writeText(template.message);
      setNotice(`Copied "${template.title}" to clipboard.`);
    } catch {
      setNotice('Copy failed. Select the message text and copy it manually.');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.18),transparent_22%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/70 transition hover:bg-white/10"
            >
              Back to jobs
            </Link>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Message templates for every job-search moment.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              Save polished recruiter notes, referral asks, and about-me blurbs so outreach is ready when the right role appears.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[420px]">
            <StatCard label="Recruiter" value={counts.recruiter} tone="from-sky-300 to-cyan-300" />
            <StatCard label="Referral" value={counts.referral} tone="from-emerald-300 to-lime-300" />
            <StatCard label="About me" value={counts.aboutMe} tone="from-pink-300 to-rose-300" />
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
              <h2 className="text-2xl font-semibold text-white">{editingId ? 'Edit template' : 'Add template'}</h2>
              <p className="mt-1 text-sm text-white/65">Create reusable messages for your application workflow.</p>
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
              Template name
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Recruiter intro after applying"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:bg-white/8"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-white/80">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as TemplateCategory)}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:bg-slate-950"
              >
                <option value="recruiter">Recruiter</option>
                <option value="referral">Referral</option>
                <option value="about-me">About me</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-white/80">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Hi [Name], I just applied for [Role] at [Company]..."
                className="min-h-64 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:bg-white/8"
              />
            </label>
          </div>

          {notice ? (
            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
              {notice}
            </div>
          ) : null}

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-rose-400 px-5 py-3.5 text-sm font-semibold text-white transition duration-200 hover:scale-[1.01] hover:shadow-[0_18px_50px_rgba(14,165,233,0.3)]"
          >
            {editingId ? 'Update template' : 'Save template'}
          </button>
        </form>

        <div className="rounded-[28px] border border-white/10 bg-[var(--panel-strong)] p-6 shadow-glow backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Saved templates</h2>
              <p className="mt-1 text-sm text-white/65">Filter, copy, or tune messages before sending.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    filter === item.value
                      ? 'border-white/25 bg-white text-slate-950'
                      : 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={`mt-1 block text-xs ${filter === item.value ? 'text-slate-600' : 'text-white/55'}`}>
                    {item.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {!loaded ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center text-sm text-white/55">
                Loading templates...
              </div>
            ) : visibleTemplates.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center text-sm text-white/55">
                No templates here yet. Add one from the form and it will appear in this list.
              </div>
            ) : (
              visibleTemplates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{template.title}</h3>
                        <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                          {categoryLabels[template.category]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">
                        Updated {formatUpdatedAt(template.updatedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(template)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(template)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(template.id)}
                        className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white/72">
                    {template.message}
                  </p>
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
