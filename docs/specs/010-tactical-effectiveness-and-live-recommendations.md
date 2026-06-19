# Spec 010 - Tactical Effectiveness And Live Recommendations

## Estado

Draft - Stage 1, Stage 2, Stage 3 y Stage 4 implementados

## Contexto

La app ya registra puntos de Uruguay, puntos rivales, puntos en contra, puntos en contra del rival, defensas Uruguay, defensas rivales con mapa, errores, sustituciones, mapas en vivo, resumenes por tiempo, resumen final, PDF y alertas tacticas.

La mejora pendiente es elevar la calidad tactica de esos datos. En particular, una `Defensa rival` representa un tiro de Uruguay que el rival defendio, bloqueo o salvo. Hoy el evento se registra con ubicacion (`defenseLocation`) pero sin asociar que jugador uruguayo tiro. Eso limita la lectura ofensiva individual: no se puede distinguir si un jugador esta siendo anulado, si tuvo muchos intentos defendidos, o si su efectividad bajo.

## Problema

1. `opponent_defense` no modela suficientemente bien el concepto tactico:
   - guarda donde nos defendieron;
   - no guarda quien tiro;
   - no permite atribuir tiros defendidos a jugadores.
2. No existe estadistica de efectividad ofensiva por jugador.
3. Las recomendaciones actuales no siempre reflejan roles defensivos:
   - hay logica que habla de asistencias aunque la app no las registra de forma fiable;
   - un jugador defensivo puede quedar marcado como poco involucrado solo por no anotar;
   - "participacion" debe considerar intentos de tiro y defensas, no solo goles.
4. LiveMatch necesita un bloque compacto de lectura tactica en vivo para priorizar alertas de alto valor.

## Objetivos

- Registrar nuevas defensas rivales asociadas al jugador uruguayo que tiro.
- Mantener compatibilidad con defensas rivales viejas sin `playerId`.
- Derivar efectividad ofensiva por jugador:
  - goles;
  - tiros defendidos por el rival;
  - tiros intentados;
  - porcentaje de efectividad.
- Mostrar barras visuales de rendimiento por jugador usando datos existentes:
  - ataque por puntos Uruguay normales;
  - defensa por defensas Uruguay.
- Mostrar efectividad por tiempo, final y PDF/report cuando corresponda.
- Agregar un bloque live de recomendaciones tacticas compacto y accionable.
- Mejorar insights para:
  - eliminar referencias a asistencias;
  - no castigar roles defensivos por no anotar;
  - detectar baja participacion solo cuando no hay tiros ni defensas;
  - detectar jugadores anulados o de baja efectividad.

## No Objetivos

- No agregar tracking de asistencias.
- No inferir `playerId` en defensas rivales historicas.
- No inferir ubicaciones desde posicion del jugador.
- No cambiar reglas de score.
- No cambiar puntos en contra ni puntos en contra del rival.
- No cambiar mapas existentes salvo para consumir datos nuevos.
- No agregar backend, auth, cloud ni servicios pagos.
- No reescribir toda la arquitectura de insights.
- No agregar dependencias pesadas de graficos.

## Definiciones Tacticas

- Defensa Uruguay: accion defensiva realizada por un jugador de Uruguay. Requiere `playerId`, no requiere mapa, no cambia score.
- Defensa rival: tiro de Uruguay defendido, bloqueado o salvado por el rival. Debe registrar:
  - jugador uruguayo que tiro (`playerId`) para eventos nuevos;
  - ubicacion donde el rival defendio (`defenseLocation`);
  - periodo, reloj y lineup snapshot.
- Goles: puntos normales de Uruguay con `playerId`; excluye `opponent_own_point`.
- Tiros defendidos por el rival: `opponent_defense` con `playerId`.
- Tiros intentados: `goles + tiros defendidos por el rival`.
- Efectividad: `goles / tiros intentados`.
- Sin tiros: estado para `shotAttempts === 0`; no debe mostrarse como 0% salvo que la UI lo necesite con etiqueta clara.
- Participacion registrada: intentos de tiro, goles, defensas Uruguay y opcionalmente errores. No incluye asistencias.

## Requisitos Funcionales

### A. Cambio de Modelo Para Defensa Rival

Estado actual:

- `OpponentDefenseEvent` tiene:
  - `kind: 'opponent_defense'`;
  - `team: 'opponent'`;
  - `defenseLocation: CourtLocation`.
