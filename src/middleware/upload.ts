import multer from "multer";

// Simpan file langsung di memori (RAM), tidak di folder
const storage = multer.memoryStorage();

// Filter file agar hanya menerima PDF
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"));
  }
};

const upload = multer({ storage, fileFilter });

export default upload;
