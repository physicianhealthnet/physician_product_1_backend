import express from "express";
import { createData, getAllTitle, getAllData, updateData, deleteData } from "../controllers/preloadPrescriptionController.js";

const preloadPrescriptionRoute = express.Router();

preloadPrescriptionRoute.post("/create", createData);
preloadPrescriptionRoute.get("/get-titles", getAllTitle);
preloadPrescriptionRoute.get("/get-all-data", getAllData);
preloadPrescriptionRoute.put("/update/:id", updateData);
preloadPrescriptionRoute.delete("/delete/:id", deleteData);

export default preloadPrescriptionRoute;
