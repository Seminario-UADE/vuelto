import { router, useLocalSearchParams } from "expo-router";
import { useId, useMemo, useState } from "react";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { OptionRow } from "@/components/option-row";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Segmentado } from "@/components/segmentado";
import { SelectorFecha } from "@/components/selector-fecha";
import { SugerenciaComercio } from "@/components/sugerencia-comercio";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { comercioPorNombre, detallesDeLaCompra, promoPropuesta } from "@/data/calculo";
import type { Canal, Comercio, OrigenCompra } from "@/data/contracts";
import { borradorDesdePorConfirmar } from "@/data/por-confirmar";
import { sugerirComercio, textoParaSugerir } from "@/data/sugerir-comercio";
import { aprox, montoEditable, parseMonto } from "@/lib/format";
import { esRed, esTipoTarjeta } from "@/perfil/modelo";
import { hapticoExito, hapticoSeleccion } from "@/lib/haptics";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCatalogoParaCompras, selectEntradasMotor, selectHoy, selectPerfilVista } from "@/store/selectores";
import { avisoMostrado } from "@/store/sesion";
import { confirmarPorConfirmar, guardarCompra } from "@/store/thunks";
import { sugerirMedio, type MedioLeido } from "@/ticket/sugerencia";
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
 * elegir un día entre el de la simulación y hoy (spec 014 FR-010) y guarda con su mismo id, así
 * confirmar dos veces deja una sola compra (FR-016). Con ticket, el medio leído es solo una
 * sugerencia (spec 014 FR-008).
 */
