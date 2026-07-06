import express from "express";
import {
  addPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  getEquipmentNames,
  getBrandNames,
  getCounts,
} from "../controllers/expenditureController.js";
import expenditureBillUpload from "../middleware/expenditure.multer.js";

const expenditureRouter = express.Router();

expenditureRouter.post(
  "/add-purchase",
  expenditureBillUpload.single("billFile"),
  addPurchase
);

expenditureRouter.get("/get-all", getPurchases);

expenditureRouter.get("/get/:id", getPurchaseById);

expenditureRouter.patch(
  "/update/:id",
  expenditureBillUpload.single("billFile"),
  updatePurchase
);

expenditureRouter.delete("/delete/:id", deletePurchase);
//all availble equpment names
expenditureRouter.get("/equipment-names", getEquipmentNames);
//selected equpment brand
expenditureRouter.get("/brand/:productName", getBrandNames);
// //selectet equipenment ,brant avabiles counts
expenditureRouter.get("/count/:productName/:brand", getCounts);
export default expenditureRouter;
