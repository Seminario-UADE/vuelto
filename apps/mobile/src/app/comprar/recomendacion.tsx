import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { divisor } from "@/components/lista";
import { FilaAccion } from "@/components/fila-accion";
import { Paso } from "@/components/paso";
import { AlternativaRow, RecomendacionCard } from "@/components/recomendacion";
import { Skeleton } from "@/components/skeleton";
import { Text } from "@/components/text";
import { useUsarRecomendacion } from "@/hooks/use-usar-recomendacion";
import { useAppSelector } from "@/store/hooks";
import { selectRecomendacion } from "@/store/selectores";
import { radius, space } from "@/theme";

/**
 * Paso 3: la respuesta sola. Con qué pagar, cuánto te devuelven (≈, con su base) y una razón.
 * «Voy a pagar con…» deja la compra por confirmar (FR-002) y *reemplaza* este paso por el 4: así
 * volver no puede crear otra (auditoría v7). Las alternativas y el grupo quedan plegados.
 */
export default function PasoRecomendacion() {
  const r = useAppSelector(selectRecomendacion);
  const monto = useAppSelector((s) => s.simulacion.monto);
  const usar = useUsarRecomendacion();
  const [verOtras, setVerOtras] = useState(false);

  const voyAPagar = () => {
    const id = usar();
    if (id) router.replace({ pathname: "/comprar/pagar", params: { id } });
  };

  const footer = !r ? null : r.medio ? (
    <Button label={`Voy a pagar con ${r.medio.nombreCorto}`} onPress={voyAPagar} />
  ) : (
    // Sin promo no hay medio que recomendar: igual se puede registrar la compra al pagar.
    <Button
      label="Registrar la compra"
      onPress={() =>
        router.push({ pathname: "/revisa", params: { modo: "manual", comercio: r.comercio.nombre, monto: monto ?? "", flujo: "1" } })
      }
    />
  );

  return (
    <Paso paso={3} titulo="Con qué te conviene pagar" footer={footer}>
      {r ? <RecomendacionCard r={r} /> : <Skeleton height={220} r={radius.card} />}

      {r ? (
        <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
          {r.alternativas.length > 0 ? (
            <FilaAccion
              icon={verOtras ? "chevronAbajo" : "chevron"}
              titulo={r.medio ? "Otras opciones" : "Tus medios hoy"}
              valor={String(r.alternativas.length)}
              onPress={() => setVerOtras((v) => !v)}
              expandido={verOtras}
            />
          ) : null}
          {verOtras ? (
            <View style={{ paddingBottom: space.sm }}>
              {r.alternativas.map((a, i) => (
                <View key={`${a.titulo}-${i}`} style={divisor(i)}>
                  <AlternativaRow a={a} />
                </View>
              ))}
            </View>
          ) : null}
          <View style={r.alternativas.length > 0 ? divisor(1) : undefined}>
            <FilaAccion
              icon="chevron"
              titulo="¿Pagan entre varios?"
              onPress={() => router.push({ pathname: "/grupo/armar", params: { comercio: r.comercio.id, monto: monto ?? "" } })}
            />
          </View>
        </Card>
      ) : null}

      {r && !r.medio ? (
        <Text variant="bodyMd" tone="inkSecondary">
          Pagá con el medio que prefieras. Cuando pagues, registrá la compra para llevar la cuenta.
        </Text>
      ) : null}
    </Paso>
  );
}
