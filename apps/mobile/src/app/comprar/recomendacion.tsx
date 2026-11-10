import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { divisor } from "@/components/lista";
import { FilaAccion } from "@/components/fila-accion";
import { Paso } from "@/components/paso";
import { AlternativaRow, RecomendacionCard } from "@/components/recomendacion";
import { Segmentado } from "@/components/segmentado";
import { Text } from "@/components/text";
import { useUsarRecomendacion } from "@/hooks/use-usar-recomendacion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectRecomendacion } from "@/store/selectores";
import { canalCambiado } from "@/store/simulacion";
import { space } from "@/theme";

/**
 * Paso 3: la respuesta sola. Con qué pagar, cuánto te devuelven (≈, con su base) y una razón.
 * «Voy a pagar con…» deja la compra por confirmar (FR-002) y *reemplaza* este paso por el 4: así
 * volver no puede crear otra (auditoría v7). Las alternativas y el grupo quedan plegados; los
 * medios sin promo, aparte de las otras opciones (#43). El canal arranca en presencial (spec 004
 * FR-001): una promo online no sirve en el local.
 */
export default function PasoRecomendacion() {
  const r = useAppSelector(selectRecomendacion);
  const monto = useAppSelector((s) => s.simulacion.monto);
  const usar = useUsarRecomendacion();
  const dispatch = useAppDispatch();
  const canal = useAppSelector((s) => s.simulacion.canal);
  const [verOtras, setVerOtras] = useState(false);
  const [verDescartes, setVerDescartes] = useState(false);
  const opciones = r?.alternativas.filter((a) => a.estado === "otra-opcion") ?? [];
  const descartes = r?.alternativas.filter((a) => a.estado !== "otra-opcion") ?? [];

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
        router.push({
          pathname: "/revisa",
          params: {
            modo: "manual",
            comercio: r.comercio.nombre,
            // El rubro exacto y el canal: la compra se guarda como se recomendó (FR-022).
            ...(r.comercio.categoriaId !== null ? { categoriaId: String(r.comercio.categoriaId) } : {}),
            monto: monto ?? "",
            canal,
            flujo: "1",
          },
        })
      }
    />
  );

  return (
    <Paso
      paso={3}
      titulo="Con qué te conviene pagar"
      footer={footer}
      panel={r ? <RecomendacionCard r={r} centrada /> : <View style={{ height: 360 }} />}
    >
      <Segmentado
        accessibilityLabel="Dónde pagás"
        opciones={[
          { valor: "presencial", label: "En el local" },
          { valor: "online", label: "Online" },
        ]}
        valor={canal}
        onChange={(c) => dispatch(canalCambiado(c))}
      />

      {r ? (
        <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
          {opciones.length > 0 ? (
            <FilaAccion
              icon={verOtras ? "chevronAbajo" : "chevron"}
              titulo="Otras opciones"
              valor={String(opciones.length)}
              onPress={() => setVerOtras((v) => !v)}
              expandido={verOtras}
            />
          ) : null}
          {verOtras ? (
            <View style={{ paddingBottom: space.sm }}>
              {opciones.map((a, i) => (
                <View key={`${a.titulo}-${i}`} style={divisor(i)}>
                  <AlternativaRow a={a} />
                </View>
              ))}
            </View>
          ) : null}
          {descartes.length > 0 ? (
            <View style={opciones.length > 0 ? divisor(1) : undefined}>
              <FilaAccion
                icon={verDescartes ? "chevronAbajo" : "chevron"}
                titulo={r.medio ? "Por qué no los otros" : "Por qué no tus medios"}
                valor={String(descartes.length)}
                onPress={() => setVerDescartes((v) => !v)}
                expandido={verDescartes}
              />
            </View>
          ) : null}
          {verDescartes ? (
            <View style={{ paddingBottom: space.sm }}>
              {descartes.map((a, i) => (
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
