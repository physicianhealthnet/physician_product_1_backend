import { GoogleGenerativeAI } from "@google/generative-ai";

// genAI will be instantiated inside the function to ensure process.env is loaded

/**
 * Analyzes a prescription and generates a pharmacist's guide and patient advice.
 * @param {Array} medicines - Array of objects { medication, morning, afternoon, night, days, instruction }.
 * @param {Object} patientInfo - Object { name, age, gender }.
 * @returns {Promise<string>} - The AI-generated report.
 */
export const analyzePrescription = async (medicines, patientInfo = {}) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const medsString = medicines
      .map(m => `- ${m.medication}: ${m.morning}-${m.afternoon}-${m.night} for ${m.days} days. Instructions: ${m.instruction || "None"}`)
      .join("\n");

    const prompt = `
You are a medical AI pharmacist. Return the analysis STRICTLY as a JSON array. DO NOT use markdown blocks or extra text.
Format EXACTLY like this:
[
  {
    "test_name": "Medication Name",
    "value": "Dosage Schedule (e.g. 1-0-1)",
    "unit": "",
    "reference": "Duration (e.g. 5 days)",
    "flag": "normal", 
    "impression": "What this medication is for...",
    "patient_solution": "Simple, clear instructions for the patient on how to take these medications...",
    "treatment_suggestion": "Pharmacist Note: Important interactions or side effects to monitor..."
  }
]

Patient Info:
Name: ${patientInfo.name || "N/A"}
Age: ${patientInfo.age || "N/A"}
Gender: ${patientInfo.gender || "N/A"}

Prescription Details:
${medsString}

IMPORTANT:
- "flag" MUST be one of: "low", "normal", "high", "critical", "warning". Use "warning" if there are severe interactions.
- Provide one JSON object in the array for EACH medication.
- Do not make a definitive medical diagnosis.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Pharmacy AI Analysis Error:", error);
    throw error;
  }
};
