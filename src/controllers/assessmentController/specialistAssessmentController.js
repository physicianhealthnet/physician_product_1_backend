import SpecialistAssessment from "../../models/specialistAssessment.model.js";

// CREATE
export const createSpecialistAssessment = async (req, res) => {
  try {
    const assessment = await SpecialistAssessment.create(req.body);
    res.status(201).json({
      success: true,
      message: "Specialist assessment created successfully",
      data: assessment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE
export const updateSpecialistAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await SpecialistAssessment.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Specialist assessment not found" });
    }

    res.json({
      success: true,
      message: "Specialist assessment updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE (soft delete)
export const deleteSpecialistAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SpecialistAssessment.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Specialist assessment not found" });
    }

    res.json({
      success: true,
      message: "Specialist assessment deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET BY ID
export const getSpecialistAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await SpecialistAssessment.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!assessment) {
      return res
        .status(404)
        .json({ success: false, message: "Specialist assessment not found" });
    }

    res.json({
      success: true,
      data: assessment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET BY PATIENT ID
export const getSpecialistAssessmentsByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;
    const assessments = await SpecialistAssessment.find({
      patientId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

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

// GET BY PATIENT ID AND DEPARTMENT
export const getSpecialistAssessmentsByPatientAndDept = async (req, res) => {
  try {
    const { patientId, department } = req.params;
    const assessments = await SpecialistAssessment.find({
      patientId,
      department,
      isDeleted: false,
    }).sort({ createdAt: -1 });

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

// GET ALL
export const getAllSpecialistAssessments = async (req, res) => {
  try {
    const assessments = await SpecialistAssessment.find({
      isDeleted: false,
    }).sort({ createdAt: -1 });

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
