import { VertexAI } from "@google-cloud/vertexai";

const vertexAi = new VertexAI({
  project: "lexical-tide-462414-s5",
  location: "us-central1", // or "asia-southeast1"
});

export const geminiModel = vertexAi.getGenerativeModel({
  model: "gemini-2.0-flash-exp", // ✅ Available for new projects
  generationConfig: {
    temperature: 0.4,
    topK: 32,
    topP: 1,
    maxOutputTokens: 1024,
  },
});