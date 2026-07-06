import preloadPrescriptionModel from "../models/preloadPrescription.model.js";

export const createData = async (req, res) => {
  try {
    const data = req.body;

    const existTitleAndAge = await preloadPrescriptionModel.findOne({
      title: data.title,
      isDeleted: false,
    });

    if (existTitleAndAge) {
      return res.status(409).json({ message: "Data Already Exists" });
    }

    const createdData = await preloadPrescriptionModel.create(req.body);

    return res
      .status(201)
      .json({ message: "Added Successfully", data: createdData });
  } catch (error) {
    return res.status(500).json({
      message: error,
    });
  }
};

export const getAllTitle = async (req, res) => {
  try {
    const titles = await preloadPrescriptionModel
      .find({ isDeleted: false })
      .select("title");

    const filterData = titles.reduce((acc, curr) => {
      if (!acc.some((item) => item.title === curr.title)) {
        acc.push(curr);
      }

      return acc;
    }, []);

    return res
      .status(200)
      .json({ message: "Fetched Successfully", data: filterData });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllData = async (req, res) => {
  try {
    const data = await preloadPrescriptionModel.find({ isDeleted: false });
    return res
      .status(200)
      .json({ message: "data fetched successfully", data: data });
  } catch (error) {
    return res.status(500).json({ message: error });
  }
};

export const updateData = async (req, res) => {
  try {
    const updateId = req.params.id;
    const data = req.body;

    // Validate ID (basic check; use a library like mongoose.Types.ObjectId.isValid for stricter validation)
    if (!updateId) {
      return res.status(400).json({ message: "Invalid or missing ID" });
    }

    // Use await and { new: true } to return the updated document
    const updateData = await preloadPrescriptionModel.findByIdAndUpdate(
      updateId,
      data,
      { new: true, runValidators: true } // new: true returns updated doc; runValidators ensures schema validation
    );

    // Check if document was found and updated
    if (!updateData) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res
      .status(200)
      .json({ message: "Updated successfully", data: updateData });
  } catch (error) {
    console.error("Update error:", error); // Log full error for debugging
    return res.status(500).json({ message: error.message }); // Send only message for security
  }
};

export const deleteData = async (req, res) => {
  try {
    const deleteId = req.params.id;

    if (!deleteId) {
      return res.status(400).json({ message: "Invalid or missing ID" });
    }

    const deletedData = await preloadPrescriptionModel.findByIdAndUpdate(
      deleteId,
      { isDeleted: true },
      { new: true }
    );

    if (!deletedData) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res
      .status(200)
      .json({ message: "Deleted successfully", data: deletedData });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ message: error.message });
  }
};
