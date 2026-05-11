(() => {
  async function requireAuthOrRedirect() {
    try {
      const me = await window.glsApi.auth.me();
      if (me?.ok && me.user?.email) return me.user;
    } catch {}
    window.location.href = "./login.html";
    return null;
  }

  window.GlsAuthGuard = { requireAuthOrRedirect };
})();

