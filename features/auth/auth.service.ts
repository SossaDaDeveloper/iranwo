import { getSupabaseClient } from '../../lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export type AuthCredentials = {
  email: string
  password: string
}

export async function createPatientAccount({ email, password }: AuthCredentials) {
  if (!email.trim()) throw new Error('Enter your email address.')
  if (password.length < 8) throw new Error('Use a password with at least 8 characters.')

  const { data, error } = await getSupabaseClient().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) throw error
  return data
}

export async function signInPatient({ email, password }: AuthCredentials) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) throw error
  return data
}

export async function signOutPatient() {
  const { error } = await getSupabaseClient().auth.signOut()
  if (error) throw error
}

export async function getCurrentPatient() {
  const { data, error } = await getSupabaseClient().auth.getUser()
  if (error) throw error
  return data.user
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, hasSession: boolean) => void,
) {
  const { data } = getSupabaseClient().auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    callback(event, Boolean(session))
  })

  return () => data.subscription.unsubscribe()
}
