/**
 * Repositorio de contactos en memoria, para los tests (spec 013). Reproduce los estados que
 * devuelve la base (`contracts/rpc-contactos.md`) sin red. La recomendación de grupo se configura
 * con una respuesta fija o una falla.
 */
import type {
  ContactoRemoto,
  FallaGrupo,
  InvitacionCreada,
  PedidoRecomendarGrupo,
  RepositorioContactos,
  RespuestaGrupo,
  ResultadoAceptar,
  VistaInvitacionRemota,
} from "./repositorio";
import { FallaGrupoError, SinNombreError } from "./repositorio";

export type OpcionesMemoria = {
  contactos?: ContactoRemoto[];
  /** Invitaciones de otros que el usuario puede abrir, por token. */
  invitaciones?: Record<string, VistaInvitacionRemota & { emisor?: { id: string; nombre: string } }>;
  sinNombre?: boolean;
  respuestaGrupo?: RespuestaGrupo;
  fallaGrupo?: FallaGrupo;
};

export type RepositorioMemoria = RepositorioContactos & {
  /** Hace fallar la próxima llamada (simula red caída o error del servidor). */
  fallarLaProxima(): void;
  pedidosGrupo: PedidoRecomendarGrupo[];
  contactos: ContactoRemoto[];
};

export function repositorioContactosMemoria(opciones: OpcionesMemoria = {}): RepositorioMemoria {
  let contactos = [...(opciones.contactos ?? [])];
  const invitaciones = { ...(opciones.invitaciones ?? {}) };
  let fallar = false;
  let generadas = 0;
  const pedidosGrupo: PedidoRecomendarGrupo[] = [];

  const quizasFallar = () => {
    if (fallar) {
      fallar = false;
      throw new Error("Sin conexión");
    }
  };

  const repo: RepositorioMemoria = {
    pedidosGrupo,
    get contactos() {
      return contactos;
    },
    fallarLaProxima() {
      fallar = true;
    },
    async listar() {
      quizasFallar();
      return [...contactos];
    },
    async crearInvitacion(): Promise<InvitacionCreada> {
      quizasFallar();
      if (opciones.sinNombre) throw new SinNombreError();
      generadas++;
      return { token: `token${String(generadas).padStart(19, "0")}`, venceEn: "2026-11-16T15:00:00.000Z" };
    },
    async verInvitacion(token): Promise<VistaInvitacionRemota> {
      quizasFallar();
      const inv = invitaciones[token];
      if (!inv) return { estado: "inexistente", quienInvita: null, venceEn: null };
      const yaContacto = inv.estado === "valida" && inv.emisor && contactos.some((c) => c.id === inv.emisor?.id);
      return yaContacto ? { estado: "ya-contacto", quienInvita: inv.quienInvita, venceEn: null } : { estado: inv.estado, quienInvita: inv.quienInvita, venceEn: inv.venceEn };
    },
    async aceptarInvitacion(token): Promise<ResultadoAceptar> {
      quizasFallar();
      const vista = await repo.verInvitacion(token);
      if (vista.estado !== "valida") return { estado: vista.estado, contacto: null };
      if (opciones.sinNombre) return { estado: "sin-nombre", contacto: null };
      const emisor = invitaciones[token]?.emisor ?? { id: "emisor", nombre: vista.quienInvita ?? "Alguien" };
      contactos = [...contactos, { id: emisor.id, nombre: emisor.nombre, vinculadoDesde: "2026-11-15T15:00:00.000Z" }];
      const inv = invitaciones[token];
      if (inv) invitaciones[token] = { ...inv, estado: "usada", venceEn: null };
      return { estado: "aceptada", contacto: { id: emisor.id, nombre: emisor.nombre } };
    },
    async quitar(contactoId) {
      quizasFallar();
      contactos = contactos.filter((c) => c.id !== contactoId);
    },
    async recomendarGrupo(pedido) {
      pedidosGrupo.push(pedido);
      quizasFallar();
      if (opciones.fallaGrupo) throw new FallaGrupoError(opciones.fallaGrupo);
      if (!opciones.respuestaGrupo) throw new FallaGrupoError("servidor");
      return opciones.respuestaGrupo;
    },
  };
  return repo;
}
