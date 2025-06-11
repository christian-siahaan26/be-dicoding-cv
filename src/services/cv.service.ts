import CvRepository from "../repositories/cv.repository";
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
  ): Promise<any> {
    try {
      const parsed = await this.cvRepository.parseCvFromPdfBuffer(buffer);
      if (
        !parsed.name ||
        parsed.name === "Parse Error - Manual Review Required"
      ) {
        console.warn(
          "⚠️ Warning: CV parsing may have failed, but proceeding with save"
        );
      }

      const cvData: Prisma.CvCreateInput = {
        appliedJob,
        name: parsed.name || "Name not parsed",
        jobTitle: parsed.jobTitle || "Not specified",
        educations: parsed.educations || [],
        experiences: parsed.profesionalExperiences || [],
        skills: parsed.technicalSkills || [],
        parseText: parsed.parseText || "",
        matchScore: null,
        jobRecommendation: Prisma.JsonNull,
        fixCv: Prisma.JsonNull,
        user: {
          connect: {
            id: userId,
          },
        },
      };

      const newCv = await this.cvRepository["prisma"].cv.create({
        data: cvData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return {
        id: newCv.id,
        appliedJob: newCv.appliedJob,
        name: newCv.name,
        jobTitle: newCv.jobTitle,
        skills: newCv.skills,
        educations: newCv.educations,
        experiences: newCv.experiences,
        parseText: newCv.parseText,
        matchScore: newCv.matchScore,
        jobRecommendation: newCv.jobRecommendation,
        fixCv: newCv.fixCv,
        createdAt: newCv.createdAt,
        updatedAt: newCv.updatedAt,
        user: newCv.user,
        parsingStatus: {
          success: parsed.name !== "Parse Error - Manual Review Required",
          hasName:
            !!parsed.name &&
            parsed.name !== "Parse Error - Manual Review Required",
          hasSkills: (parsed.technicalSkills?.length || 0) > 0,
          hasEducation: (parsed.educations?.length || 0) > 0,
          hasExperience: (parsed.profesionalExperiences?.length || 0) > 0,
        },
      };
    } catch (error) {
      
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error("Error details:", {
        message: errorMessage,
        stack: errorStack,
        appliedJob,
        userId,
        bufferSize: buffer?.length,
      });

      throw new Error(`Error creating CV from PDF buffer: ${errorMessage}`);
    }
  }

  async updateCvAnalysisResults(
    cvId: number,
    matchScore: number,
    jobRecommendation: any,
    fixCv: any
  ): Promise<any> {
    try {
      console.log(`Updating CV ID ${cvId} with AI analysis results...`);
      const updatedCv = await this.cvRepository["prisma"].cv.update({
        where: { id: cvId },
        data: {
          matchScore: matchScore,
          jobRecommendation: jobRecommendation,
          fixCv: fixCv,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
      return updatedCv;
    } catch (error) {
      throw new Error(
        `Failed to update CV with AI analysis results: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const text = await this.cvRepository.extractTextFromPdfBuffer(buffer);

      return text;
    } catch (error) {
      throw new Error(
        `Error extracting text from PDF: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export default CvService;
