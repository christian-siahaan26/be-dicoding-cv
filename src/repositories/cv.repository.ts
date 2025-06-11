import { PrismaClient, Prisma } from "@prisma/client";
import Cv from "../models/cv.model";
import { CreateCvDto, UpdateCvDto, CvFilters } from "../types/cv";
import { PaginationParams } from "../types/pagination";
import { getErrorMessage } from "../utils/error";
import fs from "fs"; // Tetap dibutuhkan jika ada logika lain yang melibatkan fs, tapi tidak untuk kredensial
import pdf from "pdf-parse";
import { getGeminiModel } from "../utils/vertexClient"; // Import fungsi getter

class CvRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async parseWithGemini(text: string) {
    const geminiModel = getGeminiModel(); // Ambil model yang sudah diinisialisasi di sini

    // ✅ Prompt yang ditingkatkan dengan struktur dan instruksi yang lebih baik
    const prompt = `Anda adalah seorang ahli CV/Resume parser. Ekstrak informasi dari teks CV berikut dan kembalikan HANYA objek JSON yang valid.

ATURAN EKSTRAKSI:
1. Ekstrak nama lengkap kandidat (biasanya di bagian atas).
2. Identifikasi judul pekerjaan (job title) saat ini atau posisi yang diinginkan dari bagian objektif/ringkasan atau peran terbaru. Gunakan "Not specified" jika tidak ada judul yang jelas dapat disimpulkan.
3. Daftar SEMUA keahlian teknis, bahasa pemrograman, alat, dan perangkat lunak relevan yang disebutkan sebagai array string datar.
4. Ekstrak SEMUA pengalaman kerja, termasuk proyek, magang, dan pekerjaan freelance.
5. Ekstrak SEMUA entri latar belakang pendidikan.
6. Lakukan ekstraksi secara menyeluruh dan akurat.
7. JANGAN sertakan judul bagian (misalnya, "EXPERIENCE", "SKILLS", "EDUCATION", "PROJECTS") sebagai entri data aktual dalam JSON.

FORMAT JSON YANG DIBUTUHKAN:
{
  "name": "Nama Lengkap Di Sini",
  "jobTitle": "Judul Pekerjaan Saat Ini atau Yang Diinginkan",
  "educations": [
    {
      "institution": "Nama Sekolah/Universitas",
      "degree": "Nama Gelar/Program (misal: Sarjana Sains, S.Kom, MBA)", 
      "duration": "Tanggal Mulai - Tanggal Selesai (misal: September 2022 - 2026, 2020 - Sekarang)",
      "details": "Informasi tambahan seperti IPK, lokasi, pencapaian spesifik (sebagai satu string atau null)"
    }
  ],
  "technicalSkills": ["Keahlian 1", "Keahlian 2", "Keahlian N"],
  "profesionalExperiences": [
    {
      "company": "Nama Perusahaan/Organisasi",
      "role": "Judul Posisi/Peran",
      "duration": "Tanggal Mulai - Tanggal Selesai (misal: Februari 2025 – Sekarang, Agustus 2024 – Oktober 2024)",
      "description": "Tanggung jawab dan pencapaian utama dalam peran ini (sebagai satu string ringkas)"
    }
  ]
}

TEKS CV UNTUK DIANALISIS:
${text}

PENTING: 
- Kembalikan HANYA objek JSON.
- TIDAK ADA format markdown (misal: tanpa \`\`\`json).
- TIDAK ADA penjelasan tambahan atau teks percakapan.
- Ekstrak SEMUA informasi yang ditemukan dalam teks untuk field yang ditentukan.
- Gunakan "Not specified" hanya jika informasi benar-benar tidak ada untuk field string.
- Untuk field array (educations, technicalSkills, profesionalExperiences), kembalikan array kosong [] jika tidak ada entri yang ditemukan.

Respons JSON:`;

    let textResponse: string | undefined = undefined;

