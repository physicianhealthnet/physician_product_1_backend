import express from "express";
import {
    getAppointmentController,
  getPainOfMonthController,
  getPatientController,
  getDashboardDataController,
  getDashboardPatientListController,
} from "../controllers/businessAnalyticsToolsController.js";

const businessAnalyticsToolsRouter = express.Router();

businessAnalyticsToolsRouter.get("/patient", getPatientController);

businessAnalyticsToolsRouter.get("/pain-month", getPainOfMonthController);
businessAnalyticsToolsRouter.get("/pain-three-month", getPainOfMonthController);
businessAnalyticsToolsRouter.get("/pain-six-month", getPainOfMonthController);
businessAnalyticsToolsRouter.get("/pain-year", getPainOfMonthController);

businessAnalyticsToolsRouter.get("/appointment-week", getAppointmentController);
businessAnalyticsToolsRouter.get("/appointment-month", getAppointmentController);
businessAnalyticsToolsRouter.get("/appointment-year", getAppointmentController);
businessAnalyticsToolsRouter.get("/dashboard-v2", getDashboardDataController);
businessAnalyticsToolsRouter.get("/dashboard-patient-list", getDashboardPatientListController);

export default businessAnalyticsToolsRouter;
