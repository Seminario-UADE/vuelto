import { router, Stack } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { DecisionCard } from "@/components/decision-card";
import { iconoDeRubro } from "@/components/icon";
import { ProgressSegments } from "@/components/progress-segments";
import { Screen } from "@/components/screen";
import { SelectorComercios } from "@/components/selector-comercios";
import { Text } from "@/components/text";
import type { Recomendacion } from "@/data/contracts";
import { hapticoSeleccion } from "@/lib/haptics";
import { RUBROS } from "@/lib/rubros";
import { quitarComercio, SELECCION_VACIA, tocarComercio } from "@/lib/seleccion-comercios";
import { MENSAJES_ERROR } from "@/perfil/modelo";
import { useAppDispatch, useAppSelector, useRecomendacionPara } from "@/store/hooks";
import { invitacionGuardada, onboardingTerminado } from "@/store/perfil";
import { confirmarComercios } from "@/store/perfil-remoto";
import { space } from "@/theme";

/**
 * Primera respuesta (onboarding, paso 2 de 2; spec 012, US4): «¿Dónde comprás seguido?». Tocar un
 * comercio lo marca y muestra la respuesta del motor para hoy con los medios que eligió (la misma de
 * Inicio, ADR-010); los marcados se guardan como habituales al seguir. Se puede seguir sin elegir.
 * Cierra el onboarding: va a Inicio, o a la invitación que abrió antes de tener cuenta. Un usuario
 * nuevo no tiene compras, así que no se muestra ninguna cifra de tope (Principio V).
 */
export default function PrimeraRespuesta() {
  const dispatch = useAppDispatch();
  const pendiente = useAppSelector((s) => s.perfil.invitacionPendiente);
  const [seleccion, setSeleccion] = useState(SELECCION_VACIA);
  // Los nombres de los marcados, como los guarda `comercios_habituales`.
  const nombres = useRef(new Map<string, string>());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const r = useRecomendacionPara(seleccion.activo, null);

  const terminar = () => {
    dispatch(onboardingTerminado());
    dispatch(invitacionGuardada(null));
    router.replace(pendiente ? `/i/${pendiente}` : "/");
  };

  const seguir = async () => {
    if (seleccion.marcados.length === 0) return terminar();
    setEnviando(true);
    setError(null);
    const r = await dispatch(confirmarComercios(seleccion.marcados.map((id) => nombres.current.get(id) ?? id)));
    setEnviando(false);
    if (!r.ok) {
      setError(`${MENSAJES_ERROR[r.error]}. Podés seguir y agregarlos después desde Perfil.`);
      return;
    }
    terminar();
  };

  const hay = seleccion.marcados.length > 0;

  return (
    <>
      <Stack.Screen options={{ headerTitle: () => <ProgressSegments total={2} actual={2} /> }} />
      <Screen
        footer={
          <>
            {r ? <Respuesta r={r} /> : null}
            {error ? (
              <Text variant="label" tone="warning" align="center" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            <Button
              label={hay ? "Seguir" : "Seguir sin elegir"}
              variant={hay ? "primary" : "secondary"}
              onPress={() => void seguir()}
              loading={enviando}
              disabled={enviando}
            />
            {error ? <Button label="Seguir sin guardarlos" variant="text" onPress={terminar} disabled={enviando} /> : null}
          </>
        }
      >
        <View style={{ gap: space.sm }}>
          <Text variant="titleLg" accessibilityRole="header">
            ¿Dónde comprás seguido?
          </Text>
          <Text variant="bodyLg" tone="inkSecondary">
            Tocá un comercio y te mostramos con qué te conviene pagar hoy. Los que marques quedan en tu perfil.
          </Text>
        </View>
        <SelectorComercios
          marcados={seleccion.marcados}
          activo={seleccion.activo}
          onTocar={(c) => {
            hapticoSeleccion();
            nombres.current.set(c.id, c.nombre);
            setError(null);
            setSeleccion((s) => tocarComercio(s, c.id));
          }}
          onQuitar={(c) => {
            setError(null);
            setSeleccion((s) => quitarComercio(s, c.id));
          }}
        />
      </Screen>
    </>
  );
}

/**
 * La respuesta del motor para el comercio tocado, fija arriba de los botones para que se vea al
 * tocar aunque la lista de comercios esté scrolleada. Sin promo, lo dice y sugiere probar otro.
 */
function Respuesta({ r }: { r: Recomendacion }) {
  const conPromo = r.medio !== null;
  return (
    <Animated.View key={r.comercio.id} entering={FadeIn.duration(150)} style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Avatar icon={iconoDeRubro[r.comercio.rubro]} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyLg" weight="semibold">
            {r.comercio.nombre}
          </Text>
          <Text variant="label" tone="inkSecondary">
            {RUBROS[r.comercio.rubro].titulo} · {r.dia}
          </Text>
        </View>
      </View>
      <DecisionCard
        titulo={conPromo ? `Te conviene ${r.medio?.nombre}` : "Hoy no hay promo con tus medios"}
        inicial={r.medio?.inicial}
        razon={conPromo ? r.razon : [r.proximaPromo, "Probá con otro comercio"].filter(Boolean).join(". ")}
        razonIcon={conPromo ? "checkCirculo" : "info"}
      />
    </Animated.View>
  );
}
