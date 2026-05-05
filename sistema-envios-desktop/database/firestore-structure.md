# Estructura Firestore (colecciones)

Este proyecto usa Firestore (plan gratuito) con las siguientes colecciones:

- `usuarios`
- `clientes`
- `envios`
- `estados_envio`
- `historial_envios`
- `ubicaciones_envios`
- `qr_envios`

## Recomendación (IDs de documento)

- `envios/{codigoEnvio}` (ej: `envios/ENV-2026-0001`)
- `historial_envios/{codigoEnvio}__{fechaISO}`
- `ubicaciones_envios/{codigoEnvio}__{fechaISO}`
- `qr_envios/{codigoEnvio}`
- `estados_envio/{estado}` (ej: `estados_envio/Registrado`)
- `counters/ENV-YYYY` (contador por año para consecutivo)

## Nota sobre reglas

Para un entorno académico/local, puedes comenzar con reglas abiertas **solo en desarrollo** y luego endurecerlas.

