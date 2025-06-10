import { type Cv as PrismaCv } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
// import e from "@types/express";

class Cv {
  private id: number;
  private appliedJob: string;
  private name: string;
  private jobTitle: string;
  private educations: JsonValue;
  private skills: JsonValue;
  private experiences: JsonValue;
  private parseText: string;
  private matchScore: number | null;
  private jobRecommendation: JsonValue | null;
  private fixCv: JsonValue | null;
  private createdAt: Date; 
  private updatedAt: Date;

  constructor(
    id: number,
    appliedJob: string,
    name: string,
    jobTitle: string,
    educations: JsonValue,
    skills: JsonValue,
    experiences: JsonValue,
    parseText: string,
    matchScore: number | null,
    jobRecommendation: JsonValue | null,
    fixCv: JsonValue |null,
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.appliedJob = appliedJob;
    this.name = name;
    this.jobTitle = jobTitle;
    this.educations = educations;
    this.skills = skills;
    this.experiences = experiences;
    this.parseText = parseText;
    this.matchScore = matchScore;
    this.jobRecommendation = jobRecommendation;
    this.fixCv = fixCv;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromEntity(prismaCv: PrismaCv) {
    return new Cv(
      prismaCv.id,
      prismaCv.appliedJob,
      prismaCv.name,
      prismaCv.jobTitle,
      prismaCv.educations,
      prismaCv.skills,
      prismaCv.experiences,
      prismaCv.parseText,
      prismaCv.matchScore,
      prismaCv.jobRecommendation,
      prismaCv.fixCv,
      prismaCv.createdAt,
      prismaCv.updatedAt
    );
  }

  toDTO() {
    return {
      id: this.id,
      appliedJob: this.appliedJob,
      name: this.name,
      jobTitle: this.jobTitle,
      educations: this.educations,
      skills: this.skills,
      experiences: this.experiences,
      parseText: this.parseText,
      matchScore: this.matchScore,
      jobRecommendation: this.jobRecommendation,
      fixCv: this.fixCv,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default Cv;
