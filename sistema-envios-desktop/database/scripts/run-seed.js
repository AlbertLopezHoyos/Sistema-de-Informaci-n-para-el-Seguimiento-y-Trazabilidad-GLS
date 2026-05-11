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
}

run().catch((err) => {
  console.error("[seed] Error:", err);
  process.exitCode = 1;
});

