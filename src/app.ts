import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import createError, { HttpError } from "http-errors";
import logger from "morgan";
import { authorize } from "./middleware/auth";
import authRouter from "./routes/auth.route";
import notesRouter from "./routes/cv.route";
import { setupSwagger } from "./utils/swagger";
import dotenv from "dotenv";

// ✅ Load environment variables first
dotenv.config();

const app = express();

// ✅ Initialize Google Auth properly
const initializeGoogleAuth = () => {
  const { GoogleAuth } = require('google-auth-library');
  
  try {
    if (process.env.NODE_ENV === 'production') {
      // Production: gunakan environment variable JSON
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is required in production');
      }

      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      
      const auth = new GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      console.log('✅ Google Auth initialized for production');
      return auth;
    } else {
      // Development: gunakan file path
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      console.log('✅ Google Auth initialized for development');
      return auth;
    }
  } catch (error) {
    console.error('❌ Error initializing Google Auth:', error);
    throw error;
  }
};

// Initialize Google Auth
const auth = initializeGoogleAuth();

// ✅ Test Vertex AI connection on startup
const testVertexAIConnection = async () => {
  try {
    const { geminiModel, getProjectInfo } = await import('./utils/vertexClient');
    const projectInfo = getProjectInfo();
    
    console.log('🔧 Vertex AI Configuration:', projectInfo);
    
    // Test dengan prompt sederhana
    const testResult = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: "Hello, respond with 'Connected'" }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 10,
      },
    });

    const response = testResult.response.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('✅ Vertex AI connection test successful:', response);
    
  } catch (error) {
    console.error('❌ Vertex AI connection test failed:', error);
    console.error('Environment variables check:');
    console.error('- NODE_ENV:', process.env.NODE_ENV);
    console.error('- GCP_PROJECT_ID:', process.env.GCP_PROJECT_ID ? '✅ Set' : '❌ Missing');
    console.error('- GCP_REGION:', process.env.GCP_REGION ? '✅ Set' : '❌ Missing');
    console.error('- GOOGLE_APPLICATION_CREDENTIALS_JSON:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? '✅ Set' : '❌ Missing');
  }
};

// Middleware
app.use(logger("dev"));
app.use(express.json({ limit: '10mb' })); // ✅ Increase limit for PDF uploads
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({ origin: "*" }));

// ✅ Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vertexAI: {
      project: process.env.GCP_PROJECT_ID || 'lexical-tide-462414-s5',
      region: process.env.GCP_REGION || 'us-central1',
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    }
  });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/cvs", authorize, notesRouter);

// Swagger
setupSwagger(app);

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404));
});

// error handler
app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // send error response
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: req.app.get("env") === "development" ? err : {},
  });
});

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test Vertex AI connection after server starts
  setTimeout(() => {
    testVertexAIConnection();
  }, 2000);
});

export default app;