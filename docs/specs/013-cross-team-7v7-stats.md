# Spec 013 - Estadística 7v7 (partido entre dos cuadros)

## Estado

Draft - Planning (docs-only). Sin implementación todavía.

## Contexto

La app ya registra partidos formales de Uruguay y deriva estadísticas ricas: efectividad ofensiva por jugador, defensas por jugador, mapas de tiros/defensas, sectores tácticos por ángulo, resúmenes por tiempo, resumen final, PDF/texto y recomendacion

es en vivo. Todo ese flujo asume un modelo asimétrico:

- `Match.opponent` es solo un nombre, sin roster (`src/domain/types.ts`).
- `TeamSide = 'uruguay' | 'opponent'` está cableado.
- `Score = { uruguay: number; opponent: number }`.
- Eventos atribuyen jugador solo del lado Uruguay; el rival agrega totales/zonas, no jugadores.
- El formato es fijo: 7 titulares y 3 tiempos de 15 minutos.

También existe `Practica 3v3` (`src/domain/training.ts`), que ya demostró el patrón de un modelo separado y simétrico con varios equipos internos, stats individuales por equipo, mapas y PDF propio, sin contaminar `Match`.

El cuerpo técnico necesita ahora una herramienta para **observar y analizar partidos entre dos cuadros cualesquiera** (por ejemplo, scouting de delegaciones rivales por categoría durante un torneo), registrando a **ambos** equipos con el mismo nivel de detalle.

## Problema

No existe forma de registrar un partido entre dos equipos completos y obtener estadísticas individuales y por zona de los dos. El modo formal solo trackea a Uruguay en detalle y no permite:

- cargar dos planteles arbitrarios (no Uruguay);
- atribuir puntos, tiros, defensas y errores a jugadores de **ambos** equipos;
- analizar de cada cuadro quién tira y desde dónde, quién defiende y dónde, y dónde pierde/recibe puntos;
- usar un formato configurable (jugadores por equipo y cantidad/duración de tiempos).

Forzar `Match` para esto rompería el flujo formal estable, que la constitución exige preservar.

## Objetivos

- Agregar un modo nuevo llamado **`Estadística 7v7`**, accesible desde Home bajo la categoría **`Partido`**.
- Permitir crear un partido entre **dos cuadros cualesquiera**, con planteles **precargados** y **editables antes de arrancar**.
- Trackear a los **dos equipos de forma simétrica**, con stats individuales completas de ambos.
- Mantener formato **configurable**: jugadores por equipo y cantidad/duración de tiempos, con default 7 jugadores y 3 tiempos de 15 minutos.
- Registrar en vivo los datos de valor de ambos equipos con **deshacer** confiable: puntos (con ubicación en cancha), tiros defendidos, defensas, errores/pérdidas.
- Usar una **cancha compartida con dos marcos** para ubicar puntos y defensas de ambos cuadros (reusando la geometría existente).
- Mostrar **resumen por cada tiempo** y **resumen final** con: dónde tiró cada equipo, quién tiró, dónde defendió cada equipo, destacados de ataque/defensa y zonas flojas (dónde pierden/reciben puntos). Solo información estadística, **sin recomendaciones tácticas**.
- **Exportar PDF** del análisis y **persistir el partido localmente** para reabrirlo y volver a exportarlo en sesiones futuras.
- Preservar intactos el modo formal, `Practica 3v3`, `Modo Entrenamiento`, scoring, mapas, reportes y backups existentes.

## No objetivos

- No modificar `Match`, `MatchEvent`, scoring formal, pantallas, reportes ni mapas del modo formal.
- No modificar `Practica 3v3` ni `Modo Entrenamiento`.
- No agregar backend, autenticación, cloud sync ni servicios pagos.
- No agregar dependencias pesadas (charts, etc.).
- No inferir ubicaciones desde la posición del jugador; `landingLocation` sigue siendo la única fuente de verdad de ubicación.
- No priorizar stats en vivo durante la carga (el valor está en el resumen por tiempo y final).
- No implementar CRUD avanzado de planteles dentro de este modo más allá de seleccionar y ajustar convocados antes de arrancar.
- No romper backups v2 existentes.

