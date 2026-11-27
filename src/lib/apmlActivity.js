import { getApmlAuth, getApmlDatabase } from './firebase'

const ACTIVITY_PATH = 'analytics/recent_actions'

export async function logApmlAction({ action, module, item = '', details = '', fileName = '', folder = '', fileSize = null, fileType = '' } = {}) {
  if (!action || !module || window.__apmlVisitorVerified !== true) return false
  try {
    const [auth, database] = await Promise.all([getApmlAuth(), getApmlDatabase()])
    const authUser = auth.currentUser
    const user = authUser?.displayName || authUser?.email || 'Guest'
    const ref = database.ref(ACTIVITY_PATH)
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
      timestamp: Date.now(),
      interactionVerified: true
    })
    return true
  } catch (error) {
    console.warn('APML activity log could not be saved:', error)
    return false
  }
}
