/**
 * Manejo global de errores en el renderer (Electron).
 * Cargar después de toast.js y antes de alert.js en páginas autenticadas.
 */
(() => {
  const LOG_PREFIX = "[GLS]";

  function humanizeError(message, context = "") {
    const m = String(message || "").trim();
    if (/requires an index|FAILED_PRECONDITION/i.test(m)) {
      return window.GlsAlert?.humanizeFirestoreMessage?.(m) || m;
    }
    if (/permission|PERMISSION_DENIED/i.test(m)) {
      return "Sin permiso en Firestore o Storage. Revise las reglas de seguridad.";
    }
    if (/unavailable|UNAVAILABLE|offline|network/i.test(m)) {
      return "Sin conexión o servicio no disponible.";
    }
    if (/deadline-exceeded|timeout/i.test(m)) {
      return "Tiempo de espera agotado.";
    }
    if (/AUTH_REQUIRED|Debe iniciar sesión|SESSION_EXPIRED|sesión expirada/i.test(m)) {
      return "Su sesión expiró. Vuelva a iniciar sesión.";
    }
    if (/storage|evidencia/i.test(m) && context.includes("storage")) {
      return m || "No se pudo subir la evidencia. Verifique Firebase Storage.";
    }
    if (!m) {
      if (context.includes("export")) return "No se pudo completar la exportación.";
      if (context.includes("qr")) return "No se pudo procesar el código QR.";
      if (context.includes("pdf")) return "No se pudo generar el PDF.";
      return "Ocurrió un error inesperado.";
    }
    return m;
  }

  function log(level, area, detail, err) {
    const payload = { area, detail, err: err?.message || err };
    if (level === "error") console.error(LOG_PREFIX, payload);
    else if (level === "warn") console.warn(LOG_PREFIX, payload);
    else console.info(LOG_PREFIX, payload);
  }

  /**
   * Muestra toast + opcional alert en contenedor.
   * @param {{ type?: string, message: string, container?: HTMLElement, silent?: boolean }} opts
   */
  function notify(opts = {}) {
    const type = opts.type || "error";
    const msg = humanizeError(opts.message, opts.context || "");
    if (!opts.silent) {
      if (type === "success" && window.GlsToast?.success) window.GlsToast.success(msg);
      else if (type === "warn" && window.GlsToast?.warning) window.GlsToast.warning(msg);
      else if (type === "info" && window.GlsToast?.info) window.GlsToast.info(msg);
      else if (window.GlsToast?.error) window.GlsToast.error(msg);
    }
    if (opts.container && window.GlsAlert?.showAlert) {
      window.GlsAlert.showAlert(opts.container, { type, message: msg });
    }
    log(type === "success" ? "info" : type === "error" ? "error" : "warn", opts.context || "ui", msg);
  }

  /** Procesa { ok, error } de IPC; devuelve el mismo objeto con error humanizado. */
  function handleIpcResult(result, context = "ipc", container) {
    if (result?.ok === false && result?.error) {
      const msg = humanizeError(result.error, context);
      notify({ type: "error", message: msg, container, context });
      return { ...result, error: msg };
    }
    return result;
  }

  function handleException(err, context = "app", container) {
    const msg = humanizeError(err?.message || String(err), context);
    notify({ type: "error", message: msg, container, context });
    return msg;
  }

  window.addEventListener("error", (ev) => {
    log("error", "uncaught", ev.message, ev.error);
    notify({ type: "error", message: ev.message || "Error en la aplicación.", context: "renderer" });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason;
    const msg = reason?.message || String(reason);
    log("error", "unhandledrejection", msg, reason);
    notify({ type: "error", message: msg, context: "promise" });
  });

  window.GlsErrors = {
    humanizeError,
    log,
    notify,
    handleIpcResult,
    handleException
  };
})();
