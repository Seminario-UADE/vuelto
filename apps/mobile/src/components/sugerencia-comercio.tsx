import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Platform, TextInput, View } from "react-native";
import { nombreDeRubro } from "@/data/comercios";
import type { Comercio } from "@/data/contracts";
import { buscarEnCatalogo, type ResultadoSugerencia } from "@/data/sugerir-comercio";
import { colors, fonts, radius, space, type as escala } from "@/theme";
import { Button } from "./button";
import { Card } from "./card";
import { FilaAccion } from "./fila-accion";
import { Icon } from "./icon";
import { divisor } from "./lista";
import { Text } from "./text";

type Props = {
  /** `null` mientras el usuario escribe o si eligió «No está en la lista»: no se muestra nada. */
  resultado: ResultadoSugerencia | null;
  catalogo: readonly Comercio[];
  onElegir: (c: Comercio) => void;
  onNoEsta: () => void;
};

/** Cuántos resultados muestra el buscador. */
const RESULTADOS_DEL_BUSCADOR = 8;

/** El título del recuadro; `null` si no hay recuadro (la línea de confirmación o nada). */
function tituloDe(resultado: ResultadoSugerencia | null): string | null {
  if (resultado === null || resultado.tipo === "nada" || resultado.tipo === "coincide") return null;
  if (resultado.tipo === "elegir_rubro") return "¿En qué rubro?";
  if (resultado.titulo === "es_alguno") return "¿Es alguno de estos?";
  // Sin sugerencias no se pregunta «¿Cuál es?»: no hay de dónde elegir (spec 015, Edge Cases).
  return resultado.sugerencias.length > 0
    ? "No lo encontramos entre los comercios con promo. ¿Cuál es?"
    : "No lo encontramos entre los comercios con promo";
}

function Filas({ comercios, onElegir }: { comercios: readonly Comercio[]; onElegir: (c: Comercio) => void }) {
  return (
    <View>
      {comercios.map((c, i) => (
        <View key={c.id} style={divisor(i)}>
          <FilaAccion titulo={c.nombre} detalle={nombreDeRubro(c)} onPress={() => onElegir(c)} />
        </View>
      ))}
    </View>
  );
}

/** El buscador con el estilo de los demás buscadores de comercios (DESIGN.md, `selector-comercios`). */
function Buscador({ texto, onCambiar }: { texto: string; onCambiar: (t: string) => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        minHeight: 48,
        paddingHorizontal: space.lg,
        borderRadius: radius.control,
        backgroundColor: colors.surfaceStrong,
      }}
    >
      <Icon name="buscar" size={20} color={colors.inkSecondary} />
      <TextInput
        value={texto}
        onChangeText={onCambiar}
        placeholder="Buscá un comercio"
        placeholderTextColor={colors.inkSecondary}
        accessibilityLabel="Buscar comercio"
        returnKeyType="search"
        autoFocus
        selectionColor={colors.accent}
        style={{ flex: 1, minHeight: 44, fontFamily: fonts.regular, fontSize: escala.bodyLg.fontSize, color: colors.ink }}
      />
    </View>
  );
}

/**
 * La ayuda para elegir el comercio de la compra (spec 015): debajo del campo «Comercio» de
 * «Revisá tu compra». Si coincide, una línea con el nombre y el rubro; si no, el recuadro con
 * hasta 3 sugerencias, «Buscar otro comercio» y «No está en la lista». Nunca elige solo (FR-004).
 */
export function SugerenciaComercio({ resultado, catalogo, onElegir, onNoEsta }: Props) {
  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState("");
  const encontrados = useMemo(
    () => (buscando ? buscarEnCatalogo(catalogo, texto, RESULTADOS_DEL_BUSCADOR) : []),
    [buscando, catalogo, texto],
  );
  const titulo = tituloDe(resultado);

  // El lector de pantalla anuncia el recuadro (FR-014): en Android lo hace la región viva del
  // título; en iOS hay que pedirlo.
  useEffect(() => {
    if (titulo !== null && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(titulo);
  }, [titulo]);

  if (resultado === null || resultado.tipo === "nada") return null;

  if (resultado.tipo === "coincide") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
        <Icon name="check" size={16} color={colors.inkSecondary} />
        <Text variant="label" tone="inkSecondary">
          {`${resultado.comercio.nombre} · ${nombreDeRubro(resultado.comercio)}`}
        </Text>
      </View>
    );
  }

  const cerrarBuscador = () => {
    setBuscando(false);
    setTexto("");
  };
  const elegir = (c: Comercio) => {
    cerrarBuscador();
    onElegir(c);
  };
  const noEsta = () => {
    cerrarBuscador();
    onNoEsta();
  };

  const cuerpo = buscando ? (
    <>
      <Buscador texto={texto} onCambiar={setTexto} />
      {texto.trim() !== "" && encontrados.length === 0 ? (
        <Text variant="bodyMd" tone="inkSecondary" accessibilityLiveRegion="polite">
          No encontramos comercios con promo con ese nombre
        </Text>
      ) : (
        <Filas comercios={encontrados} onElegir={elegir} />
      )}
    </>
  ) : resultado.tipo === "elegir_rubro" ? (
    <Filas comercios={resultado.opciones} onElegir={elegir} />
  ) : (
    <>
      <Filas comercios={resultado.sugerencias.map((s) => s.comercio)} onElegir={elegir} />
      <FilaAccion titulo="Buscar otro comercio" leading="buscar" onPress={() => setBuscando(true)} />
    </>
  );
  // «¿En qué rubro?» no ofrece «No está en la lista»: el nombre sí está en el catálogo.
  const ofreceNoEsta = buscando || resultado.tipo === "sugerencias";

  return (
    <Card padding={space.lg} gap={space.sm}>
      <Text variant="bodyMd" weight="semibold" accessibilityLiveRegion="polite">
        {buscando ? "Buscá el comercio" : titulo}
      </Text>
      {cuerpo}
      {ofreceNoEsta ? <Button label="No está en la lista" variant="text" onPress={noEsta} /> : null}
    </Card>
  );
}
