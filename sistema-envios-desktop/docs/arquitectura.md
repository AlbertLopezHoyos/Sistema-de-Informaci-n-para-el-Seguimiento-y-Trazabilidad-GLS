# Arquitectura

## Capas

- **Renderer (UI)**: `src/renderer/` (HTML/CSS/JS). No hay rutas HTTP.
- **Preload**: `src/main/preload.js` expone una API segura (`window.glsApi`) usando `contextBridge`.
- **Main (Electron/Node)**: `src/main/main.js` registra IPC handlers y llama controladores.
- **Módulos de negocio**: `src/modules/**`
  - `*.model.js`: validación/shape de datos
  - `*.repository.js`: acceso a Firestore
  - `*.service.js`: reglas de negocio
  - `*.controller.js`: fachada para IPC

## Comunicación

Renderer → `window.glsApi.*` → IPC (`ipcRenderer.invoke`) → Main (`ipcMain.handle`) → Controller → Service → Repository → Firestore.

## Persistencia

Firestore (colecciones) según `database/firestore-structure.md`.

