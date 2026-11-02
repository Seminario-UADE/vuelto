import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { Icon, iconoDeRubro } from "@/components/icon";
import { ProgressSegments } from "@/components/progress-segments";
import { Screen } from "@/components/screen";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import type { Comercio, Rubro } from "@/data/contracts";
import { guardarPerfilLocal, usePerfilLocal } from "@/data/perfil-local";
import { useAsync } from "@/hooks/use-async";
import { RUBROS } from "@/lib/rubros";
import { colors, fonts, radius, space, type as escala } from "@/theme";


/** Comercios habituales (onboarding 3/5, configuración 2 de 2). Opcional. */
export default function Comercios() {
  const { perfil } = usePerfilLocal();
  const catalogo = useAsync(() => api.getCatalogoComercios());
  const [elegidos, setElegidos] = useState<string[]>(perfil.comercios);
  const [q, setQ] = useState("");

  const grupos = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const lista = (catalogo.datos ?? []).filter((c) => norm(c.nombre).includes(norm(q.trim())));
    const por = new Map<Rubro, Comercio[]>();
    for (const c of lista) por.set(c.rubro, [...(por.get(c.rubro) ?? []), c]);
    return [...por.entries()];
  }, [catalogo.datos, q]);

  const seguir = async (guardar: boolean) => {
    if (guardar) await guardarPerfilLocal({ comercios: elegidos });
    router.push("/primera-respuesta");
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <ProgressSegments total={2} actual={2} />,
          headerRight: () => (
            <Pressable
              onPress={() => seguir(false)}
              accessibilityRole="button"
              hitSlop={8}
              style={{ minHeight: 44, minWidth: 44, paddingHorizontal: space.sm, justifyContent: "center", alignItems: "center" }}
            >
              <Text variant="bodyMd" weight="semibold" tone="accent">
                Saltar
              </Text>
            </Pressable>
          ),
        }}
      />
      <Screen
        footer={
          <>
            <Text variant="label" tone="inkSecondary" align="center">
              {elegidos.length === 0
                ? "Podés seguir sin elegir ninguno"
                : `${elegidos.length} ${elegidos.length === 1 ? "comercio elegido" : "comercios elegidos"}`}
            </Text>
            <Button label="Continuar" onPress={() => seguir(true)} />
          </>
        }
      >
        <View style={{ gap: space.sm }}>
          <Text variant="titleLg" accessibilityRole="header">
            ¿Dónde comprás seguido?
          </Text>
          <Text variant="bodyLg" tone="inkSecondary">
            Opcional. Nos ayuda a sugerirte comercios más rápido en la caja. Vuelto funciona igual sin esto.
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            minHeight: 48,
            paddingHorizontal: space.lg,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceStrong,
          }}
        >
          <Icon name="buscar" size={20} color={colors.inkSecondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscá un comercio"
            placeholderTextColor={colors.inkSecondary}
            accessibilityLabel="Buscar comercio"
            returnKeyType="search"
            selectionColor={colors.accent}
            style={{ flex: 1, minHeight: 44, fontFamily: fonts.regular, fontSize: escala.bodyLg.fontSize, color: colors.ink }}
          />
        </View>
        {catalogo.estado === "cargando" && !catalogo.datos ? <SkeletonList rows={4} height={48} /> : null}
        {catalogo.datos && grupos.length === 0 ? (
          <Text variant="bodyMd" tone="inkSecondary">
            No encontramos “{q}”. Probá con otro nombre.
          </Text>
        ) : null}
        {grupos.map(([rubro, lista]) => (
          <View key={rubro} style={{ gap: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Icon name={iconoDeRubro[rubro]} size={18} color={colors.inkSecondary} />
              <Text variant="bodyMd" weight="semibold" tone="inkSecondary">
                {RUBROS[rubro].titulo}
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {lista.map((c) => (
                <Chip
                  key={c.id}
                  label={c.nombre}
                  selected={elegidos.includes(c.id)}
                  onPress={() =>
                    setElegidos((xs) => (xs.includes(c.id) ? xs.filter((x) => x !== c.id) : [...xs, c.id]))
                  }
                />
              ))}
            </View>
          </View>
        ))}
      </Screen>
    </>
  );
}
