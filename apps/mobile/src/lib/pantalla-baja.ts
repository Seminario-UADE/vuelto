/** Debajo de este alto (en pt) la pantalla es «baja»: un iPhone SE mide 667, un iPhone 15 852. */
export const ALTO_PANTALLA_BAJA = 750;

/** Si el alto de la ventana pide las versiones compactas de lo que va fijo al pie. */
export const esPantallaBaja = (alto: number): boolean => alto < ALTO_PANTALLA_BAJA;
