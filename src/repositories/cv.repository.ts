import { PrismaClient, Prisma } from "@prisma/client";
import Cv from "../models/cv.model";
import { CreateCvDto, UpdateCvDto, CvFilters } from "../types/cv";
import { PaginationParams } from "../types/pagination";
import { getErrorMessage } from "../utils/error";
import fs from "fs";
import pdf from "pdf-parse";
import { geminiModel, getProjectInfo } from "../utils/vertexClient";

class CvRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async parseWithGemini(text: string) {
    // ✅ Enhanced prompt with better structure
    const prompt = `You are an expert CV/Resume parser. Extract information from the following CV text and return ONLY a valid JSON object.

EXTRACTION RULES:
1. Extract the person's full name (usually at the top of CV)
2. Identify current job title or desired position
3. List ALL technical skills, programming languages, frameworks, tools mentioned
4. Extract ALL work experiences including internships, projects, freelance work
5. Extract ALL educational background including courses, certifications
6. Be thorough and extract every relevant detail

REQUIRED JSON FORMAT (DO NOT DEVIATE):
{
  "name": "Full Name Here",
  "jobTitle": "Current or Desired Job Title", 
  "educations": [
    {
      "institution": "School/University/Institution Name",
      "degree": "Degree/Program/Course Name", 
      "duration": "Start Date - End Date",
      "details": "Additional info like GPA, location, achievements"
    }
  ],
  "technicalSkills": ["Skill1", "Skill2", "Skill3"],
  "profesionalExperiences": [
    {
      "company": "Company/Organization Name",
      "role": "Position/Role Title",
      "duration": "Start Date - End Date", 
      "description": "Key responsibilities, achievements, and projects"
    }
  ]
}

CV TEXT TO ANALYZE:
${text}

CRITICAL REQUIREMENTS:
- Return ONLY the JSON object, no other text
- NO markdown formatting (no \`\`\`json)
- NO explanations or comments
- Extract ALL information found in the text
- Use empty string "" for missing optional fields like details/description
- Use "Not specified" only for required fields if truly missing
- Ensure all arrays have at least one item if information exists

JSON Response:`;

