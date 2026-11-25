const config = {
  apiKey: 'AIzaSyDrAUGVJcdSw5A6xyO3Tykjcp1hFFG_dWM',
  authDomain: 'portalapml.firebaseapp.com',
  databaseURL: 'https://portalapml-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'portalapml',
  storageBucket: 'portalapml.firebasestorage.app',
  messagingSenderId: '461187970356',
  appId: '1:461187970356:web:e9dfc58a502fd3e04d2161',
  measurementId: 'G-GXLWXXBT7P'
}

const scriptLoads = new Map()
function loadFirebaseScript(src, ready) {
  if (ready()) return Promise.resolve()
  if (!scriptLoads.has(src)) {
    scriptLoads.set(src, new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = resolve
      script.onerror = () => reject(new Error('Unable to load Firebase SDK: ' + src))
      document.head.appendChild(script)
    }))
  }
  return scriptLoads.get(src).then(() => {
    if (!ready()) throw new Error('Firebase SDK did not initialise: ' + src)
  })
}

let databasePromise
let authPromise
let presencePromise
const ANALYTICS_ROOT = 'analytics'

async function loadCore() {
  await loadFirebaseScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js', () => !!window.firebase?.apps)
  await loadFirebaseScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js', () => !!window.firebase?.database)
  const firebase = window.firebase
  const appName = 'portalapml-analytics'
  const app = firebase.apps.find(item => item.name === appName) || firebase.initializeApp(config, appName)
  return { firebase, app, database: firebase.database(app) }
}

export async function getApmlDatabase() {
  if (!databasePromise) databasePromise = loadCore().then(core => core.database).catch(error => {
    databasePromise = null
    throw error
  })
  return databasePromise
}

export async function getApmlAuth() {
  if (!authPromise) authPromise = (async () => {
    const core = await loadCore()
    await loadFirebaseScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js', () => !!window.firebase?.auth)
    return core.firebase.auth(core.app)
  })().catch(error => { authPromise = null; throw error })
  return authPromise
}

export async function getApmlPresenceServices() {
  const database = await getApmlDatabase()
  const auth = await getApmlAuth()
  if (!presencePromise) {
    presencePromise = (async () => {
      const sessionId = (window.crypto?.randomUUID?.() || ('session-' + Date.now() + '-' + Math.random().toString(36).slice(2)))
      const user = auth.currentUser
      const sessionRef = database.ref(ANALYTICS_ROOT + '/active_sessions/' + sessionId)
      const payload = () => ({ online: true, timestamp: Date.now(), user: user?.displayName || user?.email || 'Guest' })
      await sessionRef.onDisconnect().remove()
      await sessionRef.set(payload())
      const heartbeat = window.setInterval(() => { sessionRef.update(payload()).catch(error => console.warn('APML presence heartbeat failed:', error)) }, 30000)
      window.addEventListener('beforeunload', () => { window.clearInterval(heartbeat); sessionRef.remove().catch(() => {}) }, { once: true })
      return true
    })().catch(error => { presencePromise = null; throw error })
  }
  await presencePromise
  return { database, auth }
}

function indiaDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const get = type => parts.find(part => part.type === type)?.value || ''
  return get('year') + '-' + get('month') + '-' + get('day')
}

async function incrementCounter(path) {
  const database = await getApmlDatabase()
  const date = indiaDateKey()
  await Promise.all([
    database.ref(ANALYTICS_ROOT + '/' + path + '/daily/' + date).transaction(value => (Number(value) || 0) + 1),
    database.ref(ANALYTICS_ROOT + '/' + path + '/lifetime').transaction(value => (Number(value) || 0) + 1)
  ])
  return true
}

export function incrementApmlPdfGenerated() {
  return incrementCounter('pdf_generation')
}

export function incrementApmlMediaDownload() {
  return incrementCounter('media_downloads')
}
