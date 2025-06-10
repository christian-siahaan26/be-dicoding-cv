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
      console.log('Starting CV parsing process...');
      
      const parsed = await this.cvRepository.parseCvFromPdfBuffer(buffer);
      
      console.log('Parsed data:', JSON.stringify(parsed, null, 2));

      // ✅ Map data properly to match Prisma schema with correct types
      const cvData: Prisma.CvCreateInput = {
        appliedJob,
        name: parsed.name,
        jobTitle: parsed.jobTitle,
        educations: parsed.educations, // Array
        experiences: parsed.profesionalExperiences, // ✅ Fix: experiences not experience
        skills: parsed.technicalSkills, // Array
        parseText: parsed.parseText,
        matchScore: null, // ✅ Use Prisma.JsonNull instead of null
        jobRecommendation: Prisma.JsonNull, // ✅ Use Prisma.JsonNull instead of null
        fixCv: Prisma.JsonNull, // ✅ Use Prisma.JsonNull instead of null
        user: {
          connect: {
            id: userId
          }
        }
      };

      console.log('Creating CV with data:', JSON.stringify(cvData, null, 2));

      const newCv = await this.cvRepository["prisma"].cv.create({
        data: cvData,
      });

      console.log('CV created successfully:', newCv.id);
      return newCv;

    } catch (error) {
      console.error('Error in createCvFromPdfBuffer:', error);
      
      // ✅ Return proper error object instead of string
      throw new Error(`Error creating CV from PDF buffer: ${
        error instanceof Error ? error.message : String(error)
      }`);
    }
  }

  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const text = await this.cvRepository.extractTextFromPdfBuffer(buffer);
      return text;
    } catch (error) {
      throw new Error(`Error extracting text from PDF: ${
        error instanceof Error ? error.message : String(error)
      }`);
    }
  }
}

export default CvService;