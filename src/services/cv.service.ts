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
      console.log('=== STARTING CV SERVICE PROCESSING ===');
      console.log('Applied Job:', appliedJob);
      console.log('User ID:', userId);
      console.log('Buffer size:', buffer.length, 'bytes');
      
      const parsed = await this.cvRepository.parseCvFromPdfBuffer(buffer);
      
      console.log('=== PARSED DATA FROM REPOSITORY ===');
      console.log('Name:', parsed.name);
      console.log('Job Title:', parsed.jobTitle);
      console.log('Skills count:', parsed.technicalSkills?.length || 0);
      console.log('Education count:', parsed.educations?.length || 0);
      console.log('Experience count:', parsed.profesionalExperiences?.length || 0);

      // ✅ Validate parsed data before saving
      if (!parsed.name || parsed.name === "Parse Error - Manual Review Required") {
        console.warn('⚠️ Warning: CV parsing may have failed, but proceeding with save');
      }

      // ✅ Map data properly to match Prisma schema with correct types
      const cvData: Prisma.CvCreateInput = {
        appliedJob,
        name: parsed.name || "Name not parsed",
        jobTitle: parsed.jobTitle || "Not specified",
        educations: parsed.educations || [], // Array
        experiences: parsed.profesionalExperiences || [], // ✅ Fix: experiences not experience
        skills: parsed.technicalSkills || [], // Array
        parseText: parsed.parseText || "",
        matchScore: null,
        jobRecommendation: Prisma.JsonNull,
        fixCv: Prisma.JsonNull,
        user: {
          connect: {
            id: userId
          }
        }
      };

      console.log('=== CREATING CV WITH DATA ===');
      console.log('Final CV data structure:');
      console.log('- Applied Job:', cvData.appliedJob);
      console.log('- Name:', cvData.name);
      console.log('- Job Title:', cvData.jobTitle);
      console.log('- Skills:', Array.isArray(cvData.skills) ? cvData.skills.length : 'Not array');
      console.log('- Education:', Array.isArray(cvData.educations) ? cvData.educations.length : 'Not array');
      console.log('- Experience:', Array.isArray(cvData.experiences) ? cvData.experiences.length : 'Not array');

      const newCv = await this.cvRepository["prisma"].cv.create({
        data: cvData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      console.log('✅ CV created successfully with ID:', newCv.id);
      
      // ✅ Return structured response
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
        // Add parsing status for debugging
        parsingStatus: {
          success: parsed.name !== "Parse Error - Manual Review Required",
          hasName: !!parsed.name && parsed.name !== "Parse Error - Manual Review Required",
          hasSkills: (parsed.technicalSkills?.length || 0) > 0,
          hasEducation: (parsed.educations?.length || 0) > 0,
          hasExperience: (parsed.profesionalExperiences?.length || 0) > 0
        }
      };

    } catch (error) {
      console.error('❌ ERROR IN CV SERVICE:', error);
      
      // ✅ Enhanced error handling with more context
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('Error details:', {
        message: errorMessage,
        stack: errorStack,
        appliedJob,
        userId,
        bufferSize: buffer?.length
      });
      
      throw new Error(`Error creating CV from PDF buffer: ${errorMessage}`);
    }
  }

  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      console.log('=== EXTRACTING TEXT FROM PDF ===');
      console.log('Buffer size:', buffer.length, 'bytes');
      
      const text = await this.cvRepository.extractTextFromPdfBuffer(buffer);
      
      console.log('✅ Text extraction successful');
      console.log('Text length:', text.length);
      console.log('First 200 chars:', text.substring(0, 200));
      
      return text;
    } catch (error) {
      console.error('❌ ERROR IN TEXT EXTRACTION:', error);
      throw new Error(`Error extracting text from PDF: ${
        error instanceof Error ? error.message : String(error)
      }`);
    }
  }

  // ✅ Additional helper methods for CV management
  async getCvById(id: number, userId: number) {
    try {
      const cv = await this.cvRepository["prisma"].cv.findFirst({
        where: {
          id,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      if (!cv) {
        throw new Error('CV not found');
      }

      return cv;
    } catch (error) {
      console.error('Error getting CV by ID:', error);
      throw error;
    }
  }

  async getAllCvsByUser(userId: number, pagination?: PaginationParams) {
    try {
      const skip = pagination?.page && pagination?.limit 
        ? (pagination.page - 1) * pagination.limit 
        : 0;
      const take = pagination?.limit || 10;

      const [cvs, total] = await Promise.all([
        this.cvRepository["prisma"].cv.findMany({
          where: { userId },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        }),
        this.cvRepository["prisma"].cv.count({
          where: { userId }
        })
      ]);

      return {
        data: cvs,
        meta: {
          total,
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          totalPages: Math.ceil(total / (pagination?.limit || 10))
        }
      };
    } catch (error) {
      console.error('Error getting CVs by user:', error);
      throw error;
    }
  }

  async deleteCv(id: number, userId: number) {
    try {
      const cv = await this.cvRepository["prisma"].cv.findFirst({
        where: { id, userId }
      });

      if (!cv) {
        throw new Error('CV not found');
      }

      await this.cvRepository["prisma"].cv.delete({
        where: { id }
      });

      return { message: 'CV deleted successfully' };
    } catch (error) {
      console.error('Error deleting CV:', error);
      throw error;
    }
  }
}

export default CvService;