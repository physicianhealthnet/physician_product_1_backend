import Patient from "../models/patientModel/patient.model.js";
import clinicData from "../models/clinics.model.js";
import { sendWhatsAppTemplate } from "../services/whatsapp.service.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { port } from "../config/schemaTypes.js";
import dayjs from "dayjs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Centralized helper to handle WhatsApp notifications for various templates.
 * @param {Object} req - Express request object (to extract pdfBase64 and headers)
 * @param {Object} data - The saved document data (must have clinicId)
 * @param {Object} patientSearch - Criteria to find the patient { patientId, PHN_ID, ptNo }
 * @param {string} templateName - WhatsApp template name
 * @param {Array} additionalVars - Additional variables for the template (e.g., [Amount])
 */
export const handleWhatsAppNotification = async (req, data, patientSearch, templateName, additionalVars = []) => {
    console.log(`[WhatsApp Notification] Triggered for ${templateName}`);
    console.log(`[WhatsApp Notification] Data:`, JSON.stringify({ clinicId: data.clinicId, patientPhone: data.patientPhone, patientName: data.patientName }));
    console.log(`[WhatsApp Notification] Patient Search:`, JSON.stringify(patientSearch));

    try {
        // 1. Find Patient to get phone number
        let patient = await Patient.findOne({
            $or: [
                { patientId: patientSearch.patientId },
                { PHN_ID: patientSearch.PHN_ID },
                { ptNo: patientSearch.ptNo }
            ].filter(q => q && q[Object.keys(q)[0]]),
            isDeleted: false
        });

        const phone = patient?.patientPhone || data.patientPhone || data.ptPhone;
        const name = patient?.patientName || data.patientName || data.ptrName || "Patient";

        if (!phone) {
            console.log(`[WhatsApp Notification] No phone number found for ${templateName}`);
            return;
        }

        // 2. Fetch Clinic Name
        const clinic = await clinicData.findOne({ clinicId: data.clinicId, isDeleted: false });
        const clinicName = clinic ? clinic.clinicName : "Our Clinic";

        // Determine Display Location (Use clinic name for internal, otherwise use the center type)
        let displayLocation = clinicName;
        if (data.labCenter) {
            displayLocation = data.labCenter === "Internal" ? clinicName : "External Lab";
        } else if (data.scanCenter) {
            displayLocation = data.scanCenter === "Internal" ? clinicName : "External Scan Center";
        }

        // 3. Process PDF if present in req?.body or data
        let mediaUrl = null;
        if (req?.body?.pdfBase64) {
            console.log(`[WhatsApp Notification] pdfBase64 present: true`);
            try {
                const base64Data = req.body.pdfBase64.split(",")[1] || req.body.pdfBase64;
                const fileName = `${templateName}_${Date.now()}.pdf`;
                const uploadDir = path.join(__dirname, "..", "..", "public", "upload", "prescriptions");

                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, base64Data, "base64");

                // Small delay to ensure file is ready
                await new Promise(resolve => setTimeout(resolve, 500));

                const protocol = req.headers?.["x-forwarded-proto"] || req.protocol || "https";
                const host = req.headers?.["host"];
                
                // For static files, we usually don't want the /api prefix if they are served from root
                const baseUrl = (host && !host.includes("localhost"))
                    ? `${protocol}://${host}`
                    : port.replace("/api", ""); // Fallback to demo server but remove /api for static files

                mediaUrl = `${baseUrl}/uploads/prescriptions/${fileName}`;
            } catch (fileErr) {
                console.error("[WhatsApp Notification] File saving failed:", fileErr.message);
            }
        } else if (data.finalReportFileUrl) {
             console.log(`[WhatsApp Notification] Using existing file: ${data.finalReportFileUrl}`);
             const protocol = req?.headers?.["x-forwarded-proto"] || req?.protocol || "https";
             const host = req?.headers?.["host"];
             const baseUrl = (host && !host.includes("localhost"))
                    ? `${protocol}://${host}`
                    : port.replace("/api", "");

             // data.finalReportFileUrl already contains '/uploads/...' (after we fix the controllers)
             mediaUrl = `${baseUrl}${data.finalReportFileUrl}`;
        } else {
             console.log(`[WhatsApp Notification] No media found for ${templateName}`);
        }

        // 4. Prepare Variables based on user-provided templates
        // lab_center_prescription: [Patient Name, Clinic Name]
        // med_prescription: [Patient Name, Clinic Name]
        // bill: [Patient Name, Amount, Clinic Name]
        
        let variables = [name];
        if (templateName === "bill") {
            variables.push(additionalVars[0] || "0.00"); // Amount
            variables.push(clinicName);
        } else if (templateName === "scan_prescription") {
            variables.push(data.scanType || "Scan");
            variables.push(displayLocation);
        } else if (templateName === "scan_appointment") {
            variables.push(data.scanType || "Scan");
            variables.push(data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("DD-MM-YYYY") : "TBD");
            variables.push(data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("hh:mm A") : "TBD");
            variables.push(data.drName || "Radiologist");
            variables.push(displayLocation);
        } else if (templateName === "scan_report") {
            variables.push(data.scanType || "Scan");
            variables.push(displayLocation);
        } else if (templateName === "scan_appointment_complete") {
            variables.push(data.scanType || "Scan");
            variables.push(displayLocation);
        } else if (templateName === "scan_reminder") {
            variables.push(data.scanType || "Scan");
            variables.push(data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("DD-MM-YYYY") : "TBD");
            variables.push(data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("hh:mm A") : "TBD");
            variables.push(displayLocation);
        } else if (templateName === "scan_center_prescription" || templateName === "scan_booking") {
            // Keep legacy support or internal mapping
            variables.push(data.scanType || "Scan");
            variables.push(clinicName);
        } else if (templateName === "lab_prescription") {
            variables.push(data.labType || "Tests");
            variables.push(displayLocation);
        } else if (templateName === "lab_appointment") {
            variables.push(data.labType || "Tests");
            variables.push(data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("DD-MM-YYYY") : "TBD");
            variables.push(data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("hh:mm A") : "TBD");
            variables.push(displayLocation);
        } else if (templateName === "lab_report") {
            variables.push(data.labType || "Tests");
            variables.push(displayLocation);
        } else if (templateName === "lab_appointment_complete") {
            variables.push(data.labType || "Tests");
            variables.push(displayLocation);
        } else if (templateName === "lab_reminder") {
            variables.push(data.labType || "Tests");
            variables.push(data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("DD-MM-YYYY") : "TBD");
            variables.push(data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("hh:mm A") : "TBD");
            variables.push(displayLocation);
        } else if (templateName === "id_card") {
            const digitalIdLink = `https://demo.physicianhealthnet.com/download-id/${patient?.patientId || data.patientId}`;
            variables = [
                clinicName,
                name,
                patient?.patientId || data.patientId,
                digitalIdLink,
                clinicName
            ];
        } else {
            variables.push(displayLocation);
        }

        // 5. Send Template via Service
        // Only send mediaUrl if the template is known to have a Media Header
        const templatesWithHeaders = ["lab_prescription", "scan_prescription", "bill"]; 
        const finalMediaUrl = templatesWithHeaders.includes(templateName) ? mediaUrl : null;

        await sendWhatsAppTemplate(
            phone,
            templateName,
            variables,
            finalMediaUrl,
            `${templateName}.pdf`
        );

    } catch (error) {
        console.error(`[WhatsApp Notification Error] ${templateName}:`, error.message);
    }
};
