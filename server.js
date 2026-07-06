import "dotenv/config";
import express from "express";
import connectDB from "./src/config/db.js";
import cors from "cors";
import router from "./src/routes/routes.js";
import { fileURLToPath } from "url";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { initializeSocket } from "./src/socket/socketController.js";
import { initCronJobs } from "./src/utils/cronJobs.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";
import fs from "fs";
import dcmjsImaging from "dcmjs-imaging";
const { DicomImage, NativePixelDecoder } = dcmjsImaging;
import sharp from "sharp";
import authRouter from "./src/routes/googleAuth.route.js";
import consultationRouter from "./src/routes/consultation.route.js";

// Initialize DICOM decoders once
await NativePixelDecoder.initializeAsync().catch(err => console.error("DICOM Decoder Init Error:", err));


import { analyzeScanImage } from "./src/utils/aiReportHelper.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  },
});

initializeSocket(io);

// __dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const upload = multer({ dest: "uploads/" });

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(message);

    const response = result.response.text();

    res.json({
      reply: response,
    });
  } catch (error) {
    console.error("Gemini AI Error:", error);

    res.status(500).json({
      error: "Something went wrong with the AI service",
      details: error.message
    });
  }
});

app.post("/analyze-xray", upload.single("xray"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "X-ray image is required",
      });
    }

    const { customPrompt } = req.body;
    const report = await analyzeScanImage(req.file, customPrompt);

    // Delete the temporary file from multer
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({
      report: report,
    });
  } catch (error) {
    console.error("X-Ray Analysis Error:", error);
    
    // Clean up file if it exists even on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Failed to analyze X-ray",
      details: error.message
    });
  }
});


import { analyzeLabResults } from "./src/utils/aiLabHelper.js";
import { analyzePrescription } from "./src/utils/aiPharmacyHelper.js";

app.post("/analyze-lab", async (req, res) => {
  try {
    const { results, labType, customPrompt } = req.body;
    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: "Lab results are required" });
    }

    const report = await analyzeLabResults(results, labType, customPrompt);
    res.json({ report });
  } catch (error) {
    console.error("Lab Analysis Error:", error);
    res.status(500).json({
      error: "Failed to analyze lab results",
      details: error.message
    });
  }
});

app.post("/analyze-pharmacy", async (req, res) => {
  try {
    const { medicines, patientInfo } = req.body;
    if (!medicines || !Array.isArray(medicines)) {
      return res.status(400).json({ error: "Medicines are required" });
    }

    const report = await analyzePrescription(medicines, patientInfo);
    res.json({ report });
  } catch (error) {
    console.error("Pharmacy AI Error:", error);
    res.status(500).json({
      error: "Failed to analyze prescription",
      details: error.message
    });
  }
});
app.use("/uploads", express.static(path.join(__dirname, "public", "upload")));
app.use(
  "/exercise-img-and-video",
  express.static(
    path.join(__dirname, "public", "upload", "exercise-img-and-video")
  )
);
app.use(
  "/expenditure-bills",
  express.static(path.join(__dirname, "public", "upload", "expenditure-bills"))
);

// moved up
app.use("/", router);
app.use("/auth", authRouter);
app.use("/", consultationRouter);

connectDB().then(() => {
  initCronJobs();
});


const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
