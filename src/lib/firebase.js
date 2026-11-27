import firebase from 'firebase/compat/app'
import 'firebase/compat/auth'
import 'firebase/compat/database'

const config = {
  apiKey: 'AIzaSyDrAUGVJcdSw5A6xyO3Tykjcp1hFFG_dWM',
  authDomain: 'portalapml.firebaseapp.com',
  databaseURL: 'https://portalapml-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'portalapml',
  storageBucket: 'portalapml.firebasestorage.app',
  messagingSenderId: '461187970356',
  appId: '1:461187970356:web:0853422718e6195b74a67d'
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
