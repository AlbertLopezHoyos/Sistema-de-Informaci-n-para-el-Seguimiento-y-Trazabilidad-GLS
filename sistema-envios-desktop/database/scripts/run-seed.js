const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

async function run() {
  console.log("[seed] Iniciando...");
  const steps = [
    require("./01-create-collections"),
    require("./02-seed-estados-envio"),
    require("./03-seed-usuarios"),
    require("./04-seed-clientes-operativos"),
    require("./06-seed-envios-operativos")
  ];

  for (const step of steps) {
    if (typeof step !== "function") continue;
    await step();
  }

  console.log("[seed] Completado.");
  console.log("");
  console.log("[seed] Inicio de sesión en la app (valores por defecto del seed de usuarios):");
  console.log("       Admin:         admin@gls.pe          /  admin1234");
  console.log("       Operaciones:   operaciones@gls.pe    /  Operaciones2026");
  console.log("       Si definió ADMIN_SEED_* u OPERACIONES_SEED_* en .env, use: npm run seed:users");
  console.log("");
  console.log("[seed] Envíos de ejemplo: ENV-{año}-0001 … 0008 (ver database/scripts/README.md).");
}

run().catch((err) => {
  console.error("[seed] Error:", err);
  process.exitCode = 1;
});

