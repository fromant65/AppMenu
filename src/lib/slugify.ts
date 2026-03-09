/**
 * Convierte un texto arbitrario en un slug URL-safe, sin acentos ni caracteres especiales.
 * Ej: "La Parrilla de Juan" → "la-parrilla-de-juan"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remover marcas diacríticas (acentos)
    .replace(/[^a-z0-9]+/g, "-") // reemplazar caracteres no alfanuméricos con guion
    .replace(/^-+|-+$/g, ""); // eliminar guiones al inicio/fin
}

/**
 * Genera un slug único verificando colisiones contra una lista de slugs existentes.
 * Si "mi-negocio" ya existe, devuelve "mi-negocio-2", luego "mi-negocio-3", etc.
 */
export function uniqueSlug(base: string, existing: string[]): string {
  const slug = slugify(base);
  if (!existing.includes(slug)) return slug;

  let counter = 2;
  while (existing.includes(`${slug}-${counter}`)) {
    counter++;
  }
  return `${slug}-${counter}`;
}
