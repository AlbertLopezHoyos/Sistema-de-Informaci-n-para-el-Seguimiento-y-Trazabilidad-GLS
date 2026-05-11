const authService = require("./auth.service");

const authController = {
  register: (payload) => authService.register(payload),
  login: (payload) => authService.login(payload),
  countUsers: () => authService.countUsers(),
  listUsersAdmin: () => authService.listUsersAdmin(),
  inviteUser: (payload) => authService.inviteUser(payload),
  setUsuarioActivo: (payload) => authService.setUsuarioActivo(payload)
};

module.exports = { authController };

