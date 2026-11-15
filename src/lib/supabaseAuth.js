import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = new Set(['kundar701@gmail.com', 'kundar.work@gmail.com'])
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null

function allowedUser(user) {
  const email = String(user?.email || '').toLowerCase().trim()
  return Boolean(user && ADMIN_EMAILS.has(email))
}

export function useApmlAdminAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let active = true
    const applySession = async (session) => {
      const nextUser = session?.user || null
      if (nextUser && !allowedUser(nextUser)) {
        await supabase.auth.signOut()
        if (active) setUser(null)
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
        queueMicrotask(() => supabase.auth.signOut())
        return
      }
      setUser(nextUser)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured. Check the Vercel environment variables.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const email = String(user?.email || '').toLowerCase().trim()
  return { admin: allowedUser(user), userEmail: email, loading, signIn, signOut }
}