    try {
      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // generationConfig sudah diatur di vertexClient.ts, tidak perlu diulang
      });

      const candidates = result.response.candidates;
      textResponse = candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error("Tidak ada respons teks dari Gemini.");
      }

      console.log('=== RESPON MENTAH DARI GEMINI ===');
      console.log(textResponse);

      // ✅ Pembersihan respons yang lebih baik
      let cleanResponse = textResponse.trim();
      
      // Hapus format markdown
      cleanResponse = cleanResponse.replace(/```json\s*/g, '');
      cleanResponse = cleanResponse.replace(/```\s*/g, '');
      cleanResponse = cleanResponse.replace(/^```/g, '');
      cleanResponse = cleanResponse.replace(/```$/g, '');
      
      // Hapus teks penjelasan sebelum/sesudah JSON
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        cleanResponse = jsonMatch[0];
      } else {
        console.warn('Tidak ada objek JSON yang ditemukan dalam respons Gemini setelah pembersihan. Mencoba parsing teks mentah.');
      }

      console.log('=== RESPON DIBERSIHKAN ===');
      console.log(cleanResponse);

      // ✅ Parsing JSON dengan penanganan error yang lebih baik
      const parsedData = JSON.parse(cleanResponse);
      
      console.log('=== DATA YANG DI-PARSE ===');
      console.log(JSON.stringify(parsedData, null, 2));

      // ✅ Validasi dan normalisasi yang ditingkatkan
      // Pemetaan sesuai dengan field yang diminta Gemini di prompt Anda
      const validatedData = {
        name: this.validateAndCleanString(parsedData.name) || "Error Parsing - Perlu Review Manual",
        jobTitle: this.validateAndCleanString(parsedData.jobTitle) || "Not specified",
        educations: this.validateEducations(parsedData.educations),
        technicalSkills: this.validateSkills(parsedData.technicalSkills),
        profesionalExperiences: this.validateExperiences(parsedData.profesionalExperiences),
        parseText: text, // Simpan teks yang diparsing sebagai bagian dari data
        matchScore: null, // Gemini tidak mengekstrak ini, jadi default null
        jobRecommendation: null, // Gemini tidak mengekstrak ini, jadi default null
        fixCv: null, // Gemini tidak mengekstrak ini, jadi default null
      };

      console.log('=== DATA AKHIR YANG DIVALIDASI ===');
      console.log(JSON.stringify(validatedData, null, 2));

      return validatedData;

    } catch (error) {
      console.error('=== ERROR PARSING ===');
      console.error('Error:', error);
      console.error('Respons Mentah:', textResponse || "Tidak ada respons diterima");
      
      // ✅ Coba parsing manual sebagai fallback
      console.log('=== MENCOBA PARSING MANUAL SEBAGAI FALLBACK ===');
      const manualParsed = this.manualParseCV(text);
      
      if (manualParsed.name !== "Error Parsing - Perlu Review Manual") {
        console.log('Parsing manual fallback berhasil.');
        return manualParsed;
      }
      
      // Fallback terakhir jika kedua metode gagal
      return {
        name: "Error Parsing - Perlu Review Manual",
        jobTitle: "Not specified",
        educations: [],
        technicalSkills: [],
        profesionalExperiences: [],
        parseText: text,
        matchScore: null, // Tambahkan properti ini
        jobRecommendation: null, // Tambahkan properti ini
        fixCv: null, // Tambahkan properti ini
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ✅ Metode validasi helper (tetap sama)
  private validateAndCleanString(value: any): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  private validateSkills(skills: any): string[] {
    if (!Array.isArray(skills)) return [];
    
    return skills
      .filter(skill => typeof skill === 'string' && skill.trim().length > 0)
      .map(skill => skill.trim())
      .filter((skill, index, arr) => arr.indexOf(skill) === index); // Hapus duplikat
  }

  private validateEducations(educations: any): any[] {
    if (!Array.isArray(educations)) return [];
    
    return educations.map(edu => ({
      institution: this.validateAndCleanString(edu?.institution) || "Not specified",
      degree: this.validateAndCleanString(edu?.degree) || "Not specified", 
      duration: this.validateAndCleanString(edu?.duration) || "Not specified",
      details: this.validateAndCleanString(edu?.details) || ""
    }));
  }

  private validateExperiences(experiences: any): any[] {
    if (!Array.isArray(experiences)) return [];
    
    return experiences.map(exp => ({
      company: this.validateAndCleanString(exp?.company) || "Not specified",
      role: this.validateAndCleanString(exp?.role) || "Not specified",
      duration: this.validateAndCleanString(exp?.duration) || "Not specified", 
      description: this.validateAndCleanString(exp?.description) || ""
    }));
  }

  // ✅ Parsing manual fallback (tetap sama)
  private manualParseCV(text: string) {
    console.log('Memulai parsing CV manual...');
    
    const result = {
      name: "Error Parsing - Perlu Review Manual",
      jobTitle: "Not specified", 
      educations: [] as any[],
      technicalSkills: [] as string[],
      profesionalExperiences: [] as any[],
      parseText: text,
      matchScore: null,
      jobRecommendation: null,
      fixCv: null,
    };

    try {
      // Logika regex yang sudah ada
      const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
      if (nameMatch) {
        result.name = nameMatch[1].trim();
        console.log('Nama ditemukan:', result.name);
      }

      const skillsMatch = text.match(/SKILLS?\s*\n([\s\S]*?)(?=\n[A-Z]{3,}|$)/i);
      if (skillsMatch) {
        const skillsText = skillsMatch[1];
        const skills = skillsText
          .split(/[,\n•:]/)
          .map(s => s.replace(/[^\w\s+#.-]/g, '').trim())
          .filter(s => s.length > 1 && s.length < 30)
          .slice(0, 20);
        
        result.technicalSkills = [...new Set(skills)];
        console.log('Keahlian ditemukan:', result.technicalSkills);
      }

      const eduMatch = text.match(/EDUCATION\s*\n([\s\S]*?)(?=\n[A-Z]{3,}|$)/i);
      if (eduMatch) {
        const eduText = eduMatch[1];
        const instMatch = eduText.match(/([A-Z][A-Z\s&]+?)\s+.*?(\d{4}.*?(?:Present|\d{4}))/g);
        if (instMatch) {
          result.educations = instMatch.map(edu => {
            const lines = edu.split('\n').map(l => l.trim()).filter(l => l);
            return {
              institution: lines[0] || "Not specified",
              degree: lines[1] || "Not specified",
              duration: lines.find(l => /\d{4}/.test(l)) || "Not specified",
              details: ""
            };
          });
          console.log('Pendidikan ditemukan:', result.educations);
        }
      }

      const expMatch = text.match(/(?:EXPERIENCE|PROJECT)[\s\S]*?(?=\n[A-Z]{3,}|$)/i);
      if (expMatch) {
        const expText = expMatch[0];
        const companies = expText.match(/([A-Z][a-zA-Z\s&-]+?)(?:\s+–|\s+\n)/g);
        if (companies) {
          result.profesionalExperiences = companies.slice(0, 5).map(comp => ({
            company: comp.trim().replace(/–$/, ''),
            role: "Not specified",
            duration: "Not specified", 
            description: ""
          }));
          console.log('Pengalaman ditemukan:', result.profesionalExperiences);
        }
      }

    } catch (error) {
      console.error('Error parsing manual:', error);
    }

    return result;
  }

  async parseCvFromPdfBuffer(buffer: Buffer) {
    try {
      console.log('=== MEMULAI PARSING CV ===');
      
      const extractedText = await this.extractTextFromPdfBuffer(buffer);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("Tidak ada teks yang dapat diekstrak dari PDF");
      }

      console.log('=== PANJANG TEKS YANG DIEKSTRAK ===', extractedText.length);
      console.log('=== 200 KARAKTER PERTAMA ===');
      console.log(extractedText.substring(0, 200));

      const parsedData = await this.parseWithGemini(extractedText);
      
      console.log('=== PARSING SELESAI ===');
      return parsedData;
      
    } catch (error) {
      console.error("Error di parseCvFromPdfBuffer:", error);
      throw error;
    }
  }

  async extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`Gagal mengekstrak teks dari buffer PDF: ${error}`);
    }
  }
}

export default CvRepository;