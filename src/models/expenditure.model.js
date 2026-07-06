import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  type: { type: String, enum: ["equipment", "consumable"], required: true },

  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  purchaseDate: { type: Date, required: true },
  amount: { type: Number, required: true },

  brand: { type: String },
  model: { type: String },
  serialNumber: { type: String },
  warrantyExpiryDate: { type: Date },
  calibrationDueDate: { type: Date },

  expiryDate: { type: Date },
});

const doctorPurchaseSchema = new mongoose.Schema(
  {
    billInvoiceNo: { type: String, required: true, unique: true },
    billDate: { type: Date, default: Date.now },

    supplier: {
      id: { type: String },
      name: { type: String, required: true },
      contact: { type: String },
      email: { type: String },
      address: { type: String },
      gstin: { type: String },
    },

    products: [productSchema],

    financials: {
      totalAmount: { type: Number, required: true },
      gst: {
        percentage: { type: Number, default: 0 },
        amount: { type: Number },
      },
      discount: {
        percentage: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
      netAmount: { type: Number },
    },

    payment: {
      mode: {
        type: String,
        enum: ["cash", "card", "upi", "bank"],
        default: "cash",
      },
      transactionId: { type: String },
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
      },
      paidAmount: { type: Number, default: 0 },
      dueAmount: { type: Number, default: 0 },
    },

    notes: { type: String },
    attachments: [{ type: String }],
    link: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("doctorPurchase", doctorPurchaseSchema);
