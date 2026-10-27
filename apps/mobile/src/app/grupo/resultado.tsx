import { router } from "expo-router";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { DecisionCard } from "@/components/decision-card";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Skeleton, SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { setSesion, useSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { aprox, iniciales, pesos } from "@/lib/format";
import { hapticoExito } from "@/lib/haptics";
import { colors, radius, space } from "@/theme";

/**
 * Gasto en grupo: quién conviene que pague y cuánto pone cada uno. De un contacto solo se
 * muestra lo de ADR-008 §3; sin estados de cobro (DESIGN.md §10).
 */
export default function GastoEnGrupo() {
  const pedido = useSesion((s) => s.grupo);
  const r = useAsync(
    () => (pedido ? api.recomendarGrupo(pedido) : Promise.resolve(null)),
    pedido ? JSON.stringify(pedido) : null,
  );
  const g = r.datos;

  const confirmar = () => {
    if (!g?.quienPaga) return router.dismissAll();
    hapticoExito();
    setSesion({
      aviso: g.quienPaga.esVos ? `Listo: pagás vos con ${g.medio}` : `Listo: paga ${g.quienPaga.nombre} con ${g.medio}`,
    });
    router.dismissAll();
  };

  if (!pedido) {
    return (
      <Screen>
        <Text variant="bodyLg">Armá el grupo primero.</Text>
        <Button label="Armar grupo" onPress={() => router.replace("/grupo/armar")} />
      </Screen>
    );
  }

  const n = pedido.integrantes.length;
  const titulo = g?.quienPaga
    ? g.quienPaga.esVos
      ? "Te conviene pagar vos"
      : `Te conviene que pague ${g.quienPaga.nombre}`
    : "Nadie del grupo tiene reintegro en esta compra";

  return (
    <Screen
      footer={
        g ? (
          <Button
            label={g.quienPaga ? (g.quienPaga.esVos ? "Confirmar que pago yo" : `Confirmar que paga ${g.quienPaga.nombre}`) : "Listo"}
            onPress={confirmar}
          />
        ) : null
      }
    >
      <Text variant="bodyMd" tone="inkSecondary">
        {g ? `${g.nombre ?? g.comercio.nombre} · ${g.cuando} · ${pesos(g.monto)} · ${n} personas` : " "}
      </Text>

      {g ? (
        <DecisionCard
          titulo={titulo}
          inicial={g.quienPaga && !g.quienPaga.esVos ? iniciales(g.quienPaga.nombre) : null}
          razon={g.medio && g.razon ? `Con ${g.medio} · ${g.razon}` : null}
          razonIcon={g.quienPaga ? "checkCirculo" : "info"}
          cifra={
            g.reintegro !== null
              ? { etiqueta: "Les devuelven", valor: aprox(g.reintegro), clave: `g${g.reintegro}` }
              : null
          }
          secundaria={g.reintegro !== null ? `Cada uno pone ${aprox(g.partePorPersona)}` : `Cada uno pone ${pesos(g.partePorPersona)}`}
          base={g.base?.texto ?? null}
        />
      ) : (
        <Skeleton height={240} r={radius.card} />
      )}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Cómo queda cada uno" />
        {g ? (
          <Card padding={space.lg} gap={0}>
            {g.integrantes.map((i, k) => (
              <View
                key={`${i.nombre}-${k}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.md,
                  paddingVertical: space.md,
                  borderTopWidth: k ? 1 : 0,
                  borderColor: colors.divider,
                }}
              >
                {i.esVos ? <Avatar icon="perfil" /> : <Avatar letras={i.iniciales} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyLg" weight="semibold">
                    {i.nombre}
                  </Text>
                  <Text variant="label" tone="inkSecondary">
                    {i.detalle}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text variant="label" tone="inkSecondary">
                    su parte
                  </Text>
                  <Text variant="bodyLg" weight="semibold" tabular>
                    {g.reintegro !== null ? aprox(g.partePorPersona) : pesos(g.partePorPersona)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <SkeletonList rows={n} height={56} />
        )}
      </View>

      <Text variant="label" tone="inkSecondary">
        La división se muestra, no se cobra: cada uno registra sus propias compras.
      </Text>
    </Screen>
  );
}
