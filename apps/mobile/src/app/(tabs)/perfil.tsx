import { router } from "expo-router";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { divisor } from "@/components/lista";
import { ComerciosDelPerfil } from "@/components/comercios-del-perfil";
import { MediosDelPerfil } from "@/components/medios-del-perfil";
import { NombreDelPerfil } from "@/components/nombre-del-perfil";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Text } from "@/components/text";
import { cerrarSesion as salir } from "@/data/auth";
import { escenarioElegido, type Escenario } from "@/store/acciones";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPendientesAlCerrarSesion } from "@/store/selectores";
import { avisoMostrado } from "@/store/sesion";
import { space } from "@/theme";

const ESCENARIOS: { id: Escenario; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "mes-vacio", label: "Mes sin compras" },
  { id: "ticket-ilegible", label: "Ticket ilegible" },
];

/**
 * Perfil: medios, comercios, contactos y cuenta. Superficie clara (auditoría P1 #2) y sin
 * "Te devolvieron" (P2 #13).
 */
export default function Perfil() {
  const dispatch = useAppDispatch();
  const perfil = useAppSelector((s) => s.perfil);
  const usuario = useAppSelector((s) => s.sesion.usuario);
  const contactos = useAppSelector((s) => s.contactos.lista);
  const escenario = useAppSelector((s) => s.sesion.escenario);

  const medios = perfil.medios;
  const comercios = perfil.comercios;

  const pendientes = useAppSelector(selectPendientesAlCerrarSesion);
  const cerrarSesion = async () => {
    // Con compras sin subir, primero se avisa cuántas se pierden (spec 010, FR-016).
    if (pendientes.guardados + pendientes.borrados > 0) {
      router.push("/cerrar-sesion");
      return;
    }
    const error = await dispatch(salir());
    if (error) {
      dispatch(avisoMostrado(error));
      return;
    }
    router.replace("/bienvenida");
  };

  return (
    <Screen kind="tab" aboveTabBar>
      <Card padding={space.xl} gap={space.lg}>
        <NombreDelPerfil />
        {perfil.carga !== "leyendo" ? (
          <Text variant="bodyMd" tone="inkSecondary">
            {medios.length} {medios.length === 1 ? "medio" : "medios"} · {comercios.length}{" "}
            {comercios.length === 1 ? "comercio" : "comercios"}
            {` · ${contactos.length} contactos`}
          </Text>
        ) : null}
      </Card>

      <MediosDelPerfil />

      <ComerciosDelPerfil />

      <View style={{ gap: space.md }}>
        <SectionHeader
          title="Contactos"
          action={{ label: "Ver todos", onPress: () => router.push("/contactos") }}
        />
        <Text variant="bodyMd" tone="inkSecondary">
          Con tus contactos, Vuelto decide quién de ustedes conviene que pague.
        </Text>
        {contactos.length > 0 ? (
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
                <Text variant="bodyLg" weight="semibold" style={{ flex: 1 }}>
                  {c.nombre}
                </Text>
                <Text variant="label" tone="inkSecondary">
                  Vinculado
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
        <Button label="Invitar a alguien" variant="secondary" icon="invitar" onPress={() => router.push("/contactos/invitar")} />
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Cuenta" />
        <Card>
          <Text variant="bodyMd" tone="inkSecondary">
            No pedimos claves ni números de tarjeta. Las fotos de tickets no se guardan: se leen y se descartan. Los
            topes son estimados con las compras que registrás.
          </Text>
        </Card>
        {usuario?.email ? (
          <Text variant="bodyMd" tone="inkSecondary">
            Entraste como {usuario.email}
          </Text>
        ) : null}
        <Button label="Cerrar sesión" variant="text" icon="salir" onPress={() => void cerrarSesion()} />
      </View>

      {__DEV__ ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Datos de ejemplo (solo desarrollo)" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {ESCENARIOS.map((e) => (
              <Chip
                key={e.id}
                label={e.label}
                selected={escenario === e.id}
                onPress={() => dispatch(escenarioElegido(e.id))}
              />
            ))}
          </View>
          <Button
            label="Abrir una invitación de ejemplo"
            variant="text"
            icon="link"
            onPress={() => router.push("/i/demo-tomas")}
          />
        </View>
      ) : null}

      <Text variant="caption" tone="inkSecondary" align="center">
        Vuelto · versión 0.1
      </Text>
    </Screen>
  );
}
