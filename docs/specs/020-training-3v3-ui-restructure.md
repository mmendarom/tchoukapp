# Spec 020 - Reestructura UI de la sección Práctica 3v3

## Estado

Implemented

## Problema

Toda la sección `Práctica 3v3` vive en una sola pantalla (`TrainingSessionsScreen`, ~1600 líneas): lista de sesiones guardadas, detalle completo de la sesión seleccionada (resumen, tabla, tops, alertas, rendimiento, cola, próximo partido, historial, edición) y el formulario completo de creación (plantel, jugadores, equipos, configuración). Todo scrollea junto, sin jerarquía, y se siente "todo metido en la home". Un usuario nuevo no entiende por dónde empezar.

## Objetivos

- Separar la sección en 3 pantallas con navegación propia:
  - `TrainingSessionsScreen`: home de la sección. Lista de sesiones + botón prominente `Nueva práctica` + acceso rápido a la práctica en curso.
  - `TrainingSetupScreen`: asistente por pasos para crear una práctica (1: plantel y presentes, 2: equipos, 3: reglas y confirmación).
  - `TrainingSessionDetailScreen`: detalle de una sesión, con enfoque "jugar primero" (mini partido en vivo / próximo sugerido / cola arriba; estadísticas e historial abajo).
- Estado vacío amigable que explique el flujo a usuarios nuevos.
- Mantener intactos dominio, store, scoring, persistencia, backup, export y la pantalla live.

## No objetivos

- No cambiar `useTrainingStore`, dominio training ni helpers de setup.
- No cambiar el PDF, share text ni reportes.
- No cambiar `LiveTrainingMiniMatchScreen` salvo destinos de navegación.
- No agregar dependencias.

## Decisiones de UX (confirmadas con el usuario 2026-07-06)

- Estructura de 3 pantallas separadas.
- Creación como asistente de 3 pasos con validación por paso.
- Detalle "jugar primero": acciones de juego dominan; stats e historial debajo.

## Navegación

- `TrainingSetup: undefined` (nueva ruta).
- `TrainingSessionDetail: { sessionId: string }` (nueva ruta).
- `TrainingSessions` sigue existiendo como home de la sección desde Home.
- Crear práctica navega (replace) al detalle de la sesión creada.
- `LiveTrainingMiniMatch` vuelve al detalle de la sesión (`TrainingSessionDetail`) en vez de a la lista.
- Archivar o eliminar desde el detalle vuelve a la lista.

## Pantallas

### TrainingSessionsScreen (home 3v3)

- Header con título y explicación corta.
- Botón primario `Nueva práctica`.
- Si hay una práctica en curso (status `live`, no archivada): tarjeta destacada `Práctica en curso` con CTA `Continuar`.
- Filtros `Activas / Finalizadas / Archivadas / Todas` + lista de tarjetas; tocar una tarjeta abre el detalle.
- Estado vacío: explica el flujo en 3 pasos y muestra el CTA de crear.

### TrainingSetupScreen (asistente)

- Indicador `Paso X de 3` con barra de progreso.
- Paso 1 `¿Quiénes juegan hoy?`: selector de plantel + grilla de jugadores presentes. Continuar requiere >= 6 seleccionados.
- Paso 2 `Armá los equipos`: cantidad de equipos (2/3/4 según presentes), asignación por jugador, previsualización de equipos con validación 3/4 visible. Continuar requiere equipos válidos.
- Paso 3 `Reglas`: puntos para ganar (default 3), `Ganador queda`, resumen de equipos, botón `Crear práctica`.
- `Atrás` vuelve un paso; en el paso 1 cancela y vuelve a la lista.
- Reutiliza `trainingSetup.ts` sin cambios; la validación combinada se reparte por paso.

### TrainingSessionDetailScreen

Orden del scroll:

1. Header de sesión: plantel, fecha, estado, configuración compacta.
2. Zona de juego: mini partido en vivo (abrir) o próximo sugerido (iniciar) + elección manual A/B + cola con estados.
3. Estadísticas: resumen, tabla de equipos, top ataque, top defensa, alertas, rendimiento (barras).
4. Historial de mini partidos.
5. Acciones de gestión: compartir resumen, exportar PDF, editar, archivar/restaurar, eliminar (con confirmaciones, igual que antes).

Sesiones archivadas muestran aviso y bloquean el juego, igual que hoy.

## Compatibilidad

- Datos persistidos no cambian; no hay migraciones.
- Spec 011 sigue siendo la fuente del dominio/flujo; esta spec solo redistribuye la UI.

## Checklist de aceptación

- Home 3v3 muestra lista + `Nueva práctica` + práctica en curso.
- El asistente crea sesiones idénticas a las de antes (mismo store input).
- El detalle permite iniciar sugerido, elegir manual, ver cola, stats, historial y gestionar la sesión.
- `LiveTrainingMiniMatch` vuelve al detalle correcto.
- Textos visibles en español.
- `npm test` y `npx tsc --noEmit` pasan.
