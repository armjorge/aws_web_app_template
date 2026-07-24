import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { env } from '../config/env'
import { apiFetch } from '../lib/api'

type HealthResponse = {
  status: string
  environment: string
  project: string
}

export function HomePage() {
  const { user, enabled, configured, signOut } = useAuth()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<HealthResponse>('/health')
      .then(setHealth)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="space-y-3">
        <p className="text-sm tracking-[0.18em] uppercase text-[var(--color-muted)]">
          Serverless template
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-5xl">
          {env.appName}
        </h1>
        <p className="max-w-xl text-lg text-[var(--color-muted)]">
          Vite + React frontend, FastAPI on Lambda, Cognito auth, and S3/CloudFront
          with Origin Access Control.
        </p>
      </header>

      <section className="space-y-4 border-t border-[var(--color-border)] pt-8">
        <h2 className="text-xl font-medium">Session</h2>
        {!enabled && (
          <p className="text-[var(--color-muted)]">Auth is disabled via VITE_ENABLE_AUTH.</p>
        )}
        {enabled && !configured && (
          <p className="text-[var(--color-muted)]">
            Cognito env vars are missing. Copy values from{' '}
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm">tofu output</code> into{' '}
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm">.env</code>.
          </p>
        )}
        {user ? (
          <div className="flex flex-wrap items-center gap-4">
            <p>
              Signed in as <strong>{user.email}</strong>
            </p>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
            >
              Sign out
            </button>
          </div>
        ) : (
          enabled &&
          configured && (
            <div className="flex gap-3">
              <Link
                to="/login"
                className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white no-underline hover:bg-[var(--color-accent-hover)]"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] no-underline"
              >
                Create account
              </Link>
            </div>
          )
        )}
      </section>

      <section className="space-y-3 border-t border-[var(--color-border)] pt-8">
        <h2 className="text-xl font-medium">API health</h2>
        {error && <p className="text-red-700">{error}</p>}
        {health && (
          <pre className="overflow-x-auto rounded-md bg-black/[0.04] p-4 text-sm">
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
      </section>
    </main>
  )
}
