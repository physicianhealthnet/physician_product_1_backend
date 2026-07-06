import multer from "multer";
import path from "path";
import fs from "fs";

// Allowed file types
const allowedTypes = /jpg|jpeg|png|pdf|doc|docx|xlsx|xls|txt|rtf|wps|wpd|dcm/;

// Destination folder (auto-create if not exists)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join("public","upload", "patient-documents");
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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb("Error: File upload only supports the following filetypes - " + allowedTypes);
    }
  }
}).single("documentFile"); 

// Middleware wrapper
const patientDocumentUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: err });
    }
    next();
  });
};

export default patientDocumentUpload;