export default function Revisa() {
  const p = useLocalSearchParams<{
    modo?: string;
    comercio?: string;
    monto?: string;
    /** Con `modo: "excepcion"`: el medio que eligió el usuario con «Usar…». */
    medio?: string;
    /** Con `modo: "ticket"`: el medio tal cual lo dice el ticket (spec 014, FR-008). */
    medioRed?: string;
    medioTipo?: string;
    medioBanco?: string;
    fecha?: string;
    texto?: string;
    canal?: string;
    categoriaId?: string;
    porConfirmar?: string;
    /** Abierta desde el flujo de compra: al guardar sigue a «Compra guardada». */
    flujo?: string;
  }>();
  const hoy = useAppSelector(selectHoy);
  // La compra por confirmar se lee una vez, al abrir: si vence con la hoja abierta, igual se guarda.
  const listaPorConfirmar = useAppSelector((s) => s.porConfirmar.lista);
  // El medio del ticket se cruza una vez, al abrir, con las tarjetas del perfil: es solo una
  // sugerencia, nunca se marca (spec 014, FR-008).
  const tarjetas = useAppSelector((s) => s.perfil.medios);
  const [sugerencia] = useState(() => (p.modo === "ticket" ? sugerirMedio(medioDeLosParametros(p), tarjetas) : null));
  const medioSugeridoTicket = sugerencia?.tipo === "sugerida" ? sugerencia.medioId : null;
  const [desde] = useState(() => {
    const pc = p.porConfirmar ? listaPorConfirmar.find((c) => c.id === p.porConfirmar) : undefined;
    // Con ticket (escaneo desde el paso 4): manda lo del ticket y lo que falta sale de la compra (FR-007).
    const ticket =
      p.modo === "ticket"
        ? { monto: parseMonto(p.monto ?? ""), fecha: p.fecha || null, medioSugeridoTicket, textoExtraido: p.texto ?? null }
        : null;
    return pc ? { pc, ...borradorDesdePorConfirmar(pc, ticket, hoy) } : null;
  });
  // El canal con el que se recomendó (#43) o, con ticket y a mano, en el local; el usuario lo
  // cambia con «¿Dónde pagaste?» (spec 015, FR-015). La promo propuesta y la guardada son las mismas.
  const [canal, setCanal] = useState<Canal>(() =>
    (desde ? desde.borrador.canal : p.canal) === "online" ? "online" : "presencial",
  );
  const modo: OrigenCompra = desde
    ? desde.borrador.modo
    : p.modo === "ticket" || p.modo === "excepcion"
      ? p.modo
      : "manual";
  const comercioInicial = desde?.borrador.comercio ?? p.comercio ?? "";
  const [comercio, setComercio] = useState(comercioInicial);
  // El comercio que el usuario tocó en la sugerencia (spec 015, FR-005): su rubro vale hasta que
  // cambie el texto del campo.
  const [elegido, setElegido] = useState<{ nombre: string; categoriaId: number } | null>(null);
  /** Tocó «No está en la lista» (FR-008): no se vuelve a sugerir hasta que cambie el texto. */
  const [noEsta, setNoEsta] = useState(false);
  /**
   * El texto en el que se buscó por última vez: con ticket, al abrir; a mano, al terminar de
   * escribir (FR-009). Mientras escribe, no coincide con el campo y no se muestra nada.
   */
  const [buscadoEn, setBuscadoEn] = useState<string | null>(() => (p.modo === "ticket" && !desde ? comercioInicial : null));
  // El comercio vino de la compra por confirmar o de la recomendación: no se sugiere otro (FR-010).
  const vinoElComercio = (desde !== null || p.modo === "excepcion") && comercio.trim() === comercioInicial.trim();
  // El rubro con el que se recomendó vale mientras el comercio siga siendo ese: si lo cambia a
  // mano, se busca por nombre como siempre, salvo que haya elegido una sugerencia.
  const categoriaElegida = desde ? (desde.borrador.categoriaId ?? NaN) : Number(p.categoriaId);
  const categoriaId =
    elegido?.categoriaId ??
    (Number.isInteger(categoriaElegida) && comercio.trim() === comercioInicial.trim() ? categoriaElegida : undefined);
  const [monto, setMonto] = useState<number | null>(desde ? desde.borrador.monto : parseMonto(p.monto ?? ""));
  // Excepción: el usuario eligió el medio al tocar "Usar…". Ticket y manual: nunca preseleccionado.
  const [medioId, setMedioId] = useState<string | null>(
    desde ? desde.borrador.medioId : modo === "excepcion" ? p.medio || null : null,
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
  // Con compra por confirmar, del día de la simulación a hoy; sin ella, cualquier día hasta hoy (FR-010).
  const rangoDeDias = desde ? desde.diasPosibles : { desde: null, hoy };

  const perfil = useAppSelector(selectPerfilVista);
  // Comercios y rubros: «Usar…» desde un rubro llega con su nombre («Supermercados»).
  const catalogo = useAppSelector(selectCatalogoParaCompras);
  // La ayuda para elegir el comercio (spec 015): nunca cambia el comercio sola (FR-004).
  // El texto del ticket solo mientras el comercio sea el leído: si lo editó, manda lo que escribió (FR-002.1).
  const textoDelTicket = textoParaSugerir({
    textoTicket: modo === "ticket" ? (desde?.borrador.textoExtraido ?? p.texto ?? null) : null,
    nombre: comercio,
    nombreLeido: comercioInicial,
  });
  const sugerenciaDeComercio = useMemo(
    () =>
      noEsta || vinoElComercio || buscadoEn === null || buscadoEn !== comercio
        ? null
        : sugerirComercio({ nombre: comercio, textoTicket: textoDelTicket, catalogo, categoriaConocida: elegido?.categoriaId ?? null }),
    [noEsta, vinoElComercio, buscadoEn, comercio, textoDelTicket, catalogo, elegido],
  );
  const cambiarComercio = (texto: string) => {
    setComercio(texto);
    setElegido(null);
    setNoEsta(false);
  };
  const elegirComercio = (c: Comercio) => {
    hapticoSeleccion();
    setComercio(c.nombre);
    setBuscadoEn(c.nombre);
    setNoEsta(false);
    setElegido(c.categoriaId === null ? null : { nombre: c.nombre, categoriaId: c.categoriaId });
  };
  // La promo que se propone y se guarda y el texto de cada tarjeta salen de la misma cuenta,
  // evaluada en la fecha de la compra (FR-022, issue #144): no la del día de hoy, que con un
  // ticket de otro día mostraría otra cosa.
  const entradas = useAppSelector(selectEntradasMotor);
  const comercioDeLaCompra = useMemo(
    () => (comercio.trim() ? comercioPorNombre(comercio.trim(), catalogo, categoriaId) : null),
    [comercio, catalogo, categoriaId],
  );
  const propuesta = useMemo(
    () => (medioId && comercioDeLaCompra ? promoPropuesta(entradas, comercioDeLaCompra, medioId, fecha, monto, canal) : null),
    [entradas, comercioDeLaCompra, medioId, fecha, monto, canal],
  );
  // Solo lo que le pasó a esta compra con cada tarjeta, sin promos de otros comercios (issue #144).
  const detalles = useMemo(
    () => (comercioDeLaCompra ? detallesDeLaCompra(entradas, comercioDeLaCompra, fecha, monto, canal) : null),
    [entradas, comercioDeLaCompra, fecha, monto, canal],
  );
  const hayPromo = propuesta !== null && propuesta.promociones.length > 0;

  /** La sugerencia, nunca marcada: la del ticket (spec 014 FR-008) o, sin ella, la de la simulación (spec 012 FR-008). */
  const notaDelMedio = (id: string): string | null => {
    if (medioId !== null) return null;
    if (medioSugeridoTicket === id) return "El que dice el ticket";
    return desde?.medioSugerido === id ? "El que elegiste al simular" : null;
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
        canal,
        categoriaId: categoriaId ?? null,
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
        <Field
          label="Comercio"
          value={comercio}
          onChangeText={cambiarComercio}
          onBlur={() => setBuscadoEn(comercio)}
          placeholder="¿Dónde compraste?"
        />
        <SugerenciaComercio
          resultado={sugerenciaDeComercio}
          catalogo={catalogo}
          onElegir={elegirComercio}
          onNoEsta={() => setNoEsta(true)}
        />
        <Field
          label="Total"
          value={montoEditable(monto)}
          onChangeText={(t) => setMonto(parseMonto(t))}
          placeholder="$0"
          prefix="$"
          keyboardType="number-pad"
          tabular
        />
        <SelectorFecha
          valor={fecha}
          rango={rangoDeDias}
          onChange={(f) => {
            hapticoSeleccion();
            setFechaElegida(f);
          }}
        />
        <View style={{ gap: space.sm }}>
          <Text variant="label" tone="inkSecondary">
            ¿Dónde pagaste?
          </Text>
          <Segmentado
            accessibilityLabel="Dónde pagaste"
            opciones={[
              { valor: "presencial", label: "En el local" },
              { valor: "online", label: "Online" },
            ]}
            valor={canal}
            onChange={(c) => {
              hapticoSeleccion();
              setCanal(c);
            }}
          />
        </View>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="¿Con qué pagaste?" />
        {sugerencia && sugerencia.tipo !== "sugerida" ? (
          <Card tone="warning" padding={space.md}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Icon name="info" size={18} color={colors.warning} />
              <Text variant="bodyMd" tone="warning" style={{ flex: 1 }}>
                {sugerencia.tipo === "sin_medio"
                  ? "El ticket no dice el medio de pago."
                  : `El ticket dice ${sugerencia.leido}, pero no sabemos cuál de tus tarjetas es.`}
              </Text>
            </View>
          </Card>
        ) : null}
        {desde?.avisos.map((a) => (
          <Text key={a} variant="bodyMd" tone="warning">
            {a === "monto-distinto"
              ? "El monto del ticket es distinto al que simulaste: usamos el del ticket."
              : "El ticket dice otro medio de pago que el que elegiste al simular."}
          </Text>
        ))}
        <View accessibilityRole="radiogroup" style={{ gap: space.md }}>
          {perfil.medios.map((m) => (
            <OptionRow
              key={m.id}
              title={m.nombre}
              detail={detalles?.[m.id] ?? null}
              note={notaDelMedio(m.id)}
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

/** El medio leído llega como texto en los parámetros de la ruta; lo que no es del contrato es `null`. */
function medioDeLosParametros(p: { medioRed?: string; medioTipo?: string; medioBanco?: string }): MedioLeido {
  return {
    red: esRed(p.medioRed) ? p.medioRed : null,
    tipo: esTipoTarjeta(p.medioTipo) ? p.medioTipo : null,
    banco: p.medioBanco || null,
    ultimos4: null,
  };
}
