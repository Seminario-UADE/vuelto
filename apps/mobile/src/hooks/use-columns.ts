import { useWindowDimensions } from "react-native";
import { ONE_COLUMN_FONT_SCALE } from "@/theme";

/** 2 columnas, o 1 cuando el texto del sistema es grande (auditoría P2 #17). */
export function useColumns(): 1 | 2 {
  const { fontScale, width } = useWindowDimensions();
  return fontScale > ONE_COLUMN_FONT_SCALE || width < 340 ? 1 : 2;
}

export function useTextoGrande(): boolean {
  return useWindowDimensions().fontScale > ONE_COLUMN_FONT_SCALE;
}
