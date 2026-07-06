import PatientRegistration from "../../models/patientModel/patientRegistration.model.js";
import Patient from "../../models/patientModel/patient.model.js";
import { createDBService } from "../../services/db.service.js";

const patientRegistrationService = createDBService(PatientRegistration);

// export const createPatientRegistrationController = async (req, res) => {
//   try {
//     const { clinicId, patientId } = req.body;

//     if (!clinicId || !patientId) {
//       return res.status(400).json({
//         message: "Clinic ID and Patient ID are required",
//       });
//     }
//     const newRegistration = new PatientRegistration({
//       ...req.body,
//       treatment_status: "live",
//     });
//     await newRegistration.save();
//     return res.status(201).json({
//       message: "Patient registration created successfully",
//       data: newRegistration,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       message: "Server error",
//       error: err.message,
//     });
//   }
// };

export const createPatientRegistrationController = async (req,res) => {
  try{
    const patientData = req.body
    console.log(patientData);
    
  }catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
}

export const getByPatientIdController = async (req, res) => {
  try {
    const { patientId } = req.params; // Use query params to get patientId

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const patient = await patientRegistrationService.getOne({
      patientId,
      treatment_status: "live",
    });

    if (!patient) {
      return res.status(404).json({ status: 404, message: "data not found" });
    }

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

export const getAllRegistrationsForTaqrgetedPatientController = async (
  req,
  res
) => {
  try {
    const { patientId } = req.params; // Use query params to get patientId

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const patients = await patientRegistrationService.getAll({
      patientId,
      treatment_status: "live",
    });

    if (!patients || patients.length === 0) {
      return res
        .status(404)
        .json({ message: "No registrations found for this patient" });
    }

    return res.status(200).json({
      message: "Patient registrations fetched successfully",
      patients,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const editPatientRegistRationController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const updatedPatient = await patientRegistrationService.update(
      id,
      updateData,
    ); // ✅ pass raw string

    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
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

export const syncPatientRegistrationController = async (req, res) => {
  try {
    const { clinicId, PHN_ID, name, email, phone } = req.body;

    if (!clinicId || !PHN_ID) {
      return res.status(400).json({ message: "Clinic ID and PHN_ID are required" });
    }

    // 1. Find or Update Patient in "patients" collection (Primary source for clinic)
    let patient = await Patient.findOne({ clinicId, PHN_ID });

    if (!patient && (email || phone)) {
      // Try finding by email or phone
      const query = { clinicId, isDeleted: false };
      if (email && phone) {
        query.$or = [{ patientEmail: email }, { patientPhone: phone }];
      } else if (email) {
        query.patientEmail = email;
      } else {
        query.patientPhone = phone;
      }
      patient = await Patient.findOne(query);
      if (patient) {
        patient.PHN_ID = PHN_ID;
        await patient.save();
      }
    }

    if (!patient) {
      // Create new Patient in "patients" collection
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const latestPatientThisYear = await Patient.findOne({
        patientId: { $regex: `^${currentYear}-` },
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .select("patientId");

      let nextPatientNumber = 1;
      if (latestPatientThisYear && latestPatientThisYear.patientId) {
        const splitId = latestPatientThisYear.patientId.split("-");
        const number = parseInt(splitId[2], 10);
        if (!isNaN(number)) {
          nextPatientNumber = number + 1;
        }
      }

      const paddedNumber = String(nextPatientNumber).padStart(3, '0');
      const patientId = `${currentYear}-${currentMonth}-${paddedNumber}`;
      patient = new Patient({
        clinicId,
        patientId,
        PHN_ID,
        patientName: name,
        patientEmail: email,
        patientPhone: phone,
        treatment_status: "live"
      });
      await patient.save();
    }

    const localPatientId = patient.patientId;

    // 2. Sync with "patientregistrations" collection for backward compatibility/details
    let registration = await PatientRegistration.findOne({ clinicId, patientId: localPatientId });
    if (!registration) {
      registration = new PatientRegistration({
        clinicId,
        patientId: localPatientId,
        PHN_ID,
        patientName: name,
        patientEmail: email,
        patientPhone: phone,
        treatment_status: "live"
      });
    } else {
      registration.PHN_ID = PHN_ID;
      registration.patientName = name || registration.patientName;
      registration.patientEmail = email || registration.patientEmail;
      registration.patientPhone = phone || registration.patientPhone;
    }
    await registration.save();

    return res.status(200).json({
      message: "Patient synced successfully",
      patient: {
        ...patient?._doc,
        patientId: localPatientId // Ensure we return the clinic patientId
      }
    });
  } catch (err) {
    console.error("Sync error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}

