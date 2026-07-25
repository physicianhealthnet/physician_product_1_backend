import LabPrescription from "../models/labPrescription.model.js";
import Patient from "../models/patientModel/patient.model.js";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import { handleWhatsAppNotification } from "../utils/notification.helper.js";
import { analyzeLabResults } from "../utils/aiLabHelper.js";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Seed Mock Data - Helper endpoint
export const createMockLabPrescriptions = async (req, res) => {
  try {
    const mockData = [
      { prescriptionId: "PR-L-100", patientId: "P-100", clinicId: "C-1", ptrName: "Rahul Sharma", ptNo: "PT-1001", drName: "Dr. Ananya", labType: "Complete Blood Count (CBC)", labCenter: "Internal", priority: "High", status: "Not Scheduled", appointmentDateTime: null },
      { prescriptionId: "PR-L-101", patientId: "P-101", clinicId: "C-1", ptrName: "Sneha Patel", ptNo: "PT-1002", drName: "Dr. Vikram", labType: "Urine Test", labCenter: "External", priority: "Medium", status: "Missing", appointmentDateTime: null },
      { prescriptionId: "PR-L-102", patientId: "P-102", clinicId: "C-1", ptrName: "Amit Kumar", ptNo: "PT-1003", drName: "Dr. Ananya", labType: "Lipid Profile", labCenter: "Internal", priority: "Low", status: "Completed", appointmentDateTime: dayjs().subtract(1, 'day').toDate() },
      { prescriptionId: "PR-L-103", patientId: "P-103", clinicId: "C-1", ptrName: "Pooja Verma", ptNo: "PT-1004", drName: "Dr. Rajesh", labType: "Thyroid Panel", labCenter: "Internal", priority: "Medium", status: "Report Not Ready", appointmentDateTime: dayjs().toDate() },
      { prescriptionId: "PR-L-104", patientId: "P-104", clinicId: "C-1", ptrName: "Karan Johar", ptNo: "PT-1005", drName: "Dr. Ananya", labType: "Blood Glucose Fasting", labCenter: "Internal", priority: "High", status: "Not Reviewed", appointmentDateTime: dayjs().subtract(2, 'hour').toDate() },
      { prescriptionId: "PR-L-105", patientId: "P-105", clinicId: "C-1", ptrName: "Ritu Desai", ptNo: "PT-1006", drName: "Dr. Vikram", labType: "Liver Function Test", labCenter: "External", priority: "Low", status: "Scheduled", appointmentDateTime: dayjs().add(2, 'hour').toDate() },
    ];
    await LabPrescription.insertMany(mockData);
    res.status(201).json({ success: true, message: "Mock lab prescriptions generated." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a real lab prescription
export const createLabPrescription = async (req, res) => {
  try {
    const { pdfBase64, ...labData } = req.body;

    // Resolve PHN_ID from Patient model if missing in payload
    if (!labData.PHN_ID && labData.patientId) {
      const patientDoc = await Patient.findOne({ patientId: labData.patientId });
      if (patientDoc && patientDoc.PHN_ID) {
        labData.PHN_ID = patientDoc.PHN_ID;
      }
    }

    const lab = new LabPrescription(labData);
    await lab.save();

    // Send Notification
    handleWhatsAppNotification(
      req,
      lab,
      { patientId: lab.patientId, PHN_ID: lab.PHN_ID, ptNo: lab.ptNo },
      "lab_prescription"
    ).catch(err => console.error("Lab Notification Error:", err.message));

    res.status(201).json({ success: true, data: lab });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Fetch prescriptions mapped by an array of statuses (for our dynamic frontend tabs)
export const getLabPrescriptionsByStatus = async (req, res) => {
  try {
    const { statuses } = req.body; // array
    if (!statuses || statuses.length === 0) {
      const all = await LabPrescription.find({
        isDeleted: false,
        $and: [
          { $or: [{ isBilled: true }, { status: { $ne: "Not Scheduled" } }] }
        ]
      });
      return res.status(200).json({ success: true, count: all.length, data: all });
    }

    const filtered = await LabPrescription.find({
      status: { $in: statuses },
      isDeleted: false
    }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLabStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, appointmentDateTime, priority } = req.body;
    const updated = await LabPrescription.findByIdAndUpdate(id, {
      ...(status && { status }),
      ...(appointmentDateTime !== undefined && { appointmentDateTime }),
      ...(priority && { priority })
    }, { new: true });
    
    if (!updated) return res.status(404).json({ success: false, message: "Lab request not found" });

    // Trigger Notification based on status
    if (status === "Scheduled") {
      handleWhatsAppNotification(req, updated, { patientId: updated.patientId, PHN_ID: updated.PHN_ID, ptNo: updated.ptNo }, "lab_appointment").catch(err => console.error("Lab Confirmed Notification Error:", err.message));
    } else if (status === "Completed") {
      handleWhatsAppNotification(req, updated, { patientId: updated.patientId, PHN_ID: updated.PHN_ID, ptNo: updated.ptNo }, "lab_appointment_complete").catch(err => console.error("Lab Completed Notification Error:", err.message));
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLabPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    let payload = { ...req.body };
    
    // Process attached report files if present
    if (req.files) {
      if (req.files.labReportFile && req.files.labReportFile[0]) {
        payload.finalReportFileUrl = `/uploads/lab-documents/${req.files.labReportFile[0].filename}`;
      }
      if (req.files.ultrasoundFile && req.files.ultrasoundFile[0]) {
        payload.ultrasoundImgUrl = `/uploads/lab-documents/${req.files.ultrasoundFile[0].filename}`;
      }
    }

    // Parse testResults if sent as string (FormData)
    if (payload.testResults && typeof payload.testResults === 'string') {
      try {
        payload.testResults = JSON.parse(payload.testResults);
      } catch (e) {
        console.error("Failed to parse testResults:", e);
      }
    }

    const updated = await LabPrescription.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Lab request not found" });

    // Trigger Report Ready notification if a file was uploaded
    if (req.files && req.files.labReportFile && req.files.labReportFile[0]) {
      handleWhatsAppNotification(req, updated, { patientId: updated.patientId, PHN_ID: updated.PHN_ID, ptNo: updated.ptNo }, "lab_report").catch(err => console.error("Lab Report Ready Notification Error:", err.message));
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateAIReportForLab = async (req, res) => {
  try {
    const { id } = req.params;
    const { customPrompt } = req.body;
    const lab = await LabPrescription.findById(id);

    if (!lab) {
      return res.status(404).json({ success: false, message: "Lab request not found" });
    }

    if (!lab.testResults || lab.testResults.length === 0) {
      return res.status(400).json({ success: false, message: "No structured lab data found to analyze" });
    }

    const report = await analyzeLabResults(lab.testResults, lab.labType, customPrompt);

    lab.finalReportNotes = report;
    await lab.save();

    res.status(200).json({ success: true, data: lab });
  } catch (error) {
    console.error("Generate AI Lab Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLabPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    // Perform soft delete
    const deleted = await LabPrescription.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!deleted) return res.status(404).json({ success: false, message: "Lab request not found" });
    res.status(200).json({ success: true, message: "Lab request deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLabPrescriptionsByPatient = async (req, res) => {
  try {
    const { id } = req.params; // Often ptNo or patient objectId
    const labs = await LabPrescription.find({
      $or: [{ PHN_ID: id }, { patientId: id }],
      isDeleted: false
    }).sort({ createdAt: -1 });
    console.log("labs", labs);

    res.status(200).json({ success: true, data: labs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Master Analytics Endpoint
export const getLabDashboardStats = async (req, res) => {
  try {
    const allLabs = await LabPrescription.find({
      isDeleted: false,
      $and: [
        { $or: [{ isBilled: true }, { status: { $ne: "Not Scheduled" } }] }
      ]
    });

    let stats = {
      todayTotal: 0, morning: 0, afternoon: 0, evening: 0,
      createdToday: 0, yesterday: 0, thisWeek: 0, thisMonth: 0, last3Months: 0,
      notScheduled: 0, missing: 0, reportNotReady: 0, notReviewed: 0, scheduled: 0
    };

    const today = dayjs();
    const startOfToday = today.startOf("day");
    const endOfToday = today.endOf("day");
    const yesterdayStart = today.subtract(1, "day").startOf("day");
    const yesterdayEnd = today.subtract(1, "day").endOf("day");
    const startOfWeek = today.startOf("week");
    const endOfWeek = today.endOf("week");
    const startOfMonth = today.startOf("month");
    const endOfMonth = today.endOf("month");
    const startOf3Months = today.subtract(3, "month").startOf("day");

    allLabs.forEach((lab) => {
      // Pipeline Buckets
      if (lab.status === "Not Scheduled") stats.notScheduled++;
      if (lab.status === "Missing") stats.missing++;
      if (lab.status === "Report Not Ready") stats.reportNotReady++;
      if (lab.status === "Not Reviewed") stats.notReviewed++;
      if (lab.status === "Scheduled") stats.scheduled++;

      const createdDate = dayjs(lab.createdAt);
      const apptDate = lab.appointmentDateTime ? dayjs(lab.appointmentDateTime) : null;

      // Track by creation date for Historicals
      if (createdDate.isSameOrAfter(startOfToday) && createdDate.isSameOrBefore(endOfToday)) stats.createdToday++;
      if (createdDate.isSameOrAfter(yesterdayStart) && createdDate.isSameOrBefore(yesterdayEnd)) stats.yesterday++;
      if (createdDate.isSameOrAfter(startOfWeek) && createdDate.isSameOrBefore(endOfWeek)) stats.thisWeek++;
      if (createdDate.isSameOrAfter(startOfMonth) && createdDate.isSameOrBefore(endOfMonth)) stats.thisMonth++;
      if (createdDate.isSameOrAfter(startOf3Months)) stats.last3Months++;

      // Track by Appointment Date for Today's traffic (if scheduled/active)
      if (apptDate && apptDate.isSameOrAfter(startOfToday) && apptDate.isSameOrBefore(endOfToday)) {
        stats.todayTotal++;
        const hour = apptDate.hour();
        if (hour >= 6 && hour < 12) stats.morning++;
        else if (hour >= 12 && hour < 16) stats.afternoon++;
        else if (hour >= 16) stats.evening++;
      }
    });

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
