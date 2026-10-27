import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "@/components/card";
import { ComercioSearch } from "@/components/comercio-search";
import { CompraRow } from "@/components/compra-row";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { MontoInput } from "@/components/monto-input";
import { RecomendacionCard } from "@/components/recomendacion";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Skeleton, SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import { TopeResumen } from "@/components/tope-card";
import * as api from "@/data/api";
import type { Comercio } from "@/data/contracts";
import { useSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { useColumns } from "@/hooks/use-columns";
import { fechaLarga } from "@/lib/format";
import { hapticoSeleccion } from "@/lib/haptics";
import { colors, radius, space } from "@/theme";

/**
 * Inicio: "¿Dónde vas a comprar?" con la respuesta en la misma tarjeta al tocar un
 * comercio (auditoría P1 #1). Sin campana (P2 #14) y sin "Te devolvieron" (P2 #13).
 */
export default function Inicio() {
  const [comercio, setComercio] = useState<Comercio | null>(null);
  const [monto, setMonto] = useState<number | null>(null);
  const cambios = useSesion((s) => s.comprasNuevas.length);
  const perfil = useAsync(() => api.getPerfil());
  const rec = useAsync(
    () => (comercio ? api.recomendar(comercio.id, monto) : Promise.resolve(null)),
    `${comercio?.id ?? "-"}:${monto ?? "-"}`,
  );
  const topes = useAsync(() => api.getTopes(), cambios);
  const compras = useAsync(() => api.getCompras(), cambios);
  const columnas = useColumns();

  const elegir = (c: Comercio) => {
    hapticoSeleccion();
    setComercio((actual) => (actual?.id === c.id ? null : c));
    setMonto(null);
  };

  const r = rec.datos && comercio && rec.datos.comercio.id === comercio.id ? rec.datos : null;
  const sinCompras = compras.datos?.compras.length === 0;
  const medios = topes.datos?.medios ?? [];
  const filas: (typeof medios)[] = [];
  for (let i = 0; i < medios.length; i += columnas) filas.push(medios.slice(i, i + columnas));

  return (
    <Screen kind="tab" aboveTabBar>
      <View style={{ gap: space.xs }}>
        <Text variant="titleLg" accessibilityRole="header">
          Hola, {perfil.datos?.nombre ?? "Martín"}
        </Text>
        <Text variant="bodyMd" tone="inkSecondary">
          Hoy es {fechaLarga(api.getHoy())}
        </Text>
      </View>

      <Card gap={space.lg} padding={space.xl}>
        <View style={{ gap: space.xs }}>
          <Text variant="titleMd" accessibilityRole="header">
            ¿Dónde vas a comprar?
          </Text>
          <Text variant="bodyMd" tone="inkSecondary">
            Tocá el comercio y te decimos con qué pagar.
          </Text>
        </View>
        <ComercioSearch onElegir={elegir} seleccionado={comercio?.id ?? null} />
      </Card>

      {comercio && !r ? <Skeleton height={190} r={radius.card} /> : null}
      {r ? (
        <Animated.View entering={FadeInDown.duration(220)}>
          <RecomendacionCard r={r}>
            {r.resultado === "recomendado" ? (
              <MontoInput
                value={monto}
                onChange={setMonto}
                onDecision
                hint="Con el monto te decimos cuánto te devuelven."
              />
            ) : null}
            <Pressable
              onPress={() => router.push({ pathname: "/comercio/[id]", params: { id: r.comercio.id, monto: monto ?? "" } })}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalle de ${r.comercio.nombre}`}
              style={{ flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 44 }}
            >
              <Text variant="bodyMd" weight="semibold" style={{ color: colors.onDecision, flex: 1 }}>
                Ver detalle y otras opciones
              </Text>
              <Icon name="chevron" size={18} color={colors.onDecision} />
            </Pressable>
          </RecomendacionCard>
        </Animated.View>
      ) : null}

      <Pressable
        onPress={() => router.push("/escanear")}
        accessibilityRole="button"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          minHeight: 64,
          paddingHorizontal: space.lg,
          borderRadius: radius.row,
          backgroundColor: colors.surface,
        }}
      >
        <Icon name="camara" size={22} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyLg" weight="semibold">
            ¿Ya compraste? Escaneá el ticket
          </Text>
          <Text variant="label" tone="inkSecondary">
            Así tus topes quedan al día
          </Text>
        </View>
        <Icon name="chevron" size={18} color={colors.inkSecondary} />
      </Pressable>

      {sinCompras ? (
        <EmptyState
          title="Todavía no registraste compras"
          body="Cuando registres la primera, vas a ver cuánto tope te queda."
          action={{ label: "Registrar compra", onPress: () => router.navigate("/comprar") }}
        />
      ) : (
        <>
          <View style={{ gap: space.md }}>
            <SectionHeader
              title="Tus topes"
              action={{ label: "Ver todos", onPress: () => router.navigate("/topes") }}
            />
            {topes.datos ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
                  <Icon name="calendario" size={16} color={colors.inkSecondary} />
                  <Text variant="label" tone="inkSecondary">
                    Los mensuales se reinician en {topes.datos.reinicioMensualEnDias} días
                  </Text>
                </View>
                {filas.map((fila, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: space.md }}>
                    {fila.map((t) => (
                      <TopeResumen key={t.medio.id} t={t} />
                    ))}
                    {fila.length < columnas ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ))}
              </>
            ) : (
              <SkeletonList rows={2} height={150} />
            )}
          </View>

          <View style={{ gap: space.sm }}>
            <SectionHeader
              title="Últimas compras"
              action={{ label: "Ver todas", onPress: () => router.push("/mis-compras") }}
            />
            {compras.datos ? (
              <Card padding={space.lg} gap={0}>
                {compras.datos.compras.slice(0, 3).map((c, i) => (
                  <View key={c.id} style={divisor(i)}>
                    <CompraRow c={c} />
                  </View>
                ))}
              </Card>
            ) : (
              <SkeletonList rows={3} />
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
