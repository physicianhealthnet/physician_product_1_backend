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

        // 6. Trigger push notification to patient app via dependency hub
        try {
            const isLocalEnv = process.env.NODE_ENV !== 'production' || process.env.HUB_URL;
            const HUB_URL = process.env.HUB_URL ||
                (isLocalEnv ? 'http://127.0.0.1:3028' : 'https://dependencyforphn.physicianhealthnet.com/api');

            const actualPatientId = patient?.patientId || data.patientId;
            if (actualPatientId) {
                let notiTitle = "New Notification";
                let notiBody = "You have a new update from the clinic.";
                let notiType = "general";
                let actionRoute = "/home";
                let actionParams = {};

                // Map templates to push notifications
                if (templateName === "bill") {
                    notiTitle = "New Bill Generated";
                    notiBody = `A bill of ${additionalVars[0] || "0.00"} has been generated by ${clinicName}.`;
                    notiType = "bill";
                    actionRoute = "/records";
                    actionParams = { type: "bill" };
                } else if (templateName === "scan_prescription" || templateName === "scan_center_prescription" || templateName === "scan_booking") {
                    notiTitle = "New Scan Request";
                    notiBody = `A new scan request (${data.scanType || "Scan"}) has been added by ${clinicName}.`;
                    notiType = "scan";
                    actionRoute = "/records";
                    actionParams = { type: "scan" };
                } else if (templateName === "scan_appointment") {
                    const dateVal = data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("DD-MM-YYYY") : "TBD";
                    const timeVal = data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("hh:mm A") : "TBD";
                    notiTitle = "Scan Appointment Scheduled";
                    notiBody = `Your scan appointment for ${data.scanType || "Scan"} has been scheduled on ${dateVal} at ${timeVal}.`;
                    notiType = "appointment";
                    actionRoute = "/appointments";
                } else if (templateName === "scan_report") {
                    notiTitle = "Scan Report Ready";
                    notiBody = `Your scan report for ${data.scanType || "Scan"} is ready.`;
                    notiType = "scan";
                    actionRoute = "/records";
                    actionParams = { type: "scan" };
                } else if (templateName === "scan_appointment_complete") {
                    notiTitle = "Scan Appointment Completed";
                    notiBody = `Your scan appointment for ${data.scanType || "Scan"} has been completed.`;
                    notiType = "scan";
                    actionRoute = "/records";
                    actionParams = { type: "scan" };
                } else if (templateName === "scan_reminder") {
                    const dateVal = data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("DD-MM-YYYY") : "TBD";
                    const timeVal = data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("hh:mm A") : "TBD";
                    notiTitle = "Scan Appointment Reminder";
                    notiBody = `Reminder: You have an upcoming scan appointment for ${data.scanType || "Scan"} on ${dateVal} at ${timeVal}.`;
                    notiType = "appointment";
                    actionRoute = "/appointments";
                } else if (templateName === "lab_prescription" || templateName === "lab_center_prescription") {
                    notiTitle = "New Lab Request";
                    notiBody = `A new lab test has been requested for you by ${clinicName}.`;
                    notiType = "lab";
                    actionRoute = "/records";
                    actionParams = { type: "lab" };
                } else if (templateName === "lab_appointment") {
                    const dateVal = data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("DD-MM-YYYY") : "TBD";
                    const timeVal = data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("hh:mm A") : "TBD";
                    notiTitle = "Lab Appointment Scheduled";
                    notiBody = `Your lab appointment for ${data.labType || "Tests"} has been scheduled on ${dateVal} at ${timeVal}.`;
                    notiType = "appointment";
                    actionRoute = "/appointments";
                } else if (templateName === "lab_report") {
                    notiTitle = "Lab Report Ready";
                    notiBody = `Your lab report is ready.`;
                    notiType = "lab";
                    actionRoute = "/records";
                    actionParams = { type: "lab" };
                } else if (templateName === "lab_appointment_complete") {
                    notiTitle = "Lab Appointment Completed";
                    notiBody = `Your lab appointment has been completed.`;
                    notiType = "lab";
                    actionRoute = "/records";
                    actionParams = { type: "lab" };
                } else if (templateName === "lab_reminder") {
                    const dateVal = data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("DD-MM-YYYY") : "TBD";
                    const timeVal = data.appointmentDateTime ? dayjs(data.appointmentDateTime).format("hh:mm A") : "TBD";
                    notiTitle = "Lab Appointment Reminder";
                    notiBody = `Reminder: You have an upcoming lab appointment scheduled on ${dateVal} at ${timeVal}.`;
                    notiType = "appointment";
                    actionRoute = "/appointments";
                } else if (templateName === "med_prescription" || templateName === "prescription") {
                    notiTitle = "New Prescription Added";
                    notiBody = `A new prescription has been added to your records by ${clinicName}.`;
                    notiType = "prescription";
                    actionRoute = "/records";
                    actionParams = { type: "prescription" };
                } else if (templateName === "id_card") {
                    notiTitle = "Digital ID Card Ready";
                    notiBody = `Your digital ID card for ${clinicName} is ready.`;
                    notiType = "general";
                    actionRoute = "/home";
                }

                console.log(`[Push Notification Link] Triggering patient push notification: ${notiTitle} to patientId: ${actualPatientId} via Hub...`);
                
                await fetch(`${HUB_URL}/auth/send-patient-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patientId: actualPatientId,
                        title: notiTitle,
                        body: notiBody,
                        data: {
                            type: notiType,
                            actionRoute,
                            actionParams,
                            clinicId: String(data.clinicId),
                            patientId: actualPatientId,
                            fileUrl: mediaUrl || data.finalReportFileUrl || ""
                        }
                    })
                }).then(async res => {
                    const resJson = await res.json();
                    console.log("[Push Notification Link] Hub Response:", JSON.stringify(resJson));
                }).catch(err => {
                    console.error("[Push Notification Link] Error calling Hub notification endpoint:", err.message);
                });

                // Emit the socket event locally on clinic server (3026)
                try {
                    const { activeSockets } = await import("../socket/socketController.js");
                    const targetIds = [
                        actualPatientId,
                        patient?.patientId,
                        patient?.PHN_ID,
                        phone,
                        patient?.patientEmail
                    ].filter(Boolean);

                    let emitted = false;
                    for (const id of targetIds) {
                        const liveSocket = activeSockets.get(id);
                        if (liveSocket && liveSocket.connected) {
                            liveSocket.emit("appointment_update", {
                                title: notiTitle,
                                body: notiBody,
                                appointmentId: data._id ? String(data._id) : "",
                                status: data.status || "Completed",
                                doctorName: data.docName || data.doctor || "",
                                clinicName: clinicName,
                                clinicLocation: clinic?.clinicAddress || "Hyderabad",
                                type: notiType,
                                fileUrl: mediaUrl || data.finalReportFileUrl || ""
                            });
                            console.log(`[Socket Notification Link] Emitted socket event locally on 3026 for ID: ${id}`);
                            emitted = true;
                            break;
                        }
                    }
                    if (!emitted) {
                        console.log("[Socket Notification Link] Active socket not found locally on 3026.");
                    }
                } catch (socketErr) {
                    console.error("[Socket Notification Link] Local socket emit failed in notification.helper.js:", socketErr.message);
                }
            }
        } catch (pushErr) {
            console.error("[Push Notification Link] Error constructing push notification request:", pushErr.message);
        }

    } catch (error) {
        console.error(`[WhatsApp Notification Error] ${templateName}:`, error.message);
    }
};
