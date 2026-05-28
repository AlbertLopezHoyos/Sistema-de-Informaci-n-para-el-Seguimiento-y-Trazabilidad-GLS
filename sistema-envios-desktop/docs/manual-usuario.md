# Manual de usuario

Aplicación de **escritorio** (Electron). Use el menú lateral para cambiar de módulo. Cierre sesión con el botón **Salir** en el pie del menú.

## Inicio de sesión

1. Ingrese correo y contraseña.
2. Si el usuario está **inactivo**, no podrá ingresar.
3. Tras un login correcto se muestra el módulo inicial (login redirige según flujo de la app).

## Roles

- **Administrador**: gestiona usuarios (alta, activar/desactivar).
- **Operaciones**: registra envíos, clientes, ubicaciones y actualiza estados.
- **Consulta**: solo visualiza; el menú oculta el registro de envíos y no puede guardar cambios operativos.

## Notificaciones

Las acciones exitosas, errores y avisos se muestran como **toast** en la esquina superior derecha (se cierran solas o al hacer clic).

## Dashboard

- Indicadores por estado: total, registrados, en tránsito, en reparto, entregados, observados, cancelados (datos desde Firestore).
- Gráficos Chart.js: estados, envíos por mes, entregados vs observados, **tendencia semanal**.
- **Top clientes**, **resumen operativo** (% entregados, observados, eficiencia).
- **Últimos envíos**: enlaces a trazabilidad con `?codigo=`.
- **Accesos rápidos** a registro, seguimiento, geolocalización e historial.

## Reportes

Filtros por estado, fechas y cliente. KPIs: tiempo promedio de entrega, porcentajes y eficiencia. Exportar **CSV**, **Excel** o **PDF**.

## Respaldo (solo administrador)

Menú **Respaldo (admin)**: exportar JSON de todas las colecciones o importar un respaldo con doble confirmación.

## Clientes

- Formulario para alta/actualización (mismo documento actualiza el registro, sin duplicar filas).
- **Buscar por documento**: carga los datos en el formulario (rol consulta: muestra resumen en mensaje).

## Registro de envíos

- Flujo por pestañas: cliente asociado, datos del envío, cotización opcional, observaciones.
- Al guardar: código `ENV-AAAA-NNNN`, estado **Registrado**, historial inicial, QR en PNG y modal con comprobante / PDF.

## Seguimiento y trazabilidad

- Lista en tiempo real de envíos activos; clic en fila abre el detalle.
- **Buscar por código** o abrir enlace con `?codigo=ENV-...`.
- Panel con remitente, destinatario, ruta, carga, peso, dimensiones, estado, **fecha de registro**.
- **Línea de tiempo** desde `historial_envios` y tabla desplegable.
- **Actualizar estado** (operaciones/admin):
  - **Observación obligatoria** (mínimo 3 caracteres).
  - Si el estado es **Entregado**: **referencia obligatoria** (mín. 4 caracteres, ej. número de guía); nombre y DNI/RUC del receptor; detalle opcional. El campo **foto** solo aparece si Firebase Storage está configurado (plan Blaze); sin Storage, use únicamente la referencia en texto.

## Historial general

- Filtros por estado, rango de fechas de registro, texto (código, orígenes, nombres, etc.) y límite de lectura Firestore.
- Clic en fila: modal con resumen, línea de tiempo, actualización de estado (si su rol lo permite) y **exportar PDF** del comprobante.

## Geolocalización referencial y QR

- Búsqueda por código o `?codigo=`.
- Registro de **punto de control**: dirección, latitud, longitud, observación; fecha/hora y responsable se guardan desde la sesión.
- Mapa Leaflet + OpenStreetMap; clic en mapa completa coordenadas.
- Historial de ubicaciones en tabla.
- Si no hay QR en Firestore, se indica y se puede **Generar QR**.

## Consulta desde archivo QR o PDF

- En **Consulta envío**, arrastre o seleccione el **PNG del QR** (`assets/qr/`) o el **PDF del comprobante** exportado al registrar.
- Pulse **Leer QR y consultar**: el sistema decodifica el QR, obtiene el código `ENV-...` y muestra el resumen (estado, último evento, ubicación, enlace a trazabilidad).

## Comprobante y PDF

- En el registro de envío y en el historial (modal) puede exportar PDF; en escritorio puede guardarse vía diálogo del sistema.
- Ese mismo PDF puede volver a subirse en **Consulta envío** para consultar el envío sin escribir el código.

## Cierre de sesión

Use **Salir** en el menú lateral para cerrar sesión y volver al login.
