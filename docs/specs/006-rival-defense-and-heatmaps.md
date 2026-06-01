# Spec 006 - Defensa rival y mapas visuales

## Estado

Implemented

## Contexto

La app ya registra `Defensa` como accion de un jugador de Uruguay: requiere jugador en cancha, no usa mapa y no cambia el score. En pruebas de campo aparecio una necesidad distinta: registrar cuando el rival defiende un ataque de Uruguay. En ese caso no se conoce jugador rival, pero si importa donde se produjo la defensa.

Los resumenes ya muestran mapas de puntos con `landingLocation`. La nueva informacion debe integrarse sin inferir ubicaciones desde posiciones de jugadores.

## Problema

El concepto actual `Defensa` mezcla mentalmente dos situaciones:

- Defensa Uruguay: accion defensiva hecha por un jugador uruguayo.
- Defensa rival: el rival defendio nuestro ataque en una zona de la cancha.

Ademas, los resumenes necesitan mapas mas claros para:

- donde hicimos puntos;
- donde nos hicieron puntos;
- donde nos defendieron.

## Objetivos

- Mantener `Defensa Uruguay` como defensa por jugador uruguayo.
- Agregar `Defensa rival` como evento de equipo rival con ubicacion de cancha.
- Reutilizar `CourtMapInput` para capturar donde nos defendieron.
- No exigir jugador uruguayo para `Defensa rival`.
- No cambiar score para ningun tipo de defensa.
- Hacer ambos tipos undoables.
- Mostrar `Defensa rival` en ultimas acciones, resumen por tiempo, resumen final y reporte.
- Agregar mapas visuales con puntos/densidad para puntos de Uruguay, puntos del rival y defensas del rival.
- Mantener compatibilidad con eventos viejos sin ubicacion.

## No objetivos

- No trackear roster ni identidad de jugadores rivales.
- No agregar backend, auth, cloud sync ni servicios pagos.
- No agregar dependencias pesadas de heatmap.
- No cambiar reglas de puntos, `landingLocation`, timer, cambios, errores, undo ni PDF base.
- No inferir ubicaciones desde posicion del jugador.

## Usuarios / Casos de uso

- Cuerpo tecnico registra una defensa uruguaya para contar rendimiento individual.
- Cuerpo tecnico registra que el rival defendio un ataque y marca la zona en el mapa.
- En el entretiempo se revisa donde el rival esta defendiendo nuestros ataques.
- Al final se comparte un reporte con totales y zonas de defensas rivales.

## Flujo esperado

1. La grilla de acciones en vivo muestra dos acciones lado a lado:
   - `Defensa`
   - `Defensa rival`
2. Usuario toca `Defensa`:
   - suma defensa al jugador seleccionado;
   - no abre modal;
   - no abre mapa.
3. Usuario toca `Defensa rival`:
   - abre mapa para marcar donde nos defendieron;
   - no requiere jugador uruguayo.
4. `Defensa` requiere jugador uruguayo seleccionado y en cancha.
5. `Defensa rival` requiere ubicacion.
6. Confirmar ubicacion guarda el evento y muestra `Defensa rival registrada`.

## Requisitos funcionales

- Agregar evento:

```ts
type OpponentDefenseEvent = BaseMatchEvent & {
  kind: 'opponent_defense';
  team: 'opponent';
  defenseLocation: CourtLocation;
};
```

- `Defensa Uruguay` conserva `kind: 'defense'`, `team: 'uruguay'`, `playerId`.
- `Defensa rival` no tiene `playerId`.
- `Defensa rival` no cambia score.
- `Defensa rival` solo se registra en periodo live.
- `Defensa rival` requiere `defenseLocation`.
- Undo elimina el evento y actualiza mapas/resumenes.
- Mapas ignoran eventos sin ubicacion.
- `Punto en contra` y `Punto en contra rival` no aparecen en mapas.
- Reporte incluye defensas Uruguay por jugador y defensas del rival total/zonas/periodo.
- Textos visibles en espanol y sin enums crudos.

