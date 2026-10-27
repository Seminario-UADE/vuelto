import type { ReactNode } from "react";
import { View } from "react-native";
import type { Alternativa, Recomendacion } from "@/data/contracts";
import { aprox } from "@/lib/format";
import { colors, space } from "@/theme";
import { Avatar } from "./avatar";
import { DecisionCard } from "./decision-card";
import { Text } from "./text";

/**
 * Pinta una `Recomendacion` tal como llega del servidor: la app no calcula nada, solo
 * elige qué texto mostrar. Sin monto no hay "Te devuelven" (auditoría P1 #1).
 */
export function RecomendacionCard({ r, children }: { r: Recomendacion; children?: ReactNode }) {
  if (r.resultado === "sin-promo" || !r.medio) {
    const agotado = r.alternativas.find((a) => a.estado === "agotado");
    return (
      <DecisionCard
        titulo={`Hoy ningún medio tuyo tiene reintegro en ${r.comercio.nombre}`}
        razonIcon="info"
        razon={
          r.proximaPromo
            ? `Cuándo sí: ${r.proximaPromo}`
            : agotado
              ? `${agotado.titulo}: ${agotado.motivo}`
              : "Pagá con el medio que prefieras."
        }
      >
        {children}
      </DecisionCard>
    );
  }

  const conMonto = r.reintegro !== null;
  const sinBase = r.topeDisponible === null;
  return (
    <DecisionCard
      titulo={`Te conviene ${r.medio.nombre}`}
      inicial={r.medio.inicial}
      razon={r.razon}
      cifra={
        conMonto
          ? { etiqueta: "Te devuelven", valor: aprox(r.reintegro ?? 0), clave: `r${r.reintegro}` }
          : sinBase
            ? null
            : { etiqueta: "Te quedan de tope", valor: aprox(r.topeDisponible ?? 0), clave: `t${r.topeDisponible}` }
      }
      secundaria={conMonto && r.teSale !== null ? `Te sale ${aprox(r.teSale)}` : null}
      tope={
        r.topeDespues
          ? {
              texto:
                r.topeDespues.disponible === 0
                  ? "Con esta compra agotás el tope"
                  : `Te quedan ${aprox(r.topeDespues.disponible)} de tope después de esta compra`,
            }
          : null
      }
      base={r.base?.texto ?? null}
    >
      {children}
    </DecisionCard>
  );
}

/** Alternativa descartada, compacta y con su motivo (DESIGN.md §6). */
export function AlternativaRow({ a }: { a: Alternativa }) {
  return (
    <View
      accessible
      accessibilityLabel={`${a.titulo}: ${a.motivo}`}
      style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm }}
    >
      <Avatar letras={a.inicial} size={32} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMd" weight="semibold">
          {a.titulo}
        </Text>
        <Text variant="label" style={{ color: a.estado === "agotado" ? colors.error : colors.inkSecondary }}>
          {a.motivo}
        </Text>
      </View>
    </View>
  );
}