- `recordOpponentDefense(defenseLocation)` no recibe jugador.
- `LiveMatchScreen` permite `Defensa rival` sin jugador seleccionado.

Estado objetivo para eventos nuevos:

- `OpponentDefenseEvent` debe aceptar `playerId?: string` por compatibilidad.
- Nuevos eventos deben guardar `playerId` obligatorio a nivel de flujo/store.
- El flujo debe ser:
  1. seleccionar jugador de Uruguay en cancha;
  2. tocar `Defensa rival`;
  3. abrir mapa;
  4. marcar donde el rival defendio el tiro;
  5. guardar `opponent_defense` con `playerId`, `defenseLocation`, `periodNumber`, `clock`, `lineupSnapshotId`.
- Si no hay jugador seleccionado:
  - mostrar `Seleccioná primero quién tiró.`
  - no abrir mapa.
- Si el jugador seleccionado ya no esta en cancha:
  - mostrar `Seleccioná un jugador en cancha.`
  - no abrir mapa.

Compatibilidad:

- Eventos viejos sin `playerId` no deben crashear.
- Eventos viejos sin `playerId` siguen apareciendo en mapas y conteos por zona.
- Eventos viejos sin `playerId` no entran en efectividad por jugador.
- No se debe migrar/inferir `playerId` historico.

### B. Estadisticas De Efectividad

Crear funciones puras en dominio, por ejemplo:

- `getPlayerOffensiveEffectiveness(events)`
- `getPlayerOffensiveEffectivenessByPeriod(events, periodNumber)`
- `getRivalDefendedShotsByPlayer(events)`
- `getRivalDefendedShotsByPlayerByPeriod(events, periodNumber)`

Tipo sugerido:

```ts
type PlayerEffectivenessStat = {
  playerId: string;
  goals: number;
  rivalDefensesAgainst: number;
  shotAttempts: number;
  effectiveness: number | undefined;
};
```

Reglas:

- `goals`: puntos Uruguay normales con `playerId`.
- `rivalDefensesAgainst`: `opponent_defense` con `playerId`.
- `shotAttempts = goals + rivalDefensesAgainst`.
- `effectiveness = goals / shotAttempts`.
- `shotAttempts === 0`: `effectiveness` debe ser `undefined` y UI debe mostrar `Sin tiros` o `-`.
- Excluir `pointSource: 'opponent_own_point'`.
- Excluir `punto_en_contra`.
- Excluir `opponent_defense` sin `playerId`.
- No inferir datos faltantes.

Disponibilidad:

- Live recommendations.
- Resumen por tiempo.
- Resumen final.
- PDF/reporte.

Estado Stage 3:

- PDF/reporte incluye efectividad por periodo y total.
- Texto compartible incluye resumen compacto de efectividad.
- Defensas rivales antiguas sin `playerId` quedan excluidas y generan nota solo si existen.

### C. Barras De Rendimiento Por Jugador

Primera version implementada y extendida con efectividad tras el cambio de modelo de `Defensa rival`.

Objetivo:

- Dar una lectura visual rapida de contribucion por jugador sin esperar a la efectividad completa.
- Usar solo datos actuales confiables.
- Complementar la futura metrica de efectividad.

Columnas:

1. `Ataque`
   - `pointsByPlayer`: puntos normales de Uruguay con `playerId`.
   - `totalTeamPoints`: suma de esos puntos.
   - `playerAttackShare = playerPoints / totalTeamPoints`.
2. `Defensa`
   - `defensesByPlayer`: defensas Uruguay con `playerId`.
   - `totalTeamDefenses`: suma de esas defensas.
   - `playerDefenseShare = playerDefenses / totalTeamDefenses`.

Reglas:

- Excluir `punto en contra rival` de ataque.
- Excluir puntos rivales de ataque.
- Excluir eventos sin `playerId`.
- Excluir `Defensa rival` de defensa Uruguay.
- Si no hay puntos:
  - `Sin puntos registrados.`
- Si no hay defensas:
  - `Sin defensas registradas.`
- No agregar libreria de charts.
- Usar barras horizontales con Views de React Native.

Disponibilidad:

- Live:
  - mostrar jugadores actualmente en cancha aunque tengan cero puntos/defensas;
  - usar datos del tiempo actual;
  - mantener orden de cancha si es posible.
