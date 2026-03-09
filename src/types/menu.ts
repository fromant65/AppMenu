/**
 * Representa una anotación de precio sobre una imagen de menú.
 * Las coordenadas x/y son valores relativos (0 a 1) respecto al ancho/alto
 * de la imagen, para que sean independientes del tamaño de pantalla.
 */
export type PriceAnnotation = {
  id: string;
  x: number; // posición relativa horizontal (0 = izquierda, 1 = derecha)
  y: number; // posición relativa vertical (0 = arriba, 1 = abajo)
  text: string; // ej: "$2.500"
  fontSize: number; // en px, ej: 16
  color: string; // hex, ej: "#000000"
  fontWeight: "normal" | "bold";
};
