const path = require("path");

function getMainWindowOptions() {
  return {
    width: 1200,
    height: 760,
    minWidth: 1100,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0b1220",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js")
    }
  };
}

module.exports = { getMainWindowOptions };