- Resumen por tiempo:
  - usar datos de ese tiempo;
  - incluir jugadores con stats y/o jugadores que estuvieron en snapshots del tiempo.
- Resumen final:
  - usar totales del partido;
  - mostrar jugadores con stats del partido.

Implementado en Stage 2:

- Cuando `Defensa rival` tiene `playerId`, la columna de ataque muestra puntos, tiros atajados por el rival y efectividad.
- Las defensas rivales legacy sin `playerId` no entran en efectividad individual.
- Estas barras alimentaran la futura `Lectura en vivo`.

Refinamiento implementado posteriormente:

- La barra de `Ataque` usa dos capas:
  - capa suave de fondo: tiros generados por el jugador (`goals + rivalDefensesAgainst`);
  - capa fuerte frontal: puntos convertidos.
- El ancho de ambas capas usa el total de tiros del equipo como denominador para que, si todos los tiros del jugador fueron gol, la capa frontal complete su capa de intentos.
- La fila muestra un resumen compacto como `4/6 tiros · 67%`.
- `opponent_own_point`, puntos rivales y defensas rivales legacy sin `playerId` no cuentan como tiros individuales.
- `Defensa` mantiene barra simple por defensas Uruguay.

### D. Bloque Live De Recomendaciones

Agregar un bloque full-width en `LiveMatchScreen`.

Ubicacion sugerida:

- Debajo de mapas en vivo y area de cambios/sustituciones.
- En telefono, no debe desplazar acciones criticas fuera del primer viewport mas de lo necesario.
- En tablet landscape, puede ubicarse debajo de la columna de mapas o debajo del grid principal.

Texto:

- Titulo: `Alertas tácticas` o `Lectura en vivo`.
- Mostrar 2 a 5 alertas maximo.
- Cada alerta debe ser corta, escaneable y accionable.

Tipos de alerta iniciales:

1. Jugador bloqueado seguido:
   - `{player} está siendo defendido seguido: {n} tiros defendidos.`
2. Baja efectividad:
   - `{player} lleva {goals}/{attempts} en tiros. Probar otra zona o rotación.`
3. Errores repetidos:
   - `Muchos errores de {player}: {n}.`
4. Zona rival repetida:
   - `Nos están entrando varias pelotas por {zone}.`
5. Zona donde nos defienden:
   - `El rival nos está defendiendo seguido en {zone}.`
6. Sin participacion:
   - `{player} todavía no registra tiros ni defensas.`
   - Solo despues de suficientes eventos/tiempo.
7. Aporte defensivo fuerte:
   - `{player} sostiene defensa: {n} defensas.`

Estado Stage 4:

- Implementado con `src/domain/liveRecommendations.ts` y `LiveRecommendationsPanel`.
- Usa solo eventos del tiempo actual.
- Muestra maximo 12 recomendaciones desde el refinamiento posterior de Stage 4.
- Prioridad:
  1. puntos en contra repetidos;
  2. errores repetidos;
  3. jugador anulado;
  4. baja efectividad;
  5. zona vulnerable;
  6. zona bloqueada;
  7. baja participacion;
  8. aporte defensivo.
- No menciona asistencias.
- Jugadores con defensas Uruguay no se marcan como baja participacion.
   - Debe ayudar a no marcar a ese jugador como bajo involucramiento.
- `Lo están anulando` solo se muestra como alerta de ajuste si el jugador tiene al menos 3 intentos, 2 tiros defendidos por el rival y efectividad menor a 75%.
- Si tiene 2+ tiros defendidos por el rival pero mantiene 75% o mas de efectividad, se muestra como dato neutral: `Le están defendiendo tiros`.
- `Baja efectividad` usa al menos 4 intentos y efectividad menor a 75%.
- `Buen rendimiento ofensivo` puede aparecer como dato neutral con 4+ intentos y 75% o mas de efectividad, siempre con prioridad baja para no tapar alertas urgentes.

Priorizacion:

- Criticas primero.
- Evitar duplicar mensajes equivalentes.
- Limitar ruido.
- Preferir alertas accionables sobre datos obvios.

### I. Polish Visual De Resumenes

Estado: implementado como polish posterior a Stage 4.

