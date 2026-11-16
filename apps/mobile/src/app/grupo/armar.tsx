import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Icon, iconoDeRubro } from "@/components/icon";
import { MontoInput } from "@/components/monto-input";
import { OptionRow } from "@/components/option-row";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Text } from "@/components/text";
import type { SinCuentaEnGrupo } from "@/data/contracts";
import { MAXIMO_INTEGRANTES } from "@/grupo/vista";
import { iniciales, parseMonto } from "@/lib/format";
import { grupoArmado } from "@/store/grupo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectBuscarComercioPorId } from "@/store/selectores";
import { colors, fonts, radius, rubroColors, size, space, type as escala } from "@/theme";

/**
 * Armar grupo (ADR-008, spec 016 US3): vos, tus contactos vinculados y gente sin cuenta (solo el
 * nombre, que no sale del teléfono). La compra es la del paso de compra, de hoy, con su rubro y su
 * canal. Hasta 12 personas (FR-026). El primario va en un pie fijo que no tapa la lista (P2 #7).
 */
export default function ArmarGrupo() {
  const p = useLocalSearchParams<{ comercio?: string; monto?: string }>();
  const dispatch = useAppDispatch();
  const contactos = useAppSelector((s) => s.contactos.lista);
  const canal = useAppSelector((s) => s.simulacion.canal);
  // Del corpus guardado, sin red (#43). Sin rubro no se puede evaluar en grupo (G-04).
  const comercio = useAppSelector(selectBuscarComercioPorId)(p.comercio ?? "");

  const [monto, setMonto] = useState<number | null>(parseMonto(p.monto ?? ""));
  const [excluidos, setExcluidos] = useState<string[]>([]);
  const [sinCuenta, setSinCuenta] = useState<SinCuentaEnGrupo[]>([]);
  // La posición de carga de cada uno: no se reusa al sacar a alguien (spec 016 FR-002).
  const [proxima, setProxima] = useState(0);
  const [nuevo, setNuevo] = useState("");

  if (!comercio || comercio.categoriaId === null) {
    return (
      <Screen footer={<Button label="Volver al paso de compra" onPress={() => router.back()} />}>
        <Card padding={space.xl}>
          <Text variant="titleMd" accessibilityRole="header">
            No podemos armar un grupo para este comercio
          </Text>
          <Text variant="bodyMd" tone="inkSecondary">
            Para decidir quién conviene que pague necesitamos saber el rubro del comercio. Elegilo de la lista en el paso
            de compra.
          </Text>
        </Card>
      </Screen>
    );
  }
  const conRubro = { ...comercio, categoriaId: comercio.categoriaId };

  const elegidos = contactos.filter((c) => !excluidos.includes(c.id));
  const cantidad = 1 + elegidos.length + sinCuenta.length;
  const lleno = cantidad >= MAXIMO_INTEGRANTES;
  const listo = monto !== null && cantidad >= 2 && cantidad <= MAXIMO_INTEGRANTES;

  const agregar = () => {
    const n = nuevo.trim();
    if (!n || lleno) return;
    setSinCuenta((xs) => [...xs, { posicion: proxima, nombre: n }]);
    setProxima((x) => x + 1);
    setNuevo("");
  };

  const ver = () => {
    if (!listo || monto === null) return;
    dispatch(grupoArmado({ comercio: conRubro, canal, monto, contactos: elegidos.map((c) => c.id), sinCuenta }));
    router.push("/grupo/resultado");
  };

  return (
    <Screen
      footer={
        <>
          <Text variant="label" tone="inkSecondary" align="center">
            {cantidad} {cantidad === 1 ? "persona" : "personas"}
            {monto === null
              ? " · falta el monto"
              : cantidad < 2
                ? " · sumá a alguien más"
                : cantidad > MAXIMO_INTEGRANTES
                  ? ` · son más de ${MAXIMO_INTEGRANTES}`
                  : ""}
          </Text>
          <Button label="Ver quién conviene que pague" onPress={ver} disabled={!listo} />
        </>
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Avatar icon={iconoDeRubro[comercio.rubro]} rubro={rubroColors[comercio.rubro]} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyLg" weight="semibold">
            {comercio.nombre}
          </Text>
          <Text variant="label" tone="inkSecondary">
            hoy · {canal === "online" ? "online" : "en el local"}
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
        {sinCuenta.map(({ posicion, nombre: n }) => (
          <View
            key={posicion}
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
              onPress={() => setSinCuenta((xs) => xs.filter((x) => x.posicion !== posicion))}
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
            disabled={!nuevo.trim() || lleno}
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
              opacity: nuevo.trim() && !lleno ? 1 : 0.5,
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
