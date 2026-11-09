import { router } from "expo-router";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { GrillaComercios } from "@/components/comercio-tile";
import { Icon } from "@/components/icon";
import { Paso } from "@/components/paso";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import type { Comercio } from "@/data/contracts";
import { useAsync } from "@/hooks/use-async";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectComerciosFrecuentes, selectFrescura } from "@/store/selectores";
import { comercioElegido } from "@/store/simulacion";
import { colors, fonts, radius, space, type as escala } from "@/theme";

/** Paso 1: ¿Dónde estás comprando? Buscador y tus comercios; tocar uno avanza solo. */
export default function PasoComercio() {
  const dispatch = useAppDispatch();
  const [q, setQ] = useState("");
  const frecuentes = useAppSelector(selectComerciosFrecuentes);
  const frescura = useAppSelector(selectFrescura);
  const habituales = useAppSelector((st) => st.perfil.comercios.length);
  const resultados = useAsync(() => api.buscarComercios(q), q);
  const catalogo = useAsync(() => api.getCatalogoComercios(), "catalogo");
  const buscando = q.trim() !== "";
  // Primero tus comercios; después, hasta completar 8, los más usados del catálogo.
  const sugeridos = [
    ...frecuentes,
    ...(catalogo.datos ?? []).filter((c) => c.frecuente && !frecuentes.some((f) => f.id === c.id)),
  ].slice(0, Math.max(8, frecuentes.length));
  const lista = buscando ? (resultados.datos ?? []) : sugeridos;

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

      {buscando && resultados.estado === "listo" && lista.length === 0 ? (
        <Text variant="bodyMd" tone="inkSecondary">
          No encontramos “{q.trim()}”. Probá con otro nombre.
        </Text>
      ) : (
        <View style={{ gap: space.md }}>
          {!buscando ? (
            <Text variant="label" tone="inkSecondary">
              {habituales > 0 ? "Tus comercios y los más usados" : "Los más usados"}
            </Text>
          ) : null}
          <GrillaComercios comercios={lista} onElegir={elegir} />
        </View>
      )}

      {frescura ? (
        <Text variant="caption" tone="inkSecondary" align="center" style={{ letterSpacing: 0 }}>
          {frescura}
        </Text>
      ) : null}
    </Paso>
  );
}
