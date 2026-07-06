import { createDBService } from "../services/db.service.js";
import TreatmentBill from "../models/treatmentBill.model.js";
import { handleWhatsAppNotification } from "../utils/notification.helper.js";

const treatmentBillService = createDBService(TreatmentBill);

export const addTreatmentBillController = async (req, res) => {
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Get latest patientId and increment
  const latestBill = await TreatmentBill.findOne({ isDeleted: false })
    .sort({ createdAt: -1 })
    .select("treatmentBillId");

  let nextPatientNumber = 1;
  if (latestBill && latestBill.treatmentBillId) {
    const splitId = latestBill.treatmentBillId.split("V");
    const number = parseInt(splitId[1]);
    if (!isNaN(number)) {
      nextPatientNumber = number + 1;
    }
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const dd = String(today.getDate()).padStart(2, "0");

  const formattedDate = `${yyyy}${mm}${dd}`;

  req.body.treatmentBillId = `PT${formattedDate}-INV${nextPatientNumber}`;

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  try {
    const { pdfBase64, ...billData } = req.body;
    const treatmentBill = await treatmentBillService.create({
      ...billData,
      treatment_status: "live",
    });

    // Send Notification
    handleWhatsAppNotification(
      req,
      treatmentBill,
      { patientId: treatmentBill.patientId },
      "bill",
      [treatmentBill.grandTotal]
    ).catch(err => console.error("Bill Notification Error:", err.message));

    return res.status(201).json({
      message: "Treatment bill added successfully",
      treatmentBill,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getTreatmentBillController = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }
    const patient = await treatmentBillService.getAll({
      patientId,
      treatment_status: "live",
      isDeleted: false,
    });
    return res.status(200).json({
      message: "Treatment bill fetched successfully",
      data: patient,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getTreatmentBillControllerByPhnId = async (req, res) => {
  try {
    const { patientPHNId } = req.params;
    if (!patientPHNId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }
    const patient = await treatmentBillService.getAll({
      patientPHNId,
      treatment_status: "live",
      isDeleted: false,
    });
    return res.status(200).json({
      message: "Treatment bill fetched successfully",
      data: patient,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const updateTreatmentBillController = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTreatmentBill = await treatmentBillService.update(
      id,
      req.body
    );
    return res.status(200).json({
      message: "Treatment bill updated successfully",
      data: updatedTreatmentBill,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAllTreatmentBillController = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const treatmentBill = await treatmentBillService.getAll({
      clinicId,
      isDeleted: false,
    });
    return res.status(200).json({
      message: "Treatment bill fetched successfully",
      data: treatmentBill,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAllClinicTreatmentBillController = async (req, res) => {
  try {
    const treatmentBill = await treatmentBillService.getAll({
      isDeleted: false,
    });
    return res.status(200).json({
      message: "Treatment bill fetched successfully",
      data: treatmentBill,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const deleteTreatmentBillController = async (req, res) => {
  try {
    const { id } = req.params;
    await treatmentBillService.update(id, { isDeleted: true });
    return res.status(200).json({
      message: "Treatment bill deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
