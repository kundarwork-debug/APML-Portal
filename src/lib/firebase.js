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
  appId: '1:461187970356:web:e9dfc58a502fd3e04d2161',
  measurementId: 'G-GXLWXXBT7P'
}

export const firebaseApp = firebase.apps.find(app => app.name === 'portalapml-feature')
  || firebase.initializeApp(config, 'portalapml-feature')

// Keep the shared compat instance available to legacy call sites in this branch.
if (typeof window !== 'undefined') window.firebase = firebase

export function getApmlDatabase() {
  return firebase.database(firebaseApp)
}

export function getApmlAuth() {
  return firebase.auth(firebaseApp)
}
