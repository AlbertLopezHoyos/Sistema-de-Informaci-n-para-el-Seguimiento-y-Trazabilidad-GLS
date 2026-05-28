# Modelo de datos Firestore (sugerido)

## `envios/{codigoEnvio}`

```js
{
  codigoEnvio: "ENV-2026-0001",
  remitente: { nombres, documento, telefono, direccion },
  destinatario: { nombres, documento, telefono, direccion },
  origen: "Lima",
  destino: "Trujillo",
  tipoCarga: "Paquete",
  descripcion: "Caja mediana",
  peso: 12.5,
  estadoActual: "Registrado",
  fechaRegistro: "ISO",
  observacion: "Sin observaciones"
}
```

## `historial_envios/{codigoEnvio}__{fechaISO}`

```js
{
  codigoEnvio: "ENV-2026-0001",
  estado: "En tránsito",
  fechaActualizacion: "ISO",
  observacion: "El envío salió del almacén",
  responsable: "Área de operaciones",
  // Entrega (opcional):
  evidenciaReferencia: "GUÍA-123",
  evidenciaImagenUrl: "https://firebasestorage.../evidencia.jpg",
  evidenciaNombreArchivo: "entrega.jpg",
  evidenciaFechaSubida: "ISO",
  // Legacy (solo lectura en registros antiguos):
  evidenciaImagenBase64: "data:image/jpeg;base64,..."
}
```

### Firebase Storage — evidencias de entrega

Ruta: `uploads/evidencias/{codigoEnvio}/{nombreArchivo}`

Validación: JPG/PNG/WEBP, máximo 5 MB. El renderer envía data URL por IPC; el proceso main sube a Storage y persiste solo URL + metadatos en Firestore.

## `ubicaciones_envios/{codigoEnvio}__{fechaISO}`

```js
{
  codigoEnvio: "ENV-2026-0001",
  direccion: "Av. Javier Prado, Lima",
  latitud: "-12.0864",
  longitud: "-77.0432",
  fechaRegistro: "ISO",
  observacion: "Punto de control registrado"
}
```

## `qr_envios/{codigoEnvio}`

```js
{
  codigoEnvio: "ENV-2026-0001",
  contenidoQr: "ENV-2026-0001",
  rutaLocalQr: "src/renderer/assets/qr/ENV-2026-0001.png",
  fechaGeneracion: "ISO"
}
```

