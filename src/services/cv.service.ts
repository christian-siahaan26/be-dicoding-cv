import CvRepository from "../repositories/cv.repository";
import Cv from "../models/cv.model";
import { CreateCvDto, UpdateCvDto, CvFilters } from "../types/cv";
import { PaginationParams, PaginatedResult } from "../types/pagination";
import { Prisma } from "@prisma/client";

class CvService {
  private cvRepository: CvRepository;

  constructor(cvRepository: CvRepository) {
    this.cvRepository = cvRepository;
  }

  async createCvFromPdfBuffer(
    buffer: Buffer,
    appliedJob: string,
    userId: number
  ) {
    try {
      console.log('Memulai proses parsing CV di layanan...'); 
      
      const parsed = await this.cvRepository.parseCvFromPdfBuffer(buffer);
      
      console.log('Data yang diparsing dari repository:', JSON.stringify(parsed, null, 2));

      // ✅ Map data dengan benar agar sesuai dengan skema Prisma dengan tipe yang benar
      const cvData: Prisma.CvCreateInput = {
        appliedJob,
        name: parsed.name,
        jobTitle: parsed.jobTitle,
        educations: parsed.educations as Prisma.InputJsonValue, // Gunakan Prisma.InputJsonValue
        experiences: parsed.profesionalExperiences as Prisma.InputJsonValue, // ✅ Perbaiki: gunakan profesionalExperiences
        skills: parsed.technicalSkills as Prisma.InputJsonValue, // ✅ Perbaiki: gunakan technicalSkills
        parseText: parsed.parseText,
        // matchScore, jobRecommendation, fixCv bisa null.
        // Jika skema Prisma Anda adalah Json? (nullable Json), Prisma.JsonNull adalah cara yang benar
        // untuk menetapkan nilai null.
        matchScore: parsed.matchScore !== undefined && parsed.matchScore !== null ? parsed.matchScore : null,
        jobRecommendation: parsed.jobRecommendation !== undefined && parsed.jobRecommendation !== null ? parsed.jobRecommendation : Prisma.JsonNull,
        fixCv: parsed.fixCv !== undefined && parsed.fixCv !== null ? parsed.fixCv : Prisma.JsonNull,
        user: {
          connect: {
            id: userId
          }
        }
      };

      console.log('Membuat CV dengan data untuk Prisma:', JSON.stringify(cvData, null, 2));

      const newCv = await this.cvRepository["prisma"].cv.create({
        data: cvData,
      });

      console.log('CV berhasil dibuat dengan ID:', newCv.id);
      return newCv;

    } catch (error) {
      console.error('Error di createCvFromPdfBuffer (Layanan):', error); 
      
      throw new Error(`Error membuat CV dari buffer PDF: ${
        error instanceof Error ? error.message : String(error)
      }`);
    }
  }

  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const text = await this.cvRepository.extractTextFromPdfBuffer(buffer);
      return text;
    } catch (error) {
      throw new Error(`Error mengekstrak teks dari PDF: ${
        error instanceof Error ? error.message : String(error)
      }`);
    }
  }
}

export default CvService;