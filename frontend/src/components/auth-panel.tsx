'use client';

import { useEffect, useState } from 'react';
import {
  getAuthProviders,
  getCurrentUser,
  getGoogleOAuthUrl,
  login,
  logout,
  signup,
} from '@/lib/api';
import type { AuthUser } from '@/lib/types';
import Link from 'next/dist/client/link';

type Mode = 'login' | 'signup';

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  useEffect(() => {
    let active = true;

    Promise.all([getCurrentUser(), getAuthProviders()])
      .then(([session, providers]) => {
        if (!active) {
          return;
        }

        setUser(session.user);
        setGoogleEnabled(providers.google);
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus(error instanceof Error ? error.message : 'Failed to load auth state');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('auth');
    if (!authResult) {
      return;
    }

    if (authResult === 'success') {
      getCurrentUser()
        .then((session) => {
          setUser(session.user);
          setStatus('Signed in successfully.');
        })
        .catch((error: unknown) => {
          setStatus(error instanceof Error ? error.message : 'Signed in, but session check failed.');
        });
    } else {
      const reason = params.get('reason') ?? 'Authentication failed';
      setStatus(reason.replaceAll('_', ' '));
    }

    params.delete('auth');
    params.delete('provider');
    params.delete('reason');
    const nextUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  const handleGoogleSignIn = () => {
    if (!googleEnabled) {
      setStatus('Google OAuth is not configured. Use email and password instead.');
      return;
    }

    window.location.href = getGoogleOAuthUrl();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus('');

    try {
      if (isSignup) {
        const result = await signup({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        setUser(result.user);
        setStatus('Account created successfully.');
        setPassword('');
        return;
      }

      const result = await login({
        email: email.trim(),
        password,
      });
      setUser(result.user);
      setStatus('Signed in successfully.');
      setPassword('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setSubmitting(true);
    setStatus('');

    try {
      await logout();
      setUser(null);
      setStatus('Signed out.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to sign out');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl sm:p-8">
        <p className="text-sm text-white/65">Loading authentication...</p>
      </section>
    );
  }

  if (user) {
    return (
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl sm:p-8">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/70">Signed in</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{user.name}</h2>
            <p className="mt-1 text-sm text-white/65">{user.email}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/45">{user.provider} account</p>
          </div>
          <div className="flex w-full flex-wrap justify-end gap-3 pt-4 sm:w-auto sm:flex-nowrap sm:gap-4 sm:pt-0">
            <Link
              href="/templates"
              className="inline-flex whitespace-nowrap items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
            >
              Message templates
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={submitting}
              className="inline-flex whitespace-nowrap items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
            >
              Sign out
            </button>
          </div>
        </div>
        {status ? (
          <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
            {status}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.2),transparent_24%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-stretch">
        <div className="space-y-6">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-white/70">
              Secure access
            </p>
            <h1 className="max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              Sign in with email or Google to keep your job pipeline private.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              Email and password always work. Google sign-in is available when OAuth credentials are configured on the backend.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Email + password', 'Create an account or sign in directly'],
              ['Google OAuth', googleEnabled ? 'Configured and ready' : 'Optional — add Google credentials to enable'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-black/15 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-white/60">{description}</p>
              </div>
            ))}
          </div>

          {googleEnabled ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="group w-full rounded-3xl border border-white/10 bg-white/5 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 sm:max-w-sm"
            >
              <span className="mb-4 block h-2 w-16 rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-yellow-200" />
              <p className="text-sm font-semibold text-white">Continue with Google</p>
              <p className="mt-1 text-sm text-white/60">OAuth 2.0 sign-in</p>
            </button>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-white/10 bg-[var(--panel-strong)] p-6 shadow-glow backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
              <p className="mt-1 text-sm text-white/65">
                {isSignup ? 'Use your email and a password.' : 'Sign in with your email and password.'}
              </p>
            </div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  !isSignup ? 'bg-white text-slate-950' : 'text-white/70 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isSignup ? 'bg-white text-slate-950' : 'text-white/70 hover:text-white'
                }`}
              >
                Sign up
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {isSignup ? (
              <label className="grid gap-2 text-sm font-medium text-white/80">
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Morgan"
                  required
                  minLength={2}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-fuchsia-400/60 focus:bg-white/8"
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-medium text-white/80">
              Email address
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="alex@example.com"
                required
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-fuchsia-400/60 focus:bg-white/8"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-white/80">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Enter your password"
                required
                minLength={isSignup ? 8 : 1}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-fuchsia-400/60 focus:bg-white/8"
              />
            </label>
          </div>

          {status ? (
            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
              {status}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-5 py-3.5 text-sm font-semibold text-white transition duration-200 hover:scale-[1.01] hover:shadow-[0_18px_50px_rgba(124,58,237,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
          </button>

          <p className="mt-4 text-center text-sm text-white/55">
            {googleEnabled
              ? 'You can also continue with Google using the button on the left.'
              : 'Google sign-in is optional. Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend to enable it.'}
          </p>
        </form>
      </div>
    </section>
  );
}
