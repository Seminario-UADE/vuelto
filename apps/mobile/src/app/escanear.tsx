import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import type { LecturaApp } from "@/data/contracts";
import { cruceDelTicket, porConfirmarDelTicket, type CompraPorConfirmar } from "@/data/por-confirmar";
import { hapticoLeve } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import type { Escenario } from "@/store/acciones";
import { useAppSelector } from "@/store/hooks";
import { selectPorConfirmarVigentes } from "@/store/por-confirmar";
import { selectCatalogoParaCompras, selectHoy } from "@/store/selectores";
import { borrar, elegirDeGaleria, limpiarTemporales, preparar, sacarFoto, type FotoElegida } from "@/ticket/camara";
import { leerFoto } from "@/ticket/leer";
import { salidaDe, type ResultadoLectura, type SalidaLectura } from "@/ticket/resultados";
import { LIMITE_LECTURA_MS, pedirLectura } from "@/ticket/servicio";
import { colors, radius, size, space } from "@/theme";

/** La lectura que salió bien, para seguir a «Revisá tu compra». */
type Leido = Extract<LecturaApp, { ok: true }>;

type Estado =
  | { tipo: "listo" }
  | { tipo: "sin_permiso" }
  | { tipo: "leyendo" }
  | { tipo: "resultado"; resultado: ResultadoLectura }
  // El cruce con la compra por confirmar (spec 012 FR-013, issue #110): se pregunta, nunca se decide solo.
  | { tipo: "de_otro_comercio"; leido: Leido; pc: CompraPorConfirmar }
  | { tipo: "es_por_confirmar"; leido: Leido; pc: CompraPorConfirmar }
  | { tipo: "anterior"; leido: Leido; pc: CompraPorConfirmar };

/** Los escenarios de desarrollo de Perfil que simulan la lectura (FR-012); el resto usa la cámara. */
const ESCENARIO_TICKET: Record<Escenario, api.EscenarioTicket | null> = {
  normal: null,
  "mes-vacio": null,
  "ticket-ilegible": "ilegible",
  "sin-red": "sin-red",
  "ticket-de-ejemplo": "ejemplo",
};

const ETIQUETA_SALIDA: Record<SalidaLectura, string> = {
  probar_de_nuevo: "Probar de nuevo",
  iniciar_sesion: "Iniciar sesión",
  cargar_a_mano: "Cargar a mano",
};

/**
 * Escanear ticket (modal a pantalla completa, spec 014). «Sacar foto» abre la cámara del sistema
 * y «Elegir de la galería», las fotos del sistema. La foto se achica, se manda al servicio y sus
 * copias se borran antes de seguir (FR-007, `ticket/leer.ts`); nunca se guarda.
 *
 * Los escenarios de desarrollo de Perfil (FR-012) simulan la lectura sin cámara ni servicio.
 */
