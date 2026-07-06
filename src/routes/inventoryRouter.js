import express from "express";
import {
  addProduct,
  deleteProduct,
  getProduct,
  getProductName,
  getTargetedProduct,
  updateProduct,
} from "../controllers/inventoryController.js";

const inventoryRouter = express.Router();

inventoryRouter.post("/add", addProduct);
inventoryRouter.get("/get-all", getProduct);
inventoryRouter.get("/get-by-name/:name", getTargetedProduct);
inventoryRouter.get("/get-name", getProductName);
inventoryRouter.patch("/update/:id", updateProduct);
inventoryRouter.delete("/delete/:id", deleteProduct);

export default inventoryRouter;
