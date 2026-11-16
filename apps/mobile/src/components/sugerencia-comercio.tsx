import { useMemo, useState } from "react";
import { View } from "react-native";
import { nombreDeRubro } from "@/data/comercios";
import type { Comercio } from "@/data/contracts";
import { buscarEnCatalogo, type ResultadoSugerencia } from "@/data/sugerir-comercio";
import { colors, space } from "@/theme";
import { Button } from "./button";
import { Card } from "./card";
import { FilaAccion } from "./fila-accion";
import { Field } from "./field";
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

const TITULOS = {
  no_encontrado: "No lo encontramos entre los comercios con promo. ¿Cuál es?",
  es_alguno: "¿Es alguno de estos?",
} as const;

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

  const elegir = (c: Comercio) => {
    setBuscando(false);
    setTexto("");
    onElegir(c);
  };
  const noEsta = () => {
    setBuscando(false);
    setTexto("");
    onNoEsta();
  };

  const titulo = resultado.tipo === "elegir_rubro" ? "¿En qué rubro?" : TITULOS[resultado.titulo];

  return (
    <Card padding={space.lg} gap={space.sm}>
      <Text variant="bodyMd" weight="semibold" accessibilityLiveRegion="polite">
        {buscando ? "Buscá el comercio" : titulo}
      </Text>
      {buscando ? (
        <>
          <Field label="Comercio" value={texto} onChangeText={setTexto} placeholder="Escribí el nombre" autoFocus />
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
      )}
      {resultado.tipo === "elegir_rubro" && !buscando ? null : (
        <Button label="No está en la lista" variant="text" onPress={noEsta} />
      )}
    </Card>
  );
}
