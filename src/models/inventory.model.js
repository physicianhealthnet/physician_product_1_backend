import mongoose from "mongoose";
import { number, string } from "../config/schemaTypes.js";

const inventorySchema = new mongoose.Schema(
  {
    productName: string,
    productCurrentCount: number,
    productTotalCount: number,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Inventory", inventorySchema);
