import mongoose from "mongoose";
import { string, stringRequired } from "../config/schemaTypes.js";

const supplierSchema = new mongoose.Schema(
  {
    name: stringRequired,
    contact: string,
    email: string,
    address: string,
    gstin: string,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
