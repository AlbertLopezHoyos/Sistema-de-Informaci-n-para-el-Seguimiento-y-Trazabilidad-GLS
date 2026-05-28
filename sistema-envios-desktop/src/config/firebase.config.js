const { initializeApp, getApps } = require("firebase/app");
const {
  getFirestore,
  initializeFirestore,
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
const { getStorage } = require("firebase/storage");

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

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  const useLongPolling = String(process.env.FIRESTORE_LONG_POLLING || "1") !== "0";
  try {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: useLongPolling
    });
  } catch {
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

function isStorageConfigured() {
  const bucket = String(process.env.FIREBASE_STORAGE_BUCKET || "").trim();
  return bucket.length > 0 && !/^REEMPLAZAR$/i.test(bucket);
}

function getFirebaseStorage() {
  const app = getFirebaseApp();
  if (!isStorageConfigured()) {
    throw new Error("Configure FIREBASE_STORAGE_BUCKET en .env para subir evidencias a Storage.");
  }
  const bucket = process.env.FIREBASE_STORAGE_BUCKET.trim();
  return getStorage(app, `gs://${bucket.replace(/^gs:\/\//, "")}`);
}

module.exports = {
  getFirebaseApp,
  getDb,
  isStorageConfigured,
  getFirebaseStorage,
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

