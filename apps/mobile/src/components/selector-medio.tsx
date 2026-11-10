import { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { buscarBancos } from "@/perfil/buscar-bancos";
import {
  esDuplicado,
  ETIQUETAS_RED,
  ETIQUETAS_TIPO,
  MENSAJES_ERROR,
  REDES,
  TIPOS_TARJETA,
  type Banco,
  type MedioNuevo,
  type Red,
  type TipoTarjeta,
} from "@/perfil/modelo";
import { colors, fonts, radius, space, type as escala } from "@/theme";
import { Button } from "./button";
import { Icon } from "./icon";
import { OptionRow } from "./option-row";
import { Segmentado } from "./segmentado";
import { Text } from "./text";

type Props = {
  /** Catálogo de bancos (de Supabase o de lo guardado en el dispositivo). */
  bancos: readonly Banco[];
  /** Medios ya guardados más los agregados sin confirmar, para no repetir (FR-004). */
  medios: readonly MedioNuevo[];
  /** Devuelve el medio armado. El selector no guarda nada (FR-006). */
  onAgregar: (medio: MedioNuevo) => void;
};

/**
 * Banco → tipo → red (issue #41, US1). Lo usan el onboarding y Perfil. Con el texto
 * vacío no muestra bancos; sin coincidencias avisa que el emisor no está (US1-7).
 */
export function SelectorMedio({ bancos, medios, onAgregar }: Props) {
  const [q, setQ] = useState("");
  const [banco, setBanco] = useState<Banco | null>(null);
  const [tipo, setTipo] = useState<TipoTarjeta | null>(null);
  const [red, setRed] = useState<Red | null>(null);

  const resultados = useMemo(() => buscarBancos(bancos, q), [bancos, q]);
  const armado: MedioNuevo | null = banco && tipo && red ? { bancoId: banco.id, tipo, red } : null;
  const repetido = armado !== null && esDuplicado(medios, armado);

  const agregar = () => {
    if (!armado || repetido) return;
    onAgregar(armado);
    // Queda el banco elegido: se puede sumar otra tarjeta del mismo (US1-3).
    setRed(null);
  };

  if (!banco) {
    return (
      <View style={{ gap: space.md }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            minHeight: 48,
            paddingHorizontal: space.lg,
            borderRadius: radius.control,
            backgroundColor: colors.surfaceStrong,
          }}
        >
          <Icon name="buscar" size={20} color={colors.inkSecondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscá tu banco"
            placeholderTextColor={colors.inkSecondary}
            accessibilityLabel="Buscar banco"
            returnKeyType="search"
            autoCorrect={false}
            selectionColor={colors.accent}
            style={{ flex: 1, minHeight: 44, fontFamily: fonts.regular, fontSize: escala.bodyLg.fontSize, color: colors.ink }}
          />
        </View>
        {q.trim() && resultados.length === 0 ? (
          <Text variant="bodyMd" tone="inkSecondary">
            Ese banco o emisor no está disponible en esta versión. Podés seguir con otro medio de pago.
          </Text>
        ) : null}
        <View style={{ gap: space.sm }}>
          {resultados.map((b) => (
            <OptionRow
              key={b.id}
              title={b.nombre}
              selected={false}
              onPress={() => {
                setBanco(b);
                setQ("");
              }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: space.lg }}>
      <OptionRow
        title={banco.nombre}
        detail="Tocá para elegir otro banco"
        selected
        onPress={() => {
          setBanco(null);
          setTipo(null);
          setRed(null);
        }}
      />
      <View style={{ gap: space.sm }}>
        <Text variant="label" tone="inkSecondary" accessibilityRole="header">
          Tipo de tarjeta
        </Text>
        <Segmentado
          opciones={TIPOS_TARJETA.map((t) => ({ valor: t, label: ETIQUETAS_TIPO[t] }))}
          valor={tipo}
          onChange={setTipo}
          accessibilityLabel="Tipo de tarjeta"
        />
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="label" tone="inkSecondary" accessibilityRole="header">
          Red
        </Text>
        <Segmentado
          opciones={REDES.map((r) => ({ valor: r, label: ETIQUETAS_RED[r] }))}
          valor={red}
          onChange={setRed}
          accessibilityLabel="Red de la tarjeta"
        />
      </View>
      {repetido ? (
        <Text variant="label" tone="warning">
          {MENSAJES_ERROR.duplicado}
        </Text>
      ) : null}
      <Button
        label="Agregar tarjeta"
        variant="secondary"
        icon="agregar"
        onPress={agregar}
        disabled={!armado || repetido}
        hint={!tipo || !red ? "Elegí el tipo de tarjeta y la red" : repetido ? MENSAJES_ERROR.duplicado : undefined}
      />
    </View>
  );
}
