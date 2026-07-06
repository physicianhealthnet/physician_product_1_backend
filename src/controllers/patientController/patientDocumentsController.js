import { port } from "../../config/schemaTypes.js";
import PatientDocuments from "../../models/patientModel/patientDocuments.model.js";
import { createDBService } from "../../services/db.service.js";

const patientDocumentsService = createDBService(PatientDocuments);

export const createPatientDocument = async (req, res) => {
  try {
    const { patientId, documentName, doctorId, doctorName, clinicName, recordDate, documentType } = req.body;

    const documentPath = "/uploads/patient-documents/" + req.file?.filename;
    if (!patientId || !documentName || !documentPath || !req.file) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Removed duplicate check to allow multiple documents with the same name

    const document = await patientDocumentsService.create({
      patientId,
      documentName,
      documentPath,
      doctorId,
      doctorName,
      clinicName,
      recordDate,
      documentType,
      treatment_status: "live",
    });

    res
      .status(201)
      .json({ message: "Document uploaded successfully", document });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getPatientDocumentsByPatientId = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const documents = await patientDocumentsService.getAll({
      patientId,
      treatment_status: "live",
    });
    return res.status(200).json({
      message: "Documents fetched successfully",
      documents,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const editPatientDocumentController = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentName } = req.body;
    const newFile = req.file; // multer single("documentFile")

    if (!id) {
      return res.status(400).json({ message: "Document ID is required" });
    }

    const existingDoc = await patientDocumentsService.getById(id);
    if (!existingDoc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Delete old file if a new one is uploaded
    // if (
    //   newFile &&
    //   existingDoc.documentPath &&
    //   fs.existsSync(existingDoc.documentPath)
    // ) {
    //   fs.unlinkSync(existingDoc.documentPath);
    // }

    const updatedData = {
      documentName: documentName || existingDoc.documentName,
      documentPath: newFile ? newFile.path : existingDoc.documentPath,
    };

    const updatedDocument = await patientDocumentsService.update(
      id,
      updatedData
    );

    return res.status(200).json({
      message: "Document updated successfully",
      document: updatedDocument,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
export const deletePatientDocumentController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Document ID is required" });
    }
    const deletedDocument = await patientDocumentsService.delete(id);
    if (!deletedDocument) {
      return res.status(404).json({ message: "Document not found" });
    }
    return res.status(200).json({
      message: "Document deleted successfully",
      document: deletedDocument,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
