import { VertexAI } from "@google-cloud/vertexai";

// ✅ Create proper authentication configuration
const getVertexAIConfig = () => {
  const projectId = process.env.GCP_PROJECT_ID || "lexical-tide-462414-s5";
  const location = process.env.GCP_REGION || "us-central1";

  if (process.env.NODE_ENV === 'production') {
    // Production: gunakan credentials dari environment variable
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is required in production');
    }

    try {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      
      return new VertexAI({
        project: projectId,
        location: location,
        googleAuthOptions: {
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        }
      });
    } catch (error) {
      console.error('Error parsing Google credentials JSON:', error);
      throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format');
    }
  } else {
    // Development: gunakan file path
    return new VertexAI({
      project: projectId,
      location: location,
    });
  }
};

// ✅ Initialize VertexAI instance
const vertexAi = getVertexAIConfig();

// ✅ Export configured Gemini model
export const geminiModel = vertexAi.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 0.1, // Lower temperature for more consistent parsing
    topK: 40,
    topP: 0.8,
    maxOutputTokens: 2048,
  },
});

// ✅ Export project info for debugging
export const getProjectInfo = () => ({
  project: process.env.GCP_PROJECT_ID || "lexical-tide-462414-s5",
  location: process.env.GCP_REGION || "us-central1",
  environment: process.env.NODE_ENV || "development"
});