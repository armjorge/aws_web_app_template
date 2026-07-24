import { useEffect, useState } from 'react'

import { useAuth } from '../auth/useAuth'
import { env } from '../config/env'
import { apiFetch } from '../lib/api'

type HealthResponse = {
  status: string
  environment: string
  project: string
}

export function HomePage() {
  const { user, signOut } = useAuth()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<HealthResponse>('/health')
      .then(setHealth)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm tracking-[0.18em] uppercase text-[var(--color-muted)]">
          {env.appName}
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-[var(--color-ink)]">
          Hello, world
        </h1>
        <p className="max-w-xl text-lg text-[var(--color-muted)]">
          You are signed in
          {user?.email ? (
            <>
              {' '}
              as <strong className="text-[var(--color-ink)]">{user.email}</strong>
            </>
          ) : null}
          .
        </p>
      </header>

      <section className="space-y-3 border-t border-[var(--color-border)] pt-8">
        <button
          type="button"
          onClick={signOut}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-black/[0.03]"
        >
          Sign out
        </button>
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
