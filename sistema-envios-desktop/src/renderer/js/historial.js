(() => {
  const appEl = document.getElementById("app");

  const ICONS = {
    refresh:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12a8 8 0 0 1 14-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18 2v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 12a8 8 0 0 1-14 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 22v-5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke="currentColor" stroke-width="1.8"/><path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
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

  const ESTADOS = [
    "Todos",
    "Registrado",
    "En tránsito",
    "En reparto",
    "Entregado",
    "Observado",
    "Cancelado"
  ];

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("historial")}
    <main class="main">
      ${renderTopbar()}
      <div class="content">
        <div class="page-head">
          <div>
            <div class="page-title">Historial general</div>
            <div class="page-subtitle">Lista completa de envíos con filtros (origen, destino, estado, fechas).</div>
          </div>
          <div class="actions">
            <button class="btn btn-primary btn-icon" id="btnRefresh"><span class="ico">${ICONS.refresh}</span>Actualizar</button>
          </div>
        </div>

        <div id="alert"></div>

        <div class="card">
          <div class="card-title">Filtros</div>
          <div class="card-subtitle">Se consultan los últimos registros descendentes por fecha de registro.</div>

          <div class="form-row grid grid-3">
            <div class="field">
              <label>Estado</label>
              <select id="fltEstado">
                ${ESTADOS.map((e) => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Búsqueda</label>
              <input id="fltSearch" placeholder="Código, origen, destino, remitente, destinatario..." />
            </div>
            <div class="field">
              <label>Cantidad máxima (Firestore)</label>
              <select id="fltLimit">
                <option value="300">300</option>
                <option value="500" selected>500</option>
                <option value="800">800</option>
                <option value="1200">1200</option>
                <option value="2000">2000</option>
              </select>
            </div>
          </div>

          <div class="form-row grid grid-2" style="margin-top:10px">
            <div class="field">
              <label>Fecha desde (registro)</label>
              <input id="fltDesde" type="date" />
            </div>
            <div class="field">
              <label>Fecha hasta (registro)</label>
              <input id="fltHasta" type="date" />
            </div>
          </div>

          <div class="actions" style="margin-top:10px">
            <button class="btn btn-accent btn-icon" id="btnApply"><span class="ico">${ICONS.search}</span>Aplicar filtros</button>
            <span class="muted" id="status"></span>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card-title">Registros</div>
          <div class="card-subtitle">Haz clic en una fila para ver detalles y trazabilidad del envío.</div>
          <div style="overflow:auto; border-radius: 12px; border:1px solid var(--border)">
            <table class="table" style="border:none; border-radius:0; box-shadow:none; min-width:1080px">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th>Carga</th>
                  <th>Peso</th>
                  <th>Total est.</th>
                </tr>
              </thead>
              <tbody id="tblBody">
                <tr><td colspan="8" class="muted">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
          <div class="hint" style="margin-top:10px">
            Nota: si tienes muchos envíos, aumenta el límite o ajusta por estado/fechas para reducir lecturas.
          </div>
        </div>
      </div>
    </main>
  `;

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(() => window.GlsMenu?.mountAuthMenu?.());

  const alertEl = document.getElementById("alert");
  const tblBody = document.getElementById("tblBody");
  const statusEl = document.getElementById("status");

  const fltEstado = document.getElementById("fltEstado");
  const fltSearch = document.getElementById("fltSearch");
  const fltLimit = document.getElementById("fltLimit");
  const fltDesde = document.getElementById("fltDesde");
  const fltHasta = document.getElementById("fltHasta");

  const btnApply = document.getElementById("btnApply");
  const btnRefresh = document.getElementById("btnRefresh");

  let dataset = [];

  function setBusy(busy, text) {
    btnApply.disabled = busy;
    btnRefresh.disabled = busy;
    statusEl.textContent = text || "";
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(s) {
    return String(s || "").toLowerCase().trim();
  }

  function parseDayStart(dateStr) {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  function parseDayEnd(dateStr) {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  function badgeForEstado(estado) {
    const e = (estado || "").toLowerCase();
    if (e.includes("entregado")) return "badge ok";
    if (e.includes("cancel")) return "badge danger";
    if (e.includes("observ")) return "badge warn";
    return "badge info";
  }

  function applyClientFilters(items) {
    const q = normalize(fltSearch.value);
    const desde = parseDayStart(fltDesde.value);
    const hasta = parseDayEnd(fltHasta.value);

    return items.filter((e) => {
      const iso = e.fechaRegistro || "";
      const t = Date.parse(iso);
      if (desde !== null && (!Number.isFinite(t) || t < desde)) return false;
      if (hasta !== null && (!Number.isFinite(t) || t > hasta)) return false;

      if (!q) return true;
      const blob = [
        e.codigoEnvio,
        e.origen,
        e.destino,
        e.estadoActual,
        e.tipoCarga,
        e.descripcion,
        e.remitente?.nombres,
        e.destinatario?.nombres,
        e.clienteAsociado?.nombres,
        e.clienteAsociado?.documento,
        e.clienteAsociado?.empresa,
        e.cotizacionEstimada?.desglose?.totalEstimado,
        e.cotizacionEstimada?.moneda
      ]
        .map(normalize)
        .join(" ");
      return blob.includes(q);
    });
  }

  function renderTable(items) {
    if (!items.length) {
      tblBody.innerHTML = `<tr><td colspan="8" class="muted">Sin registros con los filtros actuales.</td></tr>`;
      return;
    }

    tblBody.innerHTML = items
      .map((e) => {
        const codigo = e.codigoEnvio || "";
        const estado = e.estadoActual || "—";
        const reg = e.fechaRegistro || "";
        const cot = e.cotizacionEstimada;
        const totalCell =
          cot?.desglose?.totalEstimado != null
            ? `<span class="mono">${escapeHtml(String(cot.desglose.totalEstimado))} ${escapeHtml(cot.moneda || "")}</span>`
            : `<span class="muted">—</span>`;
        return `
          <tr data-code="${escapeHtml(codigo)}" style="cursor:pointer">
            <td class="mono"><b>${escapeHtml(codigo)}</b></td>
            <td>${escapeHtml(e.origen || "")}</td>
            <td>${escapeHtml(e.destino || "")}</td>
            <td><span class="${badgeForEstado(estado)}">${escapeHtml(estado)}</span></td>
            <td class="mono">${escapeHtml(reg)}</td>
            <td>${escapeHtml(e.tipoCarga || "")}</td>
            <td class="mono">${escapeHtml(String(e.peso ?? ""))}</td>
            <td>${totalCell}</td>
          </tr>
        `;
      })
      .join("");
  }

  async function load() {
    window.GlsAlert.clearAlert(alertEl);
    tblBody.innerHTML = `<tr><td colspan="8" class="muted">Cargando...</td></tr>`;
    setBusy(true, "Consultando Firestore...");
    try {
      const estado = fltEstado.value;
      const limitCount = Number(fltLimit.value || 800);
      const res = await window.glsApi.envios.listarHistorial({ estado, limitCount });
      if (!res?.ok) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: res?.error || "No se pudo cargar el historial" });
        setBusy(false, "");
        return;
      }

      dataset = res.envios || [];
      const filtered = applyClientFilters(dataset);
      renderTable(filtered);
      setBusy(false, `Mostrando ${filtered.length} de ${dataset.length} cargados`);
    } catch (err) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: err?.message || String(err) });
      setBusy(false, "");
    }
  }

  btnApply.addEventListener("click", load);
  btnRefresh.addEventListener("click", load);
  fltSearch.addEventListener("input", () => {
    const filtered = applyClientFilters(dataset);
    renderTable(filtered);
    statusEl.textContent = `Mostrando ${filtered.length} de ${dataset.length} cargados`;
  });

  tblBody.addEventListener("click", async (ev) => {
    const tr = ev.target?.closest?.("tr[data-code]");
    const code = tr?.dataset?.code;
    if (!code) return;

    setBusy(true, "Cargando detalle...");
    try {
      const [res, estadosRes] = await Promise.all([
        window.glsApi.trazabilidad.buscar(code),
        window.glsApi.trazabilidad.listarEstados()
      ]);

      if (!res?.ok) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: res?.error || "No encontrado" });
        setBusy(false, "");
        return;
      }

      const envio = res.envio;
      const historial = res.historial || [];

      const timelineItems = historial
        .slice()
        .reverse()
        .map((h) => {
          const evRef = (h.evidenciaReferencia || "").trim();
          const evDet = (h.evidenciaDetalle || "").trim();
          const evLine =
            evRef || evDet
              ? `<div class="t-obs">Evidencia: <b>${escapeHtml(evRef || "—")}</b>${
                  evDet ? ` <span class="muted">· ${escapeHtml(evDet)}</span>` : ""
                }</div>`
              : "";
          const por = (h.registradoPor || "").trim();
          return `
            <div class="t-item">
              <div class="t-top">
                <div class="t-state">${escapeHtml(h.estado || "")}</div>
                <div class="t-meta mono">${escapeHtml(h.fechaActualizacion || "")}</div>
              </div>
              <div class="t-meta">${escapeHtml(h.responsable || "")}${
                por ? ` · <span class="mono">${escapeHtml(por)}</span>` : ""
              }</div>
              ${h.observacion ? `<div class="t-obs">${escapeHtml(h.observacion)}</div>` : ""}
              ${evLine}
            </div>
          `;
        })
        .join("");

      const estados = (estadosRes?.estados || []).map((e) => e.estado || e.nombre || e.id).filter(Boolean);
      const estadoOptions = estados
        .map((e) => `<option value="${escapeHtml(e)}" ${e === envio.estadoActual ? "selected" : ""}>${escapeHtml(e)}</option>`)
        .join("");

      window.GlsModal.openModal({
        title: `Envío ${escapeHtml(envio.codigoEnvio || "")}`,
        bodyHtml: `
          <div class="grid">
            <div class="card">
              <div class="card-title">Resumen</div>
              <div class="muted">Origen → Destino</div>
              <div><b>${escapeHtml(envio.origen || "")}</b> → <b>${escapeHtml(envio.destino || "")}</b></div>
              <div style="margin-top:10px" class="muted">Estado actual</div>
              <div><span class="${badgeForEstado(envio.estadoActual)}">${escapeHtml(envio.estadoActual || "—")}</span></div>
              ${
                envio.cotizacionEstimada?.desglose?.totalEstimado != null
                  ? `<div style="margin-top:10px" class="muted">Cotización estimada (registro)</div>
              <div><b>${escapeHtml(String(envio.cotizacionEstimada.desglose.totalEstimado))}</b> ${escapeHtml(
                      envio.cotizacionEstimada.moneda || ""
                    )}</div>`
                  : `<div style="margin-top:10px" class="muted">Sin cotización en el registro.</div>`
              }
              ${
                envio.clienteAsociado
                  ? `<div style="margin-top:12px" class="muted">Cliente catálogo</div>
              <div><b>${escapeHtml(envio.clienteAsociado.nombres || "")}</b> · ${escapeHtml(
                      envio.clienteAsociado.documento || ""
                    )}</div>
              ${
                envio.clienteAsociado.empresa
                  ? `<div class="muted" style="margin-top:6px">Empresa</div><div>${escapeHtml(envio.clienteAsociado.empresa)}</div>`
                  : ""
              }`
                  : ""
              }
              ${
                envio.evidenciaEntrega &&
                ((envio.evidenciaEntrega.referencia || "").trim() || (envio.evidenciaEntrega.detalle || "").trim())
                  ? `<div style="margin-top:12px" class="muted">Evidencia de entrega</div>
              <div>Ref. <b>${escapeHtml((envio.evidenciaEntrega.referencia || "").trim() || "—")}</b></div>
              ${
                (envio.evidenciaEntrega.detalle || "").trim()
                  ? `<div class="muted" style="margin-top:4px">${escapeHtml((envio.evidenciaEntrega.detalle || "").trim())}</div>`
                  : ""
              }
              <div class="muted" style="font-size:11px;margin-top:4px">${escapeHtml(envio.evidenciaEntrega.fecha || "")}</div>`
                  : ""
              }
            </div>

            <div class="card">
              <div class="card-title">Actualizar estado</div>
              <div class="form-row">
                <div class="field"><label>Estado</label><select id="m_estado">${estadoOptions}</select></div>
                <div class="field"><label>Observación</label><textarea id="m_obs" placeholder="Detalle..."></textarea></div>
                <div id="wrapEvidenciaHist" style="display:none">
                  <div class="field">
                    <label>Evidencia de entrega (referencia)</label>
                    <input id="m_evid_ref" maxlength="280" placeholder="Obligatorio si estado Entregado (mín. 4 caracteres)" />
                  </div>
                  <div class="field">
                    <label>Detalle evidencia</label>
                    <textarea id="m_evid_det" rows="2" placeholder="Opcional"></textarea>
                  </div>
                </div>
                <div class="muted" style="font-size:12px">Entregado requiere referencia de evidencia.</div>
                <div class="actions">
                  <button class="btn btn-primary" id="m_save">Guardar</button>
                </div>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:12px">
            <div class="card-title">Línea de tiempo</div>
            <div class="timeline">${timelineItems || `<div class="muted">Sin historial</div>`}</div>
          </div>
        `
      });

      const overlay = document.querySelector(".modal-overlay:last-of-type");
      const saveBtn = overlay.querySelector("#m_save");
      const estadoSel = overlay.querySelector("#m_estado");
      const obs = overlay.querySelector("#m_obs");
      const wrapEvid = overlay.querySelector("#wrapEvidenciaHist");
      const evidRef = overlay.querySelector("#m_evid_ref");
      const evidDet = overlay.querySelector("#m_evid_det");

      function syncEvidenciaVisibility() {
        const ent = String(estadoSel.value || "").trim() === "Entregado";
        wrapEvid.style.display = ent ? "" : "none";
      }
      function onEstadoChange() {
        syncEvidenciaVisibility();
        window.GlsAlert.clearAlert(alertEl);
      }
      estadoSel.addEventListener("change", onEstadoChange);
      syncEvidenciaVisibility();

      const MSG_EVIDENCIA_ENTREGADO =
        "Para estado Entregado indique evidencia de entrega (referencia, mín. 4 caracteres).";
      evidRef?.addEventListener?.("input", () => window.GlsAlert.clearAlert(alertEl));

      saveBtn.addEventListener("click", async () => {
        try {
          window.GlsAlert.clearAlert(alertEl);
          const estado = String(estadoSel.value || "").trim();
          const refTrim = String(evidRef?.value ?? "").trim();
          if (estado === "Entregado" && refTrim.length < 4) {
            window.GlsAlert.showAlert(alertEl, { type: "error", message: MSG_EVIDENCIA_ENTREGADO });
            evidRef?.focus?.();
            return;
          }
          saveBtn.disabled = true;
          const r = await window.glsApi.trazabilidad.actualizarEstado({
            codigoEnvio: envio.codigoEnvio,
            estado: estadoSel.value,
            observacion: obs.value,
            responsable: "Área de operaciones",
            evidenciaReferencia: evidRef?.value ?? "",
            evidenciaDetalle: evidDet?.value ?? ""
          });
          if (!r?.ok) {
            window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "No se pudo actualizar" });
            saveBtn.disabled = false;
            return;
          }
          window.GlsModal.dismissOverlay(overlay);
          await load();
        } catch (e) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
          saveBtn.disabled = false;
        }
      });

      setBusy(false, `Mostrando ${applyClientFilters(dataset).length} de ${dataset.length} cargados`);
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
      setBusy(false, "");
    }
  });

  load();
})();
