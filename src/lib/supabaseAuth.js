import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { driveAlert } from './sweetalert'
import firebase from 'firebase/compat/app'
import 'firebase/compat/auth'
import { getApmlAuth } from './firebase'

const ADMIN_EMAILS = new Set(['kundar701@gmail.com', 'kundar.work@gmail.com'])
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null

let unauthorizedNoticeInProgress = false

async function rejectUnauthorizedUser() {
  if (unauthorizedNoticeInProgress) return
  unauthorizedNoticeInProgress = true
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Unable to clear unauthorized APML session:', error)
  }
  const message = 'Your sign-in was successful, but this Google account is not approved for APML Portal administration. Your access has been denied.'
  try {
    await driveAlert('Login Restricted', message, 'error')
  } catch {
    window.alert(`Login Restricted. ${message}`)
  } finally {
    unauthorizedNoticeInProgress = false
  }
}

function allowedUser(user) {
  const email = String(user?.email || '').toLowerCase().trim()
  return Boolean(user && ADMIN_EMAILS.has(email))
}

export function useApmlAdminAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [firebaseUser, setFirebaseUser] = useState(null)

  useEffect(() => {
    const firebaseAuth = getApmlAuth()
    const firebaseSubscription = firebaseAuth.onAuthStateChanged(setFirebaseUser)
    if (!supabase) {
      setLoading(false)
      return () => firebaseSubscription()
    }

    let active = true
    const applySession = async (session) => {
      const nextUser = session?.user || null
      if (nextUser && !allowedUser(nextUser)) {
        if (active) setUser(null)
        await rejectUnauthorizedUser()
        return
      }
      if (active) setUser(nextUser)
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      return applySession(data.session)
    }).catch((error) => {
      console.error('Unable to restore APML admin session:', error)
      if (active) setUser(null)
    }).finally(() => {
      if (active) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null
      if (nextUser && !allowedUser(nextUser)) {
        setUser(null)
        queueMicrotask(() => rejectUnauthorizedUser())
        return
      }
      setUser(nextUser)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
      firebaseSubscription()
    }
  }, [])

  const signIn = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured. Check the Vercel environment variables.')
    const firebaseAuth = getApmlAuth()
    const credential = await firebaseAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    if (!allowedUser(credential.user)) {
      await firebaseAuth.signOut()
      throw new Error('This Google account is not approved for APML Portal administration.')
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    })
    if (error) {
      await firebaseAuth.signOut()
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    const firebaseAuth = getApmlAuth()
    const results = await Promise.all([
      supabase ? supabase.auth.signOut() : Promise.resolve({ error: null }),
      firebaseAuth.signOut()
    ])
    const error = results.find(result => result?.error)?.error
    if (error) throw error
  }, [])

  const email = String(user?.email || '').toLowerCase().trim()
  const firebaseEmail = String(firebaseUser?.email || '').toLowerCase().trim()
  const admin = allowedUser(user) && allowedUser(firebaseUser) && email === firebaseEmail && firebaseUser.emailVerified === true
  return { admin, userEmail: email, loading, signIn, signOut }
}
