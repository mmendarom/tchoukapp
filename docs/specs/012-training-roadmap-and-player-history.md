# Spec 012 - Roadmap de formaciones, training e historial de jugadores

## Estado

Draft - Stage B safe session/team editing implemented

## Contexto

El modo formal de partido ya tiene flujo estable de periodos, timer, puntos, errores, cambios, undo, cancelacion, resumenes y ubicaciones desde `landingLocation`. El modo `Practica 3v3` ya tiene sesiones locales, mini partidos, rotacion, resumen in-app, texto compartible, backup/import y PDF training.

Quedan varias mejoras pendientes que conviene ordenar antes de implementar:

- Formaciones configurables: 3-1-3, 4-3, 3-4.
- Auto-balance de equipos 3v3.
- Pulir PDF training despues de verlo en dispositivo real.
- Edicion de sesiones/equipos 3v3 ya creados.
- Historial acumulado entre practicas.
- Estadisticas globales por jugador a lo largo del tiempo.

## Problema

Estas tareas estan relacionadas, pero no todas tienen las mismas dependencias ni el mismo riesgo. Algunas tocan el flujo formal de partido, otras el setup de entrenamiento, otras el modelo de historial local y otra depende de feedback real de dispositivo. Si se implementan sin una secuencia clara, se puede mezclar logica formal con training, duplicar estadisticas derivadas, romper compatibilidad offline o hacer mas lento el registro en vivo.

## Objetivos

- Convertir la lista de pendientes en un roadmap implementable por etapas.
- Mantener el modo formal y el modo training separados donde sus reglas difieren.
- Mantener `landingLocation` como unica fuente de ubicacion de puntos formales.
- Mantener las ubicaciones training como `{x,y}` one-frame sin inferirlas desde jugador o formacion.
- Derivar historial y estadisticas globales desde eventos/sesiones ya persistidos, no desde contadores manuales duplicados.
- Preparar auto-balance como sugerencia editable, no como decision irreversible.
- Planificar el pulido PDF training como ajuste guiado por QA real, no como rediseño especulativo.

## No objetivos

- No implementar codigo en esta spec.
- No agregar backend, autenticacion, cloud sync, servicios pagos ni dependencias nuevas.
- No cambiar scoring formal ni scoring training.
- No migrar ubicaciones historicas salvo que una implementacion futura tenga una razon documentada.
- No inferir ubicacion de caida desde posicion, formacion, zona habitual ni equipo.
- No mezclar estadisticas de partidos formales con estadisticas training en el primer corte de historial global.
- No editar eventos historicos de mini partidos ya jugados como parte del primer corte de edicion.

## Usuarios / Casos de uso

- El entrenador elige si la cancha formal se ve como 3-1-3, 4-3 o 3-4 sin cambiar quien esta en cancha ni el flujo de cambios.
- En una practica con 9, 10, 11 o 12 jugadores, el entrenador toca `Sugerir equipos` y recibe equipos 3v3 editables antes de crear la sesion.
- Despues de probar el PDF training en telefono real, se corrigen problemas concretos de legibilidad, escala, cortes, margenes o mapas.
- El entrenador abre una sesion 3v3 ya creada y corrige nombres, colores o equipos cuando todavia es seguro hacerlo.
- El cuerpo tecnico revisa varias practicas juntas para ver tendencias por jugador.
- Un jugador tiene una ficha historica training con puntos, intentos, efectividad, defensas, errores, puntos en contra, win rate y evolucion por fecha.

## Flujo esperado

### Formaciones configurables

1. En partido formal, el usuario abre la zona de cancha/alineacion.
2. Elige una formacion visual: `3-1-3`, `4-3` o `3-4`.
3. La cancha reorganiza los 7 slots visuales.
4. Cambios, intercambios, undo, resumenes y reportes siguen usando `LineupSnapshot.playerIds`.
5. La formacion elegida no afecta `landingLocation`, score, stats tacticas ni elegibilidad de jugador.

### Auto-balance 3v3

1. En setup de `Practica 3v3`, el usuario selecciona presentes y cantidad de equipos.
2. Toca `Sugerir equipos`.
3. La app arma una propuesta deterministica de equipos 3/4.
4. El entrenador puede mover jugadores antes de guardar.
5. Al crear la sesion, los equipos sugeridos pasan a ser equipos normales de la sesion.

### Pulido PDF training en dispositivo real

1. Se prueba `Exportar PDF` en un telefono/tablet real.
2. Se captura dispositivo, sistema, orientacion, app usada para abrir/compartir, sesion usada y problemas observados.
3. Se corrigen solo los problemas confirmados.
4. Se vuelve a exportar y revisar en el mismo tipo de dispositivo.

### Edicion de sesiones/equipos 3v3

