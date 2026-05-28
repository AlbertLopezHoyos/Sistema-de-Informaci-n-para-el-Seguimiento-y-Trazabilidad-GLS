/**
 * Decodifica QR desde imagen (PNG/JPG) en el renderer con jsQR.
 */
(() => {
  function parseCodigoFromQrContent(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    try {
      if (s.includes("codigo=")) {
        const q = s.includes("?") ? s.slice(s.indexOf("?")) : `?${s}`;
        const p = new URLSearchParams(q.startsWith("?") ? q : `?${q}`);
        return (p.get("codigo") || p.get("c") || "").trim().toUpperCase();
      }
    } catch (_) {}
    const m = s.match(/ENV-\d{4}-\d{4,}/i);
    return m ? m[0].toUpperCase() : "";
  }

  function decodeFromImageData(imageData) {
    const jsQR = window.jsQR;
    if (!jsQR) throw new Error("Lector QR (jsQR) no cargado.");
    const attempts = ["attemptBoth", "dontInvert"];
    for (const inversionAttempts of attempts) {
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts });
      if (code?.data) return String(code.data).trim();
    }
    throw new Error("No se detectó un código QR en la imagen. Use un PNG nítido o el PDF del comprobante.");
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxSide = 1600;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxSide || h > maxSide) {
          const r = Math.min(maxSide / w, maxSide / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        resolve(ctx.getImageData(0, 0, w, h));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo abrir la imagen."));
      };
      img.src = url;
    });
  }

  async function resolveCodigoFromImageFile(file) {
    const imageData = await loadImageFromFile(file);
    const raw = decodeFromImageData(imageData);
    const codigo = parseCodigoFromQrContent(raw);
    if (!/^ENV-\d{4}-\d{4,}$/i.test(codigo)) {
      throw new Error(
        `El QR no contiene un código de envío válido. Contenido: «${raw.slice(0, 80)}${raw.length > 80 ? "…" : ""}»`
      );
    }
    return { codigo, raw };
  }

  function isPdfFile(file) {
    const name = String(file?.name || "").toLowerCase();
    const type = String(file?.type || "").toLowerCase();
    return type === "application/pdf" || name.endsWith(".pdf");
  }

  function isImageFile(file) {
    const name = String(file?.name || "").toLowerCase();
    const type = String(file?.type || "").toLowerCase();
    return type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(name);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = String(reader.result || "");
        const idx = s.indexOf(",");
        resolve(idx >= 0 ? s.slice(idx + 1) : s);
      };
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });
  }

  window.GlsQrDecode = {
    parseCodigoFromQrContent,
    resolveCodigoFromImageFile,
    isPdfFile,
    isImageFile,
    fileToBase64
  };
})();
