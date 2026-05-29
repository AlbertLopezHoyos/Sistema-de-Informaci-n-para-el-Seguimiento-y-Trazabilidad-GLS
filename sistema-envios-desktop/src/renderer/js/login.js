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

  function setAlert(type, msg) {
    const el = document.getElementById("authAlert");
    if (!el) return;
    if (!msg) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `<div class="auth-alert ${type}">${escapeHtml(msg)}</div>`;
  }

  function setBusy(busy, text) {
    const btn = document.getElementById("btnLogin");
    const s = document.getElementById("status");
    if (btn) btn.disabled = busy;
    if (s) s.textContent = text || "";
  }

  async function redirectIfLogged() {
    try {
      const me = await window.glsApi.auth.me();
      if (me?.ok && me.user?.email) {
        window.location.href = "./dashboard.html";
      }
    } catch {}
  }

  appEl.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-left">
          <div class="auth-brand">
            <div class="auth-logo"><img src="../assets/img/logo.png" alt="GLS" /></div>
            <div>
              <h1>GRUPO LOGÍSTICO SALAZAR S.A.C.</h1>
              <p>Sistema de seguimiento y trazabilidad · Operaciones</p>
            </div>
          </div>
          <div class="auth-hero">
            <div class="auth-hero-title">Bienvenido</div>
            <div class="auth-hero-sub">
              Inicia sesión para registrar envíos, ver trazabilidad en tiempo real, historial y geolocalización con QR.
            </div>
          </div>
        </div>
        <div class="auth-right">
          <h2 class="auth-title">Iniciar sesión</h2>
          <p class="auth-subtitle">Acceso interno. Tus credenciales se validan contra Firestore.</p>

          <div id="authAlert"></div>

          <form id="formLogin" class="auth-form" autocomplete="off">
            <div>
              <label>Correo</label>
              <input name="email" type="email" placeholder="operaciones@gls.pe" required />
            </div>
            <div>
              <label>Contraseña</label>
              <input name="password" type="password" placeholder="••••••••" required />
            </div>

            <div class="auth-actions">
              <button id="btnLogin" class="auth-btn auth-btn-primary" type="submit">Ingresar</button>
              <span class="auth-subtitle" id="status"></span>
              <a id="linkSignup" class="auth-link" href="./signup.html" style="display:none">Primer alta</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById("formLogin");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAlert("", "");
    setBusy(true, "Validando...");
    const fd = new FormData(form);

    try {
      const res = await window.glsApi.auth.login({
        email: fd.get("email"),
        password: fd.get("password")
      });
      if (!res?.ok) {
        setAlert("error", res?.error || "No se pudo iniciar sesión");
        setBusy(false, "");
        return;
      }
      setAlert("success", `Bienvenido, ${res.user?.nombres || res.user?.email || ""}`.trim());
      setBusy(false, "Ingresando...");
      window.location.href = "./dashboard.html";
    } catch (err) {
      setAlert("error", err?.message || String(err));
      setBusy(false, "");
    }
  });

  (async () => {
    try {
      const pol = await window.glsApi.auth.policy();
      if (pol?.ok && pol.registroAbierto) {
        const a = document.getElementById("linkSignup");
        if (a) a.style.display = "";
      }
    } catch {}
  })();

  try {
    const expired = new URLSearchParams(window.location.search).get("expired");
    if (expired === "1") {
      setAlert(
        "warn",
        "Su sesión expiró por inactividad. Inicie sesión nuevamente para continuar."
      );
    }
  } catch {}

  redirectIfLogged();
})();

