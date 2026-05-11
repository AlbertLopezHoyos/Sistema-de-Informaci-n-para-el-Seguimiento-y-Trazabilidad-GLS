const { getDb, doc, setDoc, getDoc } = require("../../src/config/firebase.config");
const { nowIso } = require("../../src/utils/fechas");

function docIdCliente(documento) {
  const d = String(documento || "").trim();
  return `cli_${d.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

/**
 * Clientes de operación real (no etiquetas “demo”): catálogo base para envíos y pruebas.
 * Idempotente: merge por documento determinista.
 */
module.exports = async function seedClientesOperativos() {
  console.log("[seed] 04-seed-clientes-operativos");
  const db = getDb();
  const t = nowIso();

  const clientes = [
    {
      nombres: "Importadora Nuevo Mundo S.A.C.",
      documento: "20508910234",
      telefono: "+51 1 427 8811",
      direccion: "Av. Argentina 4798, Urb. Faucett, Callao",
      empresa: "Importadora Nuevo Mundo S.A.C."
    },
    {
      nombres: "Agroindustrial Huarmey S.A.",
      documento: "20100070991",
      telefono: "+51 43 421090",
      direccion: "Carretera Panamericana Norte Km 288, Huarmey, Áncash",
      empresa: "Agroindustrial Huarmey S.A."
    },
    {
      nombres: "Distribuidora Pacífico Sur E.I.R.L.",
      documento: "20608881234",
      telefono: "+51 54 282611",
      direccion: "Calle Dean Valdivia 148, Arequipa",
      empresa: "Distribuidora Pacífico Sur E.I.R.L."
    },
    {
      nombres: "Rosa María Fernández Quispe",
      documento: "10756489321",
      telefono: "+51 987 452 110",
      direccion: "Jr. Huánuco 1120, Breña, Lima",
      empresa: ""
    }
  ];

  for (const c of clientes) {
    const id = docIdCliente(c.documento);
    const ref = doc(db, "clientes", id);
    const snap = await getDoc(ref);
    const fechaAlta = snap.exists() ? snap.data()?.fechaAlta || t : t;
    await setDoc(
      ref,
      {
        ...c,
        fechaAlta,
        fechaActualizacion: t
      },
      { merge: true }
    );
    console.log(`[seed]   cliente ${id}`);
  }
};
