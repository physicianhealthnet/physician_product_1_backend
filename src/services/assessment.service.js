export const createAssessment = (service) => async (req, res) => {
 
  try {
    const { clinicId, patientId } = req.body;
    if (!clinicId || !patientId) {
      return res.status(400).json({
        message: "Clinic ID and Patient ID are required",
      });
    }

    // const existing = await service.getOne({ clinicId, patientId });
    // if (existing) {
    //   return res.status(400).json({
    //     message: "Assessment already exists for this clinic and patient",
    //   });
    // }

    const assessment = await service.create({
      ...req.body,
      treatment_status: "live",
    });
    return res.status(201).json({
      message: "Assessment created successfully",
      assessment,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAssessmentByPatientId = (service) => async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const data = await service.getOne({ patientId, treatment_status: "live" });
    return res.status(200).json({
      message: "Assessment fetched successfully",
      data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const updateAssessmentById = (service) => async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Object ID is required" });
    }

    const updated = await service.update(id, req.body);
    return res.status(200).json({
      message: "Assessment updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
