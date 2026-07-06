import express from "express";
import {
  addSupplierController,
  deleteSupplierController,
  getAllSupplierController,
  getByIdSupplierController,
  updateSupplierController,
} from "../controllers/supplierController.js";

const supplierRouter = express.Router();

supplierRouter.post("/add", addSupplierController);
supplierRouter.patch("/update/:id", updateSupplierController);
supplierRouter.delete("/delete/:id", deleteSupplierController);
supplierRouter.get("/get-all", getAllSupplierController);
supplierRouter.get("/get/:id", getByIdSupplierController);

export default supplierRouter;
