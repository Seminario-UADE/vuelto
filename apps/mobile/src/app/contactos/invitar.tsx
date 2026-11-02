import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Icon, type IconName } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { setSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { colors, radius, space } from "@/theme";

const SI = ["Qué medio suyo conviene en cada compra del grupo", "El reintegro estimado de esa compra", "Su nombre para mostrar"];
const NO = ["Nunca sus compras, montos ni comercios", "Nunca cuánto tope le queda", "Nunca sus otros medios de pago"];

function Item({ icon, texto, tono }: { icon: IconName; texto: string; tono: "ink" | "inkSecondary" }) {
  return (
    <View style={{ flexDirection: "row", gap: space.sm }}>
      <Icon name={icon} size={18} color={tono === "ink" ? colors.accent : colors.inkSecondary} />
      <Text variant="bodyMd" tone={tono} style={{ flex: 1 }}>
        {texto}
      </Text>
    </View>
  );
}

/** Invitar contacto (ADR-008 §1): link + QR de un solo uso que vence en 24 h. Sin buscador. */
export default function Invitar() {
  const [n, setN] = useState(0);
  const inv = useAsync(() => api.crearInvitacion(), n);
  const link = inv.datos?.link;

  const compartir = async () => {
    if (!link) return;
    await Share.share({ message: `Te invito a Vuelto para decidir juntos quién conviene que pague: https://${link}` });
  };
  const copiar = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(`https://${link}`);
    setSesion({ aviso: "Link copiado" });
  };

  return (
    <Screen footer={<Button label="Compartir link" icon="compartir" onPress={compartir} disabled={!link} />}>
      <Text variant="bodyLg" tone="inkSecondary">
        Mandale este link o mostrale el QR. Cuando acepte, Vuelto puede decidir quién de ustedes conviene que pague.
      </Text>

      <Card padding={space.xl} gap={space.lg}>
        <View style={{ alignItems: "center", gap: space.md }}>
          {link ? (
            <View style={{ padding: space.md, backgroundColor: colors.canvas, borderRadius: radius.row }}>
              <QRCode value={`https://${link}`} size={180} color={colors.ink} backgroundColor={colors.canvas} />
            </View>
          ) : (
            <Skeleton height={204} width={204} />
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
            <Icon name="reloj" size={16} color={colors.inkSecondary} />
            <Text variant="label" tone="inkSecondary">
              Vence en {inv.datos?.venceEn ?? "24 h"} · sirve una sola vez
            </Text>
          </View>
        </View>
        <Pressable
          onPress={copiar}
          accessibilityRole="button"
          accessibilityLabel={`Copiar link ${link ?? ""}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            minHeight: 48,
            paddingHorizontal: space.lg,
            borderRadius: radius.row,
            backgroundColor: colors.canvas,
          }}
        >
          <Text variant="bodyMd" weight="semibold" selectable style={{ flex: 1 }}>
            {link ?? " "}
          </Text>
          <Icon name="copiar" size={18} color={colors.inkSecondary} />
        </Pressable>
      </Card>

      <View style={{ gap: space.md }}>
        <Text variant="titleMd" accessibilityRole="header">
          Qué va a compartir con vos
        </Text>
        {SI.map((t) => (
          <Item key={t} icon="checkCirculo" texto={t} tono="ink" />
        ))}
        {NO.map((t) => (
          <Item key={t} icon="bloqueo" texto={t} tono="inkSecondary" />
        ))}
      </View>

      <Card>
        <Item
          icon="info"
          tono="inkSecondary"
          texto="No hay buscador: solo te vinculás con quien acepte tu invitación. Cualquiera de los dos puede quitar el vínculo."
        />
      </Card>
      <Button label="Generar otro link" variant="text" icon="recargar" onPress={() => setN((x) => x + 1)} />
    </Screen>
  );
}
