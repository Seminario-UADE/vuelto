import { useEffect, useState } from "react";
import { View } from "react-native";
import { useAsync } from "@/hooks/use-async";
import { MENSAJES_ERROR, puedeSacar, type MedioNuevo } from "@/perfil/modelo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { agregarMedio, leerBancos, leerMedios, sacarMedio } from "@/store/perfil-remoto";
import { selectMediosDelUsuario } from "@/store/selectores";
import { space } from "@/theme";
import { Button } from "./button";
import { Card } from "./card";
import { EmptyState } from "./empty-state";
import { MedioRow } from "./medio-row";
import { SectionHeader } from "./section-header";
import { SelectorMedio } from "./selector-medio";
import { SkeletonList } from "./skeleton";
import { Text } from "./text";

const AVISO_SIN_CONEXION =
  "Sin conexión: tu perfil se muestra como estaba la última vez. Para editarlo necesitás conexión.";

/**
 * «Tus medios de pago» en Perfil (issue #41, US2): agregar y sacar contra Supabase. Sin conexión se
 * muestra lo guardado y no se edita (FR-010, FR-012); el último medio no se saca (FR-009).
 */
export function MediosDelPerfil() {
  const dispatch = useAppDispatch();
  const guardados = useAppSelector((s) => s.perfil.medios);
  const carga = useAppSelector((s) => s.perfil.carga);
  const medios = useAppSelector(selectMediosDelUsuario);
  const [agregando, setAgregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bancos = useAsync(() => (agregando ? dispatch(leerBancos()) : Promise.resolve(null)), agregando ? 1 : 0);

  // Al entrar a Perfil se vuelve a leer: así se sabe si hay conexión para editar (FR-010).
  useEffect(() => {
    void dispatch(leerMedios());
  }, [dispatch]);

  // Solo se edita con la lectura al día: sin conexión, con error o leyendo queda en solo lectura (FR-010).
  const sinConexion = carga === "sin-conexion" || carga === "error";
  const editable = carga === "lista";
  const sePuedeSacar = editable && puedeSacar(guardados);

  const agregar = async (m: MedioNuevo) => {
    setEnviando(true);
    setError(null);
    const r = await dispatch(agregarMedio(m));
    setEnviando(false);
    if (r.ok) setAgregando(false);
    else setError(MENSAJES_ERROR[r.error]);
  };

  const sacar = async (id: string) => {
    setEnviando(true);
    setError(null);
    const r = await dispatch(sacarMedio(id));
    setEnviando(false);
    if (!r.ok) setError(MENSAJES_ERROR[r.error]);
  };

  return (
    <View style={{ gap: space.md }}>
      <SectionHeader
        title="Tus medios de pago"
        action={
          !editable
            ? undefined
            : {
                label: agregando ? "Cancelar" : "Agregar",
                onPress: () => {
                  setError(null);
                  setAgregando((x) => !x);
                },
              }
        }
      />
      {sinConexion ? (
        <Card tone="warning" padding={space.md} gap={space.sm}>
          <Text variant="bodyMd" tone="warning">
            {AVISO_SIN_CONEXION}
          </Text>
          <Button label="Reintentar" variant="text" onPress={() => void dispatch(leerMedios())} />
        </Card>
      ) : null}
      {medios.length === 0 && carga === "leyendo" ? (
        <SkeletonList rows={2} height={56} />
      ) : medios.length === 0 ? (
        <Text variant="bodyMd" tone="inkSecondary">
          {sinConexion ? MENSAJES_ERROR.sin_conexion : "Todavía no tenés medios de pago."}
        </Text>
      ) : (
        <Card padding={space.lg} gap={0}>
          {medios.map((m, i) => (
            <MedioRow
              key={m.id}
              medio={m}
              indice={i}
              onQuitar={!editable ? undefined : () => void sacar(m.id)}
              quitarDeshabilitado={!sePuedeSacar || enviando}
            />
          ))}
        </Card>
      )}
      {editable && guardados.length === 1 ? (
        <Text variant="label" tone="inkSecondary">
          Necesitás al menos un medio: agregá otro antes de sacar este.
        </Text>
      ) : null}
      {error ? (
        <Text variant="label" tone="warning">
          {error}
        </Text>
      ) : null}
      {agregando && editable ? (
        <Card padding={space.lg} gap={space.md}>
          {bancos.datos ? (
            <SelectorMedio bancos={bancos.datos} medios={guardados} onAgregar={(m) => void agregar(m)} />
          ) : bancos.estado === "error" ? (
            <EmptyState
              title="No pudimos cargar los bancos"
              body={bancos.error ?? MENSAJES_ERROR.sin_conexion}
              action={{ label: "Reintentar", onPress: bancos.recargar }}
            />
          ) : (
            <SkeletonList rows={3} />
          )}
        </Card>
      ) : null}
    </View>
  );
}