- `PeriodSummaryScreen` agrega un encabezado oscuro con resultado del tiempo, marcador del tiempo y marcador global.
- El resumen del tiempo agrega tarjetas compactas de lectura rapida:
  - `Ataque`;
  - `Defensa`;
  - `Errores`;
  - `Efectividad`.
- `Alertas tácticas` del tiempo usan chips `Atención`, `Ajuste` y `Dato` con acentos de color.
- `Lectura del tiempo` reemplaza alertas genericas en el resumen del periodo y reutiliza recomendaciones reales calculadas desde eventos de ese tiempo.
- La lectura del tiempo muestra hasta 8 recomendaciones concretas con numeros de puntos, tiros, errores, defensas y zonas.
- `Rendimiento del tiempo` queda antes de mapas para priorizar lectura de jugadores.
- Los mapas se agrupan bajo `Mapas del tiempo`.
- `FinalSummaryScreen` reutiliza el mismo lenguaje visual en forma liviana con encabezado y tarjetas de totales.
- `PlayerPerformanceBars` mejora contraste y jerarquia visual de ataque/defensa sin agregar dependencias.
- `Rendimiento en vivo` ordena ataque por puntos, intentos, efectividad y orden de cancha.
- En defensa ordena por defensas, share defensivo y orden de cancha.
- Los mejores aportes de ataque/defensa se resaltan con chip `Top`.
- El resaltado incluye los dos primeros grupos de ranking y conserva empates.
- Los goleadores de alto volumen no quedan penalizados solo por no tener 100% de efectividad.
- `LiveMatchScreen` agrupa acciones por contexto:
  - Uruguay: `Punto Uruguay`, `Defensa`, `Error`;
  - rival: `Punto rival`, `Defensa rival`, `En contra rival`.
- `Últimas acciones` aprovecha mejor el espacio en tablet/landscape y muestra mas acciones recientes.
- `createTacticalInsights` elimina el uso visible de asistencias en baja participacion y considera tiros/defensas para no castigar roles defensivos.
- No cambia modelos, scoring, eventos, mapas ni PDF/export.

### J. Sectores Tacticos Por Angulo

Estado: implementado como propagacion tactica posterior a Stage 4C.

- Se agrega `deriveTacticalCourtSector(location, frameOrSide?)` en `src/domain/court.ts`.
- No cambia el modelo de eventos ni las coordenadas normalizadas guardadas.
- La derivacion usa:
  - `frame` cuando existe (`left-frame`/`right-frame`);
  - si no existe, la mitad horizontal de la cancha para elegir `marco izquierdo` o `marco derecho`;
  - `y` normalizado para aproximar un angulo estable de 0° a 180°.
- Bandas:
  - `0°-30°`: sector de fondo;
  - `30°-60°`: sector bajo/intermedio;
  - `60°-120°`: zona media cerca de 90°;
  - `120°-150°`: sector alto/intermedio;
  - `150°-180°`: fondo opuesto.
- Labels visibles:
  - `marco derecho · 30°-60°`;
  - `marco izquierdo · 60°-120°`.
- `Lectura en vivo`, `Lectura del tiempo`, `Lectura final`, `createTacticalInsights` y reportes usan sectores para puntos rivales y defensas rivales.
- Las listas de final/PDF para `Zonas donde nos entraron` y `Zonas donde nos defendieron` usan sectores tacticos.
- Eventos antiguos sin ubicacion se ignoran; eventos antiguos con ubicacion siguen agrupando sin crashear.
- Las etiquetas genericas `zona izquierda`/`zona derecha` ya no se usan para alertas rivales.

### E. Mejora De Insights

Eliminar:

- Referencias a asistencias.
- Texto `no tiene puntos ni asistencias`.
- Penalizaciones a jugadores defensivos solo porque no anotan.

Reemplazar por:

- Involucramiento basado en:
  - tiros intentados;
  - goles;
  - defensas Uruguay;
  - errores si aporta contexto.
- Un jugador puede estar `sin participación` solo si:
  - esta en cancha;
  - no tiene tiros intentados;
  - no tiene goles;
  - no tiene defensas;
  - paso suficiente tiempo o suficientes eventos.
- Un jugador con varias defensas no debe aparecer como bajo involucramiento.
- Un jugador con muchos tiros defendidos y pocos goles debe aparecer como `anulado` o `baja efectividad`, no como poco involucrado.

### F. UI/UX

