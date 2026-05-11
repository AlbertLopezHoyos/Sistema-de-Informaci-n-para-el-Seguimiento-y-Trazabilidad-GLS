(() => {
  const appEl = document.getElementById("app");

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const params = new URLSearchParams(window.location.search || "");
  const inicial = params.get("codigo") || params.get("c") || "";

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("consultaqr")}
    <main class="main">
      <header class="topbar">
        <div class="topbar-inner">
          <div class="topbar-title">
            <div class="app-name">Consulta de envío</div>
            <div class="company">Por código ENV-YYYY-0001 · consulta rápida del envío por código o desde el QR.</div>
          </div>
        </div>
      </header>
      <div class="content">
        <div id="alert"></div>
        <div class="card">
          <div class="card-title">Código del envío</div>
          <div class="form-row grid grid-2" style="align-items:end">
            <div class="field">
              <label>Código</label>
              <input id="codigo" placeholder="ENV-2026-0001" value="${escapeHtml(inicial)}" />
            </div>
            <div class="actions">
              <button class="btn btn-primary" type="button" id="btnGo">Consultar</button>
              <a class="btn" href="./geolocalizacion-qr.html">Mapa y QR</a>
            </div>
          </div>
        </div>
        <div id="result" class="card" style="margin-top:12px;display:none"></div>
      </div>
    </main>
  `;

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(() => window.GlsMenu?.mountAuthMenu?.());

  const alertEl = document.getElementById("alert");
  const codigoEl = document.getElementById("codigo");
  const resultEl = document.getElementById("result");

  async function buscar() {
    window.GlsAlert.clearAlert(alertEl);
    const codigoEnvio = (codigoEl.value || "").trim();
    if (!codigoEnvio) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: "Ingrese un código válido." });
      return;
    }
    resultEl.style.display = "none";
    const r = await window.glsApi.trazabilidad.buscar(codigoEnvio);
    if (!r?.ok) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "No encontrado." });
      return;
    }
    const e = r.envio;
    const ee = e.evidenciaEntrega;
    resultEl.style.display = "block";
    resultEl.innerHTML = `
      <div class="result-header">
        <div><div class="card-title">Envío <span class="mono code">${escapeHtml(e.codigoEnvio || "")}</span></div>
          <div class="card-subtitle">Estado: <b>${escapeHtml(e.estadoActual || "")}</b></div>
        </div>
      </div>
      <div class="result-grid" style="margin-top:10px">
        <div class="card" style="box-shadow:none">
          <div class="card-title">Ruta</div>
          <div>${escapeHtml(e.origen || "")} → ${escapeHtml(e.destino || "")}</div>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="card-title">Partes</div>
          <div class="muted">Remitente</div>
          <div><b>${escapeHtml(e.remitente?.nombres || "")}</b> · ${escapeHtml(e.remitente?.documento || "")}</div>
          <div class="muted" style="margin-top:8px">Destinatario</div>
          <div><b>${escapeHtml(e.destinatario?.nombres || "")}</b> · ${escapeHtml(e.destinatario?.documento || "")}</div>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="card-title">Cliente catálogo</div>
          ${
            e.clienteAsociado
              ? `<div><b>${escapeHtml(e.clienteAsociado.nombres || "")}</b><br/><span class="mono">${escapeHtml(
                  e.clienteAsociado.documento || ""
                )}</span></div>`
              : `<div class="muted">Sin asociación a catálogo.</div>`
          }
        </div>
      </div>
      ${
        ee?.referencia
          ? `<div class="card" style="margin-top:10px;box-shadow:none">
            <div class="card-title">Evidencia de entrega</div>
            <div>Referencia: <b>${escapeHtml(ee.referencia || "")}</b></div>
            ${ee.detalle ? `<div style="margin-top:6px">${escapeHtml(ee.detalle)}</div>` : ""}
            <div class="muted" style="margin-top:6px;font-size:12px">${escapeHtml(ee.fecha || "")} · ${escapeHtml(
              ee.registradoPor || ""
            )}</div>
          </div>`
          : ""
      }
    `;
  }

  document.getElementById("btnGo").addEventListener("click", buscar);
  codigoEl.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") buscar();
  });
  if (inicial) buscar();
})();
