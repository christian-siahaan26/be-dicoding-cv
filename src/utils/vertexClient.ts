import { VertexAI } from "@google-cloud/vertexai";
// Tidak perlu import GoogleAuth di sini jika VertexAI SDK tidak langsung menerimanya
// import { GoogleAuth } from 'google-auth-library'; 

let vertexAiInstance: VertexAI;
let geminiModelInstance: any; // Gunakan 'any' untuk mempermudah, atau tipe yang lebih spesifik jika diketahui

// Fungsi ini akan dipanggil secara eksternal (dari app.ts) untuk inisialisasi client
export function initializeVertexAIClient() {
  if (vertexAiInstance && geminiModelInstance) {
    console.log('VertexAI client sudah diinisialisasi. Melewatkan inisialisasi ulang.');
    return; 
  }

  // VertexAI SDK akan secara otomatis mengambil kredensial dari GOOGLE_APPLICATION_CREDENTIALS
  // (yang seharusnya sudah disetel oleh app.ts untuk menunjuk ke /tmp/google_credentials.json)
  vertexAiInstance = new VertexAI({
    project: process.env.GCP_PROJECT_ID || "your-default-project-id", // Gunakan env var, tambahkan fallback
    location: process.env.GCP_REGION || "us-central1", // Gunakan env var, tambahkan fallback
    // TIDAK ADA PROPERTI 'auth' DI SINI - mengandalkan env var GOOGLE_APPLICATION_CREDENTIALS
  });

  geminiModelInstance = vertexAiInstance.getGenerativeModel({
    model: "gemini-2.0-flash-exp", 
    generationConfig: {
      temperature: 0.1, // Rendah untuk parsing yang konsisten
      topK: 40,
      topP: 0.8,
      maxOutputTokens: 2048, // Lebih besar untuk respons JSON yang kompleks
    },
  });

  console.log(`Client VertexAI dan model Gemini diinisialisasi untuk project: ${process.env.GCP_PROJECT_ID || "your-default-project-id"}, region: ${process.env.GCP_REGION || "us-central1"}`);
}

// Fungsi getter untuk mengakses model yang sudah diinisialisasi
export function getGeminiModel() {
  if (!geminiModelInstance) {
    // Ini seharusnya tidak terjadi jika initializeVertexAIClient() dipanggil dengan benar
    // di app.ts. Ini adalah fallback jika ada yang memanggil getGeminiModel() terlalu awal.
    console.warn("Model Gemini belum diinisialisasi. Mencoba inisialisasi otomatis (mungkin gagal di produksi tanpa setup eksplisit).");
    initializeVertexAIClient(); // Coba inisialisasi jika belum
  }
  return geminiModelInstance;
}