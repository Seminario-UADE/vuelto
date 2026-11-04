import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { Icon, iconoDeRubro } from "@/components/icon";
import { ProgressSegments } from "@/components/progress-segments";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import type { Comercio, Rubro } from "@/data/contracts";
import { RUBROS } from "@/lib/rubros";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { comercioRepetido, MENSAJE_COMERCIO_REPETIDO, MENSAJES_ERROR, nombreRepetido } from "@/perfil/modelo";
import { confirmarComercios } from "@/store/perfil-remoto";
import { selectCatalogoComercios } from "@/store/selectores";
import { colors, fonts, radius, space, type as escala } from "@/theme";


/**
 * Comercios habituales (onboarding 3/5, configuración 2 de 2; issue #47). Opcional: «Saltar» no
 * guarda nada; «Continuar» guarda los elegidos en `comercios_habituales` en un solo pedido.
 */
const POR_RUBRO = 8;

export default function Comercios() {
  const dispatch = useAppDispatch();
  const guardados = useAppSelector((s) => s.perfil.comercios);
  // Los comercios de las promos guardadas, sin red (#43).
  const catalogo = useAppSelector(selectCatalogoComercios);
  // Por nombre, como los guarda la base. Los que ya estaban guardados no se vuelven a mandar.
  const [elegidos, setElegidos] = useState<string[]>(guardados.map((c) => c.nombre));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const grupos = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const lista = catalogo.filter((c) => norm(c.nombre).includes(norm(q.trim())));
    const por = new Map<Rubro, Comercio[]>();
    for (const c of lista) por.set(c.rubro, [...(por.get(c.rubro) ?? []), c]);
    // Con el corpus real son cientos: sin búsqueda, unos pocos por rubro; el resto, buscando.
    return [...por.entries()].map(([rubro, xs]) => [rubro, q.trim() ? xs : xs.slice(0, POR_RUBRO)] as const);
  }, [catalogo, q]);

  const seguir = async (guardar: boolean) => {
    if (guardar) {
      setEnviando(true);
      setError(null);
      // El thunk descarta los ya guardados y los repetidos («coto» = «Coto»).
      const r = await dispatch(confirmarComercios(elegidos));
      setEnviando(false);
      if (!r.ok) {
        const motivo = r.error === "duplicado" ? MENSAJE_COMERCIO_REPETIDO : MENSAJES_ERROR[r.error];
        setError(`${motivo}. Podés saltear este paso y agregarlos después desde Perfil.`);
        return;
      }
    }
    router.push("/primera-respuesta");
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <ProgressSegments total={2} actual={2} />,
          headerRight: () => (
            <Pressable
              onPress={() => void seguir(false)}
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
            {error ? (
              <Text variant="label" tone="warning" align="center">
                {error}
              </Text>
            ) : null}
            <Text variant="label" tone="inkSecondary" align="center">
              {elegidos.length === 0
                ? "Podés seguir sin elegir ninguno"
                : `${elegidos.length} ${elegidos.length === 1 ? "comercio elegido" : "comercios elegidos"}`}
            </Text>
            <Button label="Continuar" onPress={() => void seguir(true)} loading={enviando} disabled={enviando} />
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
        {grupos.length === 0 ? (
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
                  selected={nombreRepetido(elegidos, c.nombre)}
                  onPress={() => {
                    // Uno ya guardado no se desmarca acá: se saca desde Perfil (acá solo se agrega).
                    if (comercioRepetido(guardados, c.nombre)) return;
                    setElegidos((xs) =>
                      nombreRepetido(xs, c.nombre) ? xs.filter((x) => !nombreRepetido([x], c.nombre)) : [...xs, c.nombre],
                    );
                  }}
                />
              ))}
            </View>
          </View>
        ))}
      </Screen>
    </>
  );
}
