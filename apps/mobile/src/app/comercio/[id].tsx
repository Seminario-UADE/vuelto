import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { Icon, iconoDeRubro } from "@/components/icon";
import { MontoInput } from "@/components/monto-input";
import { AlternativaRow, RecomendacionCard } from "@/components/recomendacion";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Skeleton, SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import { nombreDeRubro } from "@/data/comercios";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectFrescura, selectRecomendacion } from "@/store/selectores";
import { canalCambiado, comercioElegido, montoCambiado } from "@/store/simulacion";
import { colors, radius, space } from "@/theme";


/**
 * Con qué pagar: pregunta → respuesta → razón → monto → alternativas → grupo → acción
 * (DESIGN.md §6). Un solo primario de una línea ("Usar Galicia", auditoría P2 #8) en un pie
 * fijo que no tapa contenido (P2 #7).
 */
export default function ConQuePagar() {
  const params = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  // El mismo comercio que en Inicio conserva el monto; otro lo borra (simulacion.ts).
  useEffect(() => {
    dispatch(comercioElegido(params.id));
  }, [dispatch, params.id]);
  const monto = useAppSelector((s) => s.simulacion.monto);
  const setMonto = (m: number | null) => dispatch(montoCambiado(m));
  const elegido = useAppSelector((s) => s.simulacion.comercioId);
  // Derivada con el motor en el dispositivo: cambia con cada tecla del monto, sin red (ADR-010).
  const rec = useAppSelector(selectRecomendacion);
  const r = elegido === params.id ? rec : null;
  const sinPromo = r !== null && r.medio === null;
  // "Promos actualizadas hace X", como en Inicio: solo con un corpus sincronizado (spec 009 FR-019).
  const frescura = useAppSelector(selectFrescura);
  const canal = useAppSelector((s) => s.simulacion.canal);
  // Las otras opciones se ven siempre; los medios sin promo, plegados (issue #43).
  const [verDescartes, setVerDescartes] = useState(false);
  const opciones = r?.alternativas.filter((a) => a.estado === "otra-opcion") ?? [];
  const descartes = r?.alternativas.filter((a) => a.estado !== "otra-opcion") ?? [];

  const usar = () => {
    if (!r?.medio) return;
    router.push({
      pathname: "/revisa",
      params: {
        modo: "excepcion",
        comercio: r.comercio.nombre,
        // El rubro exacto: un comercio en dos rubros no se guarda en el otro.
        ...(r.comercio.categoriaId !== null ? { categoriaId: String(r.comercio.categoriaId) } : {}),
        monto: monto ?? "",
        medio: r.medio.id,
        canal,
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: r?.comercio.nombre ?? "" }} />
      <Screen
        footer={
          r ? (
            r.medio ? (
              <Button label={`Usar ${r.medio.nombreCorto}`} onPress={usar} />
            ) : (
              <Button
                label="Cargar la compra a mano"
                variant="secondary"
                onPress={() => router.push({ pathname: "/revisa", params: { modo: "manual", comercio: r.comercio.nombre } })}
              />
            )
          ) : null
        }
      >
        {r ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Avatar icon={iconoDeRubro[r.comercio.rubro]} />
            <Text variant="bodyMd" tone="inkSecondary" style={{ flex: 1 }}>
              {nombreDeRubro(r.comercio)} · {r.dia}
            </Text>
          </View>
        ) : null}

        {/* Presencial por defecto (spec 004 FR-001): una promo online no sirve en el local. */}
        <View style={{ flexDirection: "row", gap: space.sm }} accessibilityRole="radiogroup">
          <Chip
            label="En el local"
            rol="radio"
            selected={canal === "presencial"}
            onPress={() => dispatch(canalCambiado("presencial"))}
          />
          <Chip label="Online" rol="radio" selected={canal === "online"} onPress={() => dispatch(canalCambiado("online"))} />
        </View>

        {r ? <RecomendacionCard r={r} /> : <Skeleton height={220} r={radius.card} />}

        {/* Siempre visible: vacío, la tarjeta muestra el tope disponible con su base (#43). Sin
            promo el monto no cambia la respuesta, así que el hint no promete un reintegro. */}
        <Card>
          <MontoInput
            value={monto}
            onChange={setMonto}
            hint={sinPromo ? undefined : "Con el monto te decimos cuánto te devuelven y cuánto tope te queda."}
          />
        </Card>

        {r ? (
          <>
            {opciones.length > 0 ? (
              <View style={{ gap: space.xs }}>
                <SectionHeader title="Otras opciones" />
                <Card padding={space.lg} gap={0}>
                  {opciones.map((a, i) => (
                    <View key={`${a.titulo}-${i}`} style={divisor(i)}>
                      <AlternativaRow a={a} />
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}
            {descartes.length > 0 ? (
              <View style={{ gap: space.xs }}>
                <Pressable
                  onPress={() => setVerDescartes((x) => !x)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: verDescartes }}
                  style={{ flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 44 }}
                >
                  <Text variant="bodyMd" weight="semibold" style={{ flex: 1 }}>
                    {r.medio ? "Por qué no los otros" : "Por qué no tus medios"} ({descartes.length})
                  </Text>
                  <Icon name="chevron" size={18} color={colors.inkSecondary} />
                </Pressable>
                {verDescartes ? (
                  <Card padding={space.lg} gap={0}>
                    {descartes.map((a, i) => (
                      <View key={`${a.titulo}-${i}`} style={divisor(i)}>
                        <AlternativaRow a={a} />
                      </View>
                    ))}
                  </Card>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <SkeletonList rows={2} height={56} />
        )}

        <Pressable
          onPress={() =>
            router.push({ pathname: "/grupo/armar", params: { comercio: params.id, monto: monto ?? "" } })
          }
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            minHeight: 56,
            paddingHorizontal: space.lg,
            borderRadius: radius.row,
            borderWidth: 1.5,
            borderColor: colors.controlBorder,
          }}
        >
          <Icon name="grupo" size={22} />
          <Text variant="bodyLg" weight="semibold" style={{ flex: 1 }}>
            ¿Pagan entre varios?
          </Text>
          <Icon name="chevron" size={18} color={colors.inkSecondary} />
        </Pressable>

        {frescura ? (
          <Text variant="label" tone="inkSecondary" style={{ textAlign: "center" }}>
            {frescura}
          </Text>
        ) : null}
      </Screen>
    </>
  );
}
