import { router } from "expo-router";
import { View } from "react-native";
import { ActionRow } from "@/components/action-row";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { borrarPerfilLocal, usePerfilLocal } from "@/data/perfil-local";
import { reiniciarSesion, useSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { space } from "@/theme";

const ESCENARIOS: { id: api.Escenario; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "mes-vacio", label: "Mes sin compras" },
  { id: "ticket-ilegible", label: "Ticket ilegible" },
];

/**
 * Perfil: medios, comercios, contactos y cuenta. Superficie clara (auditoría P1 #2) y sin
 * "Te devolvieron" (P2 #13).
 */
export default function Perfil() {
  const { perfil } = usePerfilLocal();
  const contactosVersion = useSesion((s) => s.contactosQuitados.length + s.contactosAceptados.length);
  const datos = useAsync(() => api.getPerfil());
  const catalogoMedios = useAsync(() => api.getMediosDisponibles());
  const catalogoComercios = useAsync(() => api.getCatalogoComercios());
  const contactos = useAsync(() => api.getContactos(), contactosVersion);
  // Para forzar recarga de las pantallas al cambiar de escenario.
  const escenario = useSesion(() => api.getEscenario());

  const medios = (catalogoMedios.datos ?? []).filter((m) => perfil.medios.includes(m.id));
  const comercios = (catalogoComercios.datos ?? []).filter((c) => perfil.comercios.includes(c.id));
  const nombre = datos.datos?.nombre ?? "Martín";

  const cerrarSesion = async () => {
    reiniciarSesion();
    await borrarPerfilLocal();
    router.replace("/bienvenida");
  };

  return (
    <Screen kind="tab" aboveTabBar>
      <Card padding={space.xl} gap={space.lg}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
          <Avatar letras={nombre.charAt(0)} tone="activo" size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="titleLg" accessibilityRole="header">
              {nombre}
            </Text>
            <Text variant="label" tone="inkSecondary">
              {perfil.cuenta ? "Nombre que ven tus contactos" : "Perfil sin guardar en este celular"}
            </Text>
          </View>
        </View>
        {catalogoMedios.datos && catalogoComercios.datos ? (
        <Text variant="bodyMd" tone="inkSecondary">
          {medios.length} {medios.length === 1 ? "medio" : "medios"} · {comercios.length}{" "}
          {comercios.length === 1 ? "comercio" : "comercios"}
          {perfil.cuenta && contactos.datos ? ` · ${contactos.datos.length} contactos` : ""}
        </Text>
        ) : null}
      </Card>

      {!perfil.cuenta ? (
        <ActionRow
          icon="candado"
          title="Guardá tu perfil"
          detail="Así no perdés tus medios si cambiás de celular"
          onPress={() => router.push("/login")}
        />
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Tus medios de pago" />
        {catalogoMedios.datos ? (
          <Card padding={space.lg} gap={0}>
            {medios.map((m, i) => (
              <View
                key={m.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.md,
                  paddingVertical: space.md,
                  ...divisor(i),
                }}
              >
                <Avatar letras={m.inicial} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLg" weight="semibold">
                    {m.nombre}
                  </Text>
                  <Text variant="label" tone="inkSecondary">
                    {m.conCobertura ? m.detalle : "Todavía no tenemos promos de este medio"}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <SkeletonList rows={3} height={56} />
        )}
      </View>

      {comercios.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Comercios donde comprás" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {comercios.map((c) => (
              <Chip key={c.id} label={c.nombre} onPress={() => router.push({ pathname: "/comercio/[id]", params: { id: c.id } })} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader
          title="Contactos"
          action={perfil.cuenta ? { label: "Ver todos", onPress: () => router.push("/contactos") } : undefined}
        />
        <Text variant="bodyMd" tone="inkSecondary">
          Con tus contactos, Vuelto decide quién de ustedes conviene que pague.
        </Text>
        {perfil.cuenta ? (
          <>
            {(contactos.datos ?? []).length > 0 ? (
              <Card padding={space.lg} gap={0}>
                {(contactos.datos ?? []).map((c, i) => (
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
          </>
        ) : (
          <Card>
            <Text variant="bodyMd">Para vincular contactos, guardá tu perfil.</Text>
            <Button label="Guardar mi perfil" variant="secondary" onPress={() => router.push("/login")} />
          </Card>
        )}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Cuenta" />
        <Card>
          <Text variant="bodyMd" tone="inkSecondary">
            No pedimos claves ni números de tarjeta. Las fotos de tickets no se guardan: se leen y se descartan. Los
            topes son estimados con las compras que registrás.
          </Text>
        </Card>
        <Button label="Cerrar sesión" variant="text" icon="salir" onPress={cerrarSesion} />
      </View>

      {__DEV__ ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Datos de ejemplo (solo desarrollo)" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {ESCENARIOS.map((e) => (
              <Chip key={e.id} label={e.label} selected={escenario === e.id} onPress={() => api.setEscenario(e.id)} />
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
