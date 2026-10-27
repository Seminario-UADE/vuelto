import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { OptionRow } from "@/components/option-row";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { SheetHeader } from "@/components/sheet-header";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import type { OrigenCompra } from "@/data/contracts";
import { setSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { aprox, fechaLarga, montoEditable, parseMonto } from "@/lib/format";
import { hapticoExito, hapticoSeleccion } from "@/lib/haptics";
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
 */
export default function Revisa() {
  const p = useLocalSearchParams<{
    modo?: string;
    comercio?: string;
    monto?: string;
    medio?: string;
    fecha?: string;
    texto?: string;
  }>();
  const modo: OrigenCompra = p.modo === "ticket" || p.modo === "excepcion" ? p.modo : "manual";
  const [comercio, setComercio] = useState(p.comercio ?? "");
  const [monto, setMonto] = useState<number | null>(parseMonto(p.monto ?? ""));
  // Excepción: el usuario eligió el medio al tocar "Usar…". Ticket: solo si el ticket lo dice.
  // Manual: nunca preseleccionado.
  const medioDelTicket = modo === "ticket" && p.medio ? p.medio : null;
  const [medioId, setMedioId] = useState<string | null>(modo === "excepcion" ? p.medio || null : medioDelTicket);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fecha = p.fecha || api.getHoy();

  const perfil = useAsync(() => api.getPerfil());
  const comercioConocido = perfil.datos?.comercios.find((c) => c.nombre.toLowerCase() === comercio.trim().toLowerCase());
  const busqueda = useAsync(() => api.buscarComercios(comercio), comercio);
  const conocido = comercioConocido ?? busqueda.datos?.find((c) => c.nombre.toLowerCase() === comercio.trim().toLowerCase());
  // Qué dice el servidor de cada medio para este comercio (solo para orientar; no preselecciona).
  const rec = useAsync(() => (conocido ? api.recomendar(conocido.id, monto) : Promise.resolve(null)), `${conocido?.id ?? "-"}:${monto ?? "-"}`);

  const detalleDe = (id: string): string | null => {
    const r = rec.datos;
    if (!r) return null;
    if (r.medio?.id === id) return r.razon;
    const a = r.alternativas.find((x) => x.medio.id === id);
    return a ? (a.estado === "agotado" ? a.motivo.replace(/^t/, "T") : "Sin promo hoy") : null;
  };

  const listo = medioId !== null && monto !== null && comercio.trim() !== "";
  const pista = !comercio.trim()
    ? "Falta el comercio"
    : monto === null
      ? "Falta el monto"
      : medioId === null
        ? "Elegí con qué pagaste para continuar"
        : rec.datos?.medio?.id === medioId && rec.datos.reintegro !== null
          ? `Te devuelven ${aprox(rec.datos.reintegro)}${rec.datos.base ? `, ${rec.datos.base.texto}` : ""}. Hasta que guardes, tus topes no cambian.`
          : "Hasta que guardes, tus topes no cambian.";

  const guardar = async () => {
    if (!listo) return;
    setGuardando(true);
    setError(null);
    try {
      await api.guardarCompra({
        modo,
        comercio: comercio.trim(),
        fecha,
        monto,
        medioId,
        textoExtraido: modo === "ticket" ? (p.texto ?? null) : null,
      });
      hapticoExito();
      setSesion({ aviso: "Compra guardada · la ves en Mis compras" });
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
      <SheetHeader title="Revisá tu compra" subtitle={SUBTITULO[modo]} />

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
        <Text variant="label" tone="inkSecondary">
          {fechaLarga(fecha).replace(/^./, (c) => c.toUpperCase())}
        </Text>
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
        {perfil.datos ? (
          <View accessibilityRole="radiogroup" style={{ gap: space.md }}>
            {perfil.datos.medios.map((m) => (
              <OptionRow
                key={m.id}
                title={m.nombre}
                detail={detalleDe(m.id)}
                selected={medioId === m.id}
                onPress={() => {
                  hapticoSeleccion();
                  setMedioId(m.id);
                }}
                leading={<Avatar letras={m.inicial} tone={medioId === m.id ? "activo" : "neutral"} />}
              />
            ))}
          </View>
        ) : (
          <SkeletonList rows={4} height={64} />
        )}
      </View>
    </Screen>
  );
}
