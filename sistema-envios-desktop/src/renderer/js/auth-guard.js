(() => {
  const CHECK_MS = 60 * 1000;

  async function requireAuthOrRedirect() {
    try {
      const me = await window.glsApi.auth.me();
      if (me?.sessionExpired) {
        window.location.href = "./login.html?expired=1";
        return null;
      }
      if (me?.ok && me.user?.email) {
        startSessionWatch();
        return me.user;
      }
    } catch {}
    window.location.href = "./login.html";
    return null;
  }

  let watchStarted = false;
  function startSessionWatch() {
    if (watchStarted) return;
    watchStarted = true;
    const tick = async () => {
      try {
        const me = await window.glsApi.auth.me();
        if (me?.sessionExpired || (me?.ok && !me.user)) {
          window.location.href = "./login.html?expired=1";
          return;
        }
        if (me?.user) await window.glsApi.auth.touchSession();
      } catch (_) {}
    };
    setInterval(tick, CHECK_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void tick();
    });
    void window.glsApi.auth.touchSession();
  }

  window.GlsAuthGuard = { requireAuthOrRedirect };
})();
