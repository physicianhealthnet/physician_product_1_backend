import multer from "multer";
import path from "path";
import fs from "fs";

// Allowed file types for scan reports
const allowedTypes = /jpg|jpeg|png|pdf|doc|docx|xlsx|xls|txt|rtf|wps|wpd/;

// Destination folder (auto-create if not exists)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join("public", "upload", "scan-documents");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const modifiedName = file.originalname.toLowerCase().replace(/\s+/g, "_");
    const uniqueName = Date.now() + "-" + modifiedName;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}).array("scanReportFiles", 10); 

// Middleware wrapper
const scanDocumentUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: err });
    }
    next();
  });
};

export default scanDocumentUpload;
