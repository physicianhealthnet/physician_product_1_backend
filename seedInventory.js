import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const inventorySchema = new mongoose.Schema(
  {
    productName: String,
    productCurrentCount: Number,
    productTotalCount: Number,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Inventory = mongoose.model("InventorySEED", inventorySchema, "inventories");

const mandatoryMedicines = [
  "Paracetamol 500mg",
  "Amoxicillin 500mg",
  "Ibuprofen 400mg",
  "Omeprazole 20mg",
  "Ciprofloxacin 500mg",
  "Metformin 500mg",
  "Amlodipine 5mg",
  "Atorvastatin 20mg",
  "Losartan 50mg",
  "Azithromycin 500mg",
  "Cetirizine 10mg",
  "Pantoprazole 40mg",
  "Aspirin 75mg",
  "Levothyroxine 50mcg",
  "Vitamin C 500mg",
  "Vitamin D3",
  "Multivitamin",
  "Calcium 500mg",
  "Salbutamol Inhaler",
  "Dolo 650"
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    for (const med of mandatoryMedicines) {
      const exists = await Inventory.findOne({ productName: med, isDeleted: false });
      if (!exists) {
        await Inventory.create({
          productName: med,
          productCurrentCount: 1000,
          productTotalCount: 1000,
        });
        console.log(`Added: ${med}`);
      } else {
        console.log(`Skipped (already exists): ${med}`);
      }
    }
    
    console.log("Seeding complete!");
  } catch (e) {
    console.error("Error during seeding:", e);
  } finally {
    process.exit(0);
  }
}

seed();
