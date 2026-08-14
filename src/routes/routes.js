import express from "express";
import userRouter from "./userRoutes.js";
import clinicRouter from "./clinicRoutes.js";
import appointmentRouter from "./appointmentRoutes.js";
import patientRouter from "./patientRoutes/patientRoutes.js";
import patientRegistrationRouter from "./patientRoutes/patientRegistrationRoutes.js";
import patientDocumentsRouter from "./patientRoutes/patientDocumentsRoutes.js";
import consentFromRoutes from "./consentFromRoutes.js";
import businessAnalyticsToolsRouter from "./businessAnalyticsToolsRoutes.js";
import treatmentBillRouter from "./treatmentBillRoutes.js";
import treatmentTrackerRoutes from "./treatmentTrackerRoutes.js";
import sessionNotesRouter from "./SessionnotesRoutes.js";
import exerciseRouter from "./exerciseRoutes.js";
import exerciseStoreRouter from "./exerciseStoreRoute.js";
import inventoryRouter from "./inventoryRouter.js";
import expenditureRouter from "./expenditureRouter.js";
import feedbackRouter from "./feedbackRoutes.js";
import supplierRouter from "./supplierRoutes.js";
import appoinmentstRouter from "./Appoitments.route.js";
import treatmentHistoryRouter from "./treatmentHistoryRoutes.js";
import AnalyticsRouter from "./analytics.route.js";
import assessmentRouter from "./assessmentRoutes/assessmentRoutes.js";
import specialistAssessmentRouter from "./assessmentRoutes/specialistAssessmentRoutes.js";
import preloadPrescriptionRoute from "./preloadPrescriptionRoute.js";
import prescriptionRoute from "./prescription.route.js";
import chatRouter from "./chatRoutes.js";
import shareRouter from "./shareRoutes.js";
import scanPrescriptionRoute from "./scanPrescription.route.js";
import labPrescriptionRoute from "./labPrescription.route.js";

const router = express.Router();

router.use("/share", shareRouter);
router.use("/user", userRouter);
router.use("/clinic", clinicRouter);

//patient routes
router.use("/patient", patientRouter);
router.use("/patientregistration", patientRegistrationRouter);
router.use("/patientdocuments", patientDocumentsRouter);
router.use("/consentfrom", consentFromRoutes);

//appointment routes
router.use("/appointment", appointmentRouter);

//business analytics tools
router.use("/business-tool", businessAnalyticsToolsRouter);

router.use("/treatment-bill", treatmentBillRouter);
router.use("/treatment-tracker", treatmentTrackerRoutes);
router.use("/session-notes", sessionNotesRouter);
router.use("/exercise", exerciseRouter);
router.use("/exercise-store", exerciseStoreRouter);
router.use("/inventory", inventoryRouter);
router.use("/expenditure", expenditureRouter);
router.use("/appointments", appoinmentstRouter);
router.use("/feedback", feedbackRouter);
router.use("/supplier", supplierRouter);
router.use("/assessment", assessmentRouter);
router.use("/specialist-assessment", specialistAssessmentRouter);

router.use("/treatment-history", treatmentHistoryRouter);

router.use("/analytics", AnalyticsRouter);

router.use("/preload-prescription", preloadPrescriptionRoute);

router.use("/prescription", prescriptionRoute);
router.use("/patient-chat", chatRouter);
router.use("/scan-prescription", scanPrescriptionRoute);
router.use("/lab-prescription", labPrescriptionRoute);

export default router;
