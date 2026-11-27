const config = {
  apiKey: 'AIzaSyDrAUGVJcdSw5A6xyO3Tykjcp1hFFG_dWM',
  authDomain: 'portalapml.firebaseapp.com',
  databaseURL: 'https://portalapml-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'portalapml',
  storageBucket: 'portalapml.firebasestorage.app',
  messagingSenderId: '461187970356',
  appId: '1:461187970356:web:0853422718e6195b74a67d'
}

const scriptLoads = new Map()

function loadFirebaseScript(src, ready) {
  if (ready()) return Promise.resolve()

  if (!scriptLoads.has(src)) {
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = resolve
      script.onerror = () => reject(new Error(`Unable to load Firebase SDK: ${src}`))
      document.head.appendChild(script)
    })
    scriptLoads.set(src, promise)
  }

  return scriptLoads.get(src).then(() => {
    if (!ready()) throw new Error(`Firebase SDK did not initialise: ${src}`)
  })
}

export async function getApmlDatabase() {
  await loadFirebaseScript(
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    () => !!window.firebase?.apps
  )
  await loadFirebaseScript(
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
    () => !!window.firebase?.database
  )

  if (!window.firebase.apps.length) window.firebase.initializeApp(config)
  return window.firebase.database()
}


export async function getApmlAuth() {
  await getApmlDatabase()
  await loadFirebaseScript(
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
    () => !!window.firebase?.auth
  )
  return window.firebase.auth()
}

export async function getApmlPresenceServices() {
  await getApmlDatabase()
  await loadFirebaseScript(
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
    () => !!window.firebase?.auth
  )

  const firebase = window.firebase
  const appName = 'apml-presence'
  const app = firebase.apps.find(existing => existing.name === appName)
    || firebase.initializeApp(config, appName)
  const auth = firebase.auth(app)

  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    throw new Error('The APML presence auth instance has a non-anonymous user.')
  }

  if (!auth.currentUser) await auth.signInAnonymously()
  const user = auth.currentUser
  if (!user?.isAnonymous || !user.uid) {
    throw new Error('Firebase did not create an anonymous user for presence.')
  }

  return { database: firebase.database(app), user }
}
function istDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return values.year + '-' + values.month + '-' + values.day
}

// ANALYTICS DATA CONTRACT
// The Analytics page's source of truth is the Firebase node "Analytics page".
// Every metric rendered by src/pages/Analytics.jsx must have a real writer here
// (or in a documented event logger) and be stored under that node.
// The lowercase "analytics" paths are compatibility mirrors for the existing
// homepage and Cloudflare Worker. Do not build new dashboard cards from them.
export async function ensureApmlAnalyticsStructure(database) {
  const root = database.ref('Analytics page')
  const meta = await root.child('_meta').once('value')
  if (Number(meta.val()?.schemaVersion) >= 1) return

  const [legacyDaily, legacyPdf, legacyMedia] = await Promise.all([
    database.ref('analytics/daily_logs').once('value'),
    database.ref('analytics/totalPdfDownloads').once('value'),
    database.ref('analytics/totalMediaDownloads').once('value')
  ])
  const days = legacyDaily.val() || {}
  await Promise.all(Object.entries(days).map(([day, value]) => {
    const clean = { pdf: Number(value?.pdf) || 0, media: Number(value?.media) || 0 }
    return root.child('daily_logs/' + day).transaction(current => ({ ...clean, ...(current || {}) }))
  }))
  await Promise.all([
    ['pdfGenerated', legacyPdf.val()],
    ['mediaDownloads', legacyMedia.val()]
  ].map(([key, value]) => root.child('lifetime_totals/' + key)
    .transaction(current => current == null ? (Number(value) || 0) : current)))

  await root.child('_meta').update({
    schemaVersion: 1,
    timezone: 'Asia/Kolkata',
    createdAt: Date.now(),
    description: 'Source of truth for all metrics displayed on the APML Analytics page.'
  })
}

async function incrementAnalyticsCounter(database, lifetimeKey, legacyLifetimePath, dailyField, label) {
  const day = istDateKey()
  const canonicalLifetime = database.ref('Analytics page/lifetime_totals/' + lifetimeKey)
  const canonicalDaily = database.ref('Analytics page/daily_logs/' + day + '/' + dailyField)
  const legacyLifetime = database.ref(legacyLifetimePath)
  const legacyDaily = database.ref('analytics/daily_logs/' + day + '/' + dailyField)

  const canonical = await Promise.allSettled([
    canonicalLifetime.transaction(value => (Number(value) || 0) + 1),
    canonicalDaily.transaction(value => (Number(value) || 0) + 1)
  ])
  if (canonical.some(result => result.status !== 'fulfilled' || !result.value.committed)) {
    const reasons = canonical.filter(result => result.status === 'rejected')
      .map(result => result.reason?.message || String(result.reason))
    throw new Error(label + ' analytics update failed' + (reasons.length ? ': ' + reasons.join('; ') : '.'))
  }

  // Keep the legacy mirrors in sync for the homepage and Worker report endpoint.
  const legacy = await Promise.allSettled([
    legacyLifetime.transaction(value => (Number(value) || 0) + 1),
    legacyDaily.transaction(value => (Number(value) || 0) + 1)
  ])
  if (legacy.some(result => result.status !== 'fulfilled' || !result.value.committed)) {
    console.warn(label + ' legacy analytics mirror update incomplete; canonical Analytics page data was saved.')
  }
  return canonical[0].value.snapshot.val()
}

export async function incrementApmlMediaDownload() {
  const { database } = await getApmlPresenceServices()
  await ensureApmlAnalyticsStructure(database)
  return incrementAnalyticsCounter(database, 'mediaDownloads', 'analytics/totalMediaDownloads', 'media', 'Media download')
}

export async function incrementApmlPdfGenerated() {
  const { database } = await getApmlPresenceServices()
  await ensureApmlAnalyticsStructure(database)
  return incrementAnalyticsCounter(database, 'pdfGenerated', 'analytics/totalPdfDownloads', 'pdf', 'Generated PDF')
}
