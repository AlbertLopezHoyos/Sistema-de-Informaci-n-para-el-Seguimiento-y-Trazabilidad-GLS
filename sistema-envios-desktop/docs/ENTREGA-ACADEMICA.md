# Entrega académica — GLS Envíos Desktop v1.2.0

## Estado del sistema

Aplicación de escritorio **Electron + Firestore + IPC + Firebase Storage**, lista para demostración, pruebas finales e instalación Windows.

## Checklist de cierre (v1.2.0)

| Área | Estado |
|------|--------|
| Arquitectura base (main / modules / renderer / IPC) | Sin cambios estructurales |
| Manejo global de errores (`glsErrors.js`, `gls-error-handler.js`, `ipcError`) | Implementado |
| Validación IPC ampliada (`ipc-security.js`) | Implementado |
| Suscripciones Firestore (preload `removeListener`) | Corregido |
| Listeners menú perfil duplicados | Corregido |
| QR alta resolución (768px) + etiqueta imprimible | Mejorado |
| UI polish (`production-polish.css`) | Integrado en todas las páginas |
| Instalador electron-builder (asarUnpack sharp, extraResources) | Configurado |
| Variables entorno en instalador (`gls.env` userData / resources) | Soportado |
| Tests Jest | 15 suites — ejecutar `npm test` |
| Verificación consistencia | `npm run verify` |

## Flujo de demostración recomendado

1. `npm run seed:users` (si aplica) → `npm start`
2. Login (admin / operaciones / consulta)
3. Dashboard → Clientes → Registro envío → QR/comprobante
4. Seguimiento → actualizar estado → evidencia (si Storage configurado)
5. Geolocalización + QR → mapa y puntos
6. Consulta (código / QR / PDF) → Historial → Reportes → export CSV/Excel/PDF
7. Admin: Usuarios → Respaldo JSON → auditoría vía Firestore `logs_sistema`

## Instalación en otra máquina

```bash
npm install
npm run dist
```

Instalador: `dist/GLS-Envios-Setup-1.2.0.exe`

**Firebase:** copiar `.env.example` a `%APPDATA%\<app>\gls.env` o a la carpeta `resources` del instalador como `gls.env` con las claves `FIREBASE_*`.

## Documentación relacionada

- `manual-usuario.md`
- `manual-tecnico.md`
- `pruebas-sistema.md`
