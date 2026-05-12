const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const { getDb, doc, getDoc } = require("../../src/config/firebase.config");

async function main() {
  const db = getDb();
  const snap = await getDoc(doc(db, "meta", "seed"));
  const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim() || "(sin FIREBASE_PROJECT_ID en .env)";
  console.log("[db:ping] Firebase OK · proyecto:", projectId);
  console.log("[db:ping] meta/seed:", snap.exists() ? "documento presente" : "sin documento (normal antes del primer seed)");
}

main().catch((err) => {
  console.error("[db:ping] Error:", err?.message || err);
  process.exitCode = 1;
});
