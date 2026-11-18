import firebase from 'firebase/compat/app'
import 'firebase/compat/auth'
import 'firebase/compat/database'

const config = {
  apiKey: 'AIzaSyDgJ6uRCABWxAHOU1bIY4VuA-nQ0zM3aF8',
  authDomain: 'apml-portal.firebaseapp.com',
  databaseURL: 'https://apml-portal-default-rtdb.firebaseio.com',
  projectId: 'apml-portal',
  storageBucket: 'apml-portal.firebasestorage.app',
  messagingSenderId: '479017159240',
  appId: '1:479017159240:web:0853422718e6195b74a67d'
}

export const firebaseApp = firebase.apps.length
  ? firebase.app()
  : firebase.initializeApp(config)

// A few existing portal modules still use the namespaced compat API directly.
// Keep that shared instance available until those call sites are migrated.
if (typeof window !== 'undefined') window.firebase = firebase

export function getApmlDatabase() {
  return firebase.database(firebaseApp)
}

export function getApmlAuth() {
  return firebase.auth(firebaseApp)
}


let presenceFirebaseApp

function getPresenceFirebaseApp() {
  if (presenceFirebaseApp) return presenceFirebaseApp
  presenceFirebaseApp = firebase.apps.find(app => app.name === 'apml-presence')
    || firebase.initializeApp(config, 'apml-presence')
  return presenceFirebaseApp
}

export function getApmlPresenceDatabase() {
  return firebase.database(getPresenceFirebaseApp())
}

export function getApmlPresenceAuth() {
  return firebase.auth(getPresenceFirebaseApp())
}