- Texto visible en español.
- Mantener acciones live rapidas.
- No agregar pasos a `Defensa Uruguay`.
- `Defensa rival` agrega requisito de jugador seleccionado, pero mantiene el mapa existente.
- Boton `Defensa rival` debe seguir visible y rapido.
- El bloque live debe:
  - ser compacto;
  - tener cards/chips de severidad (`Atención`, `Ajuste`, `Dato`);
  - no tapar botones;
  - funcionar en telefono y tablet.
- Las barras de rendimiento deben:
  - titularse `Rendimiento`, `Rendimiento en vivo`, `Rendimiento del tiempo` o `Rendimiento total`;
  - usar columnas `Ataque` y `Defensa`;
  - mostrar conteo, porcentaje y barra;
  - ser compactas y legibles en telefono/tablet.

### G. Reportes/PDF

Agregar tabla de efectividad:

- `Jugador`
- `Goles`
- `Tiros defendidos`
- `Tiros`
- `Efectividad`

Sugerencias:

- En resumen por tiempo: mostrar todos con intentos o top/bottom segun espacio.
- En resumen final/PDF: tabla completa o top + baja efectividad.
- Para rankings de efectividad, aplicar umbral minimo de intentos (por ejemplo 3) para evitar lecturas engañosas.
- Si hay defensas rivales viejas sin jugador:
  - incluir nota: `Algunas defensas rivales antiguas no tienen jugador asociado.`
  - seguir incluyendolas en mapas y totales de defensas rivales.

### H. Mapas

- Mapas actuales de `Dónde nos defendieron` deben seguir usando `defenseLocation`.
- Eventos `opponent_defense` viejos sin `playerId` siguen visibles en mapas.
- Eventos nuevos con `playerId` tambien se muestran en mapas.
- No inferir ubicaciones desde jugador.
- `punto en contra` y `punto en contra rival` siguen fuera de mapas de ubicacion.

## Requisitos No Funcionales

- Offline-first.
- Sin backend/auth/cloud.
- TypeScript estricto.
- Funciones derivadas puras en `src/domain`.
- Compatibilidad con eventos viejos.
- No duplicar datos derivados en estado persistido.
- No degradar performance en live match.
- Evitar dependencias nuevas.

## Cambios En Modelo De Datos

Cambio sugerido:

```ts
export type OpponentDefenseEvent = BaseMatchEvent & {
  kind: 'opponent_defense';
  team: 'opponent';
  playerId?: string;
  defenseLocation: CourtLocation;
};
```

Razon de `playerId?: string`:

- Nuevo flujo lo requiere.
- Datos viejos no lo tienen.
- Tests y funciones deben tratarlo como opcional.

Store:

- Cambiar `recordOpponentDefense(defenseLocation)` a una firma que reciba jugador:
  - opcion A: `recordOpponentDefense(playerId, defenseLocation)`;
  - opcion B: `recordOpponentDefense({ playerId, defenseLocation })`.
- Preferencia: objeto para reducir errores de orden y permitir extension futura.
- Store debe validar:
  - match activo;
  - periodo live;
  - `playerId` en cancha;
  - `defenseLocation` presente.

## Impacto En UI

Live:

- `Defensa rival` requiere jugador seleccionado.
- Feedback si falta jugador:
  - `Seleccioná primero quién tiró.`
- Feedback si no esta en cancha:
  - `Seleccioná un jugador en cancha.`
- Mapa mantiene:
  - `¿Dónde nos defendieron?`
  - `Marcá dónde el rival defendió el tiro.`

Resumenes:

- Agregar seccion `Efectividad ofensiva`.
- Mostrar `Sin tiros` cuando corresponda.
- Mantener `Defensas del rival` total y zonas.

PDF:

- Agregar tabla `Efectividad ofensiva`.
- Incluir nota de defensas antiguas sin jugador si existen.

## Impacto En Estadisticas

Agregar helpers derivados para:

- barras de rendimiento con datos actuales:
  - puntos normales de Uruguay por jugador;
  - defensas Uruguay por jugador;
  - porcentajes sobre total del equipo;
- efectividad total;
- efectividad por periodo;
- tiros defendidos por jugador;
- conteo de defensas rivales sin jugador para nota de compatibilidad;
- ranking bajo/alto por efectividad con umbral de intentos.

No cambiar:

