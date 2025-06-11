import { Router } from "express";
import CvController from "../controllers/cv.controller";
import CvService from "../services/cv.service";
import CvRepository from "../repositories/cv.repository";
import { PrismaClient } from "@prisma/client";
import upload from "../middleware/upload";

const router = Router();
const prisma = new PrismaClient();
const cvRepository = new CvRepository(prisma);
const cvService = new CvService(cvRepository);
const cvController = new CvController(cvService);

router.post(
  "/extract",
  upload.single("cv"),
  cvController.extractTextFromPdf.bind(cvController)
);

router.post(
  "/upload",
  upload.single("cv"),
  cvController.uploadAndSaveCv.bind(cvController)
);

// https://be-dicoding-cv-o8hg.vercel.app/api/cvs/upload

export default router;
