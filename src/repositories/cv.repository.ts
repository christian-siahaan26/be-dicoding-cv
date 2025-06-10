import { PrismaClient, Prisma } from "@prisma/client";
import Cv from "../models/cv.model";
import { CreateCvDto, UpdateCvDto, CvFilters } from "../types/cv";
import { PaginationParams } from "../types/pagination";
import { getErrorMessage } from "../utils/error";
import fs from "fs";
import pdf from "pdf-parse";
import { geminiModel } from "../utils/vertexClient";

class CvRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async parseWithGemini(text: string) {
    // ✅ Improved prompt with better structure and examples
    const prompt = `You are an expert CV/Resume parser. Extract information from the following CV text and return ONLY a valid JSON object.

EXTRACTION RULES:
1. Extract the person's full name (usually at the top)
2. Identify current job title or desired position
3. List ALL technical skills, programming languages, tools mentioned
4. Extract ALL work experiences including projects and internships
5. Extract ALL educational background
6. Be thorough and accurate

REQUIRED JSON FORMAT:
{
  "name": "Full Name Here",
  "jobTitle": "Current or Desired Job Title",
  "educations": [
    {
      "institution": "School/University Name",
      "degree": "Degree/Program Name", 
      "duration": "Start - End Date",
      "details": "Additional info like GPA, location, etc"
    }
  ],
  "technicalSkills": ["Python", "JavaScript", "SQL", "Excel", "etc"],
  "profesionalExperiences": [
    {
      "company": "Company/Organization Name",
      "role": "Position/Role Title",
      "duration": "Start - End Date",
      "description": "Key responsibilities and achievements"
    }
  ]
}

CV TEXT TO ANALYZE:
${text}

IMPORTANT: 
- Return ONLY the JSON object
- NO markdown formatting (no \`\`\`json)
- NO additional explanations
- Extract ALL information found in the text
- Use "Not specified" only if information is truly missing

JSON Response:`;

    let textResponse: string | undefined = undefined;

    try {
      // ✅ Better generation config for parsing tasks
      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent parsing
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        },
      });

      const candidates = result.response.candidates;
      textResponse = candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error("No text response from Gemini");
      }

      console.log('=== RAW GEMINI RESPONSE ===');
      console.log(textResponse);

      // ✅ Better response cleaning
      let cleanResponse = textResponse.trim();
      
      // Remove any markdown formatting
      cleanResponse = cleanResponse.replace(/```json\s*/g, '');
      cleanResponse = cleanResponse.replace(/```\s*/g, '');
      cleanResponse = cleanResponse.replace(/^```/g, '');
      cleanResponse = cleanResponse.replace(/```$/g, '');
      
      // Remove any explanatory text before/after JSON
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      console.log('=== CLEANED RESPONSE ===');
      console.log(cleanResponse);

      // ✅ Parse JSON with better error handling
      const parsedData = JSON.parse(cleanResponse);
      
      console.log('=== PARSED DATA ===');
      console.log(JSON.stringify(parsedData, null, 2));

      // ✅ Enhanced validation and normalization
      const validatedData = {
        name: this.validateAndCleanString(parsedData.name) || "Parse Error - Manual Review Required",
        jobTitle: this.validateAndCleanString(parsedData.jobTitle) || "Not specified",
        educations: this.validateEducations(parsedData.educations),
        technicalSkills: this.validateSkills(parsedData.technicalSkills),
        profesionalExperiences: this.validateExperiences(parsedData.profesionalExperiences),
        parseText: text,
      };

      console.log('=== FINAL VALIDATED DATA ===');
      console.log(JSON.stringify(validatedData, null, 2));

      return validatedData;

    } catch (error) {
      console.error('=== PARSING ERROR ===');
      console.error('Error:', error);
      console.error('Raw response:', textResponse || "No response received");
      
      // ✅ Try manual parsing as fallback
      console.log('=== ATTEMPTING MANUAL PARSING ===');
      const manualParsed = this.manualParseCV(text);
      
      if (manualParsed.name !== "Parse Error - Manual Review Required") {
        console.log('Manual parsing successful');
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
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ✅ Helper validation methods
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
      .filter((skill, index, arr) => arr.indexOf(skill) === index); // Remove duplicates
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

  // ✅ Manual parsing fallback using regex patterns
  private manualParseCV(text: string) {
    console.log('Starting manual CV parsing...');
    
    const result = {
      name: "Parse Error - Manual Review Required",
      jobTitle: "Not specified", 
      educations: [] as any[],
      technicalSkills: [] as string[],
      profesionalExperiences: [] as any[],
      parseText: text
    };

    try {
      // Extract name (first line with capital letters)
      const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
      if (nameMatch) {
        result.name = nameMatch[1].trim();
        console.log('Found name:', result.name);
      }

      // Extract skills from SKILLS section
      const skillsMatch = text.match(/SKILLS?\s*\n([\s\S]*?)(?=\n[A-Z]{3,}|$)/i);
      if (skillsMatch) {
        const skillsText = skillsMatch[1];
        const skills = skillsText
          .split(/[,\n•:]/)
          .map(s => s.replace(/[^\w\s+#.-]/g, '').trim())
          .filter(s => s.length > 1 && s.length < 30)
          .slice(0, 20); // Limit to reasonable number
        
        result.technicalSkills = [...new Set(skills)];
        console.log('Found skills:', result.technicalSkills);
      }

      // Extract education
      const eduMatch = text.match(/EDUCATION\s*\n([\s\S]*?)(?=\n[A-Z]{3,}|$)/i);
      if (eduMatch) {
        const eduText = eduMatch[1];
        // Look for institution patterns
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
          console.log('Found education:', result.educations);
        }
      }

      // Extract experiences  
      const expMatch = text.match(/(?:EXPERIENCE|PROJECT)[\s\S]*?(?=\n[A-Z]{3,}|$)/i);
      if (expMatch) {
        const expText = expMatch[0];
        // Look for organization/company patterns
        const companies = expText.match(/([A-Z][a-zA-Z\s&-]+?)(?:\s+–|\s+\n)/g);
        if (companies) {
          result.profesionalExperiences = companies.slice(0, 5).map(comp => ({
            company: comp.trim().replace(/–$/, ''),
            role: "Not specified",
            duration: "Not specified", 
            description: ""
          }));
          console.log('Found experiences:', result.profesionalExperiences);
        }
      }

    } catch (error) {
      console.error('Manual parsing error:', error);
    }

    return result;
  }

  async parseCvFromPdfBuffer(buffer: Buffer) {
    try {
      console.log('=== STARTING CV PARSING ===');
      
      const extractedText = await this.extractTextFromPdfBuffer(buffer);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text could be extracted from PDF");
      }

      console.log('=== EXTRACTED TEXT LENGTH ===', extractedText.length);
      console.log('=== FIRST 200 CHARS ===');
      console.log(extractedText.substring(0, 200));

      const parsedData = await this.parseWithGemini(extractedText);
      
      console.log('=== PARSING COMPLETED ===');
      return parsedData;
      
    } catch (error) {
      console.error("Error in parseCvFromPdfBuffer:", error);
      throw error;
    }
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