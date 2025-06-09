import CvRepository from "../repositories/cv.repository";
import Cv from "../models/cv.model";
import { CreateCvDto, UpdateCvDto, CvFilters } from "../types/cv";
import { PaginationParams, PaginatedResult } from "../types/pagination";

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
      const parsed = await this.cvRepository.parseCvFromPdfBuffer(buffer);

      const newCv = await this.cvRepository["prisma"].cv.create({
        data: {
          appliedJob,
          name: parsed.name,
          educations: parsed.educations,
          profesionalExperiences: parsed.profesionalExperiences,
          technicalSkills: parsed.technicalSkills,
          userId,
        },
      });

      return newCv;
    } catch (error) {
      return `Error creating CV from PDF buffer: ${
        error instanceof Error ? error.message : error
      }`;
    }
  }

  async extractTextFromPdf(buffer: Buffer): Promise<string | string> {
    try {
      const text = await this.cvRepository.extractTextFromPdfBuffer(buffer);
      return text;
    } catch (error) {
      return `Error extracting text from PDF: ${
        error instanceof Error ? error.message : error
      }`;
    }
  }
}

export default CvService;
