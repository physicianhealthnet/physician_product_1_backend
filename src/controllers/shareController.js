import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Patient from "../models/patientModel/patient.model.js";
import Prescription from "../models/prescription.model.js";
import TreatmentBill from "../models/treatmentBill.model.js";
import SessionNotes from "../models/Sessionnotes.model.js";
import PatientRegistration from "../models/patientModel/patientRegistration.model.js";
import TreatmentTracker from "../models/treatmentTracker.model.js";
import PhysicianAssessment from "../models/physicianAssessment.model.js";
import Feedback from "../models/feedback.model.js";
import ConsentFrom from "../models/consentFrom.model.js";
import { sendEmail } from "../services/mail.service.js";
import { handleWhatsAppNotification } from "../utils/notification.helper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_ATTACHMENT = {
  filename: "sailogo.jpeg",
  path: path.join(__dirname, "..", "assets", "sailogo.jpeg"),
  cid: "sailogo",
};

const getEmailHeader = (date) => `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 850px; margin: 20px auto; border: 1px solid #ddd; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
    
    <!-- Clinic Header -->
    <div style="display: table; width: 100%; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 25px;">
      <div style="display: table-cell; width: 35%; vertical-align: top;">
        <h1 style="color: #2c3e50; font-size: 24px; margin: 0; font-weight: 800;">Sai Physician Clinic</h1>
        <p style="font-size: 12px; margin: 5px 0; color: #555; font-weight: 500;">
          Reg. No 21904, Sai Physician Clinic,<br/>
          Gayatri Complex, Near new bus stand,<br/>
          Kodumudi, Erode - 638151.
        </p>
      </div>
      <div style="display: table-cell; width: 30%; text-align: center; vertical-align: middle;">
        <img src="cid:sailogo" alt="Sai Physician Logo" style="width: 100px; height: auto; display: block; margin: 0 auto;" />
      </div>
      <div style="display: table-cell; width: 35%; text-align: right; vertical-align: top;">
        <h2 style="color: #2c3e50; font-size: 18px; margin: 0; font-weight: 700;">Dr. K. R. Rithani B.D.S.</h2>
        <p style="font-size: 12px; margin: 5px 0; color: #555; font-weight: 500;">Physician Surgeon</p>
        <p style="font-size: 12px; margin: 5px 0; color: #777; font-weight: 600;">Report Date: ${date}</p>
      </div>
    </div>
`;

const getPatientHeader = (patient) => `
    <!-- Patient Header -->
    <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 35px; border: 1px solid #e2e8f0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
        <tr>
          <td style="width: 50%; padding: 8px 0;">
            <span style="color: #64748b; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Patient Name</span>
            <strong style="font-size: 16px; color: #0f172a;">${patient.patientName}</strong>
          </td>
          <td style="width: 50%; padding: 8px 0;">
            <span style="color: #64748b; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Patient ID</span>
            <strong style="font-size: 16px; color: #0f172a;">${patient.patientId}</strong>
          </td>
        </tr>
        <tr>
          <td style="width: 50%; padding: 15px 0 8px 0;">
            <span style="color: #64748b; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Age / Gender</span>
            <strong style="font-size: 15px; color: #334155;">${patient.patientAge}Y / ${patient.patientGender}</strong>
          </td>
          <td style="width: 50%; padding: 15px 0 8px 0;">
            <span style="color: #64748b; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Mobile</span>
            <strong style="font-size: 15px; color: #334155;">${patient.patientPhone || "N/A"}</strong>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 15px 0 0 0; border-top: 1px solid #f1f5f9; margin-top: 10px;">
            <span style="color: #64748b; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Address</span>
            <span style="font-size: 14px; color: #334155;">${patient.patientAddress || "N/A"}</span>
          </td>
        </tr>
      </table>
    </div>
`;

