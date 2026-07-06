import multer from "multer";
import path from "path";
import fs from "fs";

// Allowed file types
const allowedTypes = /jpg|jpeg|png/;

// Destination folder (auto-create if not exists)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join("public", "upload", "patient-profile");
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}).single("profileImg"); 

// Middleware wrapper
const patientProfileUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: err });
    }
    next();
  });
};

export default patientProfileUpload;
