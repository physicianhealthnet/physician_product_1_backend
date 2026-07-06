import TreatmentHistory from "../models/treatmentHistory.model.js";
import PatientRegistration from "../models/patientModel/patientRegistration.model.js";
import PatientDocuments from "../models/patientModel/patientDocuments.model.js";
import TreatmentTracker from "../models/treatmentTracker.model.js";
import SessionNotes from "../models/Sessionnotes.model.js";
import TreatmentBill from "../models/treatmentBill.model.js";
import physicianAssessmentModel from "../models/physicianAssessment.model.js";
import Prescription from "../models/prescription.model.js";
export const createHistoryController = async (req, res) => {
  try {
    const {
      clinicId,
      patientId,
      treatmentId,
      date,
      medicalInformationId,
      billsId,
      patientDocumentId,
      treatmentTrackerId,
      sessionNotesId,
      assessmentId,
      prescriptionId,
    } = req.body;


    // ✅ Proper validation
    if (
      !clinicId ||
      !patientId ||
      !treatmentId ||
      !date ||
      !medicalInformationId
    ) {
      return res.status(400).json({ message: "Mandatory fields are required" });
    }

    // ✅ Update patient registration
    await PatientRegistration.findByIdAndUpdate(medicalInformationId, {
      treatment_status: "history",
    });

    await TreatmentTracker.findByIdAndUpdate(treatmentTrackerId, {
      treatment_status: "history",
      treatment_id: treatmentId,
    });

    billsId.forEach((data) => {
      TreatmentBill.findByIdAndUpdate(data, {
        treatment_id: treatmentId,
        treatment_status: "history",
      });
    });

    patientDocumentId.forEach((data) => {
      PatientDocuments.findByIdAndUpdate(data, {
        treatment_id: treatmentId,
        treatment_status: "history",
      });
    });

    sessionNotesId.forEach((data) => {
      SessionNotes.findByIdAndUpdate(data, {
        treatment_id: treatmentId,
        treatment_status: "history",
      });
    });

    await Promise.all(
      billsId.map((id) => {
        return TreatmentBill.findByIdAndUpdate(id, {
          treatment_id: medicalInformationId,
          treatment_status: "history",
        });
      })
    );
    await Promise.all(
      patientDocumentId.map((id) => {
        return PatientDocuments.findByIdAndUpdate(id, {
          treatment_id: medicalInformationId,
          treatment_status: "history",
        });
      })
    );

    await TreatmentTracker.findByIdAndUpdate(treatmentTrackerId, {
      treatment_id: medicalInformationId,
      treatment_status: "history",
    });

    await Promise.all(
      sessionNotesId.map((id) => {
        return SessionNotes.findByIdAndUpdate(id, {
          treatment_id: medicalInformationId,
          treatment_status: "history",
        });
      })
    );

    await Promise.all(
      prescriptionId.map((data) => {
        return Prescription.findByIdAndUpdate(data, {
          treatment_id: treatmentId,
          treatment_status: "history",
        });
      })
    );

    await PatientRegistration.findByIdAndUpdate(medicalInformationId, {
      treatment_id: medicalInformationId,
      treatment_status: "history",
    });

    await physicianAssessmentModel.findByIdAndUpdate(assessmentId, {
      treatment_id: treatmentId,
      treatment_status: "history",
    });

    // ✅ Create history record
    const history = await TreatmentHistory.create(req.body);

    return res.status(201).json({
      message: "History added successfully",
      history,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getAllMinimalPatientHistoryData = async (req, res) => {
  try {
    const patientRegister = await PatientRegistration.find({
      patientId: req.params.patient_id,
      treatment_status: "history",
      isDeleted: false,
    });
    return res.status(201).json({
      message: "data fetched successfully",
      patientRegister: patientRegister,
    });
  } catch (error) {
    return res.status(404).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getTargetedPatientTargetRegData = async (req, res) => {
  try {
    const targetedId = req.params.id;
    const patientRegData = await PatientRegistration.find({
      treatment_id: targetedId,
      isDeleted: false,
    });
    const treatmentBill = await TreatmentBill.find({
      treatment_id: targetedId,
      isDeleted: false,
    });
    const patientDocuments = await PatientDocuments.find({
      treatment_id: targetedId,
      isDeleted: false,
    });
    const treatmentTracker = await TreatmentTracker.find({
      treatment_id: targetedId,
      isDeleted: false,
    });
    const sessionNotes = await SessionNotes.find({
      treatment_id: targetedId,
      isDeleted: false,
    });
    const assessmentData = await physicianAssessmentModel.find({
      treatment_id: targetedId,
      isDeleted: false,
    });
    const prescriptionData = await Prescription.find({
      treatment_id: targetedId,
      isDeleted: false,
    });
    return res.status(200).json({
      message: "data fetched successfully",
      patientRegdata: patientRegData?.[0],
      treatmentBill: treatmentBill,
      patientDocuments: patientDocuments,
      treatmentTracker: treatmentTracker,
      sessionNotes: sessionNotes,
      assessmentData: assessmentData,
      prescriptionData: prescriptionData,
    });
  } catch (error) {
    return res.status(404).json({
      message: "Server error",
      error: error.message,
    });
  }
};