const getPrescriptionSection = (prescriptions) => {
  if (!prescriptions || prescriptions.length === 0) return "";
  let content = `
    <div style="margin-top: 40px;">
      <h3 style="color: #27ae60; font-size: 18px; border-bottom: 2px solid #27ae60; padding-bottom: 5px; margin-bottom: 15px;">Medications (Prescriptions)</h3>
  `;

  prescriptions.forEach((pres) => {
    content += `
      <div style="margin-bottom: 30px; position: relative;">
        <p style="font-size: 12px; color: #777; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">
          Prescription ID: <strong>${pres.prescriptionId}</strong> | Date: ${new Date(pres.createdAt).toLocaleDateString("en-IN")}
        </p>
        
        <div style="font-family: 'Times New Roman', serif; font-size: 32px; font-weight: bold; margin-bottom: 15px; color: #2c3e50;">℞</div>

        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; font-size: 13px; background-color: #f8fafc;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #1e293b;">
              <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; width: 60px;">Sr. No.</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: left;">Medication</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; width: 80px;">Dosage</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; width: 40px;">M</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; width: 40px;">A</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; width: 40px;">N</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; width: 100px;">Instruction</th>
            </tr>
          </thead>
          <tbody>
    `;

    pres.medicinesData.forEach((med, index) => {
      content += `
        <tr style="background-color: #fff;">
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; color: #64748b;">${index + 1}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 600; color: #0f172a;">${med.medication}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: 500;">${med.dosage}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${med.morning || "0"}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${med.afternoon || "0"}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${med.night || "0"}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: 500; color: #475569;">${med.af_bf}</td>
        </tr>
      `;
    });

    content += `
          </tbody>
        </table>

        <!-- Doctor Signature Block -->
        <div style="margin-top: 30px; text-align: right;">
          <h4 style="color: #2c3e50; font-size: 16px; margin: 0; font-weight: 700;">Dr. K. R. Rithani B.D.S.</h4>
          <p style="font-size: 11px; margin: 4px 0; color: #666;">Physician Surgeon</p>
        </div>
      </div>
    `;
  });
  content += `</div>`;
  return content;
};

const getBillSection = (bills) => {
  if (!bills || bills.length === 0) return "";
  let content = `
    <div style="margin-top: 40px;">
      <h3 style="color: #e67e22; font-size: 18px; border-bottom: 2px solid #e67e22; padding-bottom: 5px; margin-bottom: 15px;">Invoices & Billing Summary</h3>
  `;

  bills.forEach((bill) => {
    content += `
      <div style="margin-bottom: 25px; border: 1px solid #eee; border-radius: 6px; overflow: hidden;">
        <div style="background-color: #fff3e0; padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; font-weight: bold; color: #7d3c00;">Invoice: ${bill.treatmentBillId}</span>
          <span style="font-size: 13px; color: #7d3c00;">Date: ${new Date(bill.invoiceDate).toLocaleDateString("en-IN")}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #fafafa; border-bottom: 1px solid #eee;">
              <th style="padding: 10px; text-align: left; color: #555;">Treatment Detail</th>
              <th style="padding: 10px; text-align: right; color: #555;">Cost (₹)</th>
            </tr>
          </thead>
          <tbody>
    `;

    bill.treatments.forEach((t) => {
      content += `
        <tr style="border-bottom: 1px solid #f9f9f9;">
          <td style="padding: 10px;">${t.name}</td>
          <td style="padding: 10px; text-align: right; font-weight: 500;">${Number(t.price).toFixed(2)}</td>
        </tr>
      `;
    });

    content += `
          </tbody>
        </table>
        <div style="background: #fafafa; padding: 15px; text-align: right;">
          <table style="margin-left: auto; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 3px 15px;">Total Amount:</td><td style="padding: 3px 0; font-weight: bold; width: 100px;">₹${Number(bill.totalAmount).toFixed(2)}</td></tr>
            <tr><td style="padding: 3px 15px; color: #27ae60;">Paid Amount:</td><td style="padding: 3px 0; color: #27ae60; font-weight: bold;">₹${Number(bill.paidAmount).toFixed(2)}</td></tr>
            ${Number(bill.balanceAmount) > 0 ? `<tr><td style="padding: 3px 15px; color: #e74c3c;">Balance Due:</td><td style="padding: 3px 0; color: #e74c3c; font-weight: bold;">₹${Number(bill.balanceAmount).toFixed(2)}</td></tr>` : '<tr><td colspan="2" style="padding: 3px 15px; color: #27ae60; font-weight: bold;">FULLY PAID</td></tr>'}
          </table>
        </div>
      </div>
    `;
  });
  content += `</div>`;
  return content;
};

