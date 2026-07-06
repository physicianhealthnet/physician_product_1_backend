import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dcmjsImaging from "dcmjs-imaging";
import sharp from "sharp";

const { DicomImage, NativePixelDecoder } = dcmjsImaging;

// Initialize DICOM decoders
NativePixelDecoder.initializeAsync().catch(err => console.error("DICOM Decoder Init Error:", err));

// genAI will be instantiated inside the function to ensure process.env is loaded

/**
 * Converts a DICOM file to a PNG image.
 * @param {string} dicomPath - Path to the DICOM file.
 * @returns {Promise<string>} - Path to the converted PNG file.
 */
export const convertDicomToPng = async (dicomPath) => {
  try {
    const arrayBuffer = fs.readFileSync(dicomPath).buffer;
    const image = new DicomImage(arrayBuffer);
    const renderingResult = image.render();
    
    const convertedPath = dicomPath + ".png";
    await sharp(Buffer.from(renderingResult.pixels), {
      raw: {
        width: renderingResult.width,
        height: renderingResult.height,
        channels: 4
      }
    }).png().toFile(convertedPath);
    
    return convertedPath;
  } catch (error) {
    console.error("DICOM Conversion Error:", error);
    throw new Error("Failed to convert DICOM to PNG: " + error.message);
  }
};

/**
 * Analyzes one or multiple medical scans (images or DICOMs) using Gemini AI.
 * @param {Array<Object>} files - Array of file objects.
 * @param {string} customPrompt - Optional additional instructions.
 * @returns {Promise<string>} - The AI-generated report.
 */
export const analyzeScanImage = async (files, customPrompt = "") => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const fileList = Array.isArray(files) ? files : [files];
    const imageParts = [];
    const convertedPaths = [];

    for (const file of fileList) {
      if (!file) continue;
      
      let imagePath = file.path;
      let mimeType = file.mimetype;
      let isConverted = false;

      // Handle DICOM files
      if (mimeType === "application/dicom" || (file.originalname && file.originalname.toLowerCase().endsWith(".dcm"))) {
        console.log("Converting DICOM to PNG for AI analysis...");
        imagePath = await convertDicomToPng(file.path);
        mimeType = "image/png";
        isConverted = true;
        convertedPaths.push(imagePath);
      }

      const imageBuffer = fs.readFileSync(imagePath);
      imageParts.push({
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: mimeType,
        },
      });
    }

    const prompt = `
Analyze the provided medical document images and prepare a structured medical report.

Include:
1. Observation: Describe what is visible in the image(s).
2. Possible findings: List any abnormalities or notable features.
3. Impression: Summarize the diagnostic conclusion.
4. Suggested next step: Recommend follow-up actions or tests.
5. Short patient-friendly summary: A simple explanation for the patient.

${customPrompt ? `Additional User Instructions: ${customPrompt}` : ""}

IMPORTANT:
- Do not claim absolute certainty.
- Clearly state that this report is AI-generated and must be reviewed by a licensed medical professional.
- Use professional medical terminology where appropriate but keep the summary accessible.
`;

    let result;
    let retries = 3;
    let delay = 2000;
    
    while (retries > 0) {
      try {
        result = await model.generateContent([prompt, ...imageParts]);
        break;
      } catch (err) {
        if ((err.status === 503 || err.status === 429) && retries > 1) {
          console.warn(`[AI Helper] ${err.status} Error. Retrying in ${delay}ms... (${retries - 1} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries--;
          delay *= 2; // Exponential backoff
        } else {
          throw err;
        }
      }
    }

    const response = result.response.text();

    // Clean up converted files if created
    for (const convertedPath of convertedPaths) {
      if (fs.existsSync(convertedPath)) {
        fs.unlinkSync(convertedPath);
      }
    }

    return response;
  } catch (error) {
    console.error("AI Analysis Helper Error:", error);
    throw error;
  }
};
