/**
 * El token de una invitación (spec 016, FR-012, D11). Lo genera la base: 18 bytes al azar en
 * base64url, 24 caracteres. El link es `vuelto://i/<token>`; en Expo Go, el que da Expo para el
 * mismo camino (`exp://…/--/i/<token>`). Funciones puras: no tocan la red.
 */

export const FORMATO_TOKEN = /^[A-Za-z0-9_-]{24}$/;

/**
 * El token de lo que el usuario pegó en «Tengo una invitación»: un link de invitación (de la app
 * o de Expo Go) o el token solo. `null` si no es una invitación, para decirlo sin llamar al servidor.
 */
export function tokenDeInvitacion(texto: string): string | null {
  const limpio = texto.trim();
  if (FORMATO_TOKEN.test(limpio)) return limpio;
  // El camino `i/<token>` al final del link, con o sin `--/` (Expo Go) y sin nada después.
  const m = /^(?:vuelto:\/\/|exps?:\/\/[^\s]+?\/--\/)i\/([A-Za-z0-9_-]+)\/?$/.exec(limpio);
  const token = m?.[1];
  return token !== undefined && FORMATO_TOKEN.test(token) ? token : null;
}

/** El link de una invitación. `crearUrl` es `Linking.createURL` de `expo-linking` (inyectado para testear). */
export function linkDeInvitacion(token: string, crearUrl: (camino: string) => string): string {
  return crearUrl(`i/${token}`);
}