- `calculateTotalScore`.
- `calculatePeriodScore`.
- `getPointsByPlayer` salvo que se reutilice en efectividad.
- Mapas de puntos.

## Impacto En Reportes/PDF

`buildMatchReportData` deberia incluir:

- `effectiveness` en cada `PeriodReportData`;
- `effectiveness` en `MatchReportData.totals`;
- `legacyOpponentDefensesWithoutPlayer` o similar para nota.

`reportHtml` deberia renderizar:

- tabla por periodo si hay intentos;
- tabla total;
- fallback `Sin tiros registrados`;
- nota de compatibilidad si hay defensas rivales sin jugador.

`buildMatchReportText` debe incluir resumen textual compacto.

Estado: implementado en Stage 3 con tabla HTML y linea compacta de texto.

## Impacto En Mapas

- `getOpponentDefenseEventsWithLocation` y live maps deben seguir aceptando eventos con/sin `playerId`.
- No se requiere cambio visual de mapa para MVP.
- Futuro posible: filtro por jugador en mapa de defensas rivales, fuera de alcance de este MVP.

## Testing Plan

Modelo/store:

- Nueva defensa rival requiere jugador seleccionado/on court.
- Defensa rival guarda `playerId` y `defenseLocation`.
- Defensa rival sin ubicacion no se guarda.
- Defensa rival no cambia score.
- Undo remueve defensa rival con `playerId`.
- No se puede registrar fuera de periodo live.

Compatibilidad:

- Eventos viejos `opponent_defense` sin `playerId` no crashean.
- Eventos viejos siguen en mapas.
- Eventos viejos se excluyen de efectividad por jugador.

Estadisticas:

- Barras de rendimiento:
  - `playerAttackShare` correcto;
  - `playerDefenseShare` correcto;
  - `opponent_own_point` excluido;
  - defensas rivales excluidas;
  - jugadores en cancha con cero stats aparecen en live;
  - period filtering correcto;
  - match totals correctos;
  - no division por cero.
- Efectividad calcula goles, tiros defendidos, intentos y porcentaje.
- `opponent_own_point` no cuenta como tiro.
- `punto_en_contra` no cuenta como tiro.
- Jugador sin intentos muestra estado seguro.
- Stats por periodo filtran correctamente.
- Stats finales suman correctamente.

Insights/recomendaciones:

- No se menciona `asistencias`.
- Jugador con defensas no se marca como sin participacion.
- Sin participacion requiere cero tiros y cero defensas.
- Baja efectividad aparece con umbral de intentos.
- Jugador defendido repetidamente aparece.
- Zona de defensa rival repetida aparece.
- Recomendaciones no crashean sin eventos.
- Recomendaciones maximo 2-5 items.

UI/reportes:

- `Defensa rival` sin jugador muestra feedback y no abre mapa.
- `Defensa rival` con jugador abre mapa.
- Ultimas acciones muestran etiqueta clara.
- Resumen por tiempo muestra efectividad.
- Resumen final muestra efectividad.
- PDF/text report incluye efectividad y nota legacy si aplica.
- Mapas siguen funcionando.

## Riesgos

- Agregar requisito de jugador a `Defensa rival` puede hacer el registro un toque mas lento.
- Alertas live pueden generar ruido si los umbrales son bajos.
- Efectividad puede interpretarse mal con pocos intentos.
- Eventos viejos sin `playerId` pueden producir totales de defensas rivales mayores que la suma por jugador.
- El bloque live puede ocupar demasiado espacio en telefono si no se diseña compacto.

## Preguntas Abiertas

- Umbral minimo para mostrar efectividad: 2 o 3 intentos?
- `Defensa rival` debe seleccionar el jugador antes o permitir elegirlo despues del mapa si no habia jugador?
- El label tactico debe ser `tiros defendidos`, `tiros bloqueados` o `tiros anulados`?
- Deben incluirse errores en la definicion de participacion o solo como alerta separada?
- El bloque live debe mostrarse siempre o solo cuando haya alertas?
- En PDF, mostrar todos los jugadores o solo quienes tuvieron intentos?
- En ultimas acciones, conviene mostrar `Defensa rival a tiro de {player}`?

## Plan Por Etapas

### Stage 0 - Barras De Rendimiento Con Datos Existentes

