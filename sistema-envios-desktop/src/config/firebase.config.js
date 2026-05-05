const { initializeApp, getApps } = require("firebase/app");
const {
  getFirestore,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  deleteDoc,
  writeBatch
} = require("firebase/firestore");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

function getFirebaseApp() {
  if (getApps().length) return getApps()[0];

  const firebaseConfig = {
    apiKey: requireEnv("FIREBASE_API_KEY"),
    authDomain: requireEnv("FIREBASE_AUTH_DOMAIN"),
    projectId: requireEnv("FIREBASE_PROJECT_ID"),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || undefined,
    appId: process.env.FIREBASE_APP_ID || undefined
  };

  return initializeApp(firebaseConfig);
}

function getDb() {
  return getFirestore(getFirebaseApp());
}

module.exports = {
  getFirebaseApp,
  getDb,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  deleteDoc,
  writeBatch
};

