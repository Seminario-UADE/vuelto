# Quickstart: validar la sugerencia del comercio

## 1. Tests (sin celular ni red)

```bash
npm run test -w @vuelto/mobile
npm run typecheck -w @vuelto/mobile
npm run lint
```

Cubren `src/data/sugerir-comercio.ts`: los anexos A y B de la spec (SC-001 y SC-002, en un test aparte que no se toca al ajustar el umbral), la lista de ajuste (R2), el texto del ticket, los nombres cortos, los dos rubros, los rubros sin comercio y el tiempo con 1.000 comercios (SC-005).

## 2. En la app (Expo Go o web)

1. Perfil → escenario «Ticket de ejemplo» → «Escanear ticket»: el ticket de ejemplo dice «Coto» y coincide exacto; se ve la línea «Coto · Supermercados» sin recuadro.
2. Carga a mano: escribir «COTO C.I.C.S.A.» y tocar afuera → recuadro con «Coto» primero. Tocarla → el campo pasa a «Coto» y aparece «Promo aplicada» si corresponde al día.
3. Escribir «Perfumería Raffe» y tocar afuera → recuadro sin sugerencias, con «Buscar otro comercio» y «No está en la lista».
4. «Buscar otro comercio» → escribir «jum» → aparece «Jumbo» (si está en el catálogo sincronizado).
5. Elegir una sugerencia y después cambiar el texto: la línea de confirmación desaparece y, al tocar afuera, se vuelve a buscar.
6. Desde una compra por confirmar: el comercio es el simulado y no aparece el recuadro.
7. Con VoiceOver o TalkBack: se anuncia el recuadro y cada sugerencia se lee con su nombre y rubro.
