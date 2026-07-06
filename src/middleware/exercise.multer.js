import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadpath = path.join("public", "upload", "exercise-img-and-video");
    if (!fs.existsSync(uploadpath)) {
      fs.mkdirSync(uploadpath, { recursive: true });
    }
    cb(null, uploadpath);
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
}).single("imgAndVideoFile");

const exerciseUpload = (req, res, next) => {
  upload(req, res, function (error) {
    if (error) {
      return res.status(400).json({ message: error });
    }
    next();
  });
};

export default exerciseUpload;