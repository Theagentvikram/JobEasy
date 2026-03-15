import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAxNDUWQYZV5GIvQjePB3ny9pi_r9LbUnE',
  authDomain: 'jobeasy-9.firebaseapp.com',
  projectId: 'jobeasy-9',
  storageBucket: 'jobeasy-9.firebasestorage.app',
  messagingSenderId: '628059225346',
  appId: '1:628059225346:web:9535ef64e550c1d9d3161b',
  measurementId: 'G-X5D5W7TLMY',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export { app }
