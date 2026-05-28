(() => {
  const appEl = document.getElementById("app");

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("backup")}
    <main class="main">
      ${window.GlsPageChrome.renderTopbar({
        headline: "Respaldo y restauración",
        tagline: "Exportación e importación JSON (solo administrador)",
        pill: "Admin"
      })}
      <div class="content">
        <div id="alert"></div>
        <div class="card">
          <div class="card-title">Exportar respaldo</div>
          <div class="card-subtitle">
            Incluye: envíos, historial, clientes, logs, QR, ubicaciones y catálogo de estados.
          </div>
          <div class="actions u-mt-sm">
            <button type="button" class="btn btn-primary" id="btnBackupExport">Generar y guardar JSON</button>
          </div>
          <div id="backupExportStats" class="backup-stats u-mt-sm"></div>
        </div>
        <div class="card u-mt-md">
          <div class="card-title">Importar respaldo</div>
          <div class="card-subtitle muted">
            La restauración fusiona documentos por ID. Revise el archivo antes de confirmar.
          </div>
          <div class="field u-mt-sm">
            <label>Archivo JSON</label>
            <input type="file" id="backupFile" accept=".json,application/json" />
          </div>
          <div class="actions u-mt-sm">
            <button type="button" class="btn btn-accent" id="btnBackupImport" disabled>Restaurar respaldo</button>
          </div>
          <pre id="backupPreview" class="mono muted" style="max-height:120px;overflow:auto;font-size:11px;margin-top:12px"></pre>
        </div>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");
  let pendingBackup = null;

  function renderStats(stats) {
    const el = document.getElementById("backupExportStats");
    if (!el || !stats) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = Object.entries(stats)
      .map(([k, v]) => `<div class="stat"><b>${escapeHtml(k)}</b><br>${escapeHtml(String(v))} registros</div>`)
      .join("");
  }

  async function ensureAdmin() {
    const me = await window.glsApi.auth.me();
    if (String(me?.user?.rol || "").toLowerCase() !== "admin") {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: "Solo administradores pueden usar respaldo." });
      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 1200);
      return false;
    }
    return true;
  }

  document.getElementById("btnBackupExport")?.addEventListener("click", async () => {
    window.GlsAlert.clearAlert(alertEl);
    if (!(await ensureAdmin())) return;
    const btn = document.getElementById("btnBackupExport");
    btn.disabled = true;
    try {
      const r = await window.glsApi.backup.exportar();
      if (!r?.ok) throw new Error(r?.error || "No se pudo exportar");
      const json = JSON.stringify(r.backup, null, 2);
      const save = await window.glsApi.app.saveExportFile({
        format: "json",
        defaultPath: `gls-respaldo-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
        utf8Content: json
      });
      renderStats(r.stats);
      if (save?.ok && !save.canceled) {
        window.GlsAlert.showAlert(alertEl, { type: "success", message: "Respaldo exportado correctamente." });
      }
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("backupFile")?.addEventListener("change", async (ev) => {
    pendingBackup = null;
    document.getElementById("btnBackupImport").disabled = true;
    const file = ev.target.files?.[0];
    const preview = document.getElementById("backupPreview");
    if (!file) {
      preview.textContent = "";
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      pendingBackup = data;
      const cols = data?.meta?.collections?.join(", ") || Object.keys(data?.data || {}).join(", ");
      preview.textContent = `Válido · exportado: ${data?.meta?.exportedAt || "—"} · colecciones: ${cols}`;
      document.getElementById("btnBackupImport").disabled = false;
    } catch (e) {
      preview.textContent = `Error leyendo JSON: ${e?.message || e}`;
    }
  });

  document.getElementById("btnBackupImport")?.addEventListener("click", async () => {
    if (!pendingBackup) return;
    const ok = window.confirm(
      "¿Restaurar respaldo?\n\nSe fusionarán documentos en Firestore según los IDs del archivo. Esta acción no se puede deshacer automáticamente."
    );
    if (!ok) return;
    const ok2 = window.confirm("Confirmación final: escriba mentalmente RESTAURAR y pulse Aceptar solo si está seguro.");
    if (!ok2) return;

    window.GlsAlert.clearAlert(alertEl);
    if (!(await ensureAdmin())) return;
    const btn = document.getElementById("btnBackupImport");
    btn.disabled = true;
    try {
      const r = await window.glsApi.backup.importar(pendingBackup);
      if (!r?.ok) throw new Error(r?.error || "Importación fallida");
      window.GlsAlert.showAlert(alertEl, {
        type: "success",
        message: `Restauración completada (${r.written || 0} documentos procesados).`
      });
      pendingBackup = null;
      document.getElementById("backupFile").value = "";
      document.getElementById("backupPreview").textContent = "";
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
    } finally {
      btn.disabled = !pendingBackup;
    }
  });

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(async () => {
    await window.GlsMenu?.mountAuthMenu?.();
    await ensureAdmin();
  });
})();
