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
