# Requerimientos (resumen)

## Funcionales

1. **Registro de envíos**
   - Registrar un envío con datos de remitente/destinatario y carga.
   - Generar código `ENV-YYYY-0001` (consecutivo por año).
   - Estado inicial: `Registrado`.
   - Guardar en `envios`.
   - Crear primer registro en `historial_envios`.
   - Generar QR inicial y guardar en `qr_envios`.

2. **Trazabilidad**
   - Buscar por código.
   - Mostrar datos principales, estado y historial.
   - Actualizar estado (`Registrado`, `En tránsito`, `En reparto`, `Entregado`, `Observado`, `Cancelado`).
   - Guardar cambios en `historial_envios` y actualizar `estadoActual` en `envios`.

3. **Geolocalización y QR**
   - Buscar por código.
   - Registrar ubicación (dirección, latitud, longitud).
   - Mostrar mapa Leaflet + OpenStreetMap.
   - Guardar en `ubicaciones_envios`.
   - Generar/mostrar QR y guardar metadata en `qr_envios`.

## No funcionales

- Aplicación **de escritorio** con Electron (sin servidor web).
- Firestore como base de datos (según el plan contratado).
- Código modular (model/repository/service/controller).
- UI moderna y usable para escritorio.

