import { GoogleGenerativeAI } from "@google/generative-ai";

// genAI will be instantiated inside the function to ensure process.env is loaded

/**
 * Analyzes lab results and generates a professional summary.
 * @param {Array} results - Array of objects { name, value, unit, referenceRange }.
 * @param {string} labType - The type of lab test (e.g., CBC).
 * @param {string} customPrompt - Optional additional instructions.
 * @returns {Promise<string>} - The AI-generated summary.
 */
export const analyzeLabResults = async (results, labType, customPrompt = "") => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const resultsString = results
      .map(r => `${r.name}: ${r.value} ${r.unit} (Ref: ${r.referenceRange})`)
      .join("\n");

    const prompt = `
Analyze the following lab results for a ${labType} test and provide a professional medical interpretation for a doctor's report.

Results:
${resultsString}

Instructions:
1. Identify any values that are outside the provided reference ranges.
2. Provide a concise qualitative summary of the findings.
3. Suggest potential clinical significance (briefly).
4. Keep the tone professional and clinical.
5. Mention that this is an AI-generated draft for professional review.

${customPrompt ? `Additional User Instructions: ${customPrompt}` : ""}

IMPORTANT:
- Be precise with numbers.
- Do not make a definitive diagnosis; use phrases like "suggestive of", "indicates a need for correlation", etc.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Lab AI Analysis Error:", error);
    throw error;
  }
};