- Crear helper puro de rendimiento por jugador.
- Crear componente `PlayerPerformanceBars`.
- Integrar en live, resumen por tiempo y resumen final.
- Usar solo puntos Uruguay normales y defensas Uruguay.
- No cambiar modelo de eventos.
- No cambiar PDF.

### Stage 1 - Modelo Y Flujo De Defensa Rival

- Agregar `playerId?: string` a `OpponentDefenseEvent`.
- Cambiar store para guardar `playerId` en nuevas defensas rivales.
- Cambiar `LiveMatchScreen` para requerir jugador antes de abrir mapa.
- Mantener mapas y compatibilidad con eventos viejos.
- Tests de store/compatibilidad.

Estado: implementado en el corte 2026-06-18.

### Stage 2 - Efectividad Ofensiva

- Agregar helpers puros de efectividad.
- Agregar tests de formula y exclusiones.
- Mostrar en resumen por tiempo y final.

Estado: implementado dentro de `playerPerformance`, visible en barras live, resumen por tiempo y resumen final.

### Stage 3 - Reporte/PDF

- Extender `reportData`.
- Renderizar tabla en HTML/text.
- Agregar nota legacy.
- Tests de report data/html.

Estado: implementado en el corte 2026-06-18.

### Stage 4 - Bloque Live De Recomendaciones

- Crear helper puro para recomendaciones live.
- Integrar bloque compacto en `LiveMatchScreen`.
- Usar 2-5 alertas maximo.
- Tests de priorizacion y casos vacios.

Estado: implementado en el corte 2026-06-18.

Polish posterior:

- Maximo aumentado a 12 recomendaciones.
- Umbral de efectividad para alerta negativa ajustado a 75%.
- Jugadores con 75% o mas de efectividad y tiros defendidos por el rival reciben nota informativa, no alerta negativa.
- El panel live usa filas compactas y dos columnas en ancho grande.
- Resumen por tiempo y resumen final recibieron mejoras visuales de jerarquia y color.

### Stage 5 - Mejora De Insights Existentes

- Eliminar referencias a asistencias.
- Ajustar baja participacion para considerar tiros y defensas.
- Agregar alertas de baja efectividad/anulado.
- Tests de no ruido y defensive roles.

Estado parcial: limpieza de baja participacion implementada en el polish posterior a Stage 4. Ya no menciona asistencias y no marca como bajo involucramiento a jugadores con defensas o tiros defendidos por el rival.

## Checklist De Aceptacion

- [x] Nuevas defensas rivales guardan `playerId`.
- [x] Barras de rendimiento por jugador implementadas con datos existentes.
- [x] Ataque usa puntos normales Uruguay por jugador.
- [x] Defensa usa defensas Uruguay por jugador.
- [x] `punto en contra rival` queda excluido de barras de ataque.
- [x] Defensas rivales quedan excluidas de barras de defensa Uruguay.
- [x] Live muestra jugadores en cancha con cero stats.
- [x] Resumen por tiempo muestra barras de rendimiento.
- [x] Resumen final muestra barras de rendimiento.
- [x] `Defensa rival` requiere jugador seleccionado en cancha.
- [x] Eventos viejos sin `playerId` no crashean.
- [x] Eventos viejos sin `playerId` siguen en mapas.
- [x] Eventos viejos sin `playerId` no entran en efectividad.
- [x] Efectividad calcula goles, tiros defendidos, tiros y porcentaje.
- [x] `opponent_own_point` no cuenta como tiro.
- [x] `punto_en_contra` no cuenta como tiro.
- [x] Resumen por tiempo muestra efectividad.
- [x] Resumen final muestra efectividad.
- [x] PDF/text report muestra efectividad.
- [x] Bloque live muestra alertas tacticas compactas.
- [x] Bloque live muestra hasta 12 recomendaciones.
- [x] Jugadores con alta efectividad no reciben alerta negativa de anulado por pocos tiros defendidos.
- [x] Resumen del tiempo mejora jerarquia visual con header, tarjetas e insights coloreados.
- [x] Insights no mencionan asistencias.
- [x] Jugadores con defensas no se marcan como sin participacion.
- [ ] No se agregan backend/auth/cloud.
- [ ] `landingLocation` y `defenseLocation` siguen siendo fuente de verdad para ubicaciones.
- [ ] `npm test` pasa.
- [ ] `npx tsc --noEmit` pasa.
