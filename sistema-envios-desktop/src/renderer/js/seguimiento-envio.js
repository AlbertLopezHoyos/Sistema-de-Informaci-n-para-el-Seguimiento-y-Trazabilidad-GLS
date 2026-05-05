(() => {
  const appEl = document.getElementById("app");
  const ICONS = {
    search:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke="currentColor" stroke-width="1.8"/><path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    status:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12h6l2-5 3 10 2-5h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    truck:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7.5c0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5V16H3V7.5Z" stroke="currentColor" stroke-width="1.8"/><path d="M15 10h3.6c.36 0 .7.16.92.45l1.48 1.96c.19.25.3.56.3.88V16H15v-6Z" stroke="currentColor" stroke-width="1.8"/><path d="M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM18 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" stroke-width="1.8"/><path d="M3 16h12" stroke="currentColor" stroke-width="1.8"/></svg>'
  };

  function renderTopbar() {
    return `
      <header class="topbar">
        <div class="topbar-inner">
          <div class="topbar-title">
            <div class="app-name">Sistema de Información para el Seguimiento y Trazabilidad de Envíos en el Área de Operaciones</div>
            <div class="company">GRUPO LOGÍSTICO SALAZAR S.A.C. · Área de Operaciones – Gestión de información logística</div>
          </div>
          <div class="area-pill"><span style="color:var(--accent)">●</span> Operaciones</div>
        </div>
      </header>
    `;
  }

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("seguimiento")}
    <main class="main">
      ${renderTopbar()}
      <div class="content">
      <div class="page-head">
        <div>
          <div class="page-title">Seguimiento / Trazabilidad</div>
          <div class="page-subtitle">Lista en tiempo real de envíos activos + detalle e historial por envío.</div>
        </div>
        <div class="actions">
          <a class="btn btn-primary btn-icon" href="./registro-envio.html"><span class="ico">${ICONS.truck}</span>Nuevo envío</a>
        </div>
      </div>

      <div id="alert"></div>

      <div class="grid" style="grid-template-columns: 420px 1fr; align-items:start">
        <div class="card">
          <div class="card-title">Envíos activos (tiempo real)</div>
          <div class="card-subtitle">Se muestran automáticamente: Registrado, En tránsito, En reparto, Observado.</div>

          <div class="actions" style="margin-bottom:10px">
            <input id="filter" placeholder="Buscar por código / origen / destino / estado" class="w-100" />
            <span class="muted" id="status"></span>
          </div>

          <div style="max-height: 520px; overflow:auto; border-radius: 12px; border:1px solid var(--border)">
            <table class="table" style="border:none; border-radius:0; box-shadow:none">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Origen → Destino</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody id="listBody">
                <tr><td colspan="3" class="muted">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
          <div class="hint" style="margin-top:10px">
            Tip: haz clic en un envío para ver su detalle y línea de tiempo.
          </div>
        </div>

        <div id="result" class="grid"></div>
      </div>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");
  const resultEl = document.getElementById("result");
  const filterEl = document.getElementById("filter");
  const listBodyEl = document.getElementById("listBody");
  const statusEl = document.getElementById("status");

  let enviosActivos = [];
  let unsubscribe = null;

  function setBusy(busy, text) {
    statusEl.textContent = text || "";
  }

  async function loadEstados() {
    const r = await window.glsApi.trazabilidad.listarEstados();
    if (!r?.ok) return ["Registrado", "En tránsito", "En reparto", "Entregado", "Observado", "Cancelado"];
    return (r.estados || []).map((e) => e.estado || e.nombre || e.id).filter(Boolean);
  }

  function badgeForEstado(estado) {
    const e = (estado || "").toLowerCase();
    if (e.includes("entregado")) return "badge ok";
    if (e.includes("cancel")) return "badge danger";
    if (e.includes("observ")) return "badge warn";
    return "badge";
  }

  function renderResult({ envio, historial, estados }) {
    const estadoActual = envio?.estadoActual || "—";
    const timelineItems = (historial || [])
      .slice()
      .reverse()
      .map((h) => {
        return `
          <div class="t-item">
            <div class="t-top">
              <div class="t-state">${escapeHtml(h.estado || "")}</div>
              <div class="t-meta mono">${escapeHtml(h.fechaActualizacion || "")}</div>
            </div>
            <div class="t-meta">${escapeHtml(h.responsable || "")}</div>
            ${h.observacion ? `<div class="t-obs">${escapeHtml(h.observacion)}</div>` : ""}
          </div>
        `;
      })
      .join("");
    const historialRows = (historial || [])
      .map(
        (h) => `
        <tr>
          <td><span class="mono">${escapeHtml(h.fechaActualizacion || "")}</span></td>
          <td>${escapeHtml(h.estado || "")}</td>
          <td>${escapeHtml(h.observacion || "")}</td>
          <td>${escapeHtml(h.responsable || "")}</td>
        </tr>
      `
      )
      .join("");

    const estadoOptions = estados
      .map((e) => `<option value="${escapeHtml(e)}" ${e === estadoActual ? "selected" : ""}>${escapeHtml(e)}</option>`)
      .join("");

    resultEl.innerHTML = `
      <div class="card">
        <div class="result-header">
          <div>
            <div class="card-title">Envío <span class="mono code">${escapeHtml(envio.codigoEnvio || "")}</span></div>
            <div class="card-subtitle">
              Origen: <b>${escapeHtml(envio.origen || "")}</b> · Destino: <b>${escapeHtml(envio.destino || "")}</b>
            </div>
          </div>
          <div class="${badgeForEstado(estadoActual)}">Estado actual: <b>${escapeHtml(estadoActual)}</b></div>
        </div>

        <div class="result-grid">
          <div class="card" style="box-shadow:none">
            <div class="card-title">Cliente</div>
            <div class="muted">Remitente</div>
            <div><b>${escapeHtml(envio.remitente?.nombres || "")}</b> · ${escapeHtml(envio.remitente?.documento || "")}</div>
            <div class="muted" style="margin-top:10px">Destinatario</div>
            <div><b>${escapeHtml(envio.destinatario?.nombres || "")}</b> · ${escapeHtml(envio.destinatario?.documento || "")}</div>
          </div>
          <div class="card" style="box-shadow:none">
            <div class="card-title">Carga</div>
            <div>Tipo: <b>${escapeHtml(envio.tipoCarga || "")}</b></div>
            <div>Descripción: <b>${escapeHtml(envio.descripcion || "")}</b></div>
            <div>Peso: <b>${escapeHtml(String(envio.peso ?? ""))}</b> kg</div>
            ${
              envio.dimensiones
                ? `<div style="margin-top:10px">Dimensiones: <b>${escapeHtml(String(envio.dimensiones.largo ?? ""))} × ${escapeHtml(
                    String(envio.dimensiones.ancho ?? "")
                  )} × ${escapeHtml(String(envio.dimensiones.alto ?? ""))}</b> <span class="mono">${escapeHtml(
                    envio.dimensiones.unidadMedida || ""
                  )}</span></div>`
                : ""
            }
          </div>
          ${
            envio.cotizacionEstimada?.desglose
              ? `<div class="card" style="box-shadow:none">
            <div class="card-title">Cotización estimada</div>
            <div class="muted">Referencia interna al registrar el envío.</div>
            <div style="margin-top:10px">
              Total: <b>${escapeHtml(String(envio.cotizacionEstimada.desglose.totalEstimado))}</b>
              ${escapeHtml(envio.cotizacionEstimada.moneda || "")}
            </div>
            <div class="muted" style="margin-top:6px; font-size:12px">
              Subtotal ${escapeHtml(String(envio.cotizacionEstimada.desglose.subtotal))} · Seguro
              ${escapeHtml(String(envio.cotizacionEstimada.desglose.seguroMonto))}
              (${escapeHtml(String(envio.cotizacionEstimada.desglose.seguroPorcentaje))}%)
            </div>
          </div>`
              : `<div class="card" style="box-shadow:none"><div class="muted">Sin cotización en el registro inicial.</div></div>`
          }
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Actualizar estado</div>
          <div class="form-row">
            <div class="field"><label>Estado</label><select id="estadoSel">${estadoOptions}</select></div>
            <div class="field"><label>Observación</label><textarea id="obs" placeholder="Detalle del cambio de estado..."></textarea></div>
            <div class="actions">
              <button class="btn btn-primary btn-icon" id="btnActualizar"><span class="ico">${ICONS.status}</span>Guardar cambio</button>
              <span class="muted" id="status2"></span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Línea de tiempo</div>
          <div class="card-subtitle">Estados registrados (último arriba).</div>
          <div class="timeline">${timelineItems || `<div class="muted">Sin historial</div>`}</div>
          <div class="divider"></div>
          <details>
            <summary class="muted" style="cursor:pointer; font-weight:800">Ver historial en tabla</summary>
            <div style="margin-top:10px">
              <table class="table">
                <thead>
                  <tr><th>Fecha</th><th>Estado</th><th>Observación</th><th>Responsable</th></tr>
                </thead>
                <tbody>${historialRows || `<tr><td colspan="4" class="muted">Sin historial</td></tr>`}</tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
    `;

    const btnActualizar = document.getElementById("btnActualizar");
    const estadoSel = document.getElementById("estadoSel");
    const obs = document.getElementById("obs");
    const status2 = document.getElementById("status2");

    btnActualizar.addEventListener("click", async () => {
      window.GlsAlert.clearAlert(alertEl);
      btnActualizar.disabled = true;
      status2.textContent = "Actualizando...";
      try {
        const r = await window.glsApi.trazabilidad.actualizarEstado({
          codigoEnvio: envio.codigoEnvio,
          estado: estadoSel.value,
          observacion: obs.value,
          responsable: "Área de operaciones"
        });
        if (!r?.ok) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "No se pudo actualizar" });
          btnActualizar.disabled = false;
          status2.textContent = "";
          return;
        }
        status2.textContent = "Listo.";
        renderResult({ envio: r.envio, historial: r.historial, estados });
      } catch (e) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
        btnActualizar.disabled = false;
        status2.textContent = "";
      }
    });
  }

  async function buscarPorCodigo(codigoEnvio) {
    codigoEnvio = (codigoEnvio || "").trim();
    if (!codigoEnvio) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: "Ingresa un código ENV-YYYY-0001" });
      return;
    }
    window.GlsAlert.clearAlert(alertEl);
    resultEl.innerHTML = "";
    setBusy(true, "Buscando...");
    try {
      const [res, estados] = await Promise.all([
        window.glsApi.trazabilidad.buscar(codigoEnvio),
        loadEstados()
      ]);
      if (!res?.ok) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: res?.error || "No encontrado" });
        setBusy(false);
        return;
      }
      renderResult({ envio: res.envio, historial: res.historial, estados });
      setBusy(false, "Listo.");
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
      setBusy(false);
    }
  }

  function normalize(s) {
    return String(s || "").toLowerCase().trim();
  }

  function renderLista() {
    const q = normalize(filterEl.value);
    const filtered = !q
      ? enviosActivos
      : enviosActivos.filter((e) => {
          const hay = [
            e.codigoEnvio,
            e.origen,
            e.destino,
            e.estadoActual
          ]
            .map(normalize)
            .join(" ");
          return hay.includes(q);
        });

    if (!filtered.length) {
      listBodyEl.innerHTML = `<tr><td colspan="3" class="muted">No hay envíos activos que coincidan.</td></tr>`;
      return;
    }

    listBodyEl.innerHTML = filtered
      .map((e) => {
        const estado = e.estadoActual || "—";
        const route = `${escapeHtml(e.origen || "")} → ${escapeHtml(e.destino || "")}`;
        return `
          <tr data-code="${escapeHtml(e.codigoEnvio || "")}" style="cursor:pointer">
            <td class="mono"><b>${escapeHtml(e.codigoEnvio || "")}</b></td>
            <td>${route}</td>
            <td><span class="${badgeForEstado(estado)}">${escapeHtml(estado)}</span></td>
          </tr>
        `;
      })
      .join("");
  }

  listBodyEl.addEventListener("click", (ev) => {
    const tr = ev.target?.closest?.("tr[data-code]");
    const code = tr?.dataset?.code;
    if (code) buscarPorCodigo(code);
  });

  filterEl.addEventListener("input", () => renderLista());

  function startRealtime() {
    setBusy(true, "Conectando...");
    unsubscribe = window.glsApi.envios.subscribeActivos((payload) => {
      if (!payload?.ok) {
        setBusy(false, "Error");
        window.GlsAlert.showAlert(alertEl, { type: "error", message: payload?.error || "Error cargando envíos activos" });
        return;
      }
      enviosActivos = payload.envios || [];
      setBusy(false, `Activos: ${enviosActivos.length}`);
      renderLista();

      // Auto-selección del primero si no hay detalle cargado
      if (!resultEl.innerHTML.trim() && enviosActivos.length) {
        buscarPorCodigo(enviosActivos[0].codigoEnvio);
      }
    }, 200);
  }

  window.addEventListener("beforeunload", () => {
    try { unsubscribe?.(); } catch {}
  });

  startRealtime();

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();

