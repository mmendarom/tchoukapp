# Decision: Court Map Normalized Coordinates

## Date

2026-05-27

## Status

Accepted

## Context

La app registra donde cae la pelota cuando Uruguay o el rival convierte un punto. El mapa debe funcionar en telefonos y tablets, en distintos tamanos de pantalla y potencialmente en portrait y landscape.

El dato debe persistir offline y seguir siendo util aunque cambie el tamano visual del mapa. Tambien debe permitir recalcular zonas tacticas derivadas sin depender de la zona default del jugador.

## Decision

Usar coordenadas normalizadas como unica fuente de verdad para la ubicacion de caida del punto:

```ts
landingLocation: { x: number; y: number }
```

Donde:

- `x` va de `0` a `1`.
- `y` va de `0` a `1`.
- `0,0` representa la esquina superior izquierda del mapa medido.
- `1,1` representa la esquina inferior derecha del mapa medido.
- Las zonas tacticas se derivan desde estas coordenadas.

## Consequences

Beneficios:

- El dato es independiente del tamano real del dispositivo.
- El mapa puede renderizarse en phone, tablet, portrait o landscape.
- Los resumenes pueden usar el mismo dato exacto.
- Las zonas tacticas pueden cambiar de criterio sin migrar eventos.
- Evita inferir ubicacion desde jugador o posicion default.

Costos:

- La captura y el render deben usar exactamente el mismo sistema de coordenadas.
- Hay que testear conversiones de tap a coordenada normalizada.
- Eventos viejos sin `landingLocation` deben seguir soportados.
- Si cambia el dibujo del mapa, se debe mantener el contrato semantico de coordenadas.
- La captura del tap debe usar el rectangulo real medido de la cancha, no una medida inicial ficticia.
- El render del marcador debe convertir la coordenada normalizada usando el mismo ancho y alto medidos.
- La app permite rotacion con configuracion Expo `"orientation": "default"` para que el mapa sea mas preciso en landscape sin agregar dependencias.

## Alternatives considered

- Guardar pixeles absolutos: rechazado porque no escala entre dispositivos/orientaciones.
- Guardar solo zona tactica: rechazado porque pierde precision y no permite nuevos analisis.
- Inferir zona desde jugador: rechazado porque no representa donde realmente cayo la pelota.
- Usar coordenadas SVG/viewBox: posible en el futuro, pero hoy no se usa SVG y agregaria complejidad innecesaria.
