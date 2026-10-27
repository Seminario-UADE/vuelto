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
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import type { IntegranteGrupo } from "@/data/contracts";
import { usePerfilLocal } from "@/data/perfil-local";
import { setSesion, useSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { fechaCorta, iniciales, parseMonto } from "@/lib/format";
import { colors, fonts, radius, size, space, type as escala } from "@/theme";

/**
 * Armar grupo (ADR-008): vos, tus contactos vinculados y gente sin cuenta (solo el nombre,
 * vive mientras dura el grupo). El primario va en un pie fijo que no tapa la lista (P2 #7).
 */
export default function ArmarGrupo() {
  const p = useLocalSearchParams<{ comercio?: string; monto?: string }>();
  const ejemplo = api.getGrupoDeEjemplo();
  const desdeComercio = Boolean(p.comercio);
  const comercioId = p.comercio || ejemplo.comercioId;
  const fecha = desdeComercio ? api.getHoy() : ejemplo.fecha;
  const nombre = desdeComercio ? null : ejemplo.nombre;

  const { perfil } = usePerfilLocal();
  const version = useSesion((s) => s.contactosQuitados.length + s.contactosAceptados.length);
  const comercio = useAsync(() => api.getComercio(comercioId), comercioId);
  const contactos = useAsync(() => api.getContactos(), version);

  const [monto, setMonto] = useState<number | null>(desdeComercio ? parseMonto(p.monto ?? "") : ejemplo.monto);
  const [excluidos, setExcluidos] = useState<string[]>([]);
  const [sinCuenta, setSinCuenta] = useState<string[]>(desdeComercio ? [] : ["Sofía"]);
  const [nuevo, setNuevo] = useState("");

  const elegidos = (contactos.datos ?? []).filter((c) => !excluidos.includes(c.id));
  const cantidad = 1 + elegidos.length + sinCuenta.length;
  const listo = monto !== null && cantidad >= 2;

  const agregar = () => {
    const n = nuevo.trim();
    if (!n) return;
    setSinCuenta((xs) => [...xs, n]);
    setNuevo("");
  };

  const ver = () => {
    if (!listo || monto === null) return;
    const integrantes: IntegranteGrupo[] = [
      { tipo: "vos" },
      ...elegidos.map((c) => ({ tipo: "contacto" as const, contactoId: c.id })),
      ...sinCuenta.map((n) => ({ tipo: "sin-cuenta" as const, nombre: n })),
    ];
    setSesion({ grupo: { nombre, comercioId, monto, fecha, integrantes } });
    router.push("/grupo/resultado");
  };

  if (!perfil.cuenta) {
    return (
      <Screen>
        <EmptyState
          title="Para armar un grupo, guardá tu perfil"
          body="Los contactos se vinculan entre cuentas: así cada uno decide qué comparte."
          action={{ label: "Guardar mi perfil", onPress: () => router.push("/login") }}
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
      {comercio.datos ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <Avatar icon={iconoDeRubro[comercio.datos.rubro]} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyLg" weight="semibold">
              {nombre ?? comercio.datos.nombre}
            </Text>
            <Text variant="label" tone="inkSecondary">
              {nombre ? `${comercio.datos.nombre} · ` : ""}
              {fecha === api.getHoy() ? "hoy" : `sábado ${fechaCorta(fecha)}`}
            </Text>
          </View>
        </View>
      ) : null}

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
        {contactos.datos ? (
          contactos.datos.map((c) => {
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
          })
        ) : (
          <SkeletonList rows={2} height={64} />
        )}
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
              borderRadius: radius.pill,
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
