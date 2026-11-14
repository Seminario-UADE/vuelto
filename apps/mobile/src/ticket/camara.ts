/**
 * Adaptador de Expo para la foto del ticket (spec 014, research R1, R2 y R4). Sin lógica: solo
 * llama a la cámara, a la galería, al manipulador y al sistema de archivos. Las reglas (tamaño
 * máximo, borrar en todos los caminos) están en `leer.ts`, que se testea en Node.
 */

import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { MAXIMO_BYTES, type FotoPreparada } from "./leer";

export type FotoElegida = { tipo: "foto"; uri: string } | { tipo: "cancelada" } | { tipo: "sin_permiso" };

/** El lado mayor de la foto achicada: alcanza para leer el ticket. */
const LADO_MAXIMO = 2000;

/** Las carpetas de caché donde dejan sus copias el selector y el manipulador (código nativo de Expo). */
const CARPETAS_TEMPORALES = ["ImagePicker", "ImageManipulator"];

const OPCIONES: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  exif: false,
  base64: false,
};

function elegida(r: ImagePicker.ImagePickerResult): FotoElegida {
  const asset = r.canceled ? undefined : r.assets[0];
  return asset ? { tipo: "foto", uri: asset.uri } : { tipo: "cancelada" };
}

/** La cámara del sistema: deja repetir la foto y no la agrega a la galería (sin `saveToPhotos`). */
export async function sacarFoto(): Promise<FotoElegida> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) return { tipo: "sin_permiso" };
  return elegida(await ImagePicker.launchCameraAsync(OPCIONES));
}

/** Las fotos del sistema: el selector no necesita permiso para toda la galería. */
export async function elegirDeGaleria(): Promise<FotoElegida> {
  return elegida(await ImagePicker.launchImageLibraryAsync(OPCIONES));
}

/** Achica la foto (lado mayor de 2.000 px) y la pasa a JPEG en base64. Lee también el HEIC. */
export async function preparar(uri: string): Promise<FotoPreparada> {
  const temporales: string[] = [];
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const escala = LADO_MAXIMO / Math.max(original.width, original.height);
  const imagen =
    escala < 1
      ? await ImageManipulator.manipulate(original)
          .resize(
            original.width >= original.height
              ? { width: LADO_MAXIMO, height: null }
              : { width: null, height: LADO_MAXIMO },
          )
          .renderAsync()
      : original;
  try {
    let resultado = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    temporales.push(resultado.uri);
    if ((resultado.base64 ?? "").length * 0.75 > MAXIMO_BYTES) {
      resultado = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
      temporales.push(resultado.uri);
    }
    return { base64: resultado.base64 ?? "", temporales };
  } catch (e) {
    await borrar(temporales);
    throw e;
  } finally {
    imagen.release();
    if (imagen !== original) original.release();
  }
}

/** Borra cada archivo; uno que falla no frena a los demás. */
export async function borrar(rutas: string[]): Promise<void> {
  for (const ruta of rutas) {
    try {
      const archivo = new File(ruta);
      if (archivo.exists) archivo.delete();
    } catch {
      // Lo que quede se borra al abrir «Escanear ticket» (FR-007).
    }
  }
}

/** Vacía las carpetas de caché del selector y del manipulador: la app no las usa para nada más. */
export function limpiarTemporales(): void {
  if (Platform.OS === "web") return;
  for (const nombre of CARPETAS_TEMPORALES) {
    try {
      const carpeta = new Directory(Paths.cache, nombre);
      if (carpeta.exists) carpeta.delete();
    } catch {
      // Se reintenta la próxima vez.
    }
  }
}
