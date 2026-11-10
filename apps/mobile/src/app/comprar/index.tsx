import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { GrillaComercios } from "@/components/comercio-tile";
import { Icon } from "@/components/icon";
import { Paso } from "@/components/paso";
import { Text } from "@/components/text";
import { buscarComercios, RUBROS_DE_MODO } from "@/data/comercios";
import type { Comercio } from "@/data/contracts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCatalogoComercios, selectComerciosFrecuentes, selectFrescura } from "@/store/selectores";
import { comercioElegido } from "@/store/simulacion";
import { colors, fonts, radius, space, type as escala } from "@/theme";

/**
 * Paso 1: ¿Dónde estás comprando? Buscador y tus comercios; tocar uno avanza solo. Busca en los
 * comercios del corpus guardado, sin red (#43). Sin comercio, se elige el rubro (spec 004 FR-001).
 */
export default function PasoComercio() {
  const dispatch = useAppDispatch();
  const [q, setQ] = useState("");
  const frecuentes = useAppSelector(selectComerciosFrecuentes);
  const frescura = useAppSelector(selectFrescura);
  const habituales = useAppSelector((st) => st.perfil.comercios.length);
  const catalogo = useAppSelector(selectCatalogoComercios);
  const [porRubro, setPorRubro] = useState(false);
  const buscando = q.trim() !== "";
  const lista = useMemo(() => {
    if (buscando) {
      // Los habituales que coinciden van primero.
      const propios = buscarComercios(frecuentes, q);
      return [...propios, ...buscarComercios(catalogo, q).filter((c) => !propios.some((x) => x.id === c.id))].slice(0, 20);
    }
    // Primero tus comercios; después, hasta completar 8, los más usados del catálogo.
    return [...frecuentes, ...catalogo.filter((c) => c.frecuente && !frecuentes.some((f) => f.id === c.id))].slice(
      0,
      Math.max(8, frecuentes.length),
    );
  }, [buscando, q, frecuentes, catalogo]);
  const sinResultados = buscando && lista.length === 0;

  const elegir = (c: Comercio) => {
    dispatch(comercioElegido(c.id));
    router.push("/comprar/monto");
  };

  return (
    <Paso paso={1} titulo="¿Dónde estás comprando?" atras={false}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          minHeight: 52,
          paddingHorizontal: space.lg,
          borderRadius: radius.control,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
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
          autoCorrect={false}
          selectionColor={colors.accent}
          style={{ flex: 1, minHeight: 44, fontFamily: fonts.regular, fontSize: escala.bodyLg.fontSize, color: colors.ink }}
        />
      </View>

      {sinResultados ? (
        <Text variant="bodyMd" tone="inkSecondary">
          No encontramos “{q.trim()}”. Elegí el rubro y te decimos con qué pagar.
        </Text>
      ) : (
        <View style={{ gap: space.md }}>
          {!buscando ? (
            <Text variant="label" tone="inkSecondary">
              {habituales > 0 ? "Tus comercios y los más usados" : "Los más usados"}
            </Text>
          ) : null}
          <GrillaComercios comercios={lista} onElegir={elegir} conRubro={buscando} />
        </View>
      )}

      {/* O un rubro sin comercio: solo aplican las promos de todo el rubro. */}
      {sinResultados || porRubro ? (
        <View style={{ gap: space.md }}>
          <Text variant="label" tone="inkSecondary">
            Rubros
          </Text>
          <GrillaComercios comercios={RUBROS_DE_MODO} onElegir={elegir} />
        </View>
      ) : (
        <Pressable
          onPress={() => setPorRubro(true)}
          accessibilityRole="button"
          style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
        >
          <Text variant="bodyMd" weight="semibold" tone="accent">
            ¿No sabés el comercio? Elegí el rubro
          </Text>
        </Pressable>
      )}

      {frescura ? (
        <Text variant="caption" tone="inkSecondary" align="center" style={{ letterSpacing: 0 }}>
          {frescura}
        </Text>
      ) : null}
    </Paso>
  );
}
