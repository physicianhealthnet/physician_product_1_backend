import express from "express";
import { getPatientAnalytics } from "../controllers/analyticsController.js";

const AnalyticsRouter = express.Router();

// GET /api/patient-analytics
AnalyticsRouter.get("/get", getPatientAnalytics);

export default AnalyticsRouter;