## Requisitos no funcionales

- Offline-first.
- TypeScript strict.
- Mantener eventos como fuente de verdad.
- Evitar dependencias nuevas.
- UI rapida y usable en telefono.
- Safe area y landscape preservados.

## Impacto en modelo de datos

- `MatchEvent` suma `OpponentDefenseEvent`.
- Persistencia local sigue guardando eventos en Zustand/AsyncStorage.
- No se agregan totales derivados persistidos.
- Eventos viejos siguen siendo seguros porque los mapas filtran por `kind` y presencia de ubicacion.

## Impacto en UI

- `LiveMatchScreen` muestra `Defensa` y `Defensa rival` como acciones divididas en la grilla, sin popup intermedio.
- `Defensa` registra inmediatamente la defensa del jugador seleccionado.
- `Defensa rival` abre directamente el mapa.
- `CourtMapInput` suma modo `opponent_defense` con textos:
  - `¿Dónde nos defendieron?`
  - `Marcá dónde el rival defendió nuestro ataque`
  - `Marcá primero dónde nos defendieron.`
- `PeriodSummaryScreen` y `FinalSummaryScreen` agregan `Dónde nos defendieron`.
- Las defensas propias se etiquetan como `Defensas Uruguay`.
- Las defensas rivales se etiquetan como `Defensas del rival`.

## Impacto en estado/persistencia

- Store agrega accion `recordOpponentDefense(location)`.
- La accion no guarda si no hay partido activo, periodo live o ubicacion.
- Undo usa el flujo existente de remover el ultimo evento.
- No hay migracion destructiva.

## Testing plan

- Store:
  - defensa Uruguay sigue funcionando.
  - defensa rival con ubicacion se registra.
  - defensa rival no requiere jugador.
  - defensa rival sin ubicacion no se registra.
  - defensa rival no cambia score.
  - undo elimina defensa rival.
  - no se registra fuera de periodo live.
- Stats:
  - defensas rivales por periodo y total.
  - defensas rivales por zona.
  - eventos viejos sin ubicacion no crashean.
  - puntos en contra y puntos en contra rival no aparecen en mapas.
- Insights:
  - aparece insight de zona si hay suficientes defensas rivales.
  - no aparecen enums crudos.
- Reporte:
  - data incluye totales/periodos/zonas de defensa rival.
  - HTML/texto usa labels en espanol.
  - no crashea sin defensas rivales.

## Riesgos

- Tocar `MatchEvent` impacta muchas funciones de stats y labels.
- El split directo ocupa la misma celda visual que una accion compuesta y evita un tap extra durante registro en vivo.
- Un heatmap real podria requerir dependencia; se elige densidad por puntos para reducir riesgo.
- Reporte PDF mantiene resumen textual de zonas, no mapa visual exportable.

## Preguntas abiertas

- Si en el futuro se trackea roster rival, `opponent_defense` podria sumar `opponentPlayerId`.
- Puede evaluarse un heatmap continuo real si la densidad de datos lo justifica.
- Puede agregarse filtro por tipo de ataque en una spec futura.

## Plan de implementacion

Ver `docs/plans/006-rival-defense-and-heatmaps-plan.md`.

## Checklist de aceptacion

- [x] Existe spec y plan.
- [x] `Defensa` y `Defensa rival` aparecen como acciones directas lado a lado.
- [x] `Defensa Uruguay` requiere jugador en cancha y no abre mapa.
- [x] `Defensa rival` abre mapa y no requiere jugador.
- [x] `Defensa rival` no cambia score.
- [x] Undo elimina defensa rival.
- [x] Resumen por tiempo muestra mapa `Dónde nos defendieron`.
- [x] Resumen final muestra mapa `Dónde nos defendieron`.
- [x] Reporte incluye defensas del rival.
- [x] Tests pasan.
- [x] TypeScript pasa.
