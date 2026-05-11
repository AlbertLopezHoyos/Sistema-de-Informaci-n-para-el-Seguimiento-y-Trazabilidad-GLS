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
    const btn = document.getElementById("btnSignup");
    const s = document.getElementById("status");
    if (btn) btn.disabled = busy;
    if (s) s.textContent = text || "";
  }

  appEl.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-left">
          <div class="auth-brand">
            <div class="auth-logo"><img src="../assets/img/logo.png" alt="GLS" /></div>
            <div>
              <h1>GRUPO LOGÍSTICO SALAZAR S.A.C.</h1>
              <p>Alta de usuario interno · Operaciones</p>
            </div>
          </div>
          <div class="auth-hero">
            <div class="auth-hero-title">Crear cuenta</div>
            <div class="auth-hero-sub">
              Crea un usuario para acceder al sistema. La contraseña se guarda en Firestore como hash.
            </div>
          </div>
        </div>
        <div class="auth-right">
          <h2 class="auth-title">Registro (Signup)</h2>
          <p class="auth-subtitle">Completa los datos para crear una cuenta.</p>

          <div id="authAlert"></div>
          <p id="signupCerrado" class="auth-subtitle" style="display:none">
            Ya existen usuarios en el sistema. Solicite alta a un administrador o use la pantalla «Usuarios (admin)».
            <br /><br />
            <a class="auth-link" href="./login.html">Volver al login</a>
          </p>

          <form id="formSignup" class="auth-form" autocomplete="off">
            <div>
              <label>Nombres</label>
              <input name="nombres" placeholder="Operaciones - Turno 1" required />
            </div>
            <div>
              <label>Correo</label>
              <input name="email" type="email" placeholder="operaciones@gls.pe" required />
            </div>
            <div>
              <label>Contraseña</label>
              <input name="password" type="password" placeholder="Mínimo 6 caracteres" minlength="6" required />
            </div>

            <div class="auth-actions">
              <button id="btnSignup" class="auth-btn auth-btn-primary" type="submit">Crear cuenta</button>
              <span class="auth-subtitle" id="status"></span>
              <a class="auth-link" href="./login.html">Volver a login</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById("formSignup");

  (async () => {
    try {
      const pol = await window.glsApi.auth.policy();
      if (pol?.ok && !pol.registroAbierto) {
        document.getElementById("signupCerrado").style.display = "";
        form.style.display = "none";
      }
    } catch {}
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAlert("", "");
    setBusy(true, "Creando...");
    const fd = new FormData(form);

    try {
      const pol = await window.glsApi.auth.policy();
      const res = await window.glsApi.auth.register({
        nombres: fd.get("nombres"),
        email: fd.get("email"),
        password: fd.get("password"),
        rol: pol?.registroAbierto ? "admin" : "operaciones"
      });
      if (!res?.ok) {
        setAlert("error", res?.error || "No se pudo crear la cuenta");
        setBusy(false, "");
        return;
      }
      setAlert("success", "Cuenta creada. Ingresando...");
      setBusy(false, "");
      window.location.href = "./dashboard.html";
    } catch (err) {
      setAlert("error", err?.message || String(err));
      setBusy(false, "");
    }
  });
})();