## Usuarios / Casos de uso

- Un analista del cuerpo técnico va a la tribuna a observar `Brasil` vs `Argentina` (categoría Mayores) y quiere registrar el partido para scouting.
- Antes de arrancar, ajusta el roster de cada cuadro (alguien no vino, cambió un dorsal).
- Durante el partido, carga puntos, tiros defendidos, defensas y errores de ambos equipos, marcando ubicación en la cancha.
- Si se equivoca, deshace el último evento.
- Al terminar cada tiempo, revisa el resumen del tiempo.
- Al final, revisa el resumen final, exporta el PDF y guarda el partido para volver a consultarlo/exportarlo más adelante.

## Flujo esperado

### Setup

1. Home → categoría `Partido` → `Estadística 7v7`.
2. Pantalla de partidos de estadística (lista + crear).
3. Crear partido:
   - elegir **cuadro local** y **cuadro visitante** desde planteles precargados;
   - opcionalmente filtrar/identificar por **categoría** (p. ej. Mayores, Sub-18);
   - ajustar convocados de cada cuadro (editar antes de arrancar);
   - confirmar formato (jugadores por equipo, cantidad/duración de tiempos) con defaults 7 / 3×15;
   - elegir titulares iniciales de cada equipo (cantidad = jugadores por equipo).
4. Se crea el partido en estado `draft`.

### Registro en vivo

1. Entrar al partido y empezar el primer tiempo.
2. Flujo principal: tocar el jugador del equipo que ejecutó la acción → elegir qué pasó.
3. Acciones por jugador:
   - `Punto`: abre la cancha de dos marcos, marca dónde cayó el punto, registra punto al equipo del jugador.
   - `Lo atajaron` / tiro defendido: marca ubicación y exige el defensor del equipo rival (obligatorio); no cambia score.
   - `Defensa`: registra defensa del jugador; no cambia score.
   - `Error` / pérdida: Pérdida de pelota, Tiro errado (no toca el marco), Se les cae / mal rebote, Invasión o zona prohibida, Pisa la línea o Punto en contra; solo `Punto en contra` suma al rival.
4. `Deshacer` revierte el último evento y recalcula el score.
5. Al cumplir el tiempo, cerrar el tiempo y ver `Resumen del tiempo`.
6. Repetir por cada tiempo configurado.
7. Al terminar, ver `Resumen final` y exportar PDF.

### Revisión posterior

- El partido queda persistido y se puede reabrir desde la lista.
- Desde el detalle/resumen se puede volver a exportar el PDF.

## Requisitos funcionales

- Modelo y store **nuevos y simétricos**, separados de `Match` y de `Training`.
- Dos equipos con `id`, `name`, `category?` y `playerIds`.
- Eventos atribuibles a cualquier equipo y a cualquier jugador de ese equipo.
- Score por equipo (no `{ uruguay, opponent }`).
- Periodos configurables: cantidad y duración; default 3 × 15 min.
- Jugadores por equipo configurable; default 7.
- Puntos guardan `landingLocation` en la cancha de dos marcos.
- Tiros defendidos guardan ubicación y el defensor rival (obligatorio).
- Defensas y errores se atribuyen a un jugador del equipo en cancha.
- `Punto en contra` suma un punto al equipo contrario y cuenta como intento errado del ejecutor.
- `Deshacer` remueve el último evento y recalcula score/estado.
- Stats derivadas (no persistidas como fuente independiente) por equipo y jugador:
  - puntos, intentos, efectividad ofensiva;
  - tiros defendidos por el rival;
  - defensas;
  - errores/pérdidas;
  - mapas de tiros y de defensas por equipo;
  - zonas/sectores tácticos donde convierte y donde le defienden/anotan.
- Resumen por tiempo y resumen final por equipo, con destacados de ataque/defensa y zonas flojas.
- Export PDF del análisis del partido.
- Persistencia local del partido (reabrir y re-exportar).
- Inclusión del modo en el backup/import local sin romper compatibilidad.

## Requisitos no funcionales

