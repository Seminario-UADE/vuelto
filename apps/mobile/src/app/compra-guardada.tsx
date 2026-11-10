import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { cerrarFlujo } from "@/components/paso";
import { Text } from "@/components/text";
import { pesos } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectResumenCompras, selectTopes } from "@/store/selectores";
import { colors, radius, space } from "@/theme";

const CIRCULO = 104;
/** El aro fijo detrás del check. */
const ARO = 152;
/** La onda que se abre detrás del check y se desvanece, como el círculo verde de las referencias. */
const ONDA = 320;
/** Ease-out fuerte (DESIGN.md §7): arranca rápido, que se sienta inmediato. */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const PASO_ESCALONADO = 60;

/**
 * Cierre del flujo de compra (auditoría v7, regla del pico y el final): la compra quedó
 * guardada, cuánto te van a devolver y cuánto tope te queda en ese medio, siempre como
 * estimado y con su base (Principio V). Todo al centro (v9): una onda verde se abre desde el
 * medio, el check entra con un resorte y los datos aparecen escalonados debajo. Con «reducir
 * movimiento», solo se funde, sin escala ni desplazamiento. El háptico de éxito ya sonó al guardar (Revisá).
 */
export default function CompraGuardada() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const compra = useAppSelector(selectResumenCompras).compras.find((c) => c.id === id);
  const topes = useAppSelector(selectTopes);
  const tope = compra ? topes.medios.find((t) => t.medio.id === compra.medio.id && t.cifra !== null) : undefined;
  const insets = useSafeAreaInsets();
  const reducido = useReducedMotion();

  const onda = useSharedValue(0);
  const circulo = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    if (reducido) {
      // Reducir movimiento: menos y más suave, no cero. Solo opacidad, sin escala.
      circulo.value = withTiming(1, { duration: 200, easing: EASE_OUT });
      check.value = withTiming(1, { duration: 200, easing: EASE_OUT });
      return;
    }
    onda.value = withTiming(1, { duration: 650, easing: EASE_OUT });
    // Resortes con poco rebote (≈0,2): es un festejo, pero de una app de plata.
    circulo.value = withSpring(1, { duration: 450, dampingRatio: 0.8 });
    check.value = withDelay(140, withSpring(1, { duration: 400, dampingRatio: 0.6 }));
  }, [reducido, onda, circulo, check]);

  // Nada aparece desde la nada: escala de partida visible (no 0) y opacidad.
  const estiloOnda = useAnimatedStyle(() => ({
    opacity: reducido ? 0 : 0.8 * (1 - onda.value),
    transform: [{ scale: 0.45 + onda.value * 0.55 }],
  }));
  const estiloAro = useAnimatedStyle(() => ({
    opacity: circulo.value,
    transform: [{ scale: reducido ? 1 : 0.7 + circulo.value * 0.3 }],
  }));
  const estiloCirculo = useAnimatedStyle(() => ({
    opacity: Math.min(1, circulo.value * 1.4),
    transform: [{ scale: reducido ? 1 : 0.85 + circulo.value * 0.15 }],
  }));
  const estiloCheck = useAnimatedStyle(() => ({
    opacity: Math.min(1, check.value * 1.6),
    transform: [{ scale: reducido ? 1 : 0.6 + check.value * 0.4 }],
  }));

  // Escalonado corto (60 ms) y un desplazamiento chico (10 pt); el botón no espera a nadie para andar.
  const entrar = (orden: number) =>
    reducido
      ? FadeIn.delay(orden * 40).duration(200)
      : FadeInDown.delay(260 + orden * PASO_ESCALONADO)
          .duration(320)
          .easing(EASE_OUT)
          .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });
  const conReintegro = compra?.reintegro != null && compra.reintegro > 0;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        paddingTop: insets.top + space.lg,
        paddingBottom: Math.max(insets.bottom, space.md),
        paddingHorizontal: space.gutter,
      }}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.xxl }}>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="Compra guardada"
          style={{ width: ARO, height: ARO, alignItems: "center", justifyContent: "center" }}
        >
          <Animated.View
            style={[
              {
                position: "absolute",
                width: ONDA,
                height: ONDA,
                borderRadius: radius.pill,
                backgroundColor: colors.successBg,
              },
              estiloOnda,
            ]}
          />
          <Animated.View
            style={[
              { position: "absolute", width: ARO, height: ARO, borderRadius: radius.pill, backgroundColor: colors.successBg },
              estiloAro,
            ]}
          />
          <Animated.View
            style={[
              {
                width: CIRCULO,
                height: CIRCULO,
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
              },
              estiloCirculo,
            ]}
          >
            <Animated.View style={estiloCheck}>
              <Icon name="check" size={52} color={colors.onAccent} />
            </Animated.View>
          </Animated.View>
        </View>

        <View style={{ alignItems: "center", gap: space.sm, alignSelf: "stretch" }}>
          <Animated.View entering={entrar(0)}>
            <Text variant="titleLg" align="center">
              Compra guardada
            </Text>
          </Animated.View>
          {compra ? (
            <Animated.View entering={entrar(1)}>
              <Text variant="bodyLg" tone="inkSecondary" align="center" tabular>
                {compra.comercio.nombre} · {pesos(compra.monto)} con {compra.medio.nombre}
              </Text>
            </Animated.View>
          ) : (
            <Animated.View entering={entrar(1)}>
              <Text variant="bodyLg" tone="inkSecondary" align="center">
                Ya la ves en tus topes.
              </Text>
            </Animated.View>
          )}
        </View>

        {compra ? (
          <Animated.View
            entering={entrar(2)}
            accessible
            accessibilityLabel={
              conReintegro
                ? `Te van a devolver aproximadamente ${pesos(compra.reintegro ?? 0)}`
                : "Esta compra no tiene reintegro"
            }
            style={{ alignItems: "center", gap: space.xs, alignSelf: "stretch" }}
          >
            {conReintegro ? (
              <>
                <Text variant="label" tone="success" align="center">
                  Te van a devolver aproximadamente
                </Text>
                <Text
                  variant="display"
                  align="center"
                  tabular
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={{ fontSize: 56, lineHeight: 62, letterSpacing: -1.2, alignSelf: "stretch" }}
                >
                  {pesos(compra.reintegro ?? 0)}
                </Text>
              </>
            ) : (
              <Text variant="bodyLg" align="center">
                Esta compra no tiene reintegro.
              </Text>
            )}
          </Animated.View>
        ) : null}

        {tope ? (
          <Animated.View
            entering={entrar(3)}
            style={{
              alignItems: "center",
              gap: space.xs,
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              borderRadius: radius.card,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              alignSelf: "stretch",
            }}
          >
            <Text variant="bodyMd" weight="semibold" align="center">
              Te quedan {tope.cifra} de tope en {tope.medio.nombreCorto}
            </Text>
            <Text variant="label" tone="inkSecondary" align="center">
              {tope.base.texto}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <Animated.View entering={entrar(4)}>
        <Button label="Volver al inicio" onPress={cerrarFlujo} />
      </Animated.View>
    </View>
  );
}
