import { router, Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { MedioRow } from "@/components/medio-row";
import { ProgressSegments } from "@/components/progress-segments";
import { Screen } from "@/components/screen";
import { SelectorMedio } from "@/components/selector-medio";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import { useAsync } from "@/hooks/use-async";
import { hapticoSeleccion } from "@/lib/haptics";
import { MENSAJES_ERROR, puedeConfirmar, type MedioNuevo } from "@/perfil/modelo";
import { medioVista } from "@/perfil/vista";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { confirmarMedios, leerBancos, leerMedios } from "@/store/perfil-remoto";
import { space } from "@/theme";

/**
 * Medios de pago (onboarding 2/5, configuración 1 de 2; issue #41, US1). El usuario arma sus
 * tarjetas con banco, tipo y red; nada se guarda hasta «Confirmar», que manda todo en un solo pedido
 * (FR-006, FR-011). Si ya las confirmó (volvió atrás), solo se sigue: se editan desde Perfil.
 */
export default function Medios() {
  const dispatch = useAppDispatch();
  const guardados = useAppSelector((s) => s.perfil.medios);
  const bancos = useAsync(() => dispatch(leerBancos()));
  const [nuevos, setNuevos] = useState<MedioNuevo[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yaGuardados = guardados.length > 0;
  const nombreBanco = (id: string) => bancos.datos?.find((b) => b.id === id)?.nombre ?? null;
  const vistas = yaGuardados
    ? guardados.map(medioVista)
    : nuevos.map((n, i) => medioVista({ ...n, id: `nuevo-${i}`, nombreBanco: nombreBanco(n.bancoId) }));
  const puedeSeguir = yaGuardados || puedeConfirmar(nuevos);

  const agregar = (m: MedioNuevo) => {
    hapticoSeleccion();
    setError(null);
    setNuevos((xs) => [...xs, m]);
  };

  const quitar = (i: number) => {
    hapticoSeleccion();
    setNuevos((xs) => xs.filter((_, j) => j !== i));
  };

  const continuar = async () => {
    if (!yaGuardados) {
      setEnviando(true);
      setError(null);
      const r = await dispatch(confirmarMedios(nuevos));
      setEnviando(false);
      if (!r.ok) {
        setError(MENSAJES_ERROR[r.error]);
        return;
      }
    }
    router.push("/comercios");
  };

  const reintentar = () => {
    void dispatch(leerMedios());
    bancos.recargar();
  };

  const cantidad = vistas.length;
  return (
    <>
      <Stack.Screen options={{ headerTitle: () => <ProgressSegments total={2} actual={1} /> }} />
      <Screen
        footer={
          <>
            {error ? (
              <Text variant="label" tone="warning" align="center">
                {error}
              </Text>
            ) : (
              <Text variant="label" tone="inkSecondary" align="center">
                {puedeSeguir
                  ? `${cantidad} ${cantidad === 1 ? "tarjeta" : "tarjetas"} · podés cambiarlas desde Perfil`
                  : "Agregá al menos una tarjeta para seguir"}
              </Text>
            )}
            <Button
              label={yaGuardados ? "Continuar" : "Confirmar"}
              onPress={() => void continuar()}
              disabled={!puedeSeguir || enviando}
              loading={enviando}
              hint={puedeSeguir ? undefined : "Agregá al menos una tarjeta"}
            />
          </>
        }
      >
        <View style={{ gap: space.sm }}>
          <Text variant="titleLg" accessibilityRole="header">
            ¿Con qué pagás?
          </Text>
          <Text variant="bodyLg" tone="inkSecondary">
            Buscá tu banco y elegí el tipo de tarjeta y la red. Vuelto te dice cuál usar en cada compra.
          </Text>
        </View>

        {cantidad > 0 ? (
          <Card padding={space.lg} gap={0}>
            {vistas.map((m, i) => (
              <MedioRow
                key={m.id}
                medio={m}
                indice={i}
                onQuitar={yaGuardados ? undefined : () => quitar(i)}
                quitarDeshabilitado={enviando}
              />
            ))}
          </Card>
        ) : null}

        {yaGuardados ? (
          <Text variant="bodyMd" tone="inkSecondary">
            Tus tarjetas ya están guardadas. Para agregar o sacar, andá a Perfil.
          </Text>
        ) : bancos.datos ? (
          <SelectorMedio bancos={bancos.datos} medios={nuevos} onAgregar={agregar} />
        ) : bancos.estado === "error" ? (
          <EmptyState
            title="No pudimos cargar los bancos"
            body={bancos.error ?? MENSAJES_ERROR.sin_conexion}
            action={{ label: "Reintentar", onPress: reintentar }}
          />
        ) : (
          <SkeletonList rows={4} />
        )}
      </Screen>
    </>
  );
}