    let textResponse: string | undefined = undefined;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`=== VERTEX AI PARSING ATTEMPT ${retryCount + 1} ===`);
        console.log('Project Info:', getProjectInfo());

        // ✅ Enhanced generation config for better parsing
        const result = await geminiModel.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.05, // Very low temperature for consistent parsing
            topP: 0.7,
            topK: 20,
            maxOutputTokens: 4096, // Increased for complex CVs
            stopSequences: ["\n\n---", "\n\nNote:", "\n\nExplanation:"]
          },
        });

        const candidates = result.response.candidates;
        textResponse = candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
          throw new Error("No text response from Gemini");
        }

        console.log("=== RAW GEMINI RESPONSE ===");
        console.log(textResponse.substring(0, 500) + "...");

        // ✅ Enhanced response cleaning
        let cleanResponse = textResponse.trim();

        // Remove markdown formatting
        cleanResponse = cleanResponse.replace(/```json\s*/gi, "");
        cleanResponse = cleanResponse.replace(/```\s*/g, "");
        cleanResponse = cleanResponse.replace(/^```/g, "");
        cleanResponse = cleanResponse.replace(/```$/g, "");

        // Remove any explanatory text before/after JSON
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        }

        // Remove any trailing text after JSON
        const lastBrace = cleanResponse.lastIndexOf('}');
        if (lastBrace !== -1) {
          cleanResponse = cleanResponse.substring(0, lastBrace + 1);
        }

        console.log("=== CLEANED RESPONSE ===");
        console.log(cleanResponse.substring(0, 300) + "...");

        // ✅ Parse JSON with error handling
        const parsedData = JSON.parse(cleanResponse);

        console.log("=== PARSED DATA SUCCESS ===");
        console.log("Name:", parsedData.name);
        console.log("Job Title:", parsedData.jobTitle);
        console.log("Skills count:", parsedData.technicalSkills?.length || 0);
        console.log("Education count:", parsedData.educations?.length || 0);
        console.log("Experience count:", parsedData.profesionalExperiences?.length || 0);

        // ✅ Enhanced validation and normalization
        const validatedData = {
          name: this.validateAndCleanString(parsedData.name) || "Parse Error - Manual Review Required",
          jobTitle: this.validateAndCleanString(parsedData.jobTitle) || "Not specified",
          educations: this.validateEducations(parsedData.educations),
          technicalSkills: this.validateSkills(parsedData.technicalSkills),
          profesionalExperiences: this.validateExperiences(parsedData.profesionalExperiences),
          parseText: text,
        };

        console.log("=== FINAL VALIDATED DATA ===");
        console.log("Final name:", validatedData.name);
        console.log("Final skills:", validatedData.technicalSkills.length);
        console.log("Final education:", validatedData.educations.length);
        console.log("Final experience:", validatedData.profesionalExperiences.length);

        return validatedData;

      } catch (error) {
        console.error(`=== PARSING ERROR ATTEMPT ${retryCount + 1} ===`);
        console.error("Error:", error);
        console.error("Raw response:", textResponse?.substring(0, 200) || "No response");

        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.log("=== MAX RETRIES REACHED, TRYING MANUAL PARSING ===");
          const manualParsed = this.manualParseCV(text);

          if (manualParsed.name !== "Parse Error - Manual Review Required") {
            console.log("✅ Manual parsing successful");
            return manualParsed;
          }

          // Final fallback
          return {
            name: "Parse Error - Manual Review Required",
            jobTitle: "Not specified", 
            educations: [],
            technicalSkills: [],
            profesionalExperiences: [],
            parseText: text,
            error: error instanceof Error ? error.message : String(error),
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // This shouldn't be reached, but just in case
    throw new Error("Failed to parse CV after all retries");
  }

  // ✅ Enhanced validation methods
  private validateAndCleanString(value: any): string | null {
    if (typeof value === "string" && value.trim().length > 0 && value.trim() !== "null" && value.trim() !== "undefined") {
      return value.trim();
    }
    return null;
  }

  private validateSkills(skills: any): string[] {
    if (!Array.isArray(skills)) {
      console.log("Skills is not an array:", typeof skills);
      return [];
    }

    const validSkills = skills
      .filter((skill) => typeof skill === "string" && skill.trim().length > 0)
      .map((skill) => skill.trim())
      .filter((skill) => skill.length >= 2 && skill.length <= 50) // Reasonable skill name length
      .filter((skill, index, arr) => arr.indexOf(skill) === index); // Remove duplicates

    console.log("Validated skills:", validSkills.length, "from", skills.length);
    return validSkills;
  }

  private validateEducations(educations: any): any[] {
    if (!Array.isArray(educations)) {
      console.log("Educations is not an array:", typeof educations);
      return [];
    }

    const validEducations = educations.map((edu) => ({
      institution: this.validateAndCleanString(edu?.institution) || "Not specified",
      degree: this.validateAndCleanString(edu?.degree) || "Not specified",
      duration: this.validateAndCleanString(edu?.duration) || "Not specified",
      details: this.validateAndCleanString(edu?.details) || "",
    }));

    console.log("Validated educations:", validEducations.length, "from", educations.length);
    return validEducations;
  }

  private validateExperiences(experiences: any): any[] {
    if (!Array.isArray(experiences)) {
      console.log("Experiences is not an array:", typeof experiences);
      return [];
    }

    const validExperiences = experiences.map((exp) => ({
      company: this.validateAndCleanString(exp?.company) || "Not specified",
      role: this.validateAndCleanString(exp?.role) || "Not specified",
      duration: this.validateAndCleanString(exp?.duration) || "Not specified",
      description: this.validateAndCleanString(exp?.description) || "",
    }));

    console.log("Validated experiences:", validExperiences.length, "from", experiences.length);
    return validExperiences;
  }

  // ✅ Enhanced manual parsing fallback
  private manualParseCV(text: string) {
    console.log("=== STARTING MANUAL CV PARSING ===");

    const result = {
      name: "Parse Error - Manual Review Required",
      jobTitle: "Not specified",
      educations: [] as any[],
      technicalSkills: [] as string[],
      profesionalExperiences: [] as any[],
      parseText: text,
    };

    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Extract name (usually first few lines with proper names)
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(line) && line.length < 50) {
          result.name = line;
          console.log("Found name:", result.name);
          break;
        }
      }

      // Extract skills (look for SKILLS section)
      const skillsSection = this.extractSection(text, ['SKILLS', 'TECHNICAL SKILLS', 'TECHNOLOGIES']);
      if (skillsSection) {
        const skills = skillsSection
          .split(/[,\n•·\-:]/)
          .map(s => s.replace(/[^\w\s+#.-]/g, '').trim())
          .filter(s => s.length > 1 && s.length < 30)
          .slice(0, 20);

        result.technicalSkills = [...new Set(skills)];
        console.log("Found skills:", result.technicalSkills.length);
      }

      // Extract education
      const educationSection = this.extractSection(text, ['EDUCATION', 'ACADEMIC', 'QUALIFICATIONS']);
      if (educationSection) {
        // Simple parsing - look for institution patterns
        const eduLines = educationSection.split('\n').filter(line => line.trim().length > 0);
        const institutions = eduLines.filter(line => 
          /university|college|school|institute/i.test(line) || 
          /bachelor|master|degree|diploma/i.test(line)
        );

        if (institutions.length > 0) {
          result.educations = institutions.slice(0, 3).map(inst => ({
            institution: inst.trim(),
            degree: "Not specified",
            duration: "Not specified",
            details: "",
          }));
          console.log("Found education:", result.educations.length);
        }
      }

      // Extract experience
      const experienceSection = this.extractSection(text, ['EXPERIENCE', 'WORK', 'EMPLOYMENT', 'PROJECTS']);
      if (experienceSection) {
        const expLines = experienceSection.split('\n').filter(line => line.trim().length > 0);
        const companies = expLines.filter(line => 
          line.length > 5 && line.length < 100 && 
          /[A-Z]/.test(line) && 
          !/^(•|-)/.test(line.trim())
        );

        if (companies.length > 0) {
          result.profesionalExperiences = companies.slice(0, 5).map(company => ({
            company: company.trim(),
            role: "Not specified", 
            duration: "Not specified",
            description: "",
          }));
          console.log("Found experiences:", result.profesionalExperiences.length);
        }
      }

    } catch (error) {
      console.error("Manual parsing error:", error);
    }

    console.log("=== MANUAL PARSING COMPLETED ===");
    return result;
  }

  private extractSection(text: string, sectionNames: string[]): string | null {
    for (const sectionName of sectionNames) {
      const regex = new RegExp(`${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n[A-Z]{3,}|$)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  async parseCvFromPdfBuffer(buffer: Buffer) {
    try {
      console.log("=== STARTING CV PARSING FROM PDF ===");
      console.log("Buffer size:", buffer.length, "bytes");

      const extractedText = await this.extractTextFromPdfBuffer(buffer);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text could be extracted from PDF");
      }

      console.log("=== EXTRACTED TEXT INFO ===");
      console.log("Text length:", extractedText.length);
      console.log("First 300 chars:", extractedText.substring(0, 300));
      console.log("Contains keywords:", {
        hasName: /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(extractedText),
        hasEducation: /education|university|college/i.test(extractedText),
        hasExperience: /experience|work|job|project/i.test(extractedText),
        hasSkills: /skills|technical|programming/i.test(extractedText)
      });

      const parsedData = await this.parseWithGemini(extractedText);

      console.log("=== CV PARSING COMPLETED SUCCESSFULLY ===");
      return parsedData;
    } catch (error) {
      console.error("=== ERROR IN parseCvFromPdfBuffer ===");
      console.error("Error:", error);
      throw error;
    }
  }

  async extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    try {
      console.log("Extracting text from PDF buffer...");
      const data = await pdf(buffer);
      console.log("PDF extraction successful, text length:", data.text.length);
      return data.text;
    } catch (error) {
      console.error("PDF extraction error:", error);
      throw new Error(`Failed to extract text from PDF buffer: ${error}`);
    }
  }
}

export default CvRepository;