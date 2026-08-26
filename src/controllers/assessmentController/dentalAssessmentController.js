import DentalAssessment from "../../models/dentalAssessment.model.js";

// @desc    Create new Dental Assessment
// @route   POST /api/dental-assessment/create
export const createDentalAssessment = async (req, res) => {
  console.log("createDentalAssessment payload:", req.body);
  try {
    const assessment = await DentalAssessment.create(req.body);
    res.status(201).json({
      success: true,
      message: "Dental assessment created successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("Error creating dental assessment:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update existing Dental Assessment
// @route   PATCH /api/dental-assessment/update/:id
export const updateDentalAssessment = async (req, res) => {
  try {
    const assessment = await DentalAssessment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Dental assessment updated successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("Error updating dental assessment:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get all Dental Assessments for a Patient
// @route   GET /api/dental-assessment/get-by-patient/:patientId
export const getDentalAssessmentsByPatientId = async (req, res) => {
  try {
    const assessments = await DentalAssessment.find({
      patientId: req.params.patientId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: assessments.length > 0 ? assessments[0] : null,
      history: assessments,
    });
  } catch (error) {
    console.error("Error fetching dental assessments:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