- Offline-first.
- Sin backend/auth/cloud.
- TypeScript estricto.
- Cálculos y stats como funciones puras en `src/domain`.
- Texto visible en español.
- Usable en teléfono y tablet; registro rápido y tappable.
- Sin dependencias nuevas salvo justificación explícita en esta spec.
- No duplicar lógica: reusar geometría, sectores y patrones de efectividad existentes.
- No degradar el flujo formal ni los otros modos.

## Impacto en modelo de datos

Modelo nuevo propuesto (nombres internos en inglés; ajustables en implementación):

```ts
type StatsTeam = {
  id: string;
  name: string;
  category?: string;
  playerIds: string[];
};

type StatsMatchSettings = {
  playersPerTeam: number;     // default 7
  periodCount: number;        // default 3
  periodDurationSeconds: number; // default 900
};

type StatsMatchEvent = BaseEvent & {
  teamId: string;
  playerId?: string;
  kind: 'point' | 'shot_defended' | 'defense' | 'error' | 'own_point_against';
  location?: CourtLocation;        // landingLocation para puntos / ubicación de defensa
  defenderPlayerId?: string;       // OBLIGATORIO cuando kind === 'shot_defended'
  defendingTeamId?: string;        // OBLIGATORIO cuando kind === 'shot_defended'
  errorSubtype?: 'turnover' | 'missed_frame' | 'bad_rebound' | 'forbidden_zone' | 'line_step';
  scoreAfter?: { [teamId: string]: number };
};

type StatsMatch = {
  id: string;
  homeTeam: StatsTeam;
  awayTeam: StatsTeam;
  settings: StatsMatchSettings;
  status: 'draft' | 'live' | 'period_break' | 'finished' | 'cancelled';
  // periodos, reloj, lineups y eventos análogos al formal pero simétricos
  events: StatsMatchEvent[];
  createdAt: string;
  archivedAt?: string;
};
```

Reglas:

- Los cuadros (incluidos los ajenos/scouting) se cargan como `TeamPool` reutilizables y los equipos referencian jugadores globales por `id`; se reusa la infraestructura de `Gestionar planteles`. No se usa snapshot de roster ajeno por partido.
- `category` es metadata libre (texto), no un set fijo.
- `kind: 'error'` usa `errorSubtype`; `own_point_against` es su propio `kind` y suma +1 al rival. Los demás errores no cambian score.
- `shot_defended` siempre lleva `defenderPlayerId` y `defendingTeamId`.
- El marco al que se tiró se **infiere por zona** desde `location` (coordenada `x`), reusando la derivación de `deriveTacticalCourtSector`; no se agrega un campo de marco por evento. `landingLocation` sigue siendo la única fuente de verdad.
- El score se deriva de eventos por `teamId`.
- Eventos guardan periodo, reloj y, si aplica, snapshot de alineación.
- No se migran ni reinterpretan eventos del modo formal ni de training.

## Impacto en UI

- Home: nueva tarjeta `Estadística 7v7` bajo la sección `Partido` (`src/screens/HomeScreen.tsx`).
- Navegación: nuevas rutas (lista, live, resumen) en `src/utils/navigation.ts` y `App.tsx`.
- Pantalla de lista + setup de partido de estadística (selección de dos cuadros, edición de convocados, formato, titulares).
- Pantalla live con flujo jugador-céntrico y cancha de dos marcos compartida (reusar `CourtField`/`CourtMapInput`).
- Pantallas/resúmenes por tiempo y final con mapas y rendimiento por equipo.
- Acción `Exportar PDF` en el resumen/detalle.
- Todo el texto visible en español.

## Impacto en estado/persistencia

- Nuevo store (`useStatsMatchStore` sugerido) con persistencia propia (`STORAGE_KEYS.statsMatchState`).
- Acciones: crear, editar setup antes de iniciar, iniciar/cerrar tiempo, registrar evento, deshacer, finalizar, cancelar, archivar/eliminar, reabrir.
- Eventos como fuente de verdad de las stats; nada derivado se persiste como fuente independiente.
- Backup nuevo `v3` que incluya `statsMatches`; import sigue aceptando v1/v2 sin ese campo.

