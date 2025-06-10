import { JsonValue } from "@prisma/client/runtime/library";

export type Cv = {
  id: number;
  appliedJob: string;
  name: string;
  jobTitle: string;
  educations: JsonValue;
  skills: JsonValue;
  experiences: JsonValue;
  parseText: string;
  matchScore: number | null;
  jobRecommendation: JsonValue | null;
  fixCv: JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCvDto = {
  appliedJob: string;
  name: string;
  jobTitle: string;
  educations: JsonValue;
  skills: JsonValue;
  experiences: JsonValue;
  parseText: string;
  matchScore: number | null;
  jobRecommendation: JsonValue | null;
  fixCv: JsonValue | null;
  email: string;
};

export type UpdateCvDto = {
  cvText: string;
  parsedData?: JsonValue | null;
};

export interface CvFilters {
  search?: string;
  startDate?: Date;
  endDate?: Date;
}
