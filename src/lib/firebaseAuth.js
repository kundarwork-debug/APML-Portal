import { useCallback, useEffect, useState } from 'react'
import { getApmlAuth } from './firebase'
import { driveAlert } from './sweetalert'

const ADMIN_EMAILS = new Set(['kundar701@gmail.com', 'kundar.work@gmail.com'])

function allowedUser(user) {
  const email = String(user?.email || '').toLowerCase().trim()
  return Boolean(user && ADMIN_EMAILS.has(email))
}

let unauthorizedNoticeInProgress = false

async function rejectUnauthorizedUser(auth) {
  if (unauthorizedNoticeInProgress) return
  unauthorizedNoticeInProgress = true
  try {
    await auth.signOut()
  } catch (error) {
    console.error('Unable to clear unauthorized APML session:', error)
  }
  const message = 'This Google account is not approved for APML Portal administration. Access has been denied.'
  try {
    await driveAlert('Login Restricted', message, 'error')
  } catch {
    window.alert(`Login Restricted. ${message}`)
  } finally {
    unauthorizedNoticeInProgress = false
  }
}

export function useApmlAdminAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [auth, setAuth] = useState(null)

  useEffect(() => {
    let active = true
    let unsubscribe = null

    getApmlAuth().then(async (instance) => {
      if (!active) return
      setAuth(instance)
      await instance.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL)
      unsubscribe = instance.onAuthStateChanged(async (nextUser) => {
        if (!active) return
        if (nextUser && !allowedUser(nextUser)) {
          setUser(null)
          await rejectUnauthorizedUser(instance)
          if (active) setLoading(false)
          return
        }
        setUser(nextUser || null)
        setLoading(false)
      })
    }).catch((error) => {
      console.error('Unable to initialise Firebase administrator authentication:', error)
      if (active) setLoading(false)
    })

    return () => {
      active = false
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const signIn = useCallback(async () => {
    const instance = auth || await getApmlAuth()
    const provider = new window.firebase.auth.GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await instance.signInWithPopup(provider)
  }, [auth])

  const signOut = useCallback(async () => {
    const instance = auth || await getApmlAuth()
    await instance.signOut()
  }, [auth])

  const email = String(user?.email || '').toLowerCase().trim()
  return { admin: allowedUser(user), userEmail: email, loading, signIn, signOut }
}
