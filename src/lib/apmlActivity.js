import { getApmlAuth, getApmlDatabase, getApmlPresenceServices } from './firebase'

const ACTIVITY_PATH = 'Analytics page/recent_actions'
const ACTIVITY_LIMIT = 50

export async function logApmlAction({ action, module, item = '', details = '', fileName = '', folder = '', fileSize = null, fileType = '' } = {}) {
  if (!action || !module) return false
  try {
    // Guest event creation uses the dedicated anonymous Firebase identity.
    // The default app supplies the signed-in user's label and admin pruning.
    const [auth, presence] = await Promise.all([getApmlAuth(), getApmlPresenceServices()])
    const authUser = auth.currentUser
    const user = authUser?.displayName || authUser?.email || 'Guest'
    const ref = presence.database.ref(ACTIVITY_PATH)
    const key = ref.push().key
    if (!key) return false
    await ref.child(key).set({
      action: String(action).slice(0, 80),
      module: String(module).slice(0, 40),
      item: String(item || '').slice(0, 180),
      details: String(details || '').slice(0, 180),
      fileName: String(fileName || '').slice(0, 220),
      folder: String(folder || '').slice(0, 180),
      fileSize: Number.isFinite(Number(fileSize)) && fileSize !== null ? Number(fileSize) : null,
      fileType: String(fileType || '').slice(0, 80),
      user: String(user).slice(0, 100),
      timestamp: Date.now()
    })
    const isAdmin = authUser?.emailVerified && ['kundar.work@gmail.com', 'kundar701@gmail.com'].includes(authUser.email)
    if (isAdmin) {
      const adminDatabase = await getApmlDatabase()
      const adminRef = adminDatabase.ref(ACTIVITY_PATH)
      const snapshot = await adminRef.once('value')
      const entries = Object.entries(snapshot.val() || {}).sort(
        (a, b) => Number(b[1]?.timestamp || 0) - Number(a[1]?.timestamp || 0)
      )
      const stale = entries.slice(ACTIVITY_LIMIT)
      if (stale.length) {
        const updates = {}
        stale.forEach(([entryKey]) => { updates[entryKey] = null })
        await adminRef.update(updates)
      }
    }
    return true
  } catch (error) {
    console.warn('APML activity log could not be saved:', error)
    return false
  }
}
