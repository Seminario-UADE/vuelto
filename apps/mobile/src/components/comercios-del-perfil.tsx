import { router } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import * as api from "@/data/api";
import { comercioPorNombre } from "@/data/calculo";
import { useAsync } from "@/hooks/use-async";
import { comercioRepetido, MENSAJE_COMERCIO_REPETIDO, MENSAJES_ERROR } from "@/perfil/modelo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { agregarComercio, sacarComercio } from "@/store/perfil-remoto";
import { colors, fonts, radius, size, space, type as escala } from "@/theme";
import { Card } from "./card";
import { Chip } from "./chip";
import { Icon } from "./icon";
import { divisor } from "./lista";
import { SectionHeader } from "./section-header";
import { Text } from "./text";

/**
 * «Comercios donde comprás» en Perfil (issue #47): agregar (autocompletar con el catálogo o el nombre
 * que escriba) y sacar, contra `comercios_habituales`. Son opcionales: el perfil puede quedar sin
 * ninguno (RF-02). En «¿Con qué pago?» aparecen primero.
 */
export function ComerciosDelPerfil() {
  const dispatch = useAppDispatch();
  const comercios = useAppSelector((s) => s.perfil.comercios);
  const sinConexion = useAppSelector((s) => s.perfil.carga === "sin-conexion");
  const [agregando, setAgregando] = useState(false);
  const [q, setQ] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sugerencias = useAsync(() => (q.trim() ? api.buscarComercios(q) : Promise.resolve([])), q);

  const texto = q.trim();
  const opciones = (sugerencias.datos ?? []).filter((c) => !comercioRepetido(comercios, c.nombre)).slice(0, 5);
  const ofrecerTexto =
    texto !== "" && !comercioRepetido(comercios, texto) && !opciones.some((c) => comercioRepetido([c], texto));

  const agregar = async (nombre: string) => {
    setEnviando(true);
    setError(null);
    const r = await dispatch(agregarComercio(nombre));
    setEnviando(false);
    if (r.ok) {
      setQ("");
      setAgregando(false);
    } else {
      setError(r.error === "duplicado" ? MENSAJE_COMERCIO_REPETIDO : MENSAJES_ERROR[r.error]);
    }
  };

  const sacar = async (id: string) => {
    setEnviando(true);
    setError(null);
    const r = await dispatch(sacarComercio(id));
    setEnviando(false);
    if (!r.ok) setError(MENSAJES_ERROR[r.error]);
  };

  const abrir = (nombre: string) => {
    const c = comercioPorNombre(nombre);
    // Solo los del catálogo tienen pantalla de comercio; uno escrito a mano no tiene rubro.
    if (c.categoriaId !== null) router.push({ pathname: "/comercio/[id]", params: { id: c.id } });
  };

  return (
    <View style={{ gap: space.md }}>
      <SectionHeader
        title="Comercios donde comprás"
        action={
          sinConexion
            ? undefined
            : {
                label: agregando ? "Cancelar" : "Agregar",
                onPress: () => {
                  setError(null);
                  setQ("");
                  setAgregando((x) => !x);
                },
              }
        }
      />
      {comercios.length === 0 ? (
        <Text variant="bodyMd" tone="inkSecondary">
          Opcional: los que agregues aparecen primero cuando elegís dónde comprás.
        </Text>
      ) : (
        <Card padding={space.lg} gap={0}>
          {comercios.map((c, i) => (
            <View
              key={c.id}
              style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm, ...divisor(i) }}
            >
              <Pressable
                onPress={() => abrir(c.nombre)}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${c.nombre}`}
                style={{ flex: 1, minHeight: size.hit, justifyContent: "center" }}
              >
                <Text variant="bodyLg" weight="semibold">
                  {c.nombre}
                </Text>
              </Pressable>
              {sinConexion ? null : (
                <Pressable
                  onPress={() => void sacar(c.id)}
                  disabled={enviando}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${c.nombre}`}
                  style={{
                    width: size.hit,
                    height: size.hit,
                    borderRadius: radius.pill,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: enviando ? 0.4 : 1,
                  }}
                >
                  <Icon name="quitar" size={22} color={colors.error} />
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      )}
      {agregando && !sinConexion ? (
        <View style={{ gap: space.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              minHeight: 48,
              paddingHorizontal: space.lg,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceStrong,
            }}
          >
            <Icon name="buscar" size={20} color={colors.inkSecondary} />
            <TextInput
              value={q}
              onChangeText={(t) => {
                setError(null);
                setQ(t);
              }}
              placeholder="Buscá o escribí un comercio"
              placeholderTextColor={colors.inkSecondary}
              accessibilityLabel="Buscar comercio para agregar"
              returnKeyType="done"
              selectionColor={colors.accent}
              style={{ flex: 1, minHeight: 44, fontFamily: fonts.regular, fontSize: escala.bodyLg.fontSize, color: colors.ink }}
            />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {opciones.map((c) => (
              <Chip key={c.id} label={c.nombre} icon="agregar" onPress={() => void agregar(c.nombre)} />
            ))}
            {ofrecerTexto ? (
              <Chip label={`Agregar «${texto}»`} icon="agregar" onPress={() => void agregar(texto)} />
            ) : null}
          </View>
        </View>
      ) : null}
      {error ? (
        <Text variant="label" tone="warning">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
