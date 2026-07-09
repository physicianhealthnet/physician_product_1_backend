import fs from "fs";
import path from "path";
import ScanPrescription from "../models/scanPrescription.model.js";
import Patient from "../models/patientModel/patient.model.js";
import { handleWhatsAppNotification } from "../utils/notification.helper.js";
import { convertDicomToPng, analyzeScanImage } from "../utils/aiReportHelper.js";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Seed Mock Data - Helper endpoint
export const createMockScanPrescriptions = async (req, res) => {
  try {
    const mockData = [
      { prescriptionId: "PR-100", patientId: "P-100", clinicId: "C-1", ptrName: "Rahul Sharma", ptNo: "PT-1001", drName: "Dr. Ananya", scanType: "MRI Brain", scanCenter: "Internal", priority: "High", status: "Not Scheduled", appointmentDateTime: null },
      { prescriptionId: "PR-101", patientId: "P-101", clinicId: "C-1", ptrName: "Sneha Patel", ptNo: "PT-1002", drName: "Dr. Vikram", scanType: "CT Scan", scanCenter: "External", priority: "Medium", status: "Missing", appointmentDateTime: null },
      { prescriptionId: "PR-102", patientId: "P-102", clinicId: "C-1", ptrName: "Amit Kumar", ptNo: "PT-1003", drName: "Dr. Ananya", scanType: "X-Ray Chest", scanCenter: "Internal", priority: "Low", status: "Completed", appointmentDateTime: dayjs().subtract(1, 'day').toDate() },
      { prescriptionId: "PR-103", patientId: "P-103", clinicId: "C-1", ptrName: "Pooja Verma", ptNo: "PT-1004", drName: "Dr. Rajesh", scanType: "MRI Spine", scanCenter: "Internal", priority: "Medium", status: "Report Not Ready", appointmentDateTime: dayjs().toDate() },
      { prescriptionId: "PR-104", patientId: "P-104", clinicId: "C-1", ptrName: "Karan Johar", ptNo: "PT-1005", drName: "Dr. Ananya", scanType: "MRI Knee", scanCenter: "Internal", priority: "High", status: "Not Reviewed", appointmentDateTime: dayjs().subtract(2, 'hour').toDate() },
      { prescriptionId: "PR-105", patientId: "P-105", clinicId: "C-1", ptrName: "Ritu Desai", ptNo: "PT-1006", drName: "Dr. Vikram", scanType: "CT Abdomen", scanCenter: "External", priority: "Low", status: "Scheduled", appointmentDateTime: dayjs().add(2, 'hour').toDate() },
    ];
    await ScanPrescription.insertMany(mockData);
    res.status(201).json({ success: true, message: "Mock scan prescriptions generated." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a real scan prescription
export const createScanPrescription = async (req, res) => {
  try {
    const { pdfBase64, ...scanData } = req.body;
    const scan = new ScanPrescription(scanData);
    await scan.save();

    // Send Notification to Patient via centralized helper
    handleWhatsAppNotification(
      req,
      scan,
      { patientId: scan.patientId, PHN_ID: scan.PHN_ID, ptNo: scan.ptNo },
      "scan_prescription"
    ).catch(err => console.error("Scan Booking Notification Error:", err.message));

    res.status(201).json({ success: true, data: scan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Fetch prescriptions mapped by an array of statuses (for our dynamic frontend tabs)
export const getScanPrescriptionsByStatus = async (req, res) => {
  try {
    const { statuses } = req.body; // array
    if (!statuses || statuses.length === 0) {
      const all = await ScanPrescription.find({
        isDeleted: false,
        $and: [
          { $or: [{ isBilled: true }, { status: { $ne: "Not Scheduled" } }] }
        ]
      });
      return res.status(200).json({ success: true, count: all.length, data: all });
    }

    const filtered = await ScanPrescription.find({
      status: { $in: statuses },
      isDeleted: false,
      $and: [
        { $or: [{ isBilled: true }, { status: { $ne: "Not Scheduled" } }] }
      ]
    }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateScanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, appointmentDateTime, priority } = req.body;
    const updated = await ScanPrescription.findByIdAndUpdate(id, {
      ...(status && { status }),
      ...(appointmentDateTime !== undefined && { appointmentDateTime }),
      ...(priority && { priority })
    }, { new: true });
    
    if (!updated) return res.status(404).json({ success: false, message: "Scan not found" });

    // Trigger Notification based on status
    if (status === "Scheduled") {
      handleWhatsAppNotification(req, updated, { patientId: updated.patientId, PHN_ID: updated.PHN_ID, ptNo: updated.ptNo }, "scan_appointment").catch(err => console.error("Scan Confirmed Notification Error:", err.message));
    } else if (status === "Completed") {
      handleWhatsAppNotification(req, updated, { patientId: updated.patientId, PHN_ID: updated.PHN_ID, ptNo: updated.ptNo }, "scan_appointment_complete").catch(err => console.error("Scan Completed Notification Error:", err.message));
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateScanPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    let payload = { ...req.body };
    
    // Process attached report files if present
    if (req.files && req.files.length > 0) {
      let fileUrls = [];
      for (const file of req.files) {
        const isDicom = file.mimetype === "application/dicom" || file.originalname.toLowerCase().endsWith(".dcm");
        if (isDicom) {
          console.log("Converting DICOM to PNG for permanent storage...");
          try {
            const convertedPath = await convertDicomToPng(file.path);
            // Delete the original DICOM file
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            // Use the converted PNG filename
            fileUrls.push(`/uploads/scan-documents/${path.basename(convertedPath)}`);
          } catch (convErr) {
            console.error("Storage conversion error:", convErr);
            // Fallback to original if conversion fails
            fileUrls.push(`/uploads/scan-documents/${file.filename}`);
          }
        } else {
          fileUrls.push(`/uploads/scan-documents/${file.filename}`);
        }
      }
      
      // Store all file URLs
      payload.finalReportFileUrls = fileUrls;
      // Keep the first URL in finalReportFileUrl for backward compatibility
      if (fileUrls.length > 0) {
        payload.finalReportFileUrl = fileUrls[0];
      }
    }

    const updated = await ScanPrescription.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Scan not found" });

    // Trigger Report Ready notification if files were uploaded
    if (req.files && req.files.length > 0) {
      handleWhatsAppNotification(req, updated, { patientId: updated.patientId, PHN_ID: updated.PHN_ID, ptNo: updated.ptNo }, "scan_report").catch(err => console.error("Scan Report Ready Notification Error:", err.message));
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateAIReportForScan = async (req, res) => {
  try {
    const { id } = req.params;
    const { customPrompt } = req.body;
    const scan = await ScanPrescription.findById(id);

    if (!scan) {
      return res.status(404).json({ success: false, message: "Scan not found" });
    }

    const fileUrlToAnalyze = scan.finalReportFileUrl || (scan.finalReportFileUrls && scan.finalReportFileUrls.length > 0 ? scan.finalReportFileUrls[0] : null);

    if (!fileUrlToAnalyze) {
      return res.status(400).json({ success: false, message: "No scan document found to analyze" });
    }

    // Map URL to local path
    // URL format: /uploads/scan-documents/filename.ext
    const filename = path.basename(fileUrlToAnalyze);
    const localPath = path.join(process.cwd(), "public", "upload", "scan-documents", filename);

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ success: false, message: "Scan file not found on server" });
    }

    // Determine mimetype based on extension
    const ext = path.extname(filename).toLowerCase();
    let mimetype = "image/png"; // default
    if (ext === ".pdf") mimetype = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") mimetype = "image/jpeg";
    else if (ext === ".dcm") mimetype = "application/dicom";

    // Mock file object for analyzeScanImage
    const mockFile = {
      path: localPath,
      mimetype: mimetype,
      originalname: filename
    };

    const report = await analyzeScanImage(mockFile, customPrompt);

    scan.finalReportNotes = report;
    await scan.save();

    res.status(200).json({ success: true, data: scan });
  } catch (error) {
    console.error("Generate AI Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteScanPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    // Perform soft delete
    const deleted = await ScanPrescription.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!deleted) return res.status(404).json({ success: false, message: "Scan not found" });
    res.status(200).json({ success: true, message: "Scan deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getScanPrescriptionsByPatient = async (req, res) => {
  try {
    const { id } = req.params; // Often ptNo or patient objectId    
    const scans = await ScanPrescription.find({
      $or: [{ PHN_ID: id }, { patientId: id }],
      isDeleted: false
    }).sort({ createdAt: -1 });
    console.log(scans,"data");
    
    res.status(200).json({ success: true, data: scans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Master Analytics Endpoint
export const getScanDashboardStats = async (req, res) => {
  try {
    const allScans = await ScanPrescription.find({
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

    allScans.forEach((scan) => {
      // Pipeline Buckets
      if (scan.status === "Not Scheduled") stats.notScheduled++;
      if (scan.status === "Missing") stats.missing++;
      if (scan.status === "Report Not Ready") stats.reportNotReady++;
      if (scan.status === "Not Reviewed") stats.notReviewed++;
      if (scan.status === "Scheduled") stats.scheduled++;

      const createdDate = dayjs(scan.createdAt);
      const apptDate = scan.appointmentDateTime ? dayjs(scan.appointmentDateTime) : null;

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
