import { router, useLocalSearchParams } from "expo-router";
import { useId, useMemo, useState } from "react";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Field } from "@/components/field";
import { Chip } from "@/components/chip";
import { Icon } from "@/components/icon";
import { OptionRow } from "@/components/option-row";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { comercioPorNombre, promoPropuesta } from "@/data/calculo";
import type { OrigenCompra } from "@/data/contracts";
import { borradorDesdePorConfirmar } from "@/data/por-confirmar";
import { useAsync } from "@/hooks/use-async";
import { aprox, fechaLarga, montoEditable, parseMonto } from "@/lib/format";
import { hapticoExito, hapticoSeleccion } from "@/lib/haptics";
import { useAppDispatch, useAppSelector, useRecomendacionPara } from "@/store/hooks";
import { selectEntradasMotor, selectHoy, selectPerfilVista } from "@/store/selectores";
import { avisoMostrado } from "@/store/sesion";
import { confirmarPorConfirmar, guardarCompra } from "@/store/thunks";
import { colors, space } from "@/theme";

const SUBTITULO: Record<OrigenCompra, string> = {
  ticket: "Sacamos estos datos del ticket. Corregí lo que no esté bien.",
  excepcion: "Confirmá la compra que pagaste con el medio que te recomendamos.",
  manual: "Cargá los datos de tu compra.",
};

/**
 * Revisá tu compra (sheet). Ticket y manual: ningún medio preseleccionado y se pregunta
 * "¿Con qué pagaste?" (RF-10). Recomendación: el medio va marcado porque el usuario lo
 * eligió al tocar "Usar…". Pie fijo con un único "Guardar compra" (auditoría P1 #3).
 *
 * Con `porConfirmar` («Ya pagué», spec 012 FR-006): precarga la compra por confirmar, deja
 * elegir entre el día de la simulación y hoy si cambió el día (FR-017) y guarda con su mismo
 * id, así confirmar dos veces deja una sola compra (FR-016).
 */
