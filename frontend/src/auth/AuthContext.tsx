import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { env, isCognitoConfigured } from '../config/env'
import {
  confirmSignUp,
  getCurrentSession,
  getIdToken,
  sessionToUser,
  signIn,
  signOut as cognitoSignOut,
  signUp,
  type AuthUser,
} from './cognito'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  configured: boolean
  enabled: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  signOut: () => void
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type Props = {
  children: ReactNode
}

export function AuthProvider({ children }: Props) {
  const enabled = env.enableAuth
  const configured = isCognitoConfigured()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(enabled && configured)

  useEffect(() => {
    if (!enabled || !configured) {
      setLoading(false)
      return
    }

    let cancelled = false

    getCurrentSession()
      .then((session) => {
        if (!cancelled && session) {
          setUser(sessionToUser(session))
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, configured])

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const session = await signIn(email, password)
    setUser(sessionToUser(session))
  }, [])

  const handleSignUp = useCallback(async (email: string, password: string) => {
    await signUp(email, password)
  }, [])

  const handleConfirm = useCallback(async (email: string, code: string) => {
    await confirmSignUp(email, code)
  }, [])

  const handleSignOut = useCallback(() => {
    cognitoSignOut()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      enabled,
      signIn: handleSignIn,
      signUp: handleSignUp,
      confirmSignUp: handleConfirm,
      signOut: handleSignOut,
      getAccessToken: getIdToken,
    }),
    [
      user,
      loading,
      configured,
      enabled,
      handleSignIn,
      handleSignUp,
      handleConfirm,
      handleSignOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
