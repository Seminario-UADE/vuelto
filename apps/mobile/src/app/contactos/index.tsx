import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { fechaCorta } from "@/lib/format";
import { cargarContactos } from "@/store/contactos";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { colors, radius, size, space } from "@/theme";

/**
 * Contactos vinculados (ADR-008, spec 016 US2). Sin buscador: solo se vincula por invitación. La
 * lista sale del servidor y se vuelve a pedir cada vez que se entra (FR-019).
 */
export default function Contactos() {
  const dispatch = useAppDispatch();
  const contactos = useAppSelector((s) => s.contactos.lista);
  const fallo = useAppSelector((s) => s.contactos.estado === "error");
  useFocusEffect(
    useCallback(() => {
      void dispatch(cargarContactos());
    }, [dispatch]),
  );

  return (
    <Screen>
      <Text variant="bodyMd" tone="inkSecondary">
        Solo ves su nombre y, en cada compra del grupo, qué medio suyo conviene.
      </Text>
      {fallo ? (
        <Text variant="label" tone="inkSecondary" accessibilityLiveRegion="polite">
          Sin conexión: esta es la última lista que vimos.
        </Text>
      ) : null}
      {contactos.length === 0 ? (
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
          {contactos.map((c, i) => (
            <View
              key={c.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                paddingVertical: space.md,
                ...divisor(i),
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
      <Button label="Tengo una invitación" variant="text" icon="link" onPress={() => router.push("/contactos/pegar")} />
    </Screen>
  );
}
