import express from "express";
import {
    sharePatientRecordsViaEmail,
    shareSingleBillViaEmail,
    shareSinglePrescriptionViaEmail,
    shareSingleTreatmentViaEmail,
    shareIdCardViaWhatsApp
} from "../controllers/shareController.js";

const router = express.Router();

router.post("/email", sharePatientRecordsViaEmail);
router.post("/bill", shareSingleBillViaEmail);
router.post("/prescription", shareSinglePrescriptionViaEmail);
router.post("/treatment", shareSingleTreatmentViaEmail);
router.post("/whatsapp-id-card", shareIdCardViaWhatsApp);

export default router;
