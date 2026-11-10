import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { FilaAccion } from "@/components/fila-accion";
import { MediosDelPerfil } from "@/components/medios-del-perfil";
import { NombreDelPerfil } from "@/components/nombre-del-perfil";
import { Screen } from "@/components/screen";
import { Segmentado } from "@/components/segmentado";
import { SectionHeader } from "@/components/section-header";
import { SelectorApariencia } from "@/components/selector-apariencia";
import { Text } from "@/components/text";
import { cerrarSesion as salir } from "@/data/auth";
import { escenarioElegido, type Escenario } from "@/store/acciones";
import { preferenciaCambiada } from "@/store/apariencia";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPorConfirmarVigentes } from "@/store/por-confirmar";
import { selectPendientesAlCerrarSesion } from "@/store/selectores";
import { avisoMostrado } from "@/store/sesion";
import { space } from "@/theme";

const ESCENARIOS: { id: Escenario; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "mes-vacio", label: "Sin compras" },
  { id: "ticket-ilegible", label: "Ticket ilegible" },
];

/**
 * Perfil (DESIGN.md v7): tu nombre, tus medios de pago y Contactos. Mis compras tiene
 * su pestaña.
 * Los comercios tienen su pestaña. Sin contadores ni textos explicativos.
 */
export default function Perfil() {
  const dispatch = useAppDispatch();
  const usuario = useAppSelector((s) => s.sesion.usuario);
  const contactos = useAppSelector((s) => s.contactos.lista);
  const escenario = useAppSelector((s) => s.sesion.escenario);
  const preferenciaTema = useAppSelector((s) => s.apariencia.preferencia);


  const pendientes = useAppSelector(selectPendientesAlCerrarSesion);
  const porConfirmar = useAppSelector(selectPorConfirmarVigentes).length;
  const cerrarSesion = async () => {
    // Con compras sin subir o por confirmar, primero se avisa cuántas se pierden (spec 010 FR-016, spec 012 FR-014).
    if (pendientes.guardados + pendientes.borrados + porConfirmar > 0) {
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
      </Card>

      <MediosDelPerfil />

      <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
        <FilaAccion
          leading="grupo"
          titulo="Contactos"
          valor={contactos.length > 0 ? String(contactos.length) : null}
          onPress={() => router.push("/contactos")}
        />
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Apariencia" />
        <SelectorApariencia valor={preferenciaTema} onChange={(v) => dispatch(preferenciaCambiada(v))} />
      </View>

      <View style={{ gap: space.xs }}>
        {usuario?.email ? (
          <Text variant="label" tone="inkSecondary" align="center">
            Entraste como {usuario.email}
          </Text>
        ) : null}
        <Button label="Cerrar sesión" variant="text" icon="salir" onPress={() => void cerrarSesion()} />
      </View>

      {__DEV__ ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Datos de ejemplo (solo desarrollo)" />
          <Segmentado
            opciones={ESCENARIOS.map((e) => ({ valor: e.id, label: e.label }))}
            valor={escenario}
            onChange={(id) => dispatch(escenarioElegido(id))}
            accessibilityLabel="Datos de ejemplo"
          />
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
