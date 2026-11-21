import { useCallback, useEffect, useState } from 'react'
import { getApmlAuth } from './firebase'

const ADMIN_EMAILS = new Set(['kundar701@gmail.com', 'kundar.work@gmail.com'])

function isAdminUser(user) {
  const email = String(user?.email || '').toLowerCase().trim()
  return Boolean(user?.emailVerified && ADMIN_EMAILS.has(email))
}

export function useApmlAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let unsubscribe
    getApmlAuth().then(auth => {
      if (!active) return
      unsubscribe = auth.onAuthStateChanged(nextUser => {
        if (!active) return
        setUser(nextUser)
        setLoading(false)
      })
    }).catch(error => {
      console.error('Unable to initialize Firebase sign-in:', error)
      if (active) setLoading(false)
    })
    return () => { active = false; unsubscribe?.() }
  }, [])

  const signIn = useCallback(async () => {
    const auth = await getApmlAuth()
    const provider = new window.firebase.auth.GoogleAuthProvider()
    await auth.signInWithPopup(provider)
  }, [])

  const signOut = useCallback(async () => {
    const auth = await getApmlAuth()
    await auth.signOut()
  }, [])

  const email = String(user?.email || '').toLowerCase().trim()
  return {
    user,
    userEmail: email,
    signedIn: Boolean(user),
    admin: isAdminUser(user),
    loading,
    signIn,
    signOut
  }
}
