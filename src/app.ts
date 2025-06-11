import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import createError, { HttpError } from "http-errors";
import logger from "morgan";
import { authorize } from "./middleware/auth";
import authRouter from "./routes/auth.route";
import cvsRouter from "./routes/cv.route"; // Mengganti notesRouter menjadi cvsRouter untuk kejelasan
import { setupSwagger } from "./utils/swagger";
import dotenv from "dotenv";
import fs from "fs"; // Tambahkan import ini
import path from "path"; // Tambahkan import ini

// Muat environment variables secepat mungkin
dotenv.config();

// --- START: Inisialisasi Kredensial Vertex AI untuk Produksi ---
// LOGIKA INI HARUS BERJALAN SEBELUM MODUL APAPUN YANG MENGIMPOR vertexClient.ts
if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    const tempKeyPath = "/tmp/google_credentials.json"; // Path sementara di lingkungan serverless
    fs.writeFileSync(tempKeyPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempKeyPath; // Set env var yang dicari oleh SDK
    console.log("Production: GOOGLE_APPLICATION_CREDENTIALS set to temporary file in /tmp.");
  } catch (e) {
    console.error("Production: GAGAL mengatur GOOGLE_APPLICATION_CREDENTIALS dari env var JSON:", e);
    // Penting: Hentikan aplikasi jika kredensial penting gagal diatur
    throw new Error('Gagal menyiapkan kredensial Google Cloud untuk lingkungan produksi.');
  }
} else if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  console.error("Production: Environment variable GOOGLE_APPLICATION_CREDENTIALS_JSON tidak ditemukan.");
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON tidak ada di lingkungan produksi.');
}
// --- END: Inisialisasi Kredensial Vertex AI untuk Produksi ---

// Sekarang kita bisa mengimpor dan menginisialisasi client Vertex AI,
// karena GOOGLE_APPLICATION_CREDENTIALS sudah disetel.
import { initializeVertexAIClient } from "./utils/vertexClient";

// Panggil fungsi inisialisasi setelah environment variables disetel
initializeVertexAIClient(); 

const app = express();

// Tidak perlu lagi inisialisasi GoogleAuth terpisah di sini kecuali ada kebutuhan lain
// karena VertexAI client sekarang diinisialisasi di vertexClient.ts dengan metode yang benar.
// const { GoogleAuth } = require('google-auth-library');
// let auth;
// ... (logika GoogleAuth yang dihapus)

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({ origin: "*" }));

// routes
app.use("/api/auth", authRouter);
app.use("/api/cvs", authorize, cvsRouter);

// swagger
setupSwagger(app);

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404));
});

// error handler
app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: req.app.get("env") === "development" ? err : {},
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Lingkungan: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID}`);
    console.log(`GCP_REGION: ${process.env.GCP_REGION}`);
  }
});

export default app;