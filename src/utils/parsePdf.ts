import pdf from "pdf-parse";

/**
 * Mengekstrak teks dari file PDF dalam bentuk buffer.
 * @param buffer File PDF dalam bentuk Buffer
 * @returns string teks dari PDF
 */
export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    throw new Error('Gagal mengekstrak PDF: ' + error);
  }
};