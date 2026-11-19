import { useCallback, useEffect, useState } from 'react'
import firebase from 'firebase/compat/app'
import 'firebase/compat/auth'
import { getApmlAuth } from './firebase'

const ADMIN_EMAILS = new Set(['kundar701@gmail.com', 'kundar.work@gmail.com'])

function isApprovedAdmin(user) {
  const email = String(user?.email || '').toLowerCase().trim()
  return Boolean(user && user.emailVerified === true && ADMIN_EMAILS.has(email))
}

export function useApmlAdminAuth() {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getApmlAuth()
    const unsubscribe = auth.onAuthStateChanged(user => {
      setFirebaseUser(user || null)
      setLoading(false)
      if (user && !user.isAnonymous && !isApprovedAdmin(user)) {
        auth.signOut().catch(error => console.error('Unable to clear unapproved APML session:', error))
      }
    })
    return unsubscribe
  }, [])

  const signIn = useCallback(async () => {
    const auth = getApmlAuth()
    const provider = new firebase.auth.GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const credential = await auth.signInWithPopup(provider)
    if (!isApprovedAdmin(credential.user)) {
      await auth.signOut()
      throw new Error('This Google account is not approved for APML Portal administration.')
    }
    return credential
  }, [])

  const signOut = useCallback(async () => {
    await getApmlAuth().signOut()
  }, [])

  const admin = isApprovedAdmin(firebaseUser)
  const email = admin ? String(firebaseUser.email).toLowerCase().trim() : ''
  return { admin, userEmail: email, loading, signIn, signOut }
}

// Public media contributions use a Firebase anonymous session. This keeps uploads
// separate from the restricted Google-admin session and lets database rules validate writes.
export async function ensureApmlAnonymousAuth() {
  const auth = getApmlAuth()
  const current = auth.currentUser
  if (current?.isAnonymous) return current
  if (current) throw new Error('Please sign out of the current account before uploading media.')
  const credential = await auth.signInAnonymously()
  return credential.user
}
