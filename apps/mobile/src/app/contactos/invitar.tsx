import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Icon, type IconName } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/skeleton";
import { Text } from "@/components/text";
import { textoVencimiento } from "@/grupo/invitacion";
import { SinNombreError } from "@/grupo/repositorio";
import { linkDeInvitacion } from "@/grupo/token";
import { useAsync } from "@/hooks/use-async";
import { crearInvitacion } from "@/store/contactos";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { avisoMostrado } from "@/store/sesion";
import { colors, qrColors, radius, space } from "@/theme";

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

/** El texto de la invitación lleva el link para pegar: WhatsApp no deja tocar un `vuelto://` (D11). */
function mensaje(link: string): string {
  return (
    `Te invito a Vuelto para decidir juntos quién conviene que pague: ${link}\n\n` +
    "Si el link no se abre, copialo y pegalo en Vuelto → Perfil → Contactos → «Tengo una invitación»."
  );
}

/**
 * Invitar contacto (ADR-008 §1, spec 016 US2): link + QR de un solo uso que vence en 24 h. Al
 * volver a entrar se muestra la misma invitación; generar otra invalida la anterior (FR-011).
 * Sin buscador.
 */
export default function Invitar() {
  const [n, setN] = useState(0);
  const dispatch = useAppDispatch();
  const ahora = useAppSelector((s) => s.sesion.ahora);
  // Al abrir, la invitación vigente si hay una; «Generar otro link» pide una nueva (US2-2).
  const inv = useAsync(async () => {
    const creada = await dispatch(crearInvitacion(n > 0));
    return { link: linkDeInvitacion(creada.token, Linking.createURL), venceEn: creada.venceEn };
  }, n);
  const link = inv.estado === "listo" ? inv.datos?.link : undefined;
  const sinNombre = inv.estado === "error" && inv.error === new SinNombreError().message;

  const compartir = async () => {
    if (!link) return;
    await Share.share({ message: mensaje(link) });
  };
  const copiar = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    dispatch(avisoMostrado("Link copiado"));
  };

  if (inv.estado === "error") {
    return (
      <Screen
        footer={
          sinNombre ? (
            <Button label="Elegir mi nombre" onPress={() => router.replace("/perfil")} />
          ) : (
            <Button label="Reintentar" icon="recargar" onPress={inv.recargar} />
          )
        }
      >
        <Card padding={space.xl}>
          <Text variant="titleMd" accessibilityRole="header">
            {sinNombre ? "Primero elegí tu nombre" : "No pudimos crear la invitación"}
          </Text>
          <Text variant="bodyMd" tone="inkSecondary" accessibilityLiveRegion="polite">
            {sinNombre
              ? "Quien acepte tu invitación va a ver tu nombre para mostrar. Elegilo en Perfil y volvé."
              : "Revisá tu conexión y probá de nuevo."}
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label="Compartir link" icon="compartir" onPress={compartir} disabled={!link} />}>
      <Text variant="bodyLg" tone="inkSecondary">
        Mostrale el QR para que lo escanee con la cámara, o mandale el link. Cuando acepte, Vuelto puede decidir quién de
        ustedes conviene que pague.
      </Text>

      <Card padding={space.xl} gap={space.lg}>
        <View style={{ alignItems: "center", gap: space.md }}>
          {link ? (
            <View style={{ padding: space.md, backgroundColor: qrColors.fondo, borderRadius: radius.row }}>
              <QRCode value={link} size={180} color={qrColors.ink} backgroundColor={qrColors.fondo} />
            </View>
          ) : (
            <Skeleton height={204} width={204} />
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
            <Icon name="reloj" size={16} color={colors.inkSecondary} />
            <Text variant="label" tone="inkSecondary">
              {link && inv.datos ? textoVencimiento(inv.datos.venceEn, new Date(ahora)) : "Vence en 24 h · sirve una sola vez"}
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
