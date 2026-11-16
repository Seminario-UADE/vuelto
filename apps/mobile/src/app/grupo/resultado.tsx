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
import type { RecomendacionGrupo } from "@/data/contracts";
import { exigirContactosRemoto } from "@/grupo/remoto";
import type { FallaGrupo } from "@/grupo/repositorio";
import { vistaDeGrupo } from "@/grupo/vista";
import { useAsync } from "@/hooks/use-async";
import { aprox, pesos } from "@/lib/format";
import { hapticoExito } from "@/lib/haptics";
import { cargarContactos } from "@/store/contactos";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectHoy } from "@/store/selectores";
import { avisoMostrado } from "@/store/sesion";
import { radius, space } from "@/theme";

/** Qué dice y qué ofrece cada falla (spec 016 FR-027). */
const FALLAS: Record<FallaGrupo, { titulo: string; texto: string }> = {
  invalido: { titulo: "No pudimos armar este grupo", texto: "Revisá el comercio, el monto y que no sean más de 12 personas." },
  "contacto-no-vinculado": {
    titulo: "Alguien del grupo ya no es tu contacto",
    texto: "Puede que haya quitado el vínculo. Volvé a armar el grupo con tus contactos de ahora.",
  },
  "sin-sesion": { titulo: "Tu sesión se cerró", texto: "Volvé a entrar a tu cuenta para calcular el grupo." },
  servidor: { titulo: "No pudimos calcularlo", texto: "Revisá tu conexión y probá de nuevo." },
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

  const r = useAsync<RecomendacionGrupo | null>(async () => {
    if (!pedido) return null;
    const respuesta = await exigirContactosRemoto().recomendarGrupo({
      compra: { comercio: pedido.comercio.nombre, categoriaId: pedido.comercio.categoriaId, canal: pedido.canal, monto: pedido.monto },
      contactos: pedido.contactos,
      // Al servidor va la cantidad; los nombres se quedan en el teléfono (D5).
      sinCuenta: pedido.sinCuenta.length,
    });
    return vistaDeGrupo(respuesta, pedido, {
      hoy,
      mediosPropios,
      nombresDeContactos: Object.fromEntries(contactos.map((c) => [c.id, c.nombre])),
    });
  }, pedido ? JSON.stringify(pedido) : null);
  const g = r.estado === "listo" ? r.datos : null;
  const falla: FallaGrupo | null =
    r.estado === "error" ? (r.error && r.error in FALLAS ? (r.error as FallaGrupo) : "servidor") : null;

  const volverAlPaso = () => router.dismissAll();
  const volverAArmar = () => {
    void dispatch(cargarContactos());
    router.back();
  };

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
    const f = FALLAS[falla];
    const accion =
      falla === "contacto-no-vinculado" ? (
        <Button label="Volver a armar" onPress={volverAArmar} />
      ) : falla === "invalido" ? (
        <Button label="Volver al paso de compra" onPress={volverAlPaso} />
      ) : falla === "sin-sesion" ? (
        <Button label="Entrar a mi cuenta" onPress={() => router.push("/(auth)/login")} />
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
            {f.texto}
          </Text>
        </Card>
      </Screen>
    );
  }

  const n = 1 + pedido.contactos.length + pedido.sinCuenta.length;
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