## Testing plan

Dominio (funciones puras, primero):

- score derivado por equipo;
- intentos = puntos + tiros defendidos + puntos en contra;
- efectividad segura con 0 intentos;
- atribución por jugador en ambos equipos;
- sectores/mapas por equipo;
- deshacer recalcula score/estado;
- eventos sin ubicación no rompen mapas.

Store/persistencia:

- crear partido válido / inválido (planteles incompletos, formato inválido);
- editar convocados solo antes de iniciar;
- registrar y deshacer eventos;
- persistencia y rehidratación;
- backup/import con y sin `statsMatches`.

Compatibilidad:

- modo formal, training y practice intactos;
- backups viejos importan sin `statsMatches`.

Manual QA:

- crear partido entre dos cuadros, ajustar roster, jugar tiempos, cargar eventos de ambos, deshacer, ver resúmenes y exportar PDF;
- reabrir el partido guardado y volver a exportar;
- confirmar que el modo formal y los modos de entrenamiento siguen funcionando.

## Riesgos

- El modelo simétrico es el cambio conceptual más grande; debe quedar aislado para no tocar el formal.
- La cancha de dos marcos debe reusar `courtVisual` para no duplicar geometría ni desalinear mapas.
- Setup configurable puede complejizar validaciones (jugadores por equipo variable).
- Precargar delegaciones ajenas como `TeamPool` (jugadores globales por `id`) puede duplicar registros si no se cuida el alta; evitar duplicados al sembrar cuadros.
- PDF nuevo debe ser un export separado, sin tocar el reporte formal.

## Decisiones resueltas

- **Cuadros ajenos**: se cargan como `TeamPool` reutilizables (no snapshot por partido); se reusa `Gestionar planteles`.
- **`category`**: metadata libre (texto), no un set fijo.
- **Marco de tiro**: se infiere por zona desde `landingLocation` (coordenada `x`), reusando `deriveTacticalCourtSector`; no se agrega campo de marco por evento. `landingLocation` sigue siendo la única fuente de verdad.
- **Tipos de error/pérdida** (conjunto tchoukball completo): `turnover` (Pérdida de pelota), `missed_frame` (Tiro errado, no toca el marco), `bad_rebound` (Se les cae / mal rebote), `forbidden_zone` (Invasión o zona prohibida), `line_step` (Pisa la línea) y `own_point_against` (Punto en contra). Solo `own_point_against` suma +1 al rival; el resto cuenta como error sin cambiar score.
- **`shot_defended`**: el defensor es **obligatorio**. Un tiro defendido siempre registra `defenderPlayerId` y `defendingTeamId` (información de alto valor).
- **Resumen por tiempo/final**: solo información estadística (mapas + rendimiento + zonas). No se reusan recomendaciones tácticas (`liveRecommendations`).
- **Backup**: versión nueva `v3` que agrega `statsMatches`; import sigue aceptando v1/v2.

## Plan de implementación

Ver `docs/plans/013-cross-team-7v7-stats-plan.md`.

## Checklist de aceptación

- [ ] `Estadística 7v7` aparece en Home bajo `Partido`.
- [ ] Se pueden elegir dos cuadros precargados y editar convocados antes de arrancar.
- [ ] Formato configurable con defaults 7 jugadores / 3×15 min.
- [ ] Se registran puntos, tiros defendidos, defensas y errores de **ambos** equipos.
- [ ] Puntos usan `landingLocation` en cancha de dos marcos.
- [ ] `Deshacer` recalcula score/estado.
- [ ] Resumen por tiempo y resumen final muestran dónde tiró/quién tiró/dónde defendió cada equipo y zonas flojas.
- [ ] Export PDF del análisis funciona.
- [ ] El partido persiste y se puede reabrir y re-exportar.
- [ ] Backup/import incluye los partidos de estadística sin romper compatibilidad.
- [ ] Modo formal, `Practica 3v3` y `Modo Entrenamiento` quedan intactos.
- [ ] `landingLocation` sigue siendo la única fuente de ubicación.
- [ ] `npm test` pasa.
- [ ] `npx tsc --noEmit` pasa.