export default function Revisa() {
  const p = useLocalSearchParams<{
    modo?: string;
    comercio?: string;
    monto?: string;
    medio?: string;
    fecha?: string;
    texto?: string;
    porConfirmar?: string;
    /** Abierta desde el flujo de compra: al guardar sigue a «Compra guardada». */
    flujo?: string;
  }>();
  const hoy = useAppSelector(selectHoy);
  // La compra por confirmar se lee una vez, al abrir: si vence con la hoja abierta, igual se guarda.
  const listaPorConfirmar = useAppSelector((s) => s.porConfirmar.lista);
  const [desde] = useState(() => {
    const pc = p.porConfirmar ? listaPorConfirmar.find((c) => c.id === p.porConfirmar) : undefined;
    // Con ticket (escaneo desde el paso 4): manda lo del ticket y lo que falta sale de la compra (FR-007).
    const ticket =
      p.modo === "ticket"
        ? { monto: parseMonto(p.monto ?? ""), fecha: p.fecha || null, medioId: p.medio || null, textoExtraido: p.texto ?? null }
        : null;
    return pc ? { pc, ...borradorDesdePorConfirmar(pc, ticket, hoy) } : null;
  });
  const modo: OrigenCompra = desde
    ? desde.borrador.modo
    : p.modo === "ticket" || p.modo === "excepcion"
      ? p.modo
      : "manual";
  const [comercio, setComercio] = useState(desde?.borrador.comercio ?? p.comercio ?? "");
  const [monto, setMonto] = useState<number | null>(desde ? desde.borrador.monto : parseMonto(p.monto ?? ""));
  // Excepción: el usuario eligió el medio al tocar "Usar…". Ticket: solo si el ticket lo dice.
  // Manual: nunca preseleccionado.
  const medioDelTicket = modo === "ticket" ? (desde ? desde.borrador.medioId : p.medio || null) : null;
  const [medioId, setMedioId] = useState<string | null>(
    desde ? desde.borrador.medioId : modo === "excepcion" ? p.medio || null : medioDelTicket,
  );
  const [guardando, setGuardando] = useState(false);
  /** El usuario quitó la promo propuesta (spec 010, FR-023). Cambiar de medio la vuelve a proponer. */
  const [quitoLaPromo, setQuitoLaPromo] = useState(false);
  /** Identifica esta apertura de la hoja: un segundo toque en «Guardar» no duplica la compra (FR-005). */
  const intento = useId();
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const [fechaElegida, setFechaElegida] = useState<string | null>(desde?.borrador.fecha ?? null);
  const fecha = fechaElegida ?? (p.fecha || hoy);

  const perfil = useAppSelector(selectPerfilVista);
  const comercioConocido = perfil.comercios.find((c) => c.nombre.toLowerCase() === comercio.trim().toLowerCase());
  const busqueda = useAsync(() => api.buscarComercios(comercio), comercio);
  const conocido =
    comercioConocido ?? busqueda.datos?.find((c) => c.nombre.toLowerCase() === comercio.trim().toLowerCase());
  // Qué dice el motor de cada medio para este comercio (solo para orientar; no preselecciona).
  const rec = useRecomendacionPara(conocido?.id ?? null, monto);
  // La promo que se propone y se guarda es la misma función, evaluada en la fecha de la compra
  // (FR-022): no la del día de hoy, que con un ticket de otro día mostraría otra cosa.
  const entradas = useAppSelector(selectEntradasMotor);
  const propuesta = useMemo(
    () => (medioId && comercio.trim() ? promoPropuesta(entradas, comercioPorNombre(comercio.trim()), medioId, fecha, monto) : null),
    [entradas, medioId, comercio, fecha, monto],
  );
  const hayPromo = propuesta !== null && propuesta.promociones.length > 0;

  const detalleDe = (id: string): string | null => {
    const r = rec;
    if (!r) return null;
    if (r.medio?.id === id) return r.razon;
    const a = r.alternativas.find((x) => x.medioId === id);
    return a ? a.motivo : null;
  };

  const listo = medioId !== null && monto !== null && comercio.trim() !== "";
  const pista = !comercio.trim()
    ? "Falta el comercio"
    : monto === null
      ? "Falta el monto"
      : medioId === null
        ? "Elegí con qué pagaste para continuar"
        : hayPromo && !quitoLaPromo && propuesta.reintegro !== null
          ? `Te devuelven ${aprox(propuesta.reintegro)}${propuesta.base ? `, ${propuesta.base}` : ""}. Hasta que guardes, tus topes no cambian.`
          : "Hasta que guardes, tus topes no cambian.";

  const guardar = () => {
    if (!listo) return;
    setGuardando(true);
    setError(null);
    try {
      const borrador = {
        modo,
        comercio: comercio.trim(),
        fecha,
        monto,
        medioId,
        textoExtraido: modo === "ticket" ? (desde?.borrador.textoExtraido ?? p.texto ?? null) : null,
        usarPromo: !quitoLaPromo,
      };
      // Desde una compra por confirmar, el origen lo decide `origenAlConfirmar` en el thunk.
      const compra = dispatch(desde ? confirmarPorConfirmar(desde.pc.id, borrador, intento) : guardarCompra(borrador, intento));
      hapticoExito();
      if (p.flujo) {
        // Desde el flujo de compra, el cierre es su propia pantalla (auditoría v7).
        router.replace({ pathname: "/compra-guardada", params: { id: compra.id } });
        return;
      }
      dispatch(avisoMostrado(desde ? "Compra guardada. Tus topes están al día." : "Compra guardada · la ves en Mis compras"));
      router.back();
    } catch (e) {
      setGuardando(false);
      setError(e instanceof Error ? `${e.message}. Probá de nuevo.` : "No pudimos guardar. Probá de nuevo.");
    }
  };

  return (
    <Screen
      kind="sheet"
      footer={
        <>
          <Text variant="label" tone={error ? "error" : "inkSecondary"} align="center" accessibilityLiveRegion="polite">
            {error ?? pista}
          </Text>
          <Button label="Guardar compra" onPress={guardar} disabled={!listo} loading={guardando} hint={listo ? undefined : pista} />
        </>
      }
    >
      {/* Desde una compra por confirmar el origen final lo decide el thunk (FR-006): el subtítulo no lo adelanta. */}
      <SheetHeader
        title="Revisá tu compra"
        subtitle={desde ? (modo === "ticket" ? SUBTITULO.ticket : "Confirmá los datos de la compra que pagaste.") : SUBTITULO[modo]}
      />

      {modo === "ticket" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Icon name="candado" size={16} color={colors.inkSecondary} />
          <Text variant="label" tone="inkSecondary">
            No guardamos la foto del ticket
          </Text>
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <Field label="Comercio" value={comercio} onChangeText={setComercio} placeholder="¿Dónde compraste?" />
        <Field
          label="Total"
          value={montoEditable(monto)}
          onChangeText={(t) => setMonto(parseMonto(t))}
          placeholder="$0"
          prefix="$"
          keyboardType="number-pad"
          tabular
        />
        {desde && desde.fechasPosibles.length > 1 ? (
          // Cambió el día desde la simulación: se elige entre ese día y hoy (FR-017).
          <View style={{ gap: space.sm }}>
            <Text variant="label" tone="inkSecondary">
              ¿Cuándo pagaste?
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {desde.fechasPosibles.map((f) => (
                <Chip
                  key={f}
                  label={`${f === hoy ? "Hoy" : "El día que simulaste"}, ${fechaLarga(f)}`}
                  selected={fecha === f}
                  onPress={() => {
                    hapticoSeleccion();
                    setFechaElegida(f);
                  }}
                />
              ))}
            </View>
          </View>
        ) : (
          <Text variant="label" tone="inkSecondary">
            {fechaLarga(fecha).replace(/^./, (c) => c.toUpperCase())}
          </Text>
        )}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="¿Con qué pagaste?" />
        {modo === "ticket" && !medioDelTicket ? (
          <Card tone="warning" padding={space.md}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Icon name="info" size={18} color={colors.warning} />
              <Text variant="bodyMd" tone="warning" style={{ flex: 1 }}>
                El ticket no dice el medio de pago.
              </Text>
            </View>
          </Card>
        ) : null}
        {desde && desde.avisos.length > 0 ? (
          <Text variant="bodyMd" tone="warning">
            {desde.avisos
              .map((a) => (a === "monto-distinto" ? "El monto del ticket es distinto al que simulaste." : "El ticket dice otro medio de pago."))
              .join(" ")}{" "}
            Usamos lo del ticket.
          </Text>
        ) : null}
        <View accessibilityRole="radiogroup" style={{ gap: space.md }}>
          {perfil.medios.map((m) => (
            <OptionRow
              key={m.id}
              title={m.nombre}
              detail={detalleDe(m.id)}
              note={desde?.medioSugerido === m.id && medioId === null ? "El que elegiste al simular" : null}
              selected={medioId === m.id}
              onPress={() => {
                hapticoSeleccion();
                setMedioId(m.id);
                setQuitoLaPromo(false);
              }}
              leading={<Avatar letras={m.inicial} tone={medioId === m.id ? "activo" : "neutral"} />}
            />
          ))}
        </View>
      </View>

      {p.flujo && hayPromo && propuesta ? (
        // Desde el flujo ya se vio la promo en el paso 3: queda solo el control para quitarla (auditoría v7).
        <Button
          label={quitoLaPromo ? "Usar la promo" : "No usé la promo"}
          variant="text"
          onPress={() => setQuitoLaPromo((v) => !v)}
        />
      ) : null}

      {!p.flujo && hayPromo && propuesta ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Promo aplicada" />
          <Card padding={space.lg} gap={space.sm}>
            {quitoLaPromo ? (
              <Text variant="bodyMd" tone="inkSecondary">
                Sin promo: esta compra no va a consumir ningún tope.
              </Text>
            ) : (
              <>
                {propuesta.promociones.map((x) => (
                  <Text key={x.promocionId} variant="bodyLg" weight="semibold">
                    {x.nombre}
                  </Text>
                ))}
                <Text variant="bodyMd" tone="inkSecondary">
                  {propuesta.reintegro !== null
                    ? `Te devuelven ${aprox(propuesta.reintegro)}${propuesta.base ? `, ${propuesta.base}` : ""}.`
                    : "Cargá el monto para estimar cuánto te devuelven."}
                </Text>
              </>
            )}
            <Button
              label={quitoLaPromo ? "Usar esta promo" : "No usé esta promo"}
              variant="text"
              onPress={() => setQuitoLaPromo((v) => !v)}
            />
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
