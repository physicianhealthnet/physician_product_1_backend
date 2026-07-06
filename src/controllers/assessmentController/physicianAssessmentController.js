// controllers/physicianAssessmentController.js
import PhysicianAssessment from "../../models/physicianAssessment.model.js";
import Patient from "../../models/patientModel/patient.model.js";
import ScanPrescription from "../../models/scanPrescription.model.js";
import LabPrescription from "../../models/labPrescription.model.js";
import Prescription from "../../models/prescription.model.js";
import { randomUUID } from "crypto";

const generateRequestsFromDiagnoses = async (
  diagnoses,
  clinicId,
  patientId,
) => {
  if (!diagnoses || diagnoses.length === 0) return;

  const patient = await Patient.findOne({
    $or: [{ patientId: patientId }, { PHN_ID: patientId }],
  });
  if (!patient) return; // Cannot generate without patient details

  const baseData = {
    PHN_ID: patient.PHN_ID,
    patientId: patient.patientId,
    clinicId: clinicId,
    ptrName: patient.patientName,
    ptNo: patient.patientId,
  };

  for (const diag of diagnoses) {
    const drName = diag.doctorName || "Doctor";
    const doctorId = diag.doctorId || "";

    // Generate Scan Requests
    const scanTypes = [];
    if (diag.xrayGiven === "Yes") scanTypes.push("X-Ray");
    if (diag.ctScanGiven === "Yes") scanTypes.push("CT-Scan");
    if (diag.mriGiven === "Yes") scanTypes.push("MRI");

    for (const scanType of scanTypes) {
      await ScanPrescription.create({
        ...baseData,
        prescriptionId: `SC-${Date.now()}-${randomUUID().slice(0, 8)}`,
        drName,
        doctorId,
        scanType,
      });
    }

    // Generate Lab Request
    if (diag.bloodTestGiven === "Yes") {
      await LabPrescription.create({
        ...baseData,
        prescriptionId: `LB-${Date.now()}-${randomUUID().slice(0, 8)}`,
        drName,
        doctorId,
        labType: "Blood Test",
      });
    }

    // Generate Pharmacy Prescription
    if (diag.prescriptionGiven === "Yes") {
      await Prescription.create({
        ...baseData,
        prescriptionId: `PR-${Date.now()}-${randomUUID().slice(0, 8)}`,
        drName,
        doctorId,
        medicationList: [], // Empty list for now
        isRefillable: false,
      });
    }
  }
};

// CREATE
export const createAssessment = async (req, res) => {
  try {
    const assessment = await PhysicianAssessment.create(req.body);

    // Auto-generate requests for all initial diagnoses
    if (assessment.treatment?.diagnosis) {
      await generateRequestsFromDiagnoses(
        assessment.treatment.diagnosis,
        assessment.clinicId,
        assessment.patientId,
      );
    }

    res.status(201).json({
      success: true,
      message: "Assessment created successfully",
      data: assessment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE
export const updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    // Fetch existing first to compare diagnoses length
    const existing = await PhysicianAssessment.findById(id);
    const existingDiagnosesCount = existing?.treatment?.diagnosis?.length || 0;

    const updated = await PhysicianAssessment.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Assessment not found" });

    // Auto-generate requests for ONLY new diagnoses
    const newDiagnosesCount = updated.treatment?.diagnosis?.length || 0;
    if (newDiagnosesCount > existingDiagnosesCount) {
      const newDiagnoses = updated.treatment.diagnosis.slice(
        existingDiagnosesCount,
      );
      await generateRequestsFromDiagnoses(
        newDiagnoses,
        updated.clinicId,
        updated.patientId,
      );
    }

    res.json({
      success: true,
      message: "Updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE
export const deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await PhysicianAssessment.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );

    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Assessment not found" });

    res.json({
      success: true,
      message: "Assessment deleted",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET BY ID
export const getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assessment = await PhysicianAssessment.find({
      patientId: id,
      treatment_status: "live",
      isDeleted: false,
    });

    if (!assessment)
      return res
        .status(404)
        .json({ success: false, message: "Assessment not found" });

    res.json({
      success: true,
      data: assessment?.[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL
export const getAllAssessments = async (req, res) => {
  try {
    const assessments = await PhysicianAssessment.find({
      isDeleted: false,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: assessments.length,
      data: assessments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET BY PATIENT ID
export const getAssessmentsByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;

    const assessments = await PhysicianAssessment.find({
      patientId,
      treatment_status: "live",
      isDeleted: false,
    });

    res.json({
      success: true,
      count: assessments.length,
      data: assessments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET BY PHN ID
export const getAssessmentsByPHNId = async (req, res) => {
  try {
    const { phnId } = req.params;

    const assessments = await PhysicianAssessment.find({
      phnId,
      isDeleted: false,
    });

    console.log(assessments[0],"needed data.........");
    

    res.json({
      success: true,
      count: assessments.length,
      data: assessments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET BY CLINIC ID
export const getAssessmentsByClinicId = async (req, res) => {
  try {
    const { clinicId } = req.params;

    const assessments = await PhysicianAssessment.find({
      clinicId,
      isDeleted: false,
    });

    res.json({
      success: true,
      count: assessments.length,
      data: assessments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllChiefComplaints = async (req, res) => {
  try {
    const allAssessments = await PhysicianAssessment.find({ isDeleted: false });

    // Collect all chief complaints into a single array
    const allComplaints = [];

    allAssessments.forEach((assessment) => {
      if (assessment.chiefComplaints && assessment.chiefComplaints.trim()) {
        allComplaints.push(assessment.chiefComplaints.trim());
      }
    });

    // Remove duplicates
    const uniqueComplaints = [...new Set(allComplaints)];

    return res.status(202).json({
      data: uniqueComplaints,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
