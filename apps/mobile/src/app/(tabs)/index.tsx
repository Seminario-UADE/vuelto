import { router } from "expo-router";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { ComercioSearch } from "@/components/comercio-search";
import { CompraRow } from "@/components/compra-row";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { MontoInput } from "@/components/monto-input";
import { PorConfirmarCard } from "@/components/por-confirmar-card";
import { RecomendacionCard } from "@/components/recomendacion";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Text } from "@/components/text";
import { TopeResumen } from "@/components/tope-card";
import type { Comercio } from "@/data/contracts";
import { useColumns } from "@/hooks/use-columns";
import { useUsarRecomendacion } from "@/hooks/use-usar-recomendacion";
import { fechaLarga } from "@/lib/format";
import { hapticoSeleccion } from "@/lib/haptics";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPorConfirmarVigentes } from "@/store/por-confirmar";
import {
  selectComercioSimulado,
  selectFrescura,
  selectHoy,
  selectRecomendacion,
  selectResumenCompras,
  selectTopes,
} from "@/store/selectores";
import { comercioElegido, montoCambiado } from "@/store/simulacion";
import { colors, space } from "@/theme";

/**
 * Inicio: "¿Dónde vas a comprar?" con la respuesta en la misma tarjeta al tocar un
 * comercio (auditoría P1 #1). Sin campana (P2 #14) y sin "Te devolvieron" (P2 #13). Arriba,
 * las compras por confirmar; «Usar [medio]» deja una nueva sin tocar los topes (spec 012).
 */
export default function Inicio() {
  const dispatch = useAppDispatch();
  const comercio = useAppSelector(selectComercioSimulado);
  const monto = useAppSelector((s) => s.simulacion.monto);
  // Derivada con el motor en el dispositivo: cambia con cada tecla del monto, sin red (ADR-010).
  const r = useAppSelector(selectRecomendacion);
  const nombre = useAppSelector((s) => s.perfil.nombre);
  const hoy = useAppSelector(selectHoy);
  const topes = useAppSelector(selectTopes);
  const compras = useAppSelector(selectResumenCompras);
  // "Promos actualizadas hace X": solo con un corpus sincronizado (spec 009 FR-019).
  const frescura = useAppSelector(selectFrescura);
  const columnas = useColumns();
  const porConfirmar = useAppSelector(selectPorConfirmarVigentes);
  const usar = useUsarRecomendacion();

  const elegir = (c: Comercio) => {
    hapticoSeleccion();
    dispatch(comercioElegido(comercio?.id === c.id ? null : c.id));
  };
  const setMonto = (m: number | null) => dispatch(montoCambiado(m));

  const sinCompras = compras.compras.length === 0;
  const medios = topes.medios;
  const filas: (typeof medios)[] = [];
  for (let i = 0; i < medios.length; i += columnas) filas.push(medios.slice(i, i + columnas));

  return (
    <Screen kind="tab" aboveTabBar>
      <View style={{ gap: space.xs }}>
        <Text variant="titleLg" accessibilityRole="header">
          {nombre ? `Hola, ${nombre}` : "Hola"}
        </Text>
        <Text variant="bodyMd" tone="inkSecondary">
          Hoy es {fechaLarga(hoy)}
        </Text>
      </View>

      {porConfirmar.map((c) => (
        <Animated.View key={c.id} entering={FadeInDown.duration(220)}>
          <PorConfirmarCard c={c} />
        </Animated.View>
      ))}

      <Card gap={space.lg} padding={space.xl}>
        <View style={{ gap: space.xs }}>
          <Text variant="titleMd" accessibilityRole="header">
            ¿Dónde vas a comprar?
          </Text>
          <Text variant="bodyMd" tone="inkSecondary">
            Tocá el comercio y te decimos con qué pagar.
          </Text>
        </View>
        <ComercioSearch onElegir={elegir} seleccionado={comercio?.id ?? null} />
        {comercio && comercio.categoriaId === null ? (
          // Un habitual escrito a mano no tiene rubro: no se le pregunta al motor (issue #47).
          <Text variant="bodyMd" tone="inkSecondary" accessibilityLiveRegion="polite">
            No conocemos promos para {comercio.nombre}. Pagá con el medio que prefieras.
          </Text>
        ) : null}
      </Card>

      {r ? (
        <Animated.View entering={FadeInDown.duration(220)}>
          <RecomendacionCard r={r}>
            {r.resultado === "recomendado" ? (
              <MontoInput
                value={monto}
                onChange={setMonto}
                onDecision
                hint="Con el monto te decimos cuánto te devuelven."
              />
            ) : null}
            {r.medio ? (
              <Button label={`Usar ${r.medio.nombreCorto}`} variant="decision" onPress={() => usar()} />
            ) : null}
            <Pressable
              onPress={() => router.push({ pathname: "/comercio/[id]", params: { id: r.comercio.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalle de ${r.comercio.nombre}`}
              style={{ flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 44 }}
            >
              <Text variant="bodyMd" weight="semibold" style={{ color: colors.onDecision, flex: 1 }}>
                Ver detalle y otras opciones
              </Text>
              <Icon name="chevron" size={18} color={colors.onDecision} />
            </Pressable>
          </RecomendacionCard>
        </Animated.View>
      ) : null}

      {sinCompras ? (
        // Sin mandar a otra tab (FR-035): los topes aparecen al confirmar la primera compra.
        <EmptyState
          title="Todavía no confirmaste compras"
          body="Cuando confirmes la primera, vas a ver acá cuánto tope te queda."
        />
      ) : (
        <>
          <View style={{ gap: space.md }}>
            <SectionHeader
              title="Tus topes"
              action={{ label: "Ver todos", onPress: () => router.navigate("/topes") }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
              <Icon name="calendario" size={16} color={colors.inkSecondary} />
              <Text variant="label" tone="inkSecondary">
                Los mensuales se reinician en {topes.reinicioMensualEnDias} días
              </Text>
            </View>
            {filas.map((fila, i) => (
              <View key={i} style={{ flexDirection: "row", gap: space.md }}>
                {fila.map((t) => (
                  <TopeResumen key={t.medio.id} t={t} />
                ))}
                {fila.length < columnas ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>

          <View style={{ gap: space.sm }}>
            <SectionHeader
              title="Últimas compras"
              action={{ label: "Ver todas", onPress: () => router.push("/mis-compras") }}
            />
            <Card padding={space.lg} gap={0}>
              {compras.compras.slice(0, 3).map((c, i) => (
                <View key={c.id} style={divisor(i)}>
                  <CompraRow c={c} />
                </View>
              ))}
            </Card>
          </View>
        </>
      )}

      {frescura ? (
        <Text variant="label" tone="inkSecondary" style={{ textAlign: "center" }}>
          {frescura}
        </Text>
      ) : null}
    </Screen>
  );
}
