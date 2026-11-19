const config = {
  apiKey: 'AIzaSyDgJ6uRCABWxAHOU1bIY4VuA-nQ0zM3aF8',
  authDomain: 'apml-portal.firebaseapp.com',
  databaseURL: 'https://apml-portal-default-rtdb.firebaseio.com',
  projectId: 'apml-portal',
  storageBucket: 'apml-portal.firebasestorage.app',
  messagingSenderId: '479017159240',
  appId: '1:479017159240:web:0853422718e6195b74a67d'
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
export async function incrementApmlMediaDownload() {
  const { database } = await getApmlPresenceServices()
  const result = await database.ref('analytics/totalMediaDownloads').transaction(
    value => (Number(value) || 0) + 1
  )
  if (!result.committed) throw new Error('Firebase did not commit the media download count.')
  return result.snapshot.val()
}

export async function incrementApmlPdfGenerated() {
  const { database } = await getApmlPresenceServices()
  const result = await database.ref('analytics/totalPdfDownloads').transaction(
    value => (Number(value) || 0) + 1
  )
  if (!result.committed) throw new Error('Firebase did not commit the generated PDF count.')
  return result.snapshot.val()
}
