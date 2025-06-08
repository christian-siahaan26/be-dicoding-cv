import { type Cv as PrismaCv } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
// import e from "@types/express";

class Cv {
  private id: number;
  private appliedJob: string;
  // private name: string;
  private educations: JsonValue;
  private technicalSkills: JsonValue;
  private profesionalExperience: JsonValue;
  private matchScore: number | null;
  private createdAt: Date; 
  private updatedAt: Date;

  constructor(
    id: number,
    appliedJob: string,
    // name: string,
    educations: JsonValue,
    technicalSkills: JsonValue,
    profesionalExperience: JsonValue,
    matchScore: number | null,
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.appliedJob = appliedJob;
    // this.name = name;
    this.educations = educations;
    this.technicalSkills = technicalSkills;
    this.profesionalExperience = profesionalExperience;
    this.matchScore = matchScore;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromEntity(prismaCv: PrismaCv) {
    return new Cv(
      prismaCv.id,
      prismaCv.appliedJob,
      // prismaCv.name,
      prismaCv.educations,
      prismaCv.technicalSkills,
      prismaCv.profesionalExperiences,
      prismaCv.matchScore,
      prismaCv.createdAt,
      prismaCv.updatedAt
    );
  }

  toDTO() {
    return {
      id: this.id,
      appliedJob: this.appliedJob,
      // name: this.name,
      educations: this.educations,
      technicalSkills: this.technicalSkills,
      profesionalExperience: this.profesionalExperience,
      matchScore: this.matchScore,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default Cv;
