# Specs

Cada feature significativa empieza con una spec antes de implementar.

Una spec debe ayudar a Codex y al desarrollador a acordar que se va a construir, que queda fuera y como se validara. No necesita ser larga, pero si concreta.

Las specs deben definir:

- Problema.
- Objetivos.
- No objetivos.
- Usuarios o casos de uso.
- Flujo esperado.
- Impacto en modelo de datos.
- Impacto en UI.
- Impacto en estado y persistencia.
- Plan de testing.
- Preguntas abiertas.

Actualizar la spec si la implementacion cambia el plan.

Flujo recomendado:

1. Copiar `000-template.md`.
2. Nombrar el archivo con numero y nombre corto, por ejemplo `001-court-map-input.md`.
3. Completar la spec en estado `Draft`.
4. Revisarla contra `docs/constitution.md`.
5. Pasarla a `Approved` antes de implementar.
6. Pasarla a `Implemented` cuando la feature quede validada.
