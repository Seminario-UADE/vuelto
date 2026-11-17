import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { RUTA_COMPRAR, TabBar } from "@/components/tab-bar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { destinoDeTabs } from "@/perfil/destino";
import { MENSAJES_ERROR } from "@/perfil/modelo";
import { leerMedios } from "@/store/perfil-remoto";
import { useTema } from "@/components/tema-provider";
import { colors } from "@/theme";

/**
 * Inicio · Compras · ( + ) · Comercios · Perfil (DESIGN.md v7 §5, spec 012 FR-018). Topes se
 * abre desde Inicio. La barra es
 * propia (`TabBar`): la nativa no admite un botón central destacado. El «+» no es una pestaña:
 * su ruta ficticia abre el flujo de compra.
 */
export default function TabsLayout() {
  const t = useTema();
  const usuario = useAppSelector((s) => s.sesion.usuario);
  const perfil = useAppSelector((s) => s.perfil);
  const dispatch = useAppDispatch();
  // Toda la app está detrás de la sesión: sin usuario, a Bienvenida (crear cuenta o entrar).
  const destino = destinoDeTabs(usuario !== null, perfil);
  if (destino.tipo === "bienvenida") return <Redirect href="/bienvenida" />;
  if (destino.tipo === "esperar") return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  if (destino.tipo === "error-de-carga") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: "center" }}>
        <EmptyState
          title="No pudimos cargar tu perfil"
          body={
            perfil.carga === "servidor-desactualizado"
              ? MENSAJES_ERROR.servidor_desactualizado
              : "Necesitamos conexión para leer tus medios de pago."
          }
          action={{ label: "Reintentar", onPress: () => void dispatch(leerMedios()) }}
        />
      </View>
    );
  }
  // Sin medios en el perfil: al onboarding, sin salida hasta confirmar (issue #41, T009).
  if (destino.tipo === "onboarding") return <Redirect href="/medios" />;
  // Una invitación abierta antes de tener cuenta o perfil se abre apenas el perfil está listo, venga
  // de la primera respuesta, de «Guardá tu perfil», de «Ya tengo cuenta» o del primer ingreso
  // (ADR-008 §1, spec 012 US5, issue #137). La pantalla de aceptación la limpia al abrirse.
  if (destino.tipo === "invitacion") return <Redirect href={`/i/${destino.token}`} />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.canvas } }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="compras" options={{ title: "Compras" }} />
      <Tabs.Screen
        name={RUTA_COMPRAR}
        options={{ title: "Comprar" }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tabs.Screen name="comercios" options={{ title: "Comercios" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
