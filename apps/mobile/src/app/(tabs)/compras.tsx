import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { CompraRow } from "@/components/compra-row";
import { EmptyState } from "@/components/empty-state";
import { FilaAccion } from "@/components/fila-accion";
import { GraficoSemanas } from "@/components/grafico-semanas";
import { Icon } from "@/components/icon";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import type { Compra } from "@/data/contracts";
import { aprox, diaDelMes, pesos } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectMarcasDeSubida, selectResumenCompras } from "@/store/selectores";
import { reintentarRechazadas } from "@/store/thunks";
import { colors, space } from "@/theme";

/**
 * Compras (DESIGN.md v7 §6, pestaña propia): cuánto gastaste en el mes con un gráfico por
 * semana, lo que te devolvieron (≈ y su base) con el acceso a tus topes, y las compras por día.
 * Sin filtros ni badges: el origen va en el renglón de cada compra.
 */
export default function Compras() {
  const datos = useAppSelector(selectResumenCompras);
  const subida = useAppSelector(selectMarcasDeSubida);
  const dispatch = useAppDispatch();
  const mes = datos.mes.replace(/^./, (c) => c.toUpperCase());

  const porDia = new Map<string, Compra[]>();
  for (const c of [...datos.compras].sort((a, b) => b.fecha.localeCompare(a.fecha))) porDia.set(c.fecha, [...(porDia.get(c.fecha) ?? []), c]);

  return (
    <Screen kind="tab" aboveTabBar gap={space.xl}>
      <View style={{ gap: space.xs }}>
        <Text variant="titleLg" accessibilityRole="header">
          Tus compras
        </Text>
        <Text variant="bodyLg" tone="inkSecondary">
          {mes}
        </Text>
      </View>

      {datos.compras.length === 0 ? (
        <EmptyState
          title="Todavía no registraste compras"
          body="Tocá + cuando estés por pagar: te decimos con qué y la compra aparece acá."
        />
      ) : (
        <>
          <Card padding={space.xl} gap={space.lg}>
            <View accessible style={{ gap: space.xs }}>
              <Text variant="label" tone="inkSecondary">
                Gastaste este mes
              </Text>
              <Text variant="display" tabular style={{ fontSize: 36, lineHeight: 42 }}>
                {pesos(datos.gastaste)}
              </Text>
              <Text variant="label" tone="inkSecondary">
                {datos.cantidadDelMes === 1 ? "1 compra registrada" : `${datos.cantidadDelMes} compras registradas`}
              </Text>
            </View>
            <GraficoSemanas semanas={datos.semanas} />
          </Card>

          <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
            <FilaAccion
              leading="devolvieron"
              titulo={`Te devolvieron ${aprox(datos.devolvieron.monto)}`}
              detalle={datos.devolvieron.base.texto.replace(/^./, (c) => c.toUpperCase())}
              valor="Topes"
              onPress={() => router.push("/topes")}
            />
          </Card>

          {[...porDia.entries()].map(([fecha, lista]) => (
            <View key={fecha} style={{ gap: space.sm }}>
              <Text variant="label" weight="semibold" tone="inkSecondary" accessibilityRole="header">
                {diaDelMes(fecha)}
              </Text>
              <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
                {lista.map((c, i) => (
                  <View key={c.id} style={divisor(i)}>
                    <CompraRow
                      c={c}
                     
                      marca={subida.marcas[c.id]}
                      onBorrar={() =>
                        router.push({ pathname: "/borrar-compra", params: { id: c.id, comercio: c.comercio.nombre } })
                      }
                    />
                  </View>
                ))}
              </Card>
            </View>
          ))}

          {subida.sinSubir + subida.noSePudo + subida.soloCelular > 0 ? (
            <Card padding={space.lg} gap={space.sm}>
              <Text variant="label" tone="inkSecondary" accessibilityLiveRegion="polite">
                {[
                  subida.sinSubir > 0 ? `${subida.sinSubir} sin subir` : null,
                  subida.noSePudo > 0 ? `${subida.noSePudo} que no se pudo subir` : null,
                  subida.soloCelular > 0 ? `${subida.soloCelular} solo en este celular` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                . Cuentan para tus topes igual.
              </Text>
              {subida.noSePudo > 0 ? (
                <Button label="Reintentar" variant="secondary" icon="recargar" onPress={() => void dispatch(reintentarRechazadas())} />
              ) : null}
            </Card>
          ) : null}

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Icon name="info" size={18} color={colors.inkSecondary} />
            <Text variant="label" tone="inkSecondary" style={{ flex: 1 }}>
              Las compras sin confirmar no cuentan para tus topes.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}
