import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Paso } from "@/components/paso";
import { TecladoNumerico } from "@/components/teclado-numerico";
import { Text } from "@/components/text";
import { esComercioDeRubro, nombreDeRubro } from "@/data/comercios";
import { pesos } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectComercioSimulado } from "@/store/selectores";
import { montoCambiado } from "@/store/simulacion";
import { space } from "@/theme";

/**
 * Paso 2: ¿Cuánto vas a pagar? Opcional (constitución §I): sin monto la respuesta existe igual,
 * y el botón lo dice. Con monto, el paso 3 dice cuánto te devuelven.
 */
export default function PasoMonto() {
  const dispatch = useAppDispatch();
  const comercio = useAppSelector(selectComercioSimulado);
  const monto = useAppSelector((s) => s.simulacion.monto);
  const seguir = () => router.push("/comprar/recomendacion");

  return (
    <Paso
      paso={2}
      titulo="¿Cuánto vas a pagar?"
      subtitulo={
        !comercio
          ? undefined
          : esComercioDeRubro(comercio)
            ? `En ${comercio.nombre}`
            : `En ${comercio.nombre} · ${nombreDeRubro(comercio).toLowerCase()}`
      }
      footer={<Button label={monto === null ? "Seguir sin el monto" : "Seguir"} onPress={seguir} />}
    >
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={monto === null ? "Sin monto" : `Monto ${pesos(monto)}`}
        style={{ alignItems: "center", paddingVertical: space.xl }}
      >
        <Text variant="display" tabular tone={monto === null ? "inkSecondary" : "ink"} style={{ fontSize: 48, lineHeight: 56 }}>
          {monto === null ? "$0" : pesos(monto)}
        </Text>
        {monto === null ? (
          <Text variant="label" tone="inkSecondary">
            Si no lo sabés todavía, podés seguir sin él.
          </Text>
        ) : null}
      </View>
      <TecladoNumerico value={monto} onChange={(m) => dispatch(montoCambiado(m))} />
    </Paso>
  );
}
