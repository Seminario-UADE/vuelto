import { router } from "expo-router";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { DecisionCard } from "@/components/decision-card";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Skeleton, SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import { cantidadDeIntegrantes } from "@/grupo/pedido";
import type { FallaGrupo } from "@/grupo/repositorio";
import { vistaDeGrupo } from "@/grupo/vista";
import { useAsync } from "@/hooks/use-async";
import { aprox, pesos } from "@/lib/format";
import { hapticoExito } from "@/lib/haptics";
import { pedirRecomendacionGrupo } from "@/store/grupo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectHoy } from "@/store/selectores";
import { avisoMostrado } from "@/store/sesion";
import { radius, space } from "@/theme";

/** Qué dice cada falla (spec 016 FR-027). La acción la elige la pantalla. */
const FALLAS: Record<FallaGrupo, { titulo: string; texto: string }> = {
  invalido: { titulo: "No pudimos armar este grupo", texto: "Revisá el comercio, el monto y que no sean más de 12 personas." },
  "contacto-no-vinculado": {
    titulo: "Alguien del grupo ya no es tu contacto",
    texto: "Puede que haya quitado el vínculo. Volvé a armar el grupo con tus contactos de ahora.",
  },
  // Igual que la lectura del ticket (`ticket/resultados.ts`): el aviso de sesión de la app.
  "sin-sesion": { titulo: "Tu sesión venció", texto: "Iniciá sesión para calcular el grupo." },
  servidor: { titulo: "No pudimos calcularlo", texto: "Revisá tu conexión y probá de nuevo." },
};

/** El motivo de un pedido rechazado, según el dato que marcó el servidor (FR-027). */
const MOTIVO_INVALIDO: Record<string, string> = {
  "compra.monto": "El monto tiene que ser un número entero mayor a cero.",
  "compra.categoriaId": "No conocemos el rubro de este comercio. Elegilo de la lista en el paso de compra.",
  "compra.comercio": "El nombre del comercio no es válido. Elegilo de la lista en el paso de compra.",
  "compra.canal": "Elegí si pagás en el local u online.",
  grupo: "El grupo tiene que tener entre 2 y 12 personas, con vos incluido.",
  contactos: "Hay un contacto repetido o que no es válido. Volvé a armar el grupo.",
};

/**
 * Gasto en grupo (spec 016 US3): quién conviene que pague, con qué medio y cuánto pone cada uno,
 * con los datos reales de la cuenta, sus contactos y el corpus. De un contacto solo se muestra lo
 * de FR-021; sin estados de cobro (FR-027 de la spec 006). Nunca se queda cargando: termina en el
 * resultado o en un error con su acción (SC-009).
 */
