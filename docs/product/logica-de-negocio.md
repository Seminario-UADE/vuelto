# Lógica de negocio

Usuario final: gratis. La ingesta del corpus de promociones es 100%
automática (sin revisión humana, ver ADR-005), así que el costo principal no
es mantenimiento de una cola de revisión — es infraestructura y, a medida
que crece la cobertura, negociar los acuerdos con cada banco/billetera
(`Cómo crece`, abajo).

Ingresos potenciales:

- **Afiliación con billeteras/comercios:** el acuerdo formal que reemplaza el
  scraping sin permiso a medida que se suman bancos (ver `Cómo crece` abajo).
- **Destaque de comercios adheridos:** dentro de una recomendación, un
  comercio adherido puede pagar por aparecer resaltado cuando ya es una
  opción válida para el usuario — nunca se recomienda un medio de pago peor
  para forzar un destaque, eso rompería la regla de oro (`problema.md`).
- **Reportes agregados y anonimizados** de consumo, para bancos y comercios.

## Por qué el MVP arranca con una sola fuente (MODO)

No es solo una decisión técnica (`decisions/`, `fuentes-promos.md`): es la
base legal del modelo de negocio. MODO es la única de las 6 billeteras
relevadas sin restricción, ni sobre el método de acceso (su `robots.txt`
permite scraping y hasta nombra bots de IA como permitidos) ni sobre el
destino del contenido (a diferencia de Galicia y BBVA, que prohíben
"duplicación, copia, redistribución, comercialización" de su contenido sin
consentimiento escrito, o de Mercado Pago, que prohíbe explícitamente
scraping). Arrancar por la fuente sin fricción legal evita construir el
negocio sobre una base que un banco puede cortar con un cambio de términos.

## Cómo crece: de una fuente a un acuerdo por banco

El plan de crecimiento no es "scrapear más bancos sin permiso" — es pedir
**permiso explícito** a los bancos y billeteras más populares de Argentina
(los que hoy quedan bloqueados o en zona gris: Mercado Pago, Santander,
BBVA, Galicia) para consumir y mostrar sus promociones de forma formal, ya
sea como acuerdo de scraping autorizado o como acceso a datos vía API. Cada
banco sumado así es, a la vez, más cobertura para el usuario y una relación
comercial formal que puede convertirse en ingreso (afiliación, destaque,
acceso a datos agregados) en vez de una dependencia legal frágil.

Fuera de alcance del MVP, para esa etapa de crecimiento: negociar esos
acuerdos y reincorporar las fuentes bloqueadas (`alcance-mvp.md`).
