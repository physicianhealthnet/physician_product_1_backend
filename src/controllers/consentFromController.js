import ConsentFrom from "../models/consentFrom.model.js";
import { createDBService } from "../services/db.service.js";

const consentFromService = createDBService(ConsentFrom);

export const createConsentFromController = async (req, res) => {
  try {
    const { clinicId, patientId } = req.body;
    if (!clinicId || !patientId) {
      return res.status(400).json({
        message: "Clinic ID and Patient ID are required",
      });
    }
    const existingConsent = await consentFromService.getOne({
      clinicId,
      patientId,
      isDeleted: false,
    });
    if (existingConsent) {
      return res.status(400).json({
        message: "Consent from already exists for this clinic and patient",
      });
    }
    const newConsent = await consentFromService.create(req.body);
    return res.status(201).json({
      message: "Consent from created successfully",
      data: newConsent,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getByPatientIdController = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }
    const patient = await consentFromService.getOne({
      patientId,
      isDeleted: false,
    });
    return res.status(200).json({
      message: "Consent from fetched successfully",
      data: patient,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const updateConsentFromController = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedConsent = await consentFromService.update(id, req.body);
    return res.status(200).json({
      message: "Consent from updated successfully",
      data: updatedConsent,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};