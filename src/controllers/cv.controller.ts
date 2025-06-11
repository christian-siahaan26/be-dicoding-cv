import { Request, NextFunction, Response } from "express";
import { responses } from "../constants";
import { AuthRequest } from "../middleware/auth";
import CvService from "../services/cv.service";
import { CvFilters } from "../types/cv";
import { PaginationParams } from "../types/pagination";

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

      // --- DISINI (DI ANTARA newCv dan return res.status) ---
      // Ini adalah tempat yang TEPAT untuk memanggil fetch ke API model AI
      // const aiModelApiUrl = "http://localhost:5000/api/model";

      // const dataForAiModel = {
      //     parseText: newCv.parseText,
      //     appliedJob: newCv.appliedJob,
      //     cvId: newCv.id
      // };

      // try {
      //     const aiResponse = await fetch(aiModelApiUrl, {
      //         method: "POST",
      //         headers: {
      //             "Content-Type": "application/json",
      //         },
      //         body: JSON.stringify(dataForAiModel),
      //         timeout: 60000
      //     });

      //     if (!aiResponse.ok) {
      //         const errorBody = await aiResponse.text();
      //         console.error(`Error from AI Model API (${aiResponse.status}): ${errorBody}`);
      //         // Tangani error, tetapi lanjutkan untuk mengirim respons ke klien dengan data yang sudah disimpan
      //     } else {
      //         const aiResult = await aiResponse.json();
      //         console.log("AI Model API Response:", aiResult);

      //         // Perbarui data CV di database dengan hasil dari AI
      //         await this.cvService.updateCvAnalysisResults(
      //             newCv.id,
      //             aiResult.matchScore,
      //             aiResult.jobRecommendation,
      //             aiResult.fixCv
      //         );

      //         // Perbarui objek newCv yang akan dikirim ke klien
      //         newCv.matchScore = aiResult.matchScore;
      //         newCv.jobRecommendation = aiResult.jobRecommendation;
      //         newCv.fixCv = aiResult.fixCv;
      //     }
      // } catch (fetchError) {
      //     console.error("Error during fetch to AI Model API:", fetchError);
      //     // Tangani error koneksi atau timeout fetch
      // }
      // // --- AKHIR DARI BLOK FETCH ---

      return res.status(201).json({
        success: true,
        message: "CV successfully uploaded and saved",
        data: newCv,
      });
    } catch (error) {
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
