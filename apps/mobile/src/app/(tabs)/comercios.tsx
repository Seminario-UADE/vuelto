import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/card";
import { GrillaComercios } from "@/components/comercio-tile";
import { ComerciosDelPerfil } from "@/components/comercios-del-perfil";
import { FilaAccion } from "@/components/fila-accion";
import { Icon, iconoDeRubro } from "@/components/icon";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Text } from "@/components/text";
import type { Comercio } from "@/data/contracts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectComerciosFrecuentes, selectConvieneHoy } from "@/store/selectores";
import { comercioElegido } from "@/store/simulacion";
import { colors, radius, rubroColors, space } from "@/theme";

/**
 * Comercios (DESIGN.md v7 §6): un buscador que abre el «+», tus comercios en cuadrados (tocar uno
 * arranca la compra en el paso del monto) y «Hoy te conviene»: con qué pagar hoy en cada uno, la
 * misma recomendación del motor que da el «+», sin monto, y solo en los que tienen promo hoy (v9).
 * Agregar y sacar, detrás de «Editar».
 */
export default function Comercios() {
  const dispatch = useAppDispatch();
  const comercios = useAppSelector(selectComerciosFrecuentes);
  const conviene = useAppSelector(selectConvieneHoy);
  const habituales = useAppSelector((s) => s.perfil.comercios.length);
  const [editando, setEditando] = useState(false);

  const comprarEn = (c: Comercio) => {
    dispatch(comercioElegido(c.id));
    router.push("/comprar/monto");
  };

  return (
    <Screen kind="tab" aboveTabBar gap={space.xl}>
      <Text variant="titleLg" accessibilityRole="header">
        Comercios
      </Text>

      <Pressable
        onPress={() => router.push("/comprar")}
        accessibilityRole="search"
        accessibilityLabel="Buscar un comercio para comprar"
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          minHeight: 48,
          paddingHorizontal: space.lg,
          borderRadius: radius.control,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icon name="buscar" size={18} color={colors.inkSecondary} />
        <Text variant="bodyLg" tone="inkSecondary">
          Buscar un comercio
        </Text>
      </Pressable>

      <View style={{ gap: space.md }}>
        <SectionHeader
          title={habituales === 0 ? "Los más usados" : "Tus comercios"}
          action={{ label: editando ? "Listo" : "Editar", onPress: () => setEditando((v) => !v) }}
        />
        {editando ? (
          <ComerciosDelPerfil />
        ) : (
          <GrillaComercios comercios={comercios} onElegir={comprarEn} onAgregar={() => setEditando(true)} />
        )}
      </View>

      {editando ? null : conviene.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Hoy te conviene" />
          <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
            {conviene.map(({ comercio, recomendacion: r }, i) => (
              <View key={comercio.id} style={divisor(i)}>
                <FilaAccion
                  leading={<Avatar icon={iconoDeRubro[comercio.rubro]} forma="cuadrado" rubro={rubroColors[comercio.rubro]} />}
                  titulo={comercio.nombre}
                  detalle={`Con ${r.medio?.nombre ?? ""}${r.razon ? ` · ${r.razon}` : ""}`}
                  onPress={() => comprarEn(comercio)}
                />
              </View>
            ))}
          </Card>
          <Text variant="label" tone="inkSecondary">
            Según las promos de hoy y tus topes estimados. Con el monto, te decimos cuánto te devuelven.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Hoy te conviene" />
          <Text variant="bodyMd" tone="inkSecondary">
            Hoy ningún comercio tuyo tiene reintegro con tus medios. Igual podés buscar uno arriba.
          </Text>
        </View>
      )}
    </Screen>
  );
}
