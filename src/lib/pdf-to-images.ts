/**
 * Conversión de PDF a imágenes PNG en el cliente.
 * Usa pdfjs-dist renderizando cada página en un <canvas>.
 * Esta función se ejecuta SOLO en el navegador (client components).
 */

let pdfjsLoaded = false;

async function loadPdfjs() {
  if (pdfjsLoaded) return;

  // Importamos de forma dinámica para que Next.js no intente bundlarlo en el server
  const pdfjsLib = await import("pdfjs-dist");

  // Configurar el worker vía CDN para evitar problemas con webpack
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  pdfjsLoaded = true;
}

export interface PdfPageImage {
  pageNumber: number; // 1-based
  blob: Blob;
  fileName: string; // ej: "menu-pagina-001.png"
}

/**
 * Convierte un archivo PDF en un array de imágenes PNG.
 * @param pdfFile - Archivo PDF seleccionado por el usuario
 * @param scale   - Factor de escala del render (default 2 = mejor calidad)
 * @param onProgress - Callback opcional para reportar progreso (página actual, total)
 */
export async function pdfToImages(
  pdfFile: File,
  scale = 2,
  onProgress?: (current: number, total: number) => void,
): Promise<PdfPageImage[]> {
  await loadPdfjs();

  const pdfjsLib = await import("pdfjs-dist");
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const numPages = pdfDoc.numPages;
  const images: PdfPageImage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(pageNum, numPages);

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Crear canvas temporal
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvas, viewport }).promise;

    // Exportar canvas como PNG blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`No se pudo exportar la página ${pageNum} como PNG`));
        },
        "image/png",
        1.0,
      );
    });

    const pageNumberStr = String(pageNum).padStart(3, "0");
    images.push({
      pageNumber: pageNum,
      blob,
      fileName: `pagina-${pageNumberStr}.png`,
    });

    // Limpiar canvas de la memoria
    canvas.width = 0;
    canvas.height = 0;
  }

  return images;
}

/**
 * Sube un blob directamente a una URL de subida firmada de Supabase.
 * Retorna true si la subida fue exitosa.
 */
export async function uploadToSignedUrl(
  signedUrl: string,
  blob: Blob,
  contentType = "image/png",
): Promise<boolean> {
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  return response.ok;
}
