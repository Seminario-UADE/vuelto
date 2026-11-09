import { useState } from "react";
import { Pressable, View } from "react-native";
import { hapticoExito } from "@/lib/haptics";
import { MENSAJES_ERROR, NOMBRE_MAXIMO, validarNombre } from "@/perfil/modelo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cambiarNombre } from "@/store/perfil-remoto";
import { colors, space } from "@/theme";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Campo } from "./campo";
import { Icon } from "./icon";
import { Text } from "./text";

/**
 * El nombre que ven los contactos, en la tarjeta de Perfil (spec 012, FR-028 y FR-029). Tocarlo lo
 * edita con las mismas reglas del alta. Sin nombre (cuentas anteriores) dice «Cargá tu nombre»:
 * nunca uno inventado. Como los medios, se edita solo con el perfil leído de Supabase.
 */
export function NombreDelPerfil() {
  const dispatch = useAppDispatch();
  const nombre = useAppSelector((s) => s.perfil.nombre);
  const editable = useAppSelector((s) => s.perfil.carga === "lista");
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const abrir = () => {
    setTexto(nombre ?? "");
    setError(null);
    setEditando(true);
  };

  const guardar = async () => {
    const v = validarNombre(texto);
    if (!v.ok) {
      setError(v.mensaje);
      return;
    }
    if (v.nombre === nombre) {
      setEditando(false);
      return;
    }
    setEnviando(true);
    const r = await dispatch(cambiarNombre(v.nombre));
    setEnviando(false);
    if (!r.ok) {
      setError(MENSAJES_ERROR[r.error]);
      return;
    }
    hapticoExito();
    setEditando(false);
  };

  if (editando) {
    return (
      <View style={{ gap: space.md }}>
        <Campo
          label="Tu nombre"
          value={texto}
          onChangeText={(x) => {
            setTexto(x);
            setError(null);
          }}
          placeholder="Como te van a ver tus contactos"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="givenName"
          maxLength={NOMBRE_MAXIMO + 10}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void guardar()}
          error={error ?? undefined}
        />
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button label="Cancelar" variant="secondary" onPress={() => setEditando(false)} disabled={enviando} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Guardar" onPress={() => void guardar()} loading={enviando} disabled={enviando} />
          </View>
        </View>
      </View>
    );
  }

  const contenido = (
    <>
      {nombre ? (
        <Avatar letras={nombre.charAt(0).toLocaleUpperCase("es")} tone="activo" size={56} />
      ) : (
        <Avatar icon="editar" tone="neutral" size={56} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="titleLg" accessibilityRole="header" tone={nombre ? undefined : "inkSecondary"}>
          {nombre ?? "Cargá tu nombre"}
        </Text>
        <Text variant="label" tone="inkSecondary">
          Nombre que ven tus contactos
        </Text>
      </View>
      {editable ? <Icon name="editar" size={20} color={colors.inkSecondary} /> : null}
    </>
  );
  const fila = { flexDirection: "row" as const, alignItems: "center" as const, gap: space.lg };
  if (!editable) return <View style={fila}>{contenido}</View>;
  return (
    <Pressable
      onPress={abrir}
      accessibilityRole="button"
      accessibilityLabel={nombre ? `Tu nombre: ${nombre}. Editar` : "Cargá tu nombre"}
      style={fila}
    >
      {contenido}
    </Pressable>
  );
}
