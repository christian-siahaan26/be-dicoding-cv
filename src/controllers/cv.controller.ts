import { Request, NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import CvService from "../services/cv.service";
import axios from "axios";

class CvController {
  private cvService: CvService;

  constructor(cvService: CvService) {
    this.cvService = cvService;
  }

  async uploadAndSaveCv(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: "PDF file is required",
        });
      }

      const { appliedJob } = req.body;

      if (!appliedJob) {
        return res.status(400).json({
          success: false,
          message: "appliedJob is required",
        });
      }

      const newCv = await this.cvService.createCvFromPdfBuffer(
        req.file.buffer,
        appliedJob,
        req.user.id
      );

      // --- PANGGIL API MODEL AI DI SINI ---
      const aiModelApiUrl =
        process.env.AI_MODEL_API_URL || "https://01fc-2405-8180-a03-fbce-2dfc-6ab3-9366-4688.ngrok-free.app/analyze_cv";

      const dataForAiModel = {
        id: newCv.id, // ID CV yang baru dibuat
        name: newCv.name, // Atau ambil dari newCv jika ada
        parseText: newCv.parseText,
        appliedJob: newCv.appliedJob,
        skills: newCv.skills,
        experiences: newCv.experiences,
        educations: newCv.educations,
        jobTitle: newCv.jobTitle,
      };

      let updatedCv = { ...newCv };

      try {
        const aiResponse = await axios.post(aiModelApiUrl, dataForAiModel, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 60000,
        });

        if (aiResponse.status >= 200 && aiResponse.status < 300) {
          const aiResult = aiResponse.data;
          console.log("AI Model API Response:", aiResult);

          updatedCv = await this.cvService.updateCvAnalysisResults(
            newCv.id,
            aiResult.matchScore,
            aiResult.jobRecommendation,
            aiResult.fixCv
          );

          console.log("CV updated with AI analysis results:", updatedCv.id);
        } else {
          console.error(
            `Error from AI Model API (${aiResponse.status}):`,
            aiResponse.data
          );
        }
      } catch (axiosError: any) {
        if (axiosError.response) {
          console.error(
            `Axios Error (Response): ${
              axiosError.response.status
            } - ${JSON.stringify(axiosError.response.data)}`
          );
        } else if (axiosError.request) {
          console.error(
            "Axios Error (No Response): Request made but no response received."
          );
        } else {
          console.error("Axios Error (Request Setup):", axiosError.message);
        }
        console.warn(
          "AI model analysis failed. Returning CV data without AI analysis."
        );
      }

      return res.status(201).json({
        success: true,
        message: "CV successfully uploaded and processed",
        data: updatedCv,
      });
    } catch (error) {
      console.error("Error in uploadAndSaveCv:", error);
      next(error);
    }
  }

  async extractTextFromPdf(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: "PDF file is required",
        });
      }

      const text = await this.cvService.extractTextFromPdf(req.file.buffer);

      return res.status(200).json({
        success: true,
        extractedText: text,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default CvController;
