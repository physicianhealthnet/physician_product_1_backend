import express from "express";
import { createClinic, getAllCLinics } from "../controllers/cliniController.js";


const clinicRouter = express.Router();

clinicRouter.post("/add", createClinic);
clinicRouter.get("/all", getAllCLinics);

export default clinicRouter;