1. El usuario abre el detalle de una sesion.
2. Si la sesion no tiene mini partidos con eventos, puede editar participantes, equipos, nombres, colores, target y `Ganador queda`.
3. Si la sesion ya tiene historial jugado, solo se permiten cambios seguros: nombres, colores, notas futuras y orden/cola cuando no hay mini partido activo.
4. Cambios que reescriban la historia de mini partidos jugados quedan fuera del primer corte.

### Historial y estadisticas globales

1. El usuario abre una vista de historial training.
2. Filtra por rango de fechas, plantel, jugador o sesiones archivadas.
3. La app calcula acumulados desde `trainingSessions`.
4. Desde un jugador, puede abrir detalle historico con ranking, tendencias y resumen por practica.

## Requisitos funcionales

### Formaciones

- Soportar presets `3-1-3`, `4-3` y `3-4`.
- Mantener `3-1-3` como default para compatibilidad visual con el estado actual.
- Mapear cada preset a 7 coordenadas visuales testeables.
- Mantener los slots neutrales: no asignar roles tacticos obligatorios ni restringir cambios.
- Permitir que snapshots viejos sin formacion rendericen con default seguro.

### Auto-balance

- Crear equipos de 3 o 4 segun cantidad de presentes y cantidad de equipos.
- No duplicar jugadores entre equipos.
- Mantener jugadores sin equipo si sobran y el usuario decide no asignarlos.
- Usar estadisticas historicas training cuando esten disponibles.
- Tener fallback deterministico si no hay historial suficiente.
- Exponer la propuesta como editable antes de guardar.

### PDF training

- Registrar feedback real antes de cambiar layout.
- Mantener mapas one-frame y labels training hasta 90 grados.
- No tocar PDF formal salvo que se detecte una regresion causada por codigo compartido.
- No cambiar coordenadas persistidas.

### Edicion de sesiones/equipos

- Permitir edicion completa en sesiones draft sin mini partidos.
- Permitir edicion de nombres y colores de equipos en sesiones con historial.
- Bloquear cambios de `playerIds` de equipos que ya participaron en mini partidos con eventos.
- Bloquear edicion destructiva si hay mini partido `live`.
- Conservar `updatedAt` para auditoria local.
- Mantener backup/import compatible con sesiones antiguas.

Primer corte implementado:

- Reglas puras de permisos para edicion de sesiones training.
- Accion de store para actualizar setup completo antes de que existan mini partidos.
- Accion de store para corregir detalles de equipos con historial sin tocar jugadores ni eventos.
- UI en detalle de sesion para corregir nombres de equipos.
- UI en detalle de sesion para ajustar `Puntos para ganar` y `Ganador queda` antes de iniciar mini partidos.
- Sesiones archivadas o con mini partido en vivo quedan bloqueadas para edicion.
- En sesiones con historial jugado, la UI solo permite corregir nombres de equipos.

### Historial acumulado y estadisticas globales

- Calcular acumulados desde sesiones training guardadas.
- Excluir mini partidos cancelados de stats, como hoy.
- Incluir sesiones archivadas por opcion de filtro, no en la vista principal si se decide ocultarlas por default.
- Excluir sesiones eliminadas porque ya no existen en el store.
- Mostrar metricas por jugador:
  - practicas;
  - mini partidos jugados;
  - ganados/perdidos;
  - win rate;
  - puntos;
  - intentos;
  - efectividad;
  - tiros atajados;
  - defensas;
  - errores;
  - puntos en contra;
  - plus/minus;
  - zonas training principales cuando haya ubicaciones.

## Requisitos no funcionales

- Offline-first.
- Sin dependencias nuevas salvo justificacion explicita en una spec futura.
- Calculos historicos en funciones puras de `src/domain`.
- UI mobile-first, usable en telefono y tablet.
- Texto visible en espanol.
- Compatibilidad con sesiones viejas y eventos legacy.
- Performance aceptable con muchas sesiones locales; si hace falta, optimizar derivaciones antes de persistir duplicados.

## Impacto en modelo de datos

### Formaciones

Opcion recomendada:

```ts
type LineupFormationId = '3-1-3' | '4-3' | '3-4';
```

La formacion puede vivir como preferencia visual del partido o de la pantalla, pero `LineupSnapshot.playerIds` debe seguir siendo la fuente del orden de jugadores en cancha. Si se persiste, usar un campo opcional y default legacy:

```ts
type Match = {
  lineupFormationId?: LineupFormationId;
};
```

No guardar posiciones calculadas por jugador en eventos.

### Training editing

No hace falta duplicar eventos. Pueden agregarse acciones de store para actualizar campos seguros de `TrainingSession` y `TrainingTeam`. Si mas adelante se quiere editar equipos despues de historial jugado, conviene considerar versionado de equipos o snapshots de equipo por mini partido antes de permitir cambios profundos.

