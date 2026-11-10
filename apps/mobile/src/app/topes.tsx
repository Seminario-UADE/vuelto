import { router } from "expo-router";
import { View } from "react-native";
import { Dato, FilaDeDatos } from "@/components/dato";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TopeDetalle } from "@/components/tope-card";
import { aprox } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectTopes } from "@/store/selectores";
import { space } from "@/theme";

/**
 * Tus topes (DESIGN.md v7 §6): se abre desde Inicio. Arriba, dos datos (lo devuelto en el mes,
 * con ≈ y su base, y cuándo se reinician); abajo, una tarjeta por tope con su anillo. Sin total
 * agregado de topes (auditoría P1 #4) ni consejos: lo que conviene hoy lo dice el «+».
 */
export default function Topes() {
  // Derivados con el motor sobre las compras del store: una compra guardada los cambia al instante.
  const datos = useAppSelector(selectTopes);
  const vacio = datos.devolvieron.monto === 0 && datos.medios.every((m) => m.disponible === null);
  const mes = datos.mes.replace(/^./, (c) => c.toUpperCase());

  return (
    <Screen gap={space.xl}>
      <FilaDeDatos>
        <Dato icon="devolvieron" titulo="Te devolvieron" valor={aprox(datos.devolvieron.monto)} detalle={datos.devolvieron.base.texto} />
        <Dato
          icon="calendario"
          titulo="Se reinician"
          valor={`en ${datos.reinicioMensualEnDias} días`}
          detalle={`Los topes mensuales · ${mes}`}
        />
      </FilaDeDatos>

      {vacio ? (
        <EmptyState
          title="Todavía no registraste compras"
          body="Cuando registres la primera, vas a ver cuánto tope te queda en cada medio. Tocá + cuando estés por pagar."
        />
      ) : null}

      <View style={{ gap: space.md }}>
        <Text variant="titleMd" accessibilityRole="header">
          Por medio de pago
        </Text>
        {datos.medios.map((m) => (
          <TopeDetalle
            key={m.clave}
            t={m}
            onPress={() => router.push({ pathname: "/tope/[clave]", params: { clave: m.clave } })}
          />
        ))}
      </View>

      <Text variant="label" tone="inkSecondary" align="center">
        Estimados según las compras que registrás. Las que no confirmaste no cuentan.
      </Text>
    </Screen>
  );
}