export default function GastoEnGrupo() {
  const dispatch = useAppDispatch();
  const pedido = useAppSelector((s) => s.grupo.pedido);
  const hoy = useAppSelector(selectHoy);
  const mediosPropios = useAppSelector((s) => s.perfil.medios);
  const contactos = useAppSelector((s) => s.contactos.lista);

  const r = useAsync(async () => {
    const resultado = await dispatch(pedirRecomendacionGrupo());
    if (!resultado || !pedido) return null;
    if (!resultado.ok) return resultado;
    return {
      ok: true as const,
      vista: vistaDeGrupo(resultado.respuesta, pedido, {
        hoy,
        mediosPropios,
        nombresDeContactos: Object.fromEntries(contactos.map((c) => [c.id, c.nombre])),
      }),
    };
  }, pedido ? JSON.stringify(pedido) : null);
  // El thunk no lanza: una falla llega como dato, con su campo (FR-027). Un error inesperado es «servidor».
  const res = r.estado === "listo" ? r.datos : null;
  const g = res?.ok ? res.vista : null;
  const falla: { falla: FallaGrupo; campo: string | null } | null =
    res && !res.ok ? res : r.estado === "error" ? { falla: "servidor", campo: null } : null;

  const volverAlPaso = () => router.dismissAll();
  // La lista ya se recargó al recibir el 409 (US3-12): volver a armar la muestra al día.
  const volverAArmar = () => router.back();

  // «Confirmar» sigue como antes: el aviso y volver (qué más hace es la issue #138).
  const confirmar = () => {
    if (!g?.quienPaga) return router.dismissAll();
    hapticoExito();
    dispatch(
      avisoMostrado(g.quienPaga.esVos ? `Listo: pagás vos con ${g.medio}` : `Listo: paga ${g.quienPaga.nombre} con ${g.medio}`),
    );
    router.dismissAll();
  };

  if (!pedido) {
    return (
      <Screen footer={<Button label="Volver al paso de compra" onPress={volverAlPaso} />}>
        <Text variant="bodyLg">Armá el grupo desde el paso de compra, en «¿Pagan entre varios?».</Text>
      </Screen>
    );
  }

  if (falla) {
    const f = FALLAS[falla.falla];
    const texto = falla.falla === "invalido" ? (MOTIVO_INVALIDO[falla.campo ?? ""] ?? f.texto) : f.texto;
    const accion =
      falla.falla === "contacto-no-vinculado" ? (
        <Button label="Volver a armar" onPress={volverAArmar} />
      ) : falla.falla === "invalido" ? (
        <Button label="Volver al paso de compra" onPress={volverAlPaso} />
      ) : falla.falla === "sin-sesion" ? (
        <Button label="Iniciar sesión" onPress={() => router.push("/login")} />
      ) : (
        <Button label="Reintentar" icon="recargar" onPress={r.recargar} />
      );
    return (
      <Screen footer={accion}>
        <Card padding={space.xl}>
          <Text variant="titleMd" accessibilityRole="header">
            {f.titulo}
          </Text>
          <Text variant="bodyMd" tone="inkSecondary" accessibilityLiveRegion="polite">
            {texto}
          </Text>
        </Card>
      </Screen>
    );
  }

  const n = cantidadDeIntegrantes(pedido);
  const cifra = (x: number) => (g?.reintegro !== null ? aprox(x) : pesos(x));

  return (
    <Screen
      footer={
        g ? (
          <Button
            label={g.quienPaga ? (g.quienPaga.esVos ? "Confirmar que pago yo" : `Confirmar que paga ${g.quienPaga.nombre}`) : "Listo"}
            onPress={confirmar}
          />
        ) : null
      }
    >
      <Text variant="bodyMd" tone="inkSecondary">
        {g ? `${g.comercio.nombre} · ${g.cuando} · ${pesos(g.monto)} · ${n} personas` : " "}
      </Text>

      {g ? (
        <DecisionCard
          titulo={g.titulo}
          inicial={g.quienPaga && !g.quienPaga.esVos ? g.quienPaga.iniciales : null}
          razon={g.medio && g.razon ? `Con ${g.medio} · ${g.razon}` : null}
          razonIcon={g.quienPaga ? "checkCirculo" : "info"}
          cifra={g.reintegro !== null ? { etiqueta: "Les devuelven", valor: aprox(g.reintegro), clave: `g${g.reintegro}` } : null}
          secundaria={g.reintegro !== null ? "El reintegro le llega a quien paga" : null}
          base={g.base}
        />
      ) : (
        <Skeleton height={240} r={radius.card} />
      )}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Cómo queda cada uno" />
        {g ? (
          <Card padding={space.lg} gap={0}>
            {g.integrantes.map((i, k) => (
              <View
                key={i.clave}
                style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, ...divisor(k) }}
              >
                {i.esVos ? <Avatar icon="perfil" /> : <Avatar letras={i.iniciales ?? "?"} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyLg" weight="semibold">
                    {i.nombre}
                  </Text>
                  <Text variant="label" tone="inkSecondary">
                    {i.detalle}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text variant="label" tone="inkSecondary">
                    pone
                  </Text>
                  <Text variant="bodyLg" weight="semibold" tabular>
                    {cifra(i.pone)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <SkeletonList rows={n} height={56} />
        )}
      </View>

      <Text variant="label" tone="inkSecondary">
        La división se muestra, no se cobra: cada uno registra sus propias compras.
      </Text>
    </Screen>
  );
}
