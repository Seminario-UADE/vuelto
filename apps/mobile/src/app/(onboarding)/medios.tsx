import { router, Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { OptionRow } from "@/components/option-row";
import { ProgressSegments } from "@/components/progress-segments";
import { Screen } from "@/components/screen";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { guardarPerfilLocal, usePerfilLocal } from "@/data/perfil-local";
import { useAsync } from "@/hooks/use-async";
import { hapticoSeleccion } from "@/lib/haptics";
import { space } from "@/theme";

/** Medios de pago (onboarding 2/5, configuración 1 de 2). */
export default function Medios() {
  const { perfil } = usePerfilLocal();
  const catalogo = useAsync(() => api.getMediosDisponibles());
  const [elegidos, setElegidos] = useState<string[]>(perfil.medios);

  const medios = catalogo.datos ?? [];
  const conCobertura = medios.filter((m) => m.conCobertura && elegidos.includes(m.id)).length;
  const puedeSeguir = conCobertura > 0;

  const alternar = (id: string) => {
    hapticoSeleccion();
    setElegidos((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };

  const continuar = async () => {
    await guardarPerfilLocal({ medios: elegidos });
    router.push("/comercios");
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: () => <ProgressSegments total={2} actual={1} /> }} />
      <Screen
        footer={
          <>
            <Text variant="label" tone="inkSecondary" align="center">
              {puedeSeguir
                ? `${elegidos.length} ${elegidos.length === 1 ? "medio elegido" : "medios elegidos"} · podés cambiarlos desde Perfil`
                : "Elegí al menos un medio con promos para seguir"}
            </Text>
            <Button
              label="Continuar"
              onPress={continuar}
              disabled={!puedeSeguir}
              hint={puedeSeguir ? undefined : "Elegí al menos un medio con promos"}
            />
          </>
        }
      >
        <View style={{ gap: space.sm }}>
          <Text variant="titleLg" accessibilityRole="header">
            ¿Con qué pagás?
          </Text>
          <Text variant="bodyLg" tone="inkSecondary">
            Elegí los medios que tenés. Vuelto te dice cuál usar en cada compra.
          </Text>
        </View>
        {catalogo.estado === "cargando" && !catalogo.datos ? (
          <SkeletonList rows={5} />
        ) : (
          <View style={{ gap: space.md }}>
            {medios.map((m) => {
              const sel = elegidos.includes(m.id);
              return (
                <OptionRow
                  key={m.id}
                  kind="check"
                  title={m.nombre}
                  detail={m.detalle}
                  note={m.conCobertura ? null : "Todavía no tenemos promos de este medio"}
                  selected={sel}
                  onPress={() => alternar(m.id)}
                  leading={<Avatar letras={m.inicial} tone={sel ? "activo" : "neutral"} />}
                />
              );
            })}
          </View>
        )}
      </Screen>
    </>
  );
}
