import express from "express";
import {
  addFeedBackController,
  getFeedbackController,
  getFeedbacksController,
  updateFeedBackController,
  getAllFeedbacksForMasterController,
} from "../controllers/feedbackController.js";

const feedbackRouter = express.Router();

feedbackRouter.post("/add", addFeedBackController);
feedbackRouter.patch("/edit/:id",updateFeedBackController)
feedbackRouter.get("/get-all/:clinicId", getFeedbacksController);
feedbackRouter.get("/get/:patientId", getFeedbackController);
feedbackRouter.get("/master/get-all", getAllFeedbacksForMasterController);
export default feedbackRouter;
