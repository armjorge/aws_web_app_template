import { useEffect, type ReactNode } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

import { env } from '../config/env'

type Props = {
  children: ReactNode
}

/**
 * Global analytics wrapper. When VITE_ENABLE_ANALYTICS is false or
 * VITE_POSTHOG_KEY is empty, children render without initializing PostHog.
 */
export function PostHogProvider({ children }: Props) {
  const enabled = env.enableAnalytics && Boolean(env.posthogKey)

  useEffect(() => {
    if (!enabled) return

    posthog.init(env.posthogKey, {
      api_host: env.posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
    })
  }, [enabled])

  if (!enabled) {
    return <>{children}</>
  }

  return <PHProvider client={posthog}>{children}</PHProvider>
}
