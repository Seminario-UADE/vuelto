import { useState } from "react";
import { Pressable, View } from "react-native";
import { conMayuscula, fechaLarga, nombreDelDia, nombreDelMes } from "@/lib/format";
import { colors, radius, size, space } from "@/theme";
import { diasDelMes, mesDe, otroMes, puedeIrAlMes, type RangoDeDias } from "@/ticket/fechas";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = {
  valor: string;
  rango: RangoDeDias;
  onChange: (dia: string) => void;
};

const INICIALES = ["D", "L", "M", "M", "J", "V", "S"];

function Flecha({ atras, habilitada, onPress }: { atras: boolean; habilitada: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!habilitada}
      accessibilityRole="button"
      accessibilityLabel={atras ? "Mes anterior" : "Mes siguiente"}
      accessibilityState={{ disabled: !habilitada }}
      style={{ width: size.hit, height: size.hit, alignItems: "center", justifyContent: "center", opacity: habilitada ? 1 : 0.3 }}
    >
      <Icon name={atras ? "atras" : "chevron"} size={20} />
    </Pressable>
  );
}

/**
 * La fecha de la compra (spec 014, FR-010, research R7): la fecha elegida y, al tocarla, el
 * calendario del mes. Los días fuera del rango (`ticket/fechas.ts`) se ven y se anuncian
 * deshabilitados; nunca hay un día futuro.
 */
export function SelectorFecha({ valor, rango, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => mesDe(valor));
  const dias = diasDelMes(mes, rango);
  const vacios = dias[0]?.diaDeLaSemana ?? 0;
  const celdas: (typeof dias[number] | null)[] = [...Array<null>(vacios).fill(null), ...dias];

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label" tone="inkSecondary">
        ¿Cuándo pagaste?
      </Text>
      <Pressable
        onPress={() => {
          setMes(mesDe(valor));
          setAbierto((a) => !a);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Fecha: ${fechaLarga(valor)}`}
        accessibilityHint="Abre el calendario para cambiarla"
        accessibilityState={{ expanded: abierto }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          minHeight: size.hit,
          paddingHorizontal: space.md,
          borderRadius: radius.control,
          borderWidth: 1.5,
          borderColor: colors.controlBorder,
        }}
      >
        <Icon name="calendario" size={18} />
        <Text variant="bodyMd" style={{ flex: 1 }}>
          {conMayuscula(fechaLarga(valor))}
        </Text>
        <Icon name="editar" size={16} color={colors.inkSecondary} />
      </Pressable>

      {abierto ? (
        <View style={{ gap: space.xs, padding: space.sm, borderRadius: radius.card, backgroundColor: colors.surface }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Flecha atras habilitada={puedeIrAlMes(otroMes(mes, -1), rango)} onPress={() => setMes(otroMes(mes, -1))} />
            <Text variant="bodyMd" weight="semibold" align="center" accessibilityRole="header" style={{ flex: 1 }}>
              {conMayuscula(nombreDelMes(mes))}
            </Text>
            <Flecha atras={false} habilitada={puedeIrAlMes(otroMes(mes, 1), rango)} onPress={() => setMes(otroMes(mes, 1))} />
          </View>
          <View style={{ flexDirection: "row" }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {INICIALES.map((d, i) => (
              <Text key={i} variant="caption" tone="inkSecondary" align="center" style={{ flex: 1 }}>
                {d}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {celdas.map((c, i) => {
              if (c === null) return <View key={`v${i}`} style={{ width: `${100 / 7}%`, height: size.hit }} />;
              const elegido = c.dia === valor;
              const numero = Number(c.dia.slice(8));
              return (
                <View key={c.dia} style={{ width: `${100 / 7}%`, height: size.hit, alignItems: "center", justifyContent: "center" }}>
                  <Pressable
                    onPress={() => {
                      onChange(c.dia);
                      setAbierto(false);
                    }}
                    disabled={!c.permitido}
                    accessibilityRole="button"
                    accessibilityLabel={`${nombreDelDia(c.diaDeLaSemana)} ${numero}`}
                    accessibilityState={{ disabled: !c.permitido, selected: elegido }}
                    style={{
                      width: size.hit - 4,
                      height: size.hit - 4,
                      borderRadius: radius.pill,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: elegido ? colors.accent : colors.transparent,
                    }}
                  >
                    <Text
                      variant="bodyMd"
                      weight={elegido ? "semibold" : "medium"}
                      tabular
                      maxFontSizeMultiplier={1.3}
                      style={{ color: elegido ? colors.onAccent : c.permitido ? colors.ink : colors.inkSecondary, opacity: c.permitido ? 1 : 0.4 }}
                    >
                      {numero}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
