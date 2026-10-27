import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { useSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { fechaCorta } from "@/lib/format";
import { colors, radius, size, space } from "@/theme";

/** Contactos vinculados (ADR-008). Sin buscador: solo se vincula por invitación. */
export default function Contactos() {
  const version = useSesion((s) => s.contactosQuitados.length + s.contactosAceptados.length);
  const contactos = useAsync(() => api.getContactos(), version);

  return (
    <Screen>
      <Text variant="bodyMd" tone="inkSecondary">
        Solo ves su nombre y, en cada compra del grupo, qué medio suyo conviene.
      </Text>
      {!contactos.datos ? (
        <SkeletonList rows={2} />
      ) : contactos.datos.length === 0 ? (
        <Card>
          <Text variant="bodyLg" weight="semibold">
            Todavía no tenés contactos
          </Text>
          <Text variant="bodyMd" tone="inkSecondary">
            Mandale una invitación a alguien con quien comprás seguido. Cuando acepte, Vuelto puede decidir quién de
            ustedes conviene que pague.
          </Text>
        </Card>
      ) : (
        <Card padding={space.lg} gap={0}>
          {contactos.datos.map((c, i) => (
            <View
              key={c.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                paddingVertical: space.md,
                borderTopWidth: i ? 1 : 0,
                borderColor: colors.divider,
              }}
            >
              <Avatar letras={c.iniciales} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyLg" weight="semibold">
                  {c.nombre}
                </Text>
                <Text variant="label" tone="inkSecondary">
                  Vinculado desde el {fechaCorta(c.vinculadoDesde)}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push({ pathname: "/contactos/quitar", params: { id: c.id, nombre: c.nombre } })}
                accessibilityRole="button"
                accessibilityLabel={`Quitar a ${c.nombre}`}
                style={{
                  width: size.hit,
                  height: size.hit,
                  borderRadius: radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="quitar" size={22} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}
      <Button label="Invitar a alguien" variant="secondary" icon="invitar" onPress={() => router.push("/contactos/invitar")} />
    </Screen>
  );
}
