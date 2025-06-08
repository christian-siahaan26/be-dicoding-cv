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
