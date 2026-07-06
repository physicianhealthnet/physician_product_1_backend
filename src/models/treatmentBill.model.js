import mongoose from "mongoose";
import { number, string, stringRequired } from "../config/schemaTypes.js";

const treatmentBillSchema = new mongoose.Schema(
  {
    clinicId: stringRequired,
    patientId: stringRequired,
    patientPHNId: string,
    treatment_status: string,
    treatment_id: string,
    patientName: stringRequired,
    patientPhone: number,
    treatmentBillId: stringRequired,
    invoiceDate: stringRequired,

    treatments: [
      {
        name: string,
        price: string,
        quantity: string,
        total: string,
        notes: string,
      },
    ],

    modeOfPayment: string,
    paidAmount: string,
    totalAmount: string,

    discount: string,
    grandTotal: string,
    amountReceived: string,
    balanceAmount: string,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const TreatmentBill = mongoose.model("TreatmentBill", treatmentBillSchema);
export default TreatmentBill;
