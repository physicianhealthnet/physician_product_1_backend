import fs from "fs";
import path from "path";
import { createDBService } from "../../services/db.service.js";
import Patient from "../../models/patientModel/patient.model.js";
import LabPrescription from "../../models/labPrescription.model.js";
import ScanPrescription from "../../models/scanPrescription.model.js";
import Prescription from "../../models/prescription.model.js";
import PhysicianAssessment from "../../models/physicianAssessment.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { handleWhatsAppNotification } from "../../utils/notification.helper.js";
import { analyzeScanImage } from "../../utils/aiReportHelper.js";

const patientService = createDBService(Patient);

export const createPatientController = async (req, res) => {
  console.log(
    ">>> Product Backend: createPatientController called for:",
    req.body.patientName,
  );
  try {
    const {
      patientName,
      patientPhone,
      patientEmail,
      patientAddress,
      password,
    } = req.body;

    if (!patientName) {
      return res.status(400).json({ message: "Patient name is required" });
    }
    if (!patientPhone) {
      return res.status(400).json({ message: "Patient phone is required" });
    }

    // Normalize clinicId to array if it arrives as a string
    const clinicIds = Array.isArray(req.body.clinicId)
      ? req.body.clinicId
      : req.body.clinicId
        ? [req.body.clinicId]
        : [];

    if (req.file) {
      req.body.profileImg = `/uploads/patient-profile/${req.file.filename}`;
    }

    // Step 1: Create or fetch patient _id from secondary hub (MANDATORY FIRST STEP)
    let globalPatientId = null;
    try {
      console.log(
        ">>> Product Backend: Syncing with Hub (Establishing Global ID)...",
      );
      const isLocal =
        process.env.NODE_ENV !== "production" || process.env.HUB_URL;
      const HUB_URL =
        process.env.HUB_URL ||
        (isLocal
          ? "http://127.0.0.1:3028"
          : "http://dependencyforphn.physicianhealthnet.com/api");

      const resp = await fetch(`${HUB_URL}/auth/global-patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: patientName,
          phno: patientPhone,
          email: patientEmail,
          address: patientAddress,
          password: password || "Password123",
          clinicId: clinicIds,
          patientDOB: req.body.patientDOB,
          patientGender: req.body.patientGender,
          patientAge: req.body.patientAge,
          patientAadhar: req.body.patientAadhar,
          ref_dr_name: req.body.ref_dr_name,
          ref_dr_id: req.body.ref_dr_id,
          profileImg: req.body.profileImg,
        }),
      }).catch(async (e) => {
        if (HUB_URL.includes("localhost")) {
          const altUrl = HUB_URL.replace("localhost", "127.0.0.1");
          return fetch(`${altUrl}/auth/global-patient`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...req.body,
              name: patientName,
              phno: patientPhone,
              clinicId: clinicIds,
            }),
          });
        }
        throw e;
      });

      const json = await resp.json();
      if (!resp.ok) {
        console.error(">>> Product Backend: Hub rejection:", json.message);
        return res.status(resp.status).json({
          message: "Could not register patient globally in Hub DB",
          error: json.message || "Hub server rejected request",
        });
      }

      const returnedPatient = json.data || json.patient || json;
      if (returnedPatient && returnedPatient._id) {
        globalPatientId = returnedPatient._id;
        console.log(
          ">>> Product Backend: Global ID established:",
          globalPatientId,
        );
      } else {
        throw new Error("Hub responded OK but returned no patient _id");
      }
    } catch (e) {
      console.error(">>> Product Backend: Critical Sync Error:", e.message);
      return res.status(503).json({
        message:
          "Secondary backend (Hub) is unreachable or returned invalid data. Patient registration aborted to maintain database consistency.",
        error: e.message,
      });
    }

    // Step 2: Generate robust local patientId
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date()
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase();
    const patientsThisYear = await Patient.find({
      patientId: { $regex: `^${currentYear}-` },
    })
      .sort({ createdAt: -1 })
      .limit(1);

    let nextPatientNumber = 1;
    if (patientsThisYear.length > 0) {
      const lastId = patientsThisYear[0].patientId;
      const parts = lastId.split("-");
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        nextPatientNumber = lastNum + 1;
      }
    }

    const paddedNumber = String(nextPatientNumber).padStart(3, "0");
    let finalPatientId = `${currentYear}-${currentMonth}-${paddedNumber}`;
    let isUnique = false;
    let safetyCounter = 0;
    while (!isUnique && safetyCounter < 10) {
      const existing = await Patient.findOne({ patientId: finalPatientId });
      if (existing) {
        nextPatientNumber++;
        const newPaddedNumber = String(nextPatientNumber).padStart(3, "0");
        finalPatientId = `${currentYear}-${currentMonth}-${newPaddedNumber}`;
        safetyCounter++;
      } else {
        isUnique = true;
      }
    }

    // Step 3: Create the patient locally with the Global ID
    req.body.patientId = finalPatientId;
    req.body.clinicId = clinicIds;
    req.body.PHN_ID = globalPatientId;

    console.log(
      ">>> Product Backend: Creating local patient record for:",
      finalPatientId,
    );
    const patient = await patientService.create(req.body);

    // Send WhatsApp ID Card Notification
    try {
      if (patient && patient.patientPhone) {
        await handleWhatsAppNotification(
          req,
          patient,
          { patientId: patient.patientId },
          "id_card",
        );
      }
    } catch (waErr) {
      console.error(
        ">>> Product Backend: WhatsApp ID Card Notification Failed:",
        waErr.message,
      );
    }

    return res.status(201).json({
      message: "Patient registered successfully across both databases",
      patient,
    });
  } catch (err) {
    console.error("!!! Product Backend ERROR in createPatientController:", err);
    return res.status(500).json({
      message: "Server error during patient creation",
      error: err.message,
      stack: err.stack,
    });
  }
};
export const getAllPatientsController = async (req, res) => {
  try {
    const patients = await patientService.getAll({ isDeleted: false });
    return res.status(200).json({
      message: "Patients fetched successfully",
      patients,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAllPatientsByClinicController = async (req, res) => {
  try {
    const clinicId = req.params.clinicId; // ✅ Correct way to get URL param

    if (!clinicId) {
      return res.status(400).json({ message: "Clinic ID is required" });
    }

    const patients = await patientService.getAll({
      clinicId,
      isDeleted: false,
    });
    patients.reverse();
    return res.status(200).json({
      message: "Patients fetched successfully",
      patients,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params; // Use query params to get patientId

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const patient = await patientService.getOne({
      patientId,
      isDeleted: false,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    console.log(patient, "data from backend testing");

    return res.status(200).json({
      message: "Patient fetched successfully",
      patient,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const editPatientController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Normalize clinicId to array if it arrives as a string
    if (updateData.clinicId) {
      updateData.clinicId = Array.isArray(updateData.clinicId)
        ? updateData.clinicId
        : [updateData.clinicId];
    }

    if (req.file) {
      updateData.profileImg = `/uploads/patient-profile/${req.file.filename}`;
    }

    if (!id) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const updatedPatient = await patientService.update(id, updateData); // ✅ pass raw string
    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Step 2: Sync updates with Hub
    try {
      console.log(
        ">>> Product Backend: Syncing update with Hub for:",
        updatedPatient.patientName,
      );
      const isLocal =
        process.env.NODE_ENV !== "production" || process.env.HUB_URL;
      const HUB_URL =
        process.env.HUB_URL ||
        (isLocal
          ? "http://127.0.0.1:3028"
          : "http://dependencyforphn.physicianhealthnet.com/api");
      const hubUpdateFetch = async (url) => {
        return fetch(`${url}/auth/global-patient`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updatedPatient.patientName,
            phno: updatedPatient.patientPhone,
            email: updatedPatient.patientEmail,
            address: updatedPatient.patientAddress,
            clinicId: updatedPatient.clinicId,
            patientDOB: updatedPatient.patientDOB,
            patientGender: updatedPatient.patientGender,
            patientAge: updatedPatient.patientAge,
            patientAadhar: updatedPatient.patientAadhar,
            ref_dr_name: updatedPatient.ref_dr_name,
            ref_dr_id: updatedPatient.ref_dr_id,
            profileImg: updatedPatient.profileImg,
            password: req.body.password,
            globalPatientId: updatedPatient.PHN_ID,
          }),
        });
      };

      hubUpdateFetch(HUB_URL)
        .then(async (resp) => {
          console.log("function start....");

          if (resp.ok) {
            const json = await resp.json();
            const returnedPatient = json.data || json.patient || json;
            if (
              returnedPatient &&
              returnedPatient._id &&
              !updatedPatient.PHN_ID
            ) {
              await Patient.findByIdAndUpdate(updatedPatient._id, {
                PHN_ID: returnedPatient._id,
              });
            }
            console.log(">>> Product Backend: Update sync successful");
          }
        })
        .catch(async (e) => {
          if (HUB_URL.includes("localhost")) {
            const altUrl = HUB_URL.replace("localhost", "127.0.0.1");
            try {
              const resp = await hubUpdateFetch(altUrl);
              if (resp.ok)
                console.log(
                  ">>> Product Backend: Update sync successful (via 127.0.0.1)",
                );
            } catch (e2) {
              console.warn(
                ">>> Product Backend: Update sync failed (Hub offline):",
                e2.message,
              );
            }
          } else {
            console.warn(
              ">>> Product Backend: Update sync failed (Hub offline):",
              e.message,
            );
          }
        });
    } catch (e) {
      console.warn(">>> Product Backend: Sync error during update:", e.message);
    }

    return res.status(200).json({
      message: "Patient updated successfully",
      patient: updatedPatient,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const deletePatientController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const deletedPatient = await Patient.findOneAndUpdate(
      { patientId: id, isDeleted: false },
      { isDeleted: true },
      { new: true },
    );

    if (!deletedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    return res.status(200).json({
      message: "Patient deleted successfully",
      patient: deletedPatient,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getPatientByIdAndPhone = async (req, res) => {
  try {
    const { patientId, patientPhone, FCMToken } = req.body;

    if (!patientId || !patientPhone || !FCMToken) {
      return res.status(400).json({
        success: false,
        message: "patientId and patientPhone are required.",
      });
    }

    const patient = await Patient.findOne({
      patientId,
      patientPhone,
      isDeleted: false,
    });

    await Patient.findByIdAndUpdate(
      patient._id,
      { FCMToken: FCMToken },
      { new: true },
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};

export const patientLogout = async (req, res) => {
  const { patientId, id } = req.body;
  try {
    const logoutAndClearFCM = await Patient.findById(id);
    if (logoutAndClearFCM.patientId === patientId) {
      await Patient.findByIdAndUpdate(id, { FCMToken: null }, { new: true });
      return res.status(200).json({
        message: "Logout Successfully & FCM Cleared",
        data: true,
      });
    } else {
      return res.status(200).json({
        message: "Logout failed & FCM not cleared",
        data: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const generateOverallAIReport = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findOne({ patientId, isDeleted: false });
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    const labs = await LabPrescription.find({ patientId, isDeleted: false });
    const scans = await ScanPrescription.find({ patientId, isDeleted: false });
    const prescriptions = await Prescription.find({
      patientId,
      isDeleted: false,
    });

    // Format info
    const patientInfo = `
Name: ${patient.patientName}
Age: ${patient.patientAge}
Gender: ${patient.patientGender}
Mobile: ${patient.patientPhone}
Location: ${patient.location || "Not recorded"}
Primary Complaint: ${patient.primaryComplaint || "None"}
Physician Reason: ${patient.physicianReason || "None"}
BP: ${patient.bp || "Not recorded"}
RBS: ${patient.rbs || "Not recorded"}
Medications: ${patient.medications || "None"}
Conditions: ${patient.conditions || "None"}
Allergies: ${patient.allergies || "None"}
`;

    const labsInfo = labs
      .map(
        (l, idx) => `
Lab Test #${idx + 1}:
Test Type: ${l.labType}
Status: ${l.status}
Notes: ${l.finalReportNotes || "None"}
Results: ${l.testResults ? l.testResults.map((r) => `${r.name}: ${r.value} ${r.unit} (Ref: ${r.referenceRange})`).join(", ") : "None"}
`,
      )
      .join("\n");

    const scansInfo = scans
      .map(
        (s, idx) => `
Scan Test #${idx + 1}:
Scan Type: ${s.scanType}
Status: ${s.status}
Findings/Notes: ${s.finalReportNotes || "None"}
`,
      )
      .join("\n");

    const prescriptionsInfo = prescriptions
      .map(
        (p, idx) => `
Prescription #${idx + 1}:
Prescribed By: Dr. ${p.doctorName}
Status: ${p.dispenseStatus}
Medicines: ${p.medicinesData ? p.medicinesData.map((m) => `${m.medication} - Dosage: ${m.dosage}, Days: ${m.days} (${m.morning}-${m.afternoon}-${m.night})`).join("; ") : "None"}
`,
      )
      .join("\n");

    const prompt = `
Generate a comprehensive clinical health summary/report for the following patient based on their entire medical history records.

PATIENT BASIC DETAILS:
${patientInfo}

LAB REPORTS:
${labsInfo || "No lab reports found."}

SCAN REPORTS:
${scansInfo || "No scan reports found."}

PRESCRIPTIONS/MEDICATIONS:
${prescriptionsInfo || "No prescriptions found."}

Please format the response nicely as a markdown document with the following structure:
1. Executive Health Summary (2-3 sentences overview)
2. Detailed Clinical Findings (synthesize lab and scan findings if any)
3. Current Treatment & Medications Review (assess the prescriptions and overall regimen)
4. Key Recommendations & Follow-ups (what tests or consultations should be next)
5. Patient-friendly Explanation (simplified version)

Include a clinical disclaimer at the bottom stating that this report is AI-generated for clinical assistance and must be verified by a medical doctor.
`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const aiReportText = result.response.text();

    res.status(200).json({
      success: true,
      report: aiReportText,
    });
  } catch (error) {
    console.error("AI Report Generation Error:", error);
    res.status(500).json({ message: "Failed to generate AI report" });
  }
};

export const analyzeDocumentController = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Fetch all records and use the last object data
    const allLabs = await LabPrescription.find({
      $or: [{ PHN_ID: patientId }, { patientId: patientId }],
      finalReportFileUrl: { $ne: "", $exists: true },
    });
    const labs = allLabs.length > 0 ? [allLabs[allLabs.length - 1]] : [];

    const allScans = await ScanPrescription.find({
      $or: [{ PHN_ID: patientId }, { patientId: patientId }],
      finalReportFileUrl: { $ne: "", $exists: true },
    });
    const scans = allScans.length > 0 ? [allScans[allScans.length - 1]] : [];

    const assessment = await PhysicianAssessment.find({
      patientId,
      isDeleted: false,
    })
      .sort({ _id: -1 })
      .limit(1);

    let vitalsString = "No recent vitals available.";
    if (
      assessment &&
      assessment.length > 0 &&
      assessment[0].vitals &&
      assessment[0].vitals.length > 0
    ) {
      const latestVitals =
        assessment[0].vitals[assessment[0].vitals.length - 1];
      vitalsString = `Temperature: ${latestVitals.temperature || "N/A"}, Pulse Rate: ${latestVitals.pulseRate || "N/A"}, Respiratory Rate: ${latestVitals.respiratoryRate || "N/A"}, Blood Pressure: ${latestVitals.bloodPressure || "N/A"}, SpO2: ${latestVitals.spO2 || "N/A"}, Height: ${latestVitals.height || "N/A"}, Weight: ${latestVitals.weight || "N/A"}, BMI: ${latestVitals.bmi || "N/A"}, Blood Sugar (Fasting): ${latestVitals.bloodSugarFasting || "N/A"}, Blood Sugar (After Food): ${latestVitals.bloodSugarAfterFood || "N/A"}`;
    }

    let labTestString = "No previous lab test results available.";
    if (
      labs &&
      labs.length > 0 &&
      labs[0].testResults &&
      labs[0].testResults.length > 0
    ) {
      labTestString = labs[0].testResults
        .map(
          (tr) =>
            `- ${tr.name || "N/A"}: ${tr.value || "N/A"} ${tr.unit || ""} (Reference: ${tr.referenceRange || "N/A"})`,
        )
        .join("\n");
    }

    const reportsToProcess = [...labs, ...scans];

    if (reportsToProcess.length === 0) {
      return res
        .status(404)
        .json({ message: "No lab or scan reports found for this patient" });
    }

    const files = [];

    for (const report of reportsToProcess) {
      if (!report.finalReportFileUrl) continue;

      const fileUrl = report.finalReportFileUrl;
      const fileName = path.basename(fileUrl);

      let possiblePath1 = path.join(
        process.cwd(),
        "public",
        "upload",
        "lab-documents",
        fileName,
      );
      let possiblePath2 = path.join(
        process.cwd(),
        "public",
        "upload",
        "scan-documents",
        fileName,
      );
      let possiblePath3 = path.join(
        process.cwd(),
        "public",
        "uploads",
        "lab-documents",
        fileName,
      );

      let filePath = null;
      if (fs.existsSync(possiblePath1)) filePath = possiblePath1;
      else if (fs.existsSync(possiblePath2)) filePath = possiblePath2;
      else if (fs.existsSync(possiblePath3)) filePath = possiblePath3;

      if (!filePath) {
        let rawPath = path.join(
          process.cwd(),
          "public",
          fileUrl.replace("/uploads", "/upload"),
        );
        if (fs.existsSync(rawPath)) filePath = rawPath;
      }

      if (filePath) {
        files.push({
          path: filePath,
          mimetype: filePath.endsWith(".png")
            ? "image/png"
            : filePath.endsWith(".pdf")
              ? "application/pdf"
              : filePath.endsWith(".dcm")
                ? "application/dicom"
                : "image/jpeg",
          originalname: fileName,
        });
      }
    }

    if (files.length === 0) {
      return res
        .status(404)
        .json({ message: "Physical report files not found on server" });
    }

    const customPrompt = `
You are a highly skilled AI Medical Assistant. Analyze the provided medical document image for patient: ${patient.patientName} (Age: ${patient.patientAge || "Unknown"}, Gender: ${patient.patientGender || "Unknown"}).

Patient's latest vital signs for clinical context:
${vitalsString}

Patient's latest documented lab test subdivisions/results for clinical context:
${labTestString}

You must respond ONLY with a strictly formatted JSON array. Do not wrap the JSON in markdown code blocks.
The JSON array should contain objects representing the extracted tests.
Use the following exact schema:

[
    {
        "test": "blood test", // Use "blood test" for lab reports
        "data": [
            {
                "test_name": "Hemoglobin",
                "value": "12",
                "unit": "gm/dl",
                "reference_range": "13.5-17.5",
                "result": "",
                "flag": "high", // Must be one of: "normal", "high", "low", "critical"
                "patient_understandable_solution": "Brief patient-friendly explanation and simple actionable advice.",
                "treatment_suggestion": "Specific medicine or clinical treatment suggestions to resolve the issue."
            }
        ]
    },
    {
        "test": "vitals analysis", // IMPORTANT: Also evaluate the patient's vital signs and output them here
        "data": [
            {
                "test_name": "Pulse Rate",
                "value": "120",
                "unit": "bpm",
                "reference_range": "60-100",
                "result": "",
                "flag": "high", // Must be one of: "normal", "high", "low", "critical"
                "patient_understandable_solution": "Brief patient-friendly explanation and simple actionable advice.",
                "treatment_suggestion": "Specific medicine or clinical treatment suggestions to resolve the issue."
            }
        ]
    },
    {
        "test": "x-ray", // Or "ultrasound", "MRI", "scan"
        "data": {
            "impression": "the report is normal",
            "flag": "normal", // Must be one of: "normal", "high", "low", "critical"
            "suggested_next_step": "",
            "patient_friendly_summary": "",
            "patient_understandable_solution": "Brief patient-friendly explanation and simple actionable advice.",
            "treatment_suggestion": "Specific medicine or clinical treatment suggestions to resolve the issue."
        }    
    }
]

Analyze the image carefully and extract all relevant information matching this schema. Ensure the flag logic is clinically accurate.
`;

    let aiReportRaw = await analyzeScanImage(files, customPrompt);
    let aiReportParsed = [];

    // Sanitize the response
    try {
      let sanitized = aiReportRaw.trim();
      if (sanitized.startsWith("```json"))
        sanitized = sanitized.replace(/^```json/, "");
      else if (sanitized.startsWith("```"))
        sanitized = sanitized.replace(/^```/, "");
      if (sanitized.endsWith("```")) sanitized = sanitized.replace(/```$/, "");
      sanitized = sanitized.trim();

      aiReportParsed = JSON.parse(sanitized);
    } catch (parseError) {
      console.error("JSON Parse error from AI:", parseError);
      aiReportParsed = [
        {
          test: "error",
          data: { impression: "AI returned invalid format. Please try again." },
        },
      ];
    }

    return res.status(200).json({
      message: "Patient records analyzed successfully",
      report: aiReportParsed,
    });
  } catch (error) {
    console.error("Analyze Existing Document Error:", error);
    return res
      .status(500)
      .json({
        message: "Failed to analyze patient records",
        error: error.message,
      });
  }
};
