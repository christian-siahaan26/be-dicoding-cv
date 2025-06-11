import { PrismaClient, Prisma } from "@prisma/client";
import pdf from "pdf-parse";
import { geminiModel, getProjectInfo } from "../utils/vertexClient";

class CvRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async parseWithGemini(text: string) {
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
      "degree": "Degree/Program/Course Name"
    }
  ],
  "technicalSkills": ["Skill1", "Skill2", "Skill3"],
  "profesionalExperiences": [
    {
      "company": "Company/Organization Name",
      "role": "Position/Role Title"
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
        const result = await geminiModel.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.05,
            topP: 0.7,
            topK: 20,
            maxOutputTokens: 4096,
            stopSequences: ["\n\n---", "\n\nNote:", "\n\nExplanation:"]
          },
        });

        const candidates = result.response.candidates;
        textResponse = candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
          throw new Error("No text response from Gemini");
        }

        let cleanResponse = textResponse.trim();

        cleanResponse = cleanResponse.replace(/```json\s*/gi, "");
        cleanResponse = cleanResponse.replace(/```\s*/g, "");
        cleanResponse = cleanResponse.replace(/^```/g, "");
        cleanResponse = cleanResponse.replace(/```$/g, "");

        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        }

        const lastBrace = cleanResponse.lastIndexOf('}');
        if (lastBrace !== -1) {
          cleanResponse = cleanResponse.substring(0, lastBrace + 1);
        }

        const parsedData = JSON.parse(cleanResponse);

        const validatedData = {
          name: this.validateAndCleanString(parsedData.name) || "Parse Error - Manual Review Required",
          jobTitle: this.validateAndCleanString(parsedData.jobTitle) || "Not specified",
          educations: this.validateEducations(parsedData.educations),
          technicalSkills: this.validateSkills(parsedData.technicalSkills),
          profesionalExperiences: this.validateExperiences(parsedData.profesionalExperiences),
          parseText: text,
        };

        return validatedData;

      } catch (error) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          const manualParsed = this.manualParseCV(text);

          if (manualParsed.name !== "Parse Error - Manual Review Required") {
            return manualParsed;
          }

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

        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    throw new Error("Failed to parse CV after all retries");
  }

  private validateAndCleanString(value: any): string | null {
    if (typeof value === "string" && value.trim().length > 0 && value.trim() !== "null" && value.trim() !== "undefined") {
      return value.trim();
    }
    return null;
  }

  private validateSkills(skills: any): string[] {
    if (!Array.isArray(skills)) {
      return [];
    }

    const validSkills = skills
      .filter((skill) => typeof skill === "string" && skill.trim().length > 0)
      .map((skill) => skill.trim())
      .filter((skill) => skill.length >= 2 && skill.length <= 50)
      .filter((skill, index, arr) => arr.indexOf(skill) === index);

    return validSkills;
  }

  private validateEducations(educations: any): any[] {
    if (!Array.isArray(educations)) {
      return [];
    }

    const validEducations = educations.map((edu) => ({
      institution: this.validateAndCleanString(edu?.institution) || "Not specified",
      degree: this.validateAndCleanString(edu?.degree) || "Not specified",
    }));

    return validEducations;
  }

  private validateExperiences(experiences: any): any[] {
    if (!Array.isArray(experiences)) {
      return [];
    }

    const validExperiences = experiences.map((exp) => ({
      company: this.validateAndCleanString(exp?.company) || "Not specified",
      role: this.validateAndCleanString(exp?.role) || "Not specified",
    }));

    return validExperiences;
  }

  private manualParseCV(text: string) {

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
      
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(line) && line.length < 50) {
          result.name = line;
          break;
        }
      }

      const skillsSection = this.extractSection(text, ['SKILLS', 'TECHNICAL SKILLS', 'TECHNOLOGIES']);
      if (skillsSection) {
        const skills = skillsSection
          .split(/[,\n•·\-:]/)
          .map(s => s.replace(/[^\w\s+#.-]/g, '').trim())
          .filter(s => s.length > 1 && s.length < 30)
          .slice(0, 20);

        result.technicalSkills = [...new Set(skills)];
      }

      const educationSection = this.extractSection(text, ['EDUCATION', 'ACADEMIC', 'QUALIFICATIONS']);
      if (educationSection) {
        const eduLines = educationSection.split('\n').filter(line => line.trim().length > 0);
        const institutions = eduLines.filter(line => 
          /university|college|school|institute/i.test(line) || 
          /bachelor|master|degree|diploma/i.test(line)
        );

        if (institutions.length > 0) {
          result.educations = institutions.slice(0, 3).map(inst => ({
            institution: inst.trim(),
            degree: "Not specified",
          }));
        }
      }

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
          }));
        }
      }

    } catch (error) {
      console.error("Manual parsing error:", error);
    }

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

      const extractedText = await this.extractTextFromPdfBuffer(buffer);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text could be extracted from PDF");
      }

      const parsedData = await this.parseWithGemini(extractedText);

      return parsedData;
    } catch (error) {
      throw error;
    }
  }

  async extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      console.log("PDF extraction successful, text length:", data.text.length);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF buffer: ${error}`);
    }
  }
}

export default CvRepository;