### Historial global

Primer corte recomendado: no persistir estadisticas globales. Crear builders puros:

```ts
type TrainingHistoryQuery = {
  from?: string;
  to?: string;
  teamPoolId?: string;
  playerId?: string;
  includeArchived?: boolean;
};

type TrainingPlayerCareerStats = {
  playerId: string;
  sessions: number;
  miniMatchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  attempts: number;
  effectiveness: number;
  shotsDefended: number;
  defenses: number;
  errors: number;
  ownPointsAgainst: number;
  plusMinus: number;
};
```

Persistir un cache solo si el rendimiento real lo exige y queda documentado.

## Impacto en UI

- `LineupCourt` debe aceptar una formacion o posiciones derivadas.
- `TrainingSessionsScreen` probablemente necesita extraer setup/detalle a componentes o pantallas si la edicion crece.
- Setup training agrega `Sugerir equipos`.
- Detalle training agrega acciones de edicion seguras.
- Nueva vista de historial training o seccion dentro de `Practica 3v3`.
- Nueva vista de jugador para estadisticas acumuladas.
- PDF training solo cambia despues de QA real y debe mantenerse imprimible/compartible.

## Impacto en estado/persistencia

- Formaciones: campo opcional, migracion default o preferencia local.
- Auto-balance: no persiste nada especial hasta que el usuario crea la sesion.
- Edicion: acciones de store deben validar estado de sesion, mini partidos activos, equipos usados y compatibilidad.
- Historial/global stats: derivado de `trainingSessions`; no guardar duplicados en v1.
- Backup/import debe seguir incluyendo sesiones completas y tolerar campos opcionales nuevos.

## Testing plan

### Dominio

- Presets de formacion generan 7 posiciones dentro de bounds.
- `3-1-3` conserva el layout visual legacy.
- Auto-balance crea equipos validos, sin duplicados y con fallback deterministico.
- Edicion bloquea cambios inseguros y permite cambios seguros.
- Historial acumula multiples sesiones y excluye cancelados.
- Stats globales toleran sesiones vacias, archivadas, legacy y jugadores sin eventos.

### Store/persistencia

- Migracion tolera sesiones/matches sin campos nuevos.
- Acciones de edicion actualizan `updatedAt`.
- Backup/export/import preserva campos nuevos opcionales.
- Restore recalcula/normaliza sin romper historial.

### UI/manual

- Cambiar formacion no rompe sustituciones, intercambios ni undo.
- `Sugerir equipos` genera propuesta editable.
- Editar una sesion draft guarda cambios y reiniciar app los conserva.
- Intentar editar equipos con historial muestra bloqueo claro.
- Historial global coincide con la suma de sesiones individuales.
- PDF training se revisa en dispositivo real antes y despues del ajuste.

Validaciones antes de cerrar cada implementacion:

```bash
npm test
npx tsc --noEmit
```

## Riesgos

- Editar `playerIds` de equipos con eventos puede reescribir el significado historico de stats.
- Auto-balance puede parecer mas inteligente de lo que es si no hay suficientes datos o niveles manuales.
- Mezclar estadisticas formales y training puede producir comparaciones injustas.
- Historial global puede ser pesado si se recalcula sin memoizacion sobre muchas sesiones.
- Cambiar `LineupCourt` puede afectar sustituciones y swaps en vivo.
- PDF training puede verse distinto segun visor, tamaño de hoja o sistema operativo.

## Preguntas abiertas

- Confirmar si las formaciones 3-1-3, 4-3 y 3-4 aplican solo al partido formal de 7 jugadores.
- Definir si auto-balance debe usar solo historial training o tambien un nivel manual por jugador.
- Definir si sesiones archivadas entran por default en historial acumulado o solo con filtro.
- Definir si estadisticas globales v2 deben mezclar partidos formales y practicas.
- Definir si la edicion futura debe permitir corregir eventos puntuales ya registrados.
- Capturar dispositivo objetivo para el pulido PDF: telefono/tablet, Android/iOS, visor PDF y orientacion.

## Plan de implementacion

Ver `docs/plans/012-training-roadmap-and-player-history-plan.md`.

## Checklist de aceptacion

- [ ] Cada tarea pendiente tiene una etapa propuesta.
- [ ] Las dependencias entre historial, estadisticas y auto-balance estan claras.
- [ ] El modo formal queda protegido.
- [ ] `landingLocation` y ubicaciones training no se infieren desde formaciones ni jugadores.
- [x] La edicion de sesiones no reescribe historial jugado en el primer corte implementado.
- [ ] Las estadisticas globales v1 se derivan desde sesiones locales.
- [ ] El pulido PDF training queda atado a feedback real de dispositivo.
