(() => {
  const ESTADOS_OFICIALES = [
    "Registrado",
    "En almacén",
    "En tránsito",
    "En reparto",
    "Entregado",
    "Observado",
    "Cancelado"
  ];

  const META = {
    Registrado: { cls: "st-blue", icon: "📋", order: 1 },
    "En almacén": { cls: "st-yellow", icon: "📦", order: 2 },
    "En tránsito": { cls: "st-orange", icon: "🚚", order: 3 },
    "En reparto": { cls: "st-orange", icon: "📍", order: 4 },
    Entregado: { cls: "st-green", icon: "✓", order: 5 },
    Observado: { cls: "st-red", icon: "!", order: 6 },
    Cancelado: { cls: "st-gray", icon: "✕", order: 7 }
  };

  const ESTADOS_SUGIEREN_UBICACION = new Set(["En tránsito", "En reparto"]);

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function meta(estado) {
    return META[estado] || { cls: "st-gray", icon: "•", order: 99 };
  }

  function badgeClass(estado) {
    return `badge estado-badge ${meta(estado).cls}`;
  }

  function badgeHtml(estado) {
    const m = meta(estado);
    return `<span class="${badgeClass(estado)}"><span class="estado-badge-ico" aria-hidden="true">${m.icon}</span>${escapeHtml(estado || "—")}</span>`;
  }

  function normalizeEstadosList(estados) {
    const fromApi = (estados || []).map((e) => e.estado || e.nombre || e.id).filter(Boolean);
    const merged = [...new Set([...ESTADOS_OFICIALES, ...fromApi])];
    return merged.sort((a, b) => (meta(a).order || 99) - (meta(b).order || 99));
  }

  function ubicacionCercana(historialItem, ubicaciones) {
    if (!historialItem || !ubicaciones?.length) return null;
    const t = Date.parse(historialItem.fechaActualizacion || "");
    if (!Number.isFinite(t)) return null;
    let best = null;
    let bestDiff = Infinity;
    for (const u of ubicaciones) {
      const tu = Date.parse(u.fechaRegistro || "");
      if (!Number.isFinite(tu)) continue;
      const d = Math.abs(tu - t);
      if (d < bestDiff && d < 6 * 60 * 60 * 1000) {
        bestDiff = d;
        best = u;
      }
    }
    return best;
  }

  function timelineVerticalHtml(historial, ubicaciones) {
    const items = (historial || []).slice().sort((a, b) => {
      const ta = Date.parse(a.fechaActualizacion || "") || 0;
      const tb = Date.parse(b.fechaActualizacion || "") || 0;
      return ta - tb;
    });
    if (!items.length) {
      return `<div class="gls-empty"><div class="gls-empty-ico">📭</div><div>Sin eventos de trazabilidad.</div></div>`;
    }
    const cards = items
      .map((h, idx) => {
        const m = meta(h.estado);
        const u = ubicacionCercana(h, ubicaciones);
        const evRef = (h.evidenciaReferencia || "").trim();
        const evDet = (h.evidenciaDetalle || "").trim();
        const recNom = (h.receptorNombre || "").trim();
        const recDoc = (h.receptorDocumento || "").trim();
        const por = (h.registradoPor || "").trim();
        const isLast = idx === items.length - 1;
        return `
          <div class="tl-v-item ${m.cls}${isLast ? " is-last" : ""}">
            <div class="tl-v-rail">
              <span class="tl-v-dot" aria-hidden="true">${m.icon}</span>
              ${isLast ? "" : '<span class="tl-v-line"></span>'}
            </div>
            <div class="tl-v-card">
              <div class="tl-v-head">
                <span class="tl-v-state">${escapeHtml(h.estado || "")}</span>
                <span class="tl-v-date mono">${escapeHtml(h.fechaActualizacion || "")}</span>
              </div>
              <div class="tl-v-meta">${escapeHtml(h.responsable || "")}${por ? ` · <span class="mono">${escapeHtml(por)}</span>` : ""}</div>
              ${h.observacion ? `<p class="tl-v-obs">${escapeHtml(h.observacion)}</p>` : ""}
              ${
                u
                  ? `<div class="tl-v-ubic"><span class="tl-v-ubic-label">Ubicación</span> ${escapeHtml(u.direccion || "")} <span class="mono">(${escapeHtml(String(u.latitud))}, ${escapeHtml(String(u.longitud))})</span></div>`
                  : ""
              }
              ${
                recNom || recDoc
                  ? `<div class="tl-v-evid">Receptor: <b>${escapeHtml(recNom || "—")}</b> · DNI/RUC <span class="mono">${escapeHtml(recDoc || "—")}</span></div>`
                  : ""
              }
              ${
                evRef || evDet
                  ? `<div class="tl-v-evid">Evidencia: <b>${escapeHtml(evRef || "—")}</b>${evDet ? ` · ${escapeHtml(evDet)}` : ""}</div>`
                  : ""
              }
              ${
                h.evidenciaImagenUrl || h.evidenciaImagenBase64
                  ? `<img class="tl-v-img" src="${escapeHtml(h.evidenciaImagenUrl || h.evidenciaImagenBase64)}" alt="Evidencia entrega" loading="lazy" />${
                      h.evidenciaNombreArchivo || h.nombreArchivo
                        ? `<div class="muted" style="font-size:11px;margin-top:4px">${escapeHtml(
                            h.evidenciaNombreArchivo || h.nombreArchivo
                          )}</div>`
                        : ""
                    }`
                  : ""
              }
            </div>
          </div>`;
      })
      .join("");
    return `<div class="tl-vertical">${cards}</div>`;
  }

  function statePickerHtml(estados, selected) {
    const list = normalizeEstadosList(estados);
    return `<div class="state-picker" role="group" aria-label="Seleccionar estado">
      ${list
        .map(
          (e) => `
        <button type="button" class="state-pill ${meta(e).cls}${e === selected ? " is-active" : ""}" data-state="${escapeHtml(e)}">
          <span class="state-pill-ico">${meta(e).icon}</span>${escapeHtml(e)}
        </button>`
        )
        .join("")}
      <input type="hidden" id="estadoSelHidden" value="${escapeHtml(selected || list[0] || "")}" />
    </div>`;
  }

  function attachStatePicker(root, onChange) {
    const hidden = root.querySelector("#estadoSelHidden");
    if (!hidden) return;
    root.querySelectorAll(".state-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelectorAll(".state-pill").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        hidden.value = btn.getAttribute("data-state") || "";
        onChange?.(hidden.value);
      });
    });
  }

  function kpiStripHtml(envios) {
    const list = envios || [];
    const total = list.length;
    const count = (st) => list.filter((e) => String(e.estadoActual || "").trim() === st).length;
    const entregados = count("Entregado");
    const observados = count("Observado");
    const transito = count("En tránsito") + count("En reparto") + count("En almacén");
    const pct = total ? Math.round((entregados / total) * 100) : 0;
    return `
      <div class="seg-kpi-strip grid grid-4">
        <div class="seg-kpi"><div class="seg-kpi-num">${total}</div><div class="seg-kpi-label">Activos</div></div>
        <div class="seg-kpi seg-kpi--green"><div class="seg-kpi-num">${entregados}</div><div class="seg-kpi-label">Entregados</div></div>
        <div class="seg-kpi seg-kpi--warn"><div class="seg-kpi-num">${observados}</div><div class="seg-kpi-label">Observados</div></div>
        <div class="seg-kpi seg-kpi--blue"><div class="seg-kpi-num">${transito}</div><div class="seg-kpi-label">En flujo logístico</div></div>
      </div>
      <div class="seg-kpi-bar muted">Entregados: <b>${pct}%</b> del total activo en pantalla</div>
    `;
  }

  function skeletonTableRows(cols, rows = 4) {
    return Array.from({ length: rows })
      .map(() => `<tr>${Array.from({ length: cols }).map(() => `<td><span class="gls-skeleton gls-skeleton--line"></span></td>`).join("")}</tr>`)
      .join("");
  }

  function loaderHtml(text) {
    return `<div class="gls-loader"><span class="gls-spinner"></span><span>${escapeHtml(text || "Cargando…")}</span></div>`;
  }

  function sugiereUbicacion(estado) {
    return ESTADOS_SUGIEREN_UBICACION.has(String(estado || "").trim());
  }

  function ubicacionesTimelineHtml(ubicaciones) {
    const items = (ubicaciones || [])
      .slice()
      .sort((a, b) => Date.parse(a.fechaRegistro || "") - Date.parse(b.fechaRegistro || ""));
    if (!items.length) {
      return `<div class="gls-empty"><div class="gls-empty-ico">📍</div><div>Sin puntos de control registrados.</div></div>`;
    }
    const cards = items
      .map((u, idx) => {
        const isLast = idx === items.length - 1;
        const por = (u.registradoPor || "").trim();
        return `
          <div class="tl-v-item st-blue${isLast ? " is-last" : ""}">
            <div class="tl-v-rail">
              <span class="tl-v-dot" aria-hidden="true">📍</span>
              ${isLast ? "" : '<span class="tl-v-line"></span>'}
            </div>
            <div class="tl-v-card">
              <div class="tl-v-head">
                <span class="tl-v-state">${escapeHtml(u.direccion || "Punto de control")}</span>
                <span class="tl-v-date mono">${escapeHtml(u.fechaRegistro || "")}</span>
              </div>
              <div class="tl-v-meta">${escapeHtml(u.responsable || "")}${por ? ` · <span class="mono">${escapeHtml(por)}</span>` : ""}</div>
              <div class="tl-v-ubic mono">${escapeHtml(String(u.latitud ?? ""))}, ${escapeHtml(String(u.longitud ?? ""))}</div>
              ${u.observacion ? `<p class="tl-v-obs">${escapeHtml(u.observacion)}</p>` : ""}
            </div>
          </div>`;
      })
      .join("");
    return `<div class="tl-vertical tl-vertical--ubic">${cards}</div>`;
  }

  function badgeEstado(estado) {
    return badgeHtml(estado);
  }

  window.GlsEstadoEnvio = {
    ESTADOS_OFICIALES,
    ESTADOS_SUGIEREN_UBICACION,
    escapeHtml,
    badgeHtml,
    badgeEstado,
    badgeClass,
    meta,
    normalizeEstadosList,
    timelineVerticalHtml,
    statePickerHtml,
    attachStatePicker,
    kpiStripHtml,
    skeletonTableRows,
    loaderHtml,
    sugiereUbicacion,
    ubicacionCercana,
    ubicacionesTimelineHtml
  };
})();
