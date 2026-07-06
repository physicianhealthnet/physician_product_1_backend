import clinicData from "../models/clinics.model.js";
import { createDBService } from "../services/db.service.js";

const clinicService = createDBService(clinicData); // create it inline

export const createClinic = async (req, res) => {
  try {
    const { clinicName } = req.body;
    if (!clinicName) {
      return res.staus(400).json({ message: "please provide all the fields" });
    }

    // Count existing clinics of this type
    const count = await clinicData.countDocuments();

    // Create new clinicID based on count
    const clinicId = `PHN-C-${count + 1}`;

    const newClinic = await clinicService.create({
      ...req.body,
      clinicId,
    });

    return res
      .status(201)
      .json({ message: "Clinic created successfully", newClinic });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating clinic", error: error.message });
  }
};

export const getAllCLinics = async (req, res) => {
  try {
    const clinic = await clinicService.getAllData();
    if (!clinic || clinic.length === 0) {
      return res.status(404).json({ message: "No clinics found" });
    }
    return res
      .status(200)
      .json({ message: "Clinics retrieved successfully", clinic });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error getting clinics", error: error.message });
  }
};