const getTreatmentSection = (treatments) => {
  if (!treatments || treatments.length === 0) return "";
  let content = `
    <div style="margin-top: 40px;">
      <h3 style="color: #2980b9; font-size: 18px; border-bottom: 2px solid #2980b9; padding-bottom: 5px; margin-bottom: 15px;">Procedure Tracking</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-size: 13px;">
        <thead>
          <tr style="background-color: #ebf5fb; color: #2c3e50;">
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Session</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Date</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Protocol / Procedures</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Notes</th>
          </tr>
        </thead>
        <tbody>
  `;

  treatments.sort((a, b) => a.sessionNo - b.sessionNo).forEach((tr) => {
    content += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">#${tr.sessionNo}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${tr.date}</td>
        <td style="border: 1px solid #ddd; padding: 10px;">
          <div style="font-weight: 600; color: #2c3e50;">${tr.protocol}</div>
          <div style="font-size: 12px; color: #555; margin-top: 4px;">${tr.treatments?.join(', ')}</div>
        </td>
        <td style="border: 1px solid #ddd; padding: 10px; color: #666;">${tr.notes || "-"}</td>
      </tr>
    `;
  });

  content += `</tbody></table></div>`;
  return content;
};

const getEmailFooter = () => `
    <div style="margin-top: 50px; border-top: 2px solid #2c3e50; padding-top: 20px; text-align: center;">
      <p style="font-size: 14px; font-weight: 700; color: #2c3e50; margin: 0;">Sai Physician Clinic</p>
      <p style="font-size: 12px; color: #7f8c8d; margin: 5px 0;">Quality Physician Care for Your Family</p>
      <div style="margin-top: 15px; padding: 10px; background-color: #f9f9f9; border-radius: 4px;">
        <p style="font-size: 11px; color: #95a5a6; margin: 0;">This email contains confidential medical information. It was generated automatically upon request in our clinical system.</p>
      </div>
    </div>
  </div>
`;

export const sharePatientRecordsViaEmail = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const patient = await Patient.findOne({ patientId, isDeleted: false });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    if (!patient.patientEmail) {
      return res.status(400).json({ message: "Patient email not found in records" });
    }

    const [
      prescriptions,
      bills,
      sessionNotes,
      registration,
      treatments,
      assessments,
      feedback,
      consent
    ] = await Promise.all([
      Prescription.find({ patientId, treatment_status: "live", isDeleted: false }),
      TreatmentBill.find({ patientId, treatment_status: "live", isDeleted: false }),
      SessionNotes.find({ patientId, treatment_status: "live", isDeleted: false }),
      PatientRegistration.findOne({ patientId, isDeleted: false }),
      TreatmentTracker.find({ patientId, isDeleted: false }),
      PhysicianAssessment.find({ patientId, isDeleted: false }),
      Feedback.find({ patientId, isDeleted: false }),
      ConsentFrom.findOne({ patientId, isDeleted: false }),
    ]);

    const date = new Date().toLocaleDateString("en-IN");
    let content = getEmailHeader(date);
    content += getPatientHeader(patient);
    content += ` <p style="font-size: 16px; color: #2c3e50; font-weight: 600; text-align: center; background: #eee; padding: 10px; border-radius: 4px; border-bottom: 20px solid #ccc;">COMPLETE MEDICAL HISTORY & TREATMENT RECORDS</p>`;

    if (registration) {
      content += `
        <div style="margin-top: 30px;">
          <h3 style="color: #8e44ad; font-size: 18px; border-bottom: 2px solid #8e44ad; padding-bottom: 5px; margin-bottom: 15px;">Medical & Physician History</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="background-color: #f9f9f9;"><td style="padding: 8px; width: 40%;"><strong>Primary Complaint:</strong></td><td style="padding: 8px;">${registration.primaryComplaint || "None"}</td></tr>
            <tr><td style="padding: 8px;"><strong>Last Physician Visit:</strong></td><td style="padding: 8px;">${registration.lastPhysicianVisit || "N/A"}</td></tr>
            <tr style="background-color: #f9f9f9;"><td style="padding: 8px;"><strong>Previous Treatments:</strong></td><td style="padding: 8px;">${registration.previousTreatments || "None"}</td></tr>
            <tr><td style="padding: 8px;"><strong>Allergies:</strong></td><td style="padding: 8px; color: #e74c3c; font-weight: bold;">${registration.allergies || "None"}</td></tr>
            <tr style="background-color: #f9f9f9;"><td style="padding: 8px;"><strong>Medical Conditions:</strong></td><td style="padding: 8px;">${registration.conditions || "None"}</td></tr>
            <tr><td style="padding: 8px;"><strong>Habits:</strong></td><td style="padding: 8px;">${[registration.smoking === 'Yes' ? 'Smoking' : '', registration.alcohol === 'Yes' ? 'Alcohol' : ''].filter(h => h).join(', ') || "None"}</td></tr>
          </table>
        </div>
      `;
    }

    if (assessments && assessments.length > 0) {
      content += `
        <div style="margin-top: 40px;">
          <h3 style="color: #c0392b; font-size: 18px; border-bottom: 2px solid #c0392b; padding-bottom: 5px; margin-bottom: 15px;">Physician Assessment & Findings</h3>
      `;
      assessments.forEach((asc) => {
        content += `
          <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 6px;">
            <p style="font-size: 13px; color: #7f8c8d; margin-bottom: 10px;">Assessment Date: ${new Date(asc.createdAt).toLocaleDateString("en-IN")}</p>
            <div style="margin-bottom: 10px;"><strong style="color: #2c3e50; font-size: 14px;">Chief Complaints:</strong><p style="font-size: 14px; margin: 4px 0 10px 0;">${asc.chiefComplaints || "None recorded"}</p></div>
            <div style="margin-bottom: 10px;"><strong style="color: #2c3e50; font-size: 14px;">History of Present Illness:</strong><p style="font-size: 14px; margin: 4px 0 10px 0;">${asc.historyOfPresentIllness || "None recorded"}</p></div>
            <div style="margin-bottom: 10px;"><strong style="color: #2c3e50; font-size: 14px;">Vitals:</strong>
              <ul style="margin: 5px 0; font-size: 14px; padding-left: 20px;">
                <li>BP: ${asc.vitals?.bloodPressure || "N/A"}</li>
                <li>Pulse: ${asc.vitals?.pulseRate || "N/A"}</li>
                <li>Temp: ${asc.vitals?.temperature || "N/A"}</li>
                <li>Resp: ${asc.vitals?.respiratoryRate || "N/A"}</li>
                <li>SpO2: ${asc.vitals?.spO2 || "N/A"}</li>
                <li>Weight: ${asc.vitals?.weight || "N/A"}</li>
              </ul>
            </div>
            <div style="margin-bottom: 10px;"><strong style="color: #2c3e50; font-size: 14px;">General Examination:</strong><p style="font-size: 14px; margin: 4px 0 10px 0;">${asc.generalExamination || "None recorded"}</p></div>
            <div style="margin-bottom: 10px;"><strong style="color: #2c3e50; font-size: 14px;">Systemic Examination:</strong>
              <ul style="margin: 5px 0; font-size: 14px; padding-left: 20px;">
                <li>CVS: ${asc.systemicExamination?.cvs || "N/A"}</li>
                <li>RS: ${asc.systemicExamination?.rs || "N/A"}</li>
                <li>CNS: ${asc.systemicExamination?.cns || "N/A"}</li>
                <li>PA: ${asc.systemicExamination?.pa || "N/A"}</li>
              </ul>
            </div>
            <div style="margin-bottom: 10px;"><strong style="color: #2c3e50; font-size: 14px;">Diagnosis:</strong><ul style="margin: 5px 0; font-size: 14px; padding-left: 20px;">${asc.treatment?.diagnosis?.map(d => `<li>${d.text} (${d.date})</li>`).join('') || "<li>No diagnosis recorded</li>"}</ul></div>
            <div><strong style="color: #2c3e50; font-size: 14px;">Treatment Plan:</strong><ul style="margin: 5px 0; font-size: 14px; padding-left: 20px;">${asc.treatment?.plan?.map(p => `<li>${p.text} (${p.date})</li>`).join('') || "<li>No plan recorded</li>"}</ul></div>
          </div>
        `;
      });
      content += `</div>`;
    }

    content += getTreatmentSection(treatments);
    content += getPrescriptionSection(prescriptions);
    content += getBillSection(bills);

    if (sessionNotes && sessionNotes.length > 0) {
      content += `
        <div style="margin-top: 40px;">
          <h3 style="color: #7f8c8d; font-size: 18px; border-bottom: 2px solid #7f8c8d; padding-bottom: 5px; margin-bottom: 15px;">Visit Summaries</h3>
      `;
      sessionNotes.forEach((note) => {
        content += `
          <div style="background-color: #fbfcfc; padding: 15px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #ecf0f1;">
            <p style="font-size: 13px; margin: 0; color: #2c3e50;"><strong>Date:</strong> ${note.sessionDate}</p>
            <p style="font-size: 14px; margin: 8px 0 0 0; color: #555;">${note.sessionNotes}</p>
          </div>
        `;
      });
      content += `</div>`;
    }

    if (feedback && feedback.length > 0) {
      content += `
        <div style="margin-top: 40px; background-color: #fff9f9; padding: 20px; border-radius: 8px; border: 1px dashed #fab1a0;">
          <h3 style="color: #d63031; font-size: 18px; margin-top: 0; margin-bottom: 10px;">Patient Feedback</h3>
          <p style="font-size: 13px; color: #636e72;">Latest Feedback: "${feedback[feedback.length - 1].remarks || "No comments"}"</p>
          <p style="font-size: 13px; color: #636e72;">Overall Experience: ${feedback[feedback.length - 1].overallExperience}/5</p>
        </div>
      `;
    }

    if (consent) {
      content += `
        <div style="margin-top: 40px; background-color: #e8f5e9; padding: 20px; border-radius: 8px; border: 1px dashed #81c784;">
          <h3 style="color: #2e7d32; font-size: 18px; margin-top: 0; margin-bottom: 10px;">Communication Consent & Signatures</h3>
          <p style="font-size: 13px; color: #424242;"><strong>Contact Preferences:</strong> ${consent.phoneCalls === 'Yes' ? 'Phone Calls, ' : ''}${consent.textMessage === 'Yes' ? 'Text message, ' : ''}${consent.email === 'Yes' ? 'Email' : ''}</p>
          <div style="display: flex; justify-content: space-between; margin-top: 15px;">
            <div style="width: 48%;"><p style="font-size: 13px; color: #424242; margin-bottom: 2px;"><strong>Guardian/Patient Sign:</strong> ${consent.guardianSign || "N/A"}</p><p style="font-size: 11px; color: #757575;">Date: ${consent.guardianDate || consent.consentDate || "N/A"}</p></div>
            <div style="width: 48%; text-align: right;"><p style="font-size: 13px; color: #424242; margin-bottom: 2px;"><strong>Doctor:</strong> ${consent.doctorName || "Dr. K. R. Rithani"}</p><p style="font-size: 11px; color: #757575;">Date: ${consent.doctorDate || "N/A"}</p></div>
          </div>
        </div>
      `;
    }

    content += getEmailFooter();

    await sendEmail({
      to: patient.patientEmail,
      subject: `Complete Medical Records - ${patient.patientName}`,
      html: content,
      attachments: [LOGO_ATTACHMENT],
    });

    return res.status(200).json({ message: "Complete records shared successfully via email" });
  } catch (error) {
    console.error("Error in sharePatientRecordsViaEmail:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const shareSingleBillViaEmail = async (req, res) => {
  try {
    const { billId, pdfAttachment } = req.body;
    if (!billId) return res.status(400).json({ message: "Bill ID is required" });

    const bill = await TreatmentBill.findById(billId);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const patient = await Patient.findOne({ patientId: bill.patientId, isDeleted: false });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (!patient.patientEmail) return res.status(400).json({ message: "Patient email not found" });

    const date = new Date().toLocaleDateString("en-IN");
    let content = getEmailHeader(date);
    content += getPatientHeader(patient);
    content += ` <p style="font-size: 16px; color: #2c3e50; font-weight: 600; text-align: center; background: #eee; padding: 10px; border-radius: 4px; border-bottom: 2px solid #ccc;">TREATMENT INVOICE</p>`;
    content += getBillSection([bill]);
    content += getEmailFooter();

    const attachments = [LOGO_ATTACHMENT];
    if (pdfAttachment) {
      attachments.push({
        filename: `Invoice_${bill.treatmentBillId}.pdf`,
        content: pdfAttachment,
        encoding: 'base64'
      });
    }

    await sendEmail({
      to: patient.patientEmail,
      subject: `Invoice Shared - ${bill.treatmentBillId}`,
      html: content,
      attachments
    });

    return res.status(200).json({ message: "Invoice shared successfully via email" });
  } catch (error) {
    console.error("Error in shareSingleBillViaEmail:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const shareSinglePrescriptionViaEmail = async (req, res) => {
  try {
    const { prescriptionId, pdfAttachment } = req.body;
    if (!prescriptionId) return res.status(400).json({ message: "Prescription ID is required" });

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) return res.status(404).json({ message: "Prescription not found" });

    const patient = await Patient.findOne({ patientId: prescription.patientId, isDeleted: false });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (!patient.patientEmail) return res.status(400).json({ message: "Patient email not found" });

    const date = new Date().toLocaleDateString("en-IN");
    let content = getEmailHeader(date);
    content += getPatientHeader(patient);
    content += ` <p style="font-size: 16px; color: #2c3e50; font-weight: 600; text-align: center; background: #eee; padding: 10px; border-radius: 4px; border-bottom: 2px solid #ccc;">MEDICAL PRESCRIPTION</p>`;
    content += getPrescriptionSection([prescription]);
    content += getEmailFooter();

    const attachments = [LOGO_ATTACHMENT];
    if (pdfAttachment) {
      attachments.push({
        filename: `Prescription_${prescription.prescriptionId}.pdf`,
        content: pdfAttachment,
        encoding: 'base64'
      });
    }

    await sendEmail({
      to: patient.patientEmail,
      subject: `Prescription Shared - ${prescription.prescriptionId}`,
      html: content,
      attachments
    });

    return res.status(200).json({ message: "Prescription shared successfully via email" });
  } catch (error) {
    console.error("Error in shareSinglePrescriptionViaEmail:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const shareSingleTreatmentViaEmail = async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ message: "Patient ID is required" });

    const treatments = await TreatmentTracker.find({ patientId, isDeleted: false });
    if (!treatments || treatments.length === 0) return res.status(404).json({ message: "No treatment records found" });

    const patient = await Patient.findOne({ patientId, isDeleted: false });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (!patient.patientEmail) return res.status(400).json({ message: "Patient email not found" });

    const date = new Date().toLocaleDateString("en-IN");
    let content = getEmailHeader(date);
    content += getPatientHeader(patient);
    content += ` <p style="font-size: 16px; color: #2c3e50; font-weight: 600; text-align: center; background: #eee; padding: 10px; border-radius: 4px; border-bottom: 2px solid #ccc;">TREATMENT HISTORY & PROCEDURES</p>`;
    content += getTreatmentSection(treatments);
    content += getEmailFooter();

    await sendEmail({
      to: patient.patientEmail,
      subject: `Treatment Record Shared - ${patient.patientName}`,
      html: content,
      attachments: [LOGO_ATTACHMENT],
    });

    return res.status(200).json({ message: "Treatment record shared successfully via email" });
  } catch (error) {
    console.error("Error in shareSingleTreatmentViaEmail:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const shareIdCardViaWhatsApp = async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ message: "Patient ID is required" });

    const patient = await Patient.findOne({ patientId, isDeleted: false });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (!patient.patientPhone) return res.status(400).json({ message: "Patient phone number not found" });

    await handleWhatsAppNotification(
      req,
      patient,
      { patientId: patient.patientId },
      "id_card"
    );

    return res.status(200).json({ message: "ID Card shared successfully via WhatsApp" });
  } catch (error) {
    console.error("Error in shareIdCardViaWhatsApp:", error);
    return res.status(500).json({ message: error.message });
  }
};

