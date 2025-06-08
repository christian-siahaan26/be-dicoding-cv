import { JsonValue } from "@prisma/client/runtime/library";

export type Cv = {
  id: number;
  appliedJob: string;
  name: string;
  educations: JsonValue;
  skills: JsonValue;
  profesionalExperience: JsonValue;
  matchScore: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCvDto = {
  appliedJob: string;
  name: string;
  educations: JsonValue;
  skills: JsonValue;
  profesionalExperience: JsonValue;
  matchScore: number | null;
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
