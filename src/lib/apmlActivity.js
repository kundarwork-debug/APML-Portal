import { getApmlDatabase } from './firebase'

const ACTIVITY_PATH = 'Analytics page/recent_actions'
const ACTIVITY_LIMIT = 50

export async function logApmlAction({ action, module, item = '', details = '' } = {}) {
  if (!action || !module) return
  try {
    const database = await getApmlDatabase()
    const authUser = window.firebase?.auth?.().currentUser
    const user = authUser?.displayName || authUser?.email || 'Guest'
    const ref = database.ref(ACTIVITY_PATH)
    const key = ref.push().key
    if (!key) return
    await ref.child(key).set({
      action: String(action).slice(0, 80),
      module: String(module).slice(0, 40),
      item: String(item || '').slice(0, 180),
      details: String(details || '').slice(0, 180),
      user: String(user).slice(0, 100),
      timestamp: Date.now()
    })
    const snapshot = await ref.once('value')
    const entries = Object.entries(snapshot.val() || {}).sort(
      (a, b) => Number(b[1]?.timestamp || 0) - Number(a[1]?.timestamp || 0)
    )
    const stale = entries.slice(ACTIVITY_LIMIT)
    if (stale.length) {
      const updates = {}
      stale.forEach(([entryKey]) => { updates[entryKey] = null })
      await ref.update(updates)
    }
  } catch (error) {
    console.warn('APML activity log could not be saved:', error)
  }
}
