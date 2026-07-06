import Prescription from "../models/prescription.model.js";
import Inventory from "../models/inventory.model.js";
import { randomUUID } from "crypto";
import { handleWhatsAppNotification } from "../utils/notification.helper.js";

export const createPrescription = async (req, res) => {
  try {
    const { pdfBase64, ...data } = req.body;

    // Ensure prescriptionId is generated as it's required
    if (!data.prescriptionId) {
      data.prescriptionId = `PR-${Date.now()}-${randomUUID().slice(0, 8)}`;
    }

    const createdPrescription = await Prescription.create(data);

    // Send Notification
    handleWhatsAppNotification(
      req,
      createdPrescription,
      { patientId: createdPrescription.patientId, ptNo: createdPrescription.ptNo },
      "med_prescription"
    ).catch(err => console.error("Medicine Notification Error:", err.message));

    return res.status(201).json({
      message: "Prescription Created Successfully",
      data: createdPrescription,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPrescriptionsByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;

    const prescriptions = await Prescription.find({
      $or: [{ patientId: patientId }, { ptNo: patientId }],
      treatment_status: "live",
      isDeleted: false,
    });

    return res.status(200).json({
      message: "Prescriptions Fetched Successfully",
      data: prescriptions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!prescription) {
      return res.status(404).json({ message: "Prescription Not Found" });
    }

    return res.status(200).json({
      message: "Prescription Fetched Successfully",
      data: prescription,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPrescriptionsByPHNId = async (req, res) => {
  try {
    const { PHN_ID } = req.params;
    console.log(PHN_ID,"PHN_ID");

    const prescriptions = await Prescription.find({
      PHN_ID: PHN_ID,
      isDeleted: false,
    });
    console.log(prescriptions,"prescriptions");
    

    return res.status(200).json({
      message: "Prescriptions Fetched Successfully",
      data: prescriptions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    console.log(data,"data");
    
    const updatedPrescription = await Prescription.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!updatedPrescription) {
      return res.status(404).json({ message: "Prescription Not Found" });
    }

    return res.status(200).json({
      message: "Prescription Updated Successfully",
      data: updatedPrescription,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPrescription = await Prescription.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!deletedPrescription) {
      return res.status(404).json({ message: "Prescription Not Found" });
    }

    return res
      .status(200)
      .json({ message: "Prescription Deleted Successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const allPrescription = await Prescription.find({
      treatment_id: id,
      treatment_status: "history",
      isDeleted: false,
    });

    if (!allPrescription) {
      return res.status(404).json({ message: "Prescription Not Found" });
    }

    return res.status(200).json({
      data: allPrescription,
      message: "history data fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPrescriptionsForPharmacy = async (req, res) => {
  try {
    const { clinicId } = req.query;
    const query = { isDeleted: false };
    if (clinicId) query.clinicId = clinicId;

    const prescriptions = await Prescription.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Prescriptions Fetched Successfully",
      data: prescriptions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const dispensePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { dispenseData, aiReport } = req.body; // Array of { medication, quantity } and optional aiReport

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: "Prescription Not Found" });
    }

    // Process stock deduction
    for (const item of dispenseData) {
      const inventoryItem = await Inventory.findOne({
        productName: { $regex: new RegExp(`^${item.medication}$`, "i") },
        isDeleted: false,
      });

      if (inventoryItem) {
        if (inventoryItem.productCurrentCount < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${item.medication}. Available: ${inventoryItem.productCurrentCount}`,
          });
        }
        inventoryItem.productCurrentCount -= item.quantity;
        await inventoryItem.save();
      } else {
        // Option: continue or error. Let's warning in log but proceed if others are available?
        // Actually, better to inform user.
        console.warn(`Medication ${item.medication} not found in inventory`);
      }
    }

    // Update prescription status/refill
    if (prescription.isRefillable) {
      prescription.refillCount += 1;
      if (prescription.refillCount >= prescription.refillLimit) {
        prescription.dispenseStatus = "Fully Dispensed";
      } else {
        prescription.dispenseStatus = "Partially Dispensed";
      }
    } else {
      prescription.dispenseStatus = "Fully Dispensed";
    }

    if (aiReport) {
      prescription.aiPharmacyReport = aiReport;
    }
    
    await prescription.save();

    return res.status(200).json({
      message: "Prescription Dispensed Successfully",
      data: prescription,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
