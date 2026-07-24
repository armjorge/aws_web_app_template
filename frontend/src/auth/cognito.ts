import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js'

import { env, isCognitoConfigured } from '../config/env'

export type AuthUser = {
  email: string
  sub: string
}

function getUserPool(): CognitoUserPool {
  if (!isCognitoConfigured()) {
    throw new Error(
      'Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID.',
    )
  }

  return new CognitoUserPool({
    UserPoolId: env.cognitoUserPoolId,
    ClientId: env.cognitoClientId,
  })
}

function getCognitoUser(email: string): CognitoUser {
  return new CognitoUser({
    Username: email,
    Pool: getUserPool(),
  })
}

export function getCurrentSession(): Promise<CognitoUserSession | null> {
  if (!isCognitoConfigured()) return Promise.resolve(null)

  const user = getUserPool().getCurrentUser()
  if (!user) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err) {
        reject(err)
        return
      }
      resolve(session?.isValid() ? session : null)
    })
  })
}

export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession()
  return session?.getIdToken().getJwtToken() ?? null
}

export function signUp(email: string, password: string): Promise<void> {
  const attributeList = [
    new CognitoUserAttribute({ Name: 'email', Value: email }),
  ]

  return new Promise((resolve, reject) => {
    getUserPool().signUp(email, password, attributeList, [], (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  const user = getCognitoUser(email)

  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

export function signIn(email: string, password: string): Promise<CognitoUserSession> {
  const user = getCognitoUser(email)
  const details = new AuthenticationDetails({
    Username: email,
    Password: password,
  })

  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(err),
    })
  })
}

export function signOut(): void {
  if (!isCognitoConfigured()) return
  getUserPool().getCurrentUser()?.signOut()
}

export function sessionToUser(session: CognitoUserSession): AuthUser {
  const payload = session.getIdToken().decodePayload()
  return {
    email: String(payload.email ?? ''),
    sub: String(payload.sub ?? ''),
  }
}
