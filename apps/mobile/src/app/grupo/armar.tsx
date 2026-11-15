import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { Icon, iconoDeRubro } from "@/components/icon";
import { MontoInput } from "@/components/monto-input";
import { OptionRow } from "@/components/option-row";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import type { IntegranteGrupo } from "@/data/contracts";
import { fechaCorta, iniciales, parseMonto } from "@/lib/format";
import { grupoArmado } from "@/store/contactos";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectComercioSimulado, selectHoy } from "@/store/selectores";
import { colors, fonts, radius, rubroColors, size, space, type as escala } from "@/theme";

/**
 * Armar grupo (ADR-008): vos, tus contactos vinculados y gente sin cuenta (solo el nombre,
 * vive mientras dura el grupo). El primario va en un pie fijo que no tapa la lista (P2 #7).
 */
export default function ArmarGrupo() {
  const p = useLocalSearchParams<{ comercio?: string; monto?: string }>();
  const dispatch = useAppDispatch();
  const hoy = useAppSelector(selectHoy);
  const contactos = useAppSelector((s) => s.contactos.lista);
  const ejemplo = api.getGrupoDeEjemplo();
  const desdeComercio = Boolean(p.comercio);
  const fecha = desdeComercio ? hoy : ejemplo.fecha;
  const nombre = desdeComercio ? null : ejemplo.nombre;

  // El mismo comercio que resolvió el «+» (G-04), sin red (#43); sin él, el del grupo de ejemplo.
  // Si la ruta pide otro que el de la simulación, no se arma el grupo con uno que no se eligió.
  const simulado = useAppSelector(selectComercioSimulado);
  const comercio = desdeComercio ? (simulado?.id === p.comercio ? simulado : null) : ejemplo.comercio;

  const [monto, setMonto] = useState<number | null>(desdeComercio ? parseMonto(p.monto ?? "") : ejemplo.monto);
  const [excluidos, setExcluidos] = useState<string[]>([]);
  const [sinCuenta, setSinCuenta] = useState<string[]>(desdeComercio ? [] : ["Sofía"]);
  const [nuevo, setNuevo] = useState("");

  const elegidos = contactos.filter((c) => !excluidos.includes(c.id));
  const cantidad = 1 + elegidos.length + sinCuenta.length;
  const listo = monto !== null && cantidad >= 2;

  const agregar = () => {
    const n = nuevo.trim();
    if (!n) return;
    setSinCuenta((xs) => [...xs, n]);
    setNuevo("");
  };

  const ver = () => {
    if (!listo || comercio === null || monto === null) return;
    const integrantes: IntegranteGrupo[] = [
      { tipo: "vos" },
      ...elegidos.map((c) => ({ tipo: "contacto" as const, contactoId: c.id })),
      ...sinCuenta.map((n) => ({ tipo: "sin-cuenta" as const, nombre: n })),
    ];
    dispatch(grupoArmado({ nombre, comercio, monto, fecha, integrantes }));
    router.push("/grupo/resultado");
  };

  if (comercio === null) {
    // El comercio ya no se puede resolver (por ejemplo, salió del corpus al sincronizar): se avisa
    // en vez de esconder el encabezado sin decir nada (G-04).
    return (
      <Screen>
        <EmptyState
          title="No encontramos ese comercio"
          body="Volvé a elegirlo en «¿Con qué pago?» para armar el grupo."
          action={{ label: "Volver", onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Text variant="label" tone="inkSecondary" align="center">
            {cantidad} {cantidad === 1 ? "persona" : "personas"}
            {monto === null ? " · falta el monto" : cantidad < 2 ? " · sumá a alguien más" : ""}
          </Text>
          <Button label="Ver quién conviene que pague" onPress={ver} disabled={!listo} />
        </>
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Avatar icon={iconoDeRubro[comercio.rubro]} rubro={rubroColors[comercio.rubro]} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyLg" weight="semibold">
            {nombre ?? comercio.nombre}
          </Text>
          <Text variant="label" tone="inkSecondary">
            {nombre ? `${comercio.nombre} · ` : ""}
            {fecha === hoy ? "hoy" : `sábado ${fechaCorta(fecha)}`}
          </Text>
        </View>
      </View>

      <Card>
        <MontoInput value={monto} onChange={setMonto} label="Monto total" />
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader title="¿Quiénes están?" />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            minHeight: size.rowMin,
            paddingHorizontal: space.lg,
            borderRadius: radius.row,
            backgroundColor: colors.surface,
          }}
        >
          <Avatar icon="perfil" tone="activo" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyLg" weight="semibold">
              Vos
            </Text>
            <Text variant="label" tone="inkSecondary">
              Siempre en el grupo
            </Text>
          </View>
        </View>
        {contactos.map((c) => {
          const sel = !excluidos.includes(c.id);
          return (
            <OptionRow
              key={c.id}
              kind="check"
              title={c.nombre}
              detail="Contacto vinculado · usamos su tope"
              selected={sel}
              onPress={() => setExcluidos((xs) => (sel ? [...xs, c.id] : xs.filter((x) => x !== c.id)))}
              leading={<Avatar letras={c.iniciales} tone={sel ? "activo" : "neutral"} />}
            />
          );
        })}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Sin cuenta en Vuelto" />
        {sinCuenta.map((n, i) => (
          <View
            key={`${n}-${i}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              minHeight: size.rowMin,
              paddingLeft: space.lg,
              borderRadius: radius.row,
              backgroundColor: colors.surface,
            }}
          >
            <Avatar letras={iniciales(n)} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyLg" weight="semibold">
                {n}
              </Text>
              <Text variant="label" tone="inkSecondary">
                Agregada a mano · no conocemos su tope
              </Text>
            </View>
            <Pressable
              onPress={() => setSinCuenta((xs) => xs.filter((_, j) => j !== i))}
              accessibilityRole="button"
              accessibilityLabel={`Sacar a ${n} del grupo`}
              style={{ width: size.hit + 8, height: size.hit, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="cerrar" size={18} color={colors.inkSecondary} />
            </Pressable>
          </View>
        ))}
        <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
          <TextInput
            value={nuevo}
            onChangeText={setNuevo}
            onSubmitEditing={agregar}
            placeholder="Nombre de alguien sin cuenta"
            placeholderTextColor={colors.inkSecondary}
            accessibilityLabel="Nombre de alguien sin cuenta"
            returnKeyType="done"
            selectionColor={colors.accent}
            style={{
              flex: 1,
              minHeight: 48,
              paddingHorizontal: space.lg,
              borderRadius: radius.row,
              borderWidth: 1.5,
              borderColor: colors.controlBorder,
              fontFamily: fonts.regular,
              fontSize: escala.bodyLg.fontSize,
              color: colors.ink,
            }}
          />
          <Pressable
            onPress={agregar}
            disabled={!nuevo.trim()}
            accessibilityRole="button"
            accessibilityLabel="Agregar al grupo"
            style={{
              minHeight: 48,
              minWidth: 48,
              paddingHorizontal: space.md,
              borderRadius: radius.control,
              backgroundColor: colors.surfaceStrong,
              alignItems: "center",
              justifyContent: "center",
              opacity: nuevo.trim() ? 1 : 0.5,
            }}
          >
            <Icon name="agregar" size={22} />
          </Pressable>
        </View>
      </View>

      <Button label="¿Falta alguien con Vuelto? Invitalo" variant="text" icon="invitar" onPress={() => router.push("/contactos/invitar")} />
    </Screen>
  );
}
