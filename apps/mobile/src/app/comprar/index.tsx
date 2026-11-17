import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Card } from "@/components/card";
import { ChipsDeRubro, FilaDeComercio, FilaDeTusComercios } from "@/components/elegir-comercio";
import { Icon } from "@/components/icon";
import { divisor } from "@/components/lista";
import { Paso } from "@/components/paso";
import { Text } from "@/components/text";
import { comercioDeRubro, comerciosParaElegir, nombreDeRubro, RUBROS_DE_MODO } from "@/data/comercios";
import type { Comercio } from "@/data/contracts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCatalogoComercios, selectComerciosFrecuentes, selectFrescura } from "@/store/selectores";
import { comercioElegido } from "@/store/simulacion";
import { colors, fonts, radius, space, type as escala } from "@/theme";

/** Cuántos comercios lista sin buscar: el resto se encuentra con el buscador. */
const EN_LISTA = 30;
/** Los más usados del catálogo cuando el usuario no eligió comercios propios. */
const MAS_USADOS = 8;

/**
 * Paso 1: ¿Dónde estás comprando? (v10). De arriba abajo: el buscador; los rubros en chips que
 * filtran (como los filtros de la referencia); tus comercios en una fila para tocar sin buscar; y
 * la lista agrupada. Con un rubro elegido, la primera fila elige el rubro sin comercio (spec 004
 * FR-001), así ese camino está a la vista en vez de detrás de un link. Tocar avanza solo. Busca en
 * los comercios del corpus guardado, sin red (#43).
 */
export default function PasoComercio() {
  const dispatch = useAppDispatch();
  const [q, setQ] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const frecuentes = useAppSelector(selectComerciosFrecuentes);
  const frescura = useAppSelector(selectFrescura);
  const habituales = useAppSelector((st) => st.perfil.comercios.length);
  const catalogo = useAppSelector(selectCatalogoComercios);
  const buscando = q.trim() !== "";

  const tuyos = useMemo(
    () => (habituales > 0 ? frecuentes : comerciosParaElegir(catalogo, frecuentes).slice(0, MAS_USADOS)),
    [habituales, frecuentes, catalogo],
  );
  const rubro = categoriaId === null ? null : comercioDeRubro(categoriaId);
  const verTuyos = !buscando && categoriaId === null && tuyos.length > 0;
  const todos = useMemo(() => {
    const encontrados = comerciosParaElegir(catalogo, frecuentes, { q, categoriaId });
    // Los que ya están en la fila de arriba no se repiten en la lista.
    return verTuyos ? encontrados.filter((c) => !tuyos.some((t) => t.id === c.id)) : encontrados;
  }, [catalogo, frecuentes, q, categoriaId, verTuyos, tuyos]);
  const lista = todos.slice(0, EN_LISTA);

  const elegir = (c: Comercio) => {
    dispatch(comercioElegido(c.id));
    router.push("/comprar/monto");
  };

  return (
    <Paso paso={1} titulo="¿Dónde estás comprando?" atras={false}>
      <View style={{ gap: space.md }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            minHeight: 52,
            paddingLeft: space.lg,
            paddingRight: space.xs,
            borderRadius: radius.control,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
          }}
        >
          <Icon name="buscar" size={20} color={colors.inkSecondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={rubro ? `Buscá en ${nombreDeRubro(rubro).toLowerCase()}` : "Buscá un comercio"}
            placeholderTextColor={colors.inkSecondary}
            accessibilityLabel="Buscar comercio"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={colors.accent}
            style={{ flex: 1, minHeight: 44, fontFamily: fonts.regular, fontSize: escala.bodyLg.fontSize, color: colors.ink }}
          />
          {buscando ? (
            <Pressable
              onPress={() => setQ("")}
              accessibilityRole="button"
              accessibilityLabel="Borrar la búsqueda"
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="cerrar" size={18} color={colors.inkSecondary} />
            </Pressable>
          ) : null}
        </View>
        <ChipsDeRubro rubros={RUBROS_DE_MODO} elegido={categoriaId} onElegir={setCategoriaId} />
      </View>

      {verTuyos ? (
        <View style={{ gap: space.md }}>
          <Text variant="label" weight="semibold" tone="inkSecondary">
            {habituales > 0 ? "Tus comercios" : "Los más usados"}
          </Text>
          <FilaDeTusComercios comercios={tuyos} onElegir={elegir} />
        </View>
      ) : null}

      {lista.length > 0 || rubro ? (
        <View style={{ gap: space.md }}>
          <Text variant="label" weight="semibold" tone="inkSecondary">
            {buscando ? "Resultados" : rubro ? nombreDeRubro(rubro) : verTuyos ? "Más comercios" : "Todos los comercios"}
          </Text>
          <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
            {rubro ? <FilaDeComercio c={rubro} onElegir={elegir} todoElRubro="este" /> : null}
            {lista.map((c, i) => (
              <View key={c.id} style={divisor(rubro ? i + 1 : i)}>
                <FilaDeComercio c={c} onElegir={elegir} />
              </View>
            ))}
          </Card>
          {todos.length > lista.length ? (
            <Text variant="caption" tone="inkSecondary" align="center" style={{ letterSpacing: 0 }}>
              Ves {lista.length} de {todos.length}. Buscá por nombre para encontrar el resto.
            </Text>
          ) : null}
        </View>
      ) : (
        // Sin resultados y sin rubro: el rubro es la salida, con una fila por rubro a la vista.
        <View style={{ gap: space.md }}>
          <Text variant="bodyMd" tone="inkSecondary">
            No encontramos “{q.trim()}”. Elegí el rubro y te decimos con qué pagar.
          </Text>
          <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
            {RUBROS_DE_MODO.map((r, i) => (
              <View key={r.id} style={divisor(i)}>
                <FilaDeComercio c={r} onElegir={elegir} todoElRubro="nombrado" />
              </View>
            ))}
          </Card>
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
