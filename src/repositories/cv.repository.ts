import { PrismaClient, Prisma } from "@prisma/client";
import Cv from "../models/cv.model";
import { CreateCvDto, UpdateCvDto, CvFilters } from "../types/cv";
import { PaginationParams } from "../types/pagination";
import { getErrorMessage } from "../utils/error";
import { create } from "domain";
import fs from "fs";
import pdf from "pdf-parse";

class CvRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private parseExtractedText(text: string) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const name = lines[0] || "Unknown";

    const educationSectionMatch = text.match(
      /(Education\s*&?\s*Certification|Educational Details|Education)[:\s\n]*([\s\S]*?)(?=\n[A-Z][A-Za-z\s&]+:|\n\n|Technical Skills|Professional Experience|Chronological Summary of Experience|Work Experience)/i
    );

    const educations = educationSectionMatch?.[2]?.trim() || "Unknown";

    const skillsSectionMatch =
      text.match(
        /Technical Skills[:\s]*([\s\S]*?)(?=\n[A-Z][a-z]+\s*:|\n\n|\nClient:|\nEducation:)/i
      ) ||
      text.match(
        /Skills[:\s]*([\s\S]*?)(?=\n[A-Z][a-z]+\s*:|\n\n|\nClient:|\nEducation:)/i
      );

    const rawSkills = skillsSectionMatch?.[1] || "";
    const skills = rawSkills
      .split(/,|\n|•|-/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 50 && !/experience/i.test(s));

    const experienceSections = text.match(
      /(Professional experience|Chronology|Summary of Experience|Work Experience)[:\s]*([\s\S]*)/i
    );

    const experiences: {
      company: string;
      role: string;
    }[] = [];

    if (experienceSections) {
      const entries = experienceSections[2]
        .split(/Client:/i)
        .map((e) => e.trim())
        .filter(Boolean);

      for (const entry of entries) {
        const companyMatch = entry.match(/^(.+?),/);
        const roleMatch = entry.match(/Role:\s*(.+)/i);

        experiences.push({
          company: companyMatch?.[1]?.trim() || "Unknown",
          role: roleMatch?.[1]?.trim() || "Unknown",
        });
      }
    }

    return {
      name,
      educations,
      technicalSkills: skills,
      profesionalExperiences: experiences,
    };
  }

  async parseCvFromPdfBuffer(buffer: Buffer) {
    const extractedText = await this.extractTextFromPdfBuffer(buffer);
    const parsedData = this.parseExtractedText(extractedText);
    return parsedData;
  }

  async extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF buffer: ${error}`);
    }
  }
}

export default CvRepository;