export default function Escanear() {
  // Desde el paso 4 del flujo: la lectura confirma esa compra por confirmar (spec 012 FR-007).
  const desde = useLocalSearchParams<{ porConfirmar?: string; flujo?: string }>();
  const extra = {
    ...(desde.porConfirmar ? { porConfirmar: desde.porConfirmar } : {}),
    ...(desde.flujo ? { flujo: desde.flujo } : {}),
  };
  const insets = useSafeAreaInsets();
  const [estado, setEstado] = useState<Estado>({ tipo: "listo" });
  const escenario = useAppSelector((s) => s.sesion.escenario);
  const escenarioTicket = ESCENARIO_TICKET[escenario];
  const usuario = useAppSelector((s) => s.sesion.usuario);
  const conSesion = usuario !== null && supabase !== null;
  const hoy = useAppSelector(selectHoy);
  // Si el usuario cierra la pantalla mientras lee, la lectura termina (y borra) pero no navega.
  const abierta = useRef(true);

  useEffect(() => {
    // Lo que haya quedado de una lectura interrumpida (FR-007).
    limpiarTemporales();
    abierta.current = true;
    return () => {
      abierta.current = false;
    };
  }, []);

  const porConfirmar = useAppSelector(selectPorConfirmarVigentes);
  const catalogo = useAppSelector(selectCatalogoParaCompras);

  /** Abre «Revisá tu compra» con lo leído: confirmando esa compra por confirmar, o como compra suelta (`null`). */
  const irARevisa = (t: Leido, porConfirmarId: string | null) =>
    router.replace({
      pathname: "/revisa",
      params: {
        modo: "ticket",
        comercio: t.comercio ?? "",
        monto: t.monto ?? "",
        fecha: t.fecha ?? "",
        // Lo que dice el ticket, no una tarjeta: «Revisá» lo sugiere, nunca lo marca (FR-008).
        medioRed: t.medio.red ?? "",
        medioTipo: t.medio.tipo ?? "",
        medioBanco: t.medio.banco ?? "",
        texto: t.textoExtraido,
        ...(porConfirmarId ? { porConfirmar: porConfirmarId } : {}),
        ...(desde.flujo ? { flujo: desde.flujo } : {}),
      },
    });

  const terminar = (t: LecturaApp) => {
    if (!abierta.current) return;
    if (!t.ok) {
      setEstado({ tipo: "resultado", resultado: t.resultado });
      return;
    }
    const ticket = { comercio: t.comercio, fecha: t.fecha, textoExtraido: t.textoExtraido };
    // Desde «Ya pagué» o la tarjeta: se cruza con esa compra (spec 012 US2-5 y US2-6).
    const pc = desde.porConfirmar ? porConfirmar.find((c) => c.id === desde.porConfirmar) : undefined;
    if (pc) {
      const cruce = cruceDelTicket(pc, ticket, catalogo);
      if (cruce === "otro_comercio") setEstado({ tipo: "de_otro_comercio", leido: t, pc });
      else if (cruce === "anterior") setEstado({ tipo: "anterior", leido: t, pc });
      else irARevisa(t, pc.id);
      return;
    }
    // Escaneando suelto: si coincide con una compra por confirmar, se pregunta (US2-9).
    const coincide = desde.porConfirmar ? null : porConfirmarDelTicket(porConfirmar, ticket, catalogo);
    if (coincide) setEstado({ tipo: "es_por_confirmar", leido: t, pc: coincide });
    else irARevisa(t, desde.porConfirmar ?? null);
  };

  const leer = async (elegir: () => Promise<FotoElegida>) => {
    if (estado.tipo === "leyendo") return;
    hapticoLeve();
    if (escenarioTicket) {
      setEstado({ tipo: "leyendo" });
      terminar(await api.leerTicket({ hoy, escenario: escenarioTicket }));
      return;
    }
    const cliente = supabase;
    if (!cliente || !conSesion) return;
    let foto: FotoElegida;
    try {
      foto = await elegir();
    } catch {
      setEstado({ tipo: "resultado", resultado: "foto_no_valida" });
      return;
    }
    // Cerró la cámara o la galería sin elegir: vuelve sin error (FR-003).
    if (foto.tipo === "cancelada") return;
    if (foto.tipo === "sin_permiso") {
      setEstado({ tipo: "sin_permiso" });
      return;
    }
    setEstado({ tipo: "leyendo" });
    const t = await leerFoto(foto.uri, {
      preparar,
      borrar,
      pedir: (base64) => pedirLectura(cliente, base64, { limiteMs: LIMITE_LECTURA_MS }),
    });
    terminar(t);
  };

  const aMano = () =>
    router.replace({ pathname: "/revisa", params: desde.porConfirmar ? extra : { modo: "manual", ...extra } });
  const iniciarSesion = () => router.push("/login");

  const accion: Record<SalidaLectura, () => void> = {
    probar_de_nuevo: () => setEstado({ tipo: "listo" }),
    iniciar_sesion: iniciarSesion,
    cargar_a_mano: aMano,
  };

  const leyendo = estado.tipo === "leyendo";
  // Sin sesión no se abre la cámara ni se llama al servicio (FR-002). Los escenarios no usan ninguno.
  const pideSesion = !conSesion && escenarioTicket === null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.scrim, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* El visor es oscuro en los dos temas: la barra de estado va clara. */}
      <StatusBar style="light" />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, minHeight: 56 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={{
            width: size.hit,
            height: size.hit,
            borderRadius: radius.pill,
            backgroundColor: colors.scrimSurface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="cerrar" size={18} color={colors.onScrim} />
        </Pressable>
        <Text variant="titleMd" align="center" accessibilityRole="header" style={{ flex: 1, color: colors.onScrim }}>
          Escaneá el ticket
        </Text>
        <View style={{ width: size.hit }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: space.section, gap: space.lg }}
      >
        <View style={{ alignItems: "center", gap: space.md }}>
          <Icon name={leyendo ? "ticket" : "camara"} size={56} color={colors.onScrim} />
          <Text variant="bodyLg" align="center" accessibilityLiveRegion="polite" style={{ color: colors.onScrim }}>
            {leyendo ? "Leyendo el ticket…" : "Sacale una foto al ticket entero, con buena luz."}
          </Text>
        </View>

        {pideSesion ? (
          <Card>
            <Text variant="bodyMd" accessibilityLiveRegion="polite">
              Iniciá sesión para leer tickets
            </Text>
            <Button label="Iniciar sesión" onPress={iniciarSesion} />
            <Button label="Cargar a mano" variant="secondary" onPress={aMano} />
          </Card>
        ) : estado.tipo === "resultado" ? (
          <Card>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Icon name="info" size={20} color={colors.error} />
              <Text variant="bodyMd" tone="error" style={{ flex: 1 }} accessibilityLiveRegion="polite">
                {salidaDe(estado.resultado).mensaje}
              </Text>
            </View>
            {salidaDe(estado.resultado).salidas.map((s, i) => (
              <Button key={s} label={ETIQUETA_SALIDA[s]} variant={i === 0 ? "primary" : "secondary"} onPress={accion[s]} />
            ))}
          </Card>
        ) : estado.tipo === "de_otro_comercio" || estado.tipo === "es_por_confirmar" ? (
          <Card>
            <Text variant="bodyMd" weight="semibold" accessibilityLiveRegion="polite">
              {estado.tipo === "de_otro_comercio"
                ? `¿Este ticket es de tu compra en ${estado.pc.comercioNombre}?`
                : `¿Es tu compra por confirmar en ${estado.pc.comercioNombre}?`}
            </Text>
            <Button label="Sí, es esa compra" onPress={() => irARevisa(estado.leido, estado.pc.id)} />
            <Button label="No, es otra compra" variant="secondary" onPress={() => irARevisa(estado.leido, null)} />
          </Card>
        ) : estado.tipo === "anterior" ? (
          <Card>
            <Text variant="bodyMd" accessibilityLiveRegion="polite">
              {`Este ticket es de antes de que simularas la compra en ${estado.pc.comercioNombre}: lo cargamos como una compra aparte.`}
            </Text>
            <Button label="Seguir" onPress={() => irARevisa(estado.leido, null)} />
          </Card>
        ) : estado.tipo === "sin_permiso" ? (
          <Card>
            <Text variant="bodyMd" accessibilityLiveRegion="polite">
              Para sacar la foto necesitamos permiso para usar la cámara
            </Text>
            <Button label="Elegir de la galería" icon="galeria" onPress={() => void leer(elegirDeGaleria)} />
            <Button label="Cargar a mano" variant="secondary" onPress={aMano} />
          </Card>
        ) : (
          <Card>
            <Button label="Sacar foto" icon="camara" loading={leyendo} onPress={() => void leer(sacarFoto)} />
            <Button
              label="Elegir de la galería"
              icon="galeria"
              variant="secondary"
              disabled={leyendo}
              onPress={() => void leer(elegirDeGaleria)}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Icon name="candado" size={18} />
              <Text variant="label" style={{ flex: 1 }}>
                La foto no se guarda: leemos los datos y la descartamos
              </Text>
            </View>
            {escenarioTicket ? (
              <Text variant="caption" tone="inkSecondary">
                Escenario de prueba: no abre la cámara ni manda la foto.
              </Text>
            ) : null}
          </Card>
        )}
      </ScrollView>

      {pideSesion || (estado.tipo !== "listo" && estado.tipo !== "leyendo") ? null : (
        <View style={{ alignItems: "center", paddingVertical: space.lg }}>
          <Pressable
            onPress={aMano}
            disabled={leyendo}
            accessibilityRole="button"
            style={{ alignItems: "center", gap: space.xs, minWidth: 88, minHeight: size.hit, opacity: leyendo ? 0.5 : 1 }}
          >
            <Icon name="teclado" size={24} color={colors.onScrim} />
            <Text variant="label" style={{ color: colors.onScrim }}>
              Cargar a mano
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
