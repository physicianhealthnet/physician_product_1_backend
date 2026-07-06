
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// --- Imports for Models ---
import AppointmentsModel from '../src/models/Appointments.model.js';
import SessionNotesModel from '../src/models/Sessionnotes.model.js';
import AppointmentModel from '../src/models/appointment.model.js';
import ClinicsModel from '../src/models/clinics.model.js';
import ConsentFromModel from '../src/models/consentFrom.model.js';
import PhysicianAssessmentModel from '../src/models/physicianAssessment.model.js';
import ExerciseModel from '../src/models/exercise.model.js';
import ExerciseStoreModel from '../src/models/exerciseStore.model.js';
import ExpenditureModel from '../src/models/expenditure.model.js';
import FeedbackModel from '../src/models/feedback.model.js';
import InventoryModel from '../src/models/inventory.model.js';

import PatientModel from '../src/models/patientModel/patient.model.js';
import PatientDocumentsModel from '../src/models/patientModel/patientDocuments.model.js';
import PatientRegistrationModel from '../src/models/patientModel/patientRegistration.model.js';

import PreloadPrescriptionModel from '../src/models/preloadPrescription.model.js';
import PrescriptionModel from '../src/models/prescription.model.js';
import SupplierModel from '../src/models/supplier.model.js';
import TreatmentBillModel from '../src/models/treatmentBill.model.js';
import TreatmentHistoryModel from '../src/models/treatmentHistory.model.js';
import TreatmentTrackerModel from '../src/models/treatmentTracker.model.js';
import UserModel from '../src/models/user.model.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("MONGO_URI not found in .env");
    process.exit(1);
}

const models = [
    { name: 'Appointments', model: AppointmentsModel },
    { name: 'SessionNotes', model: SessionNotesModel },
    { name: 'Appointment', model: AppointmentModel },
    { name: 'Clinics', model: ClinicsModel },
    { name: 'ConsentFrom', model: ConsentFromModel },
    { name: 'PhysicianAssessment', model: PhysicianAssessmentModel },
    { name: 'Exercise', model: ExerciseModel },
    { name: 'ExerciseStore', model: ExerciseStoreModel },
    { name: 'Expenditure', model: ExpenditureModel },
    { name: 'Feedback', model: FeedbackModel },
    { name: 'Inventory', model: InventoryModel },
    { name: 'Patient', model: PatientModel },
    { name: 'PatientDocuments', model: PatientDocumentsModel },
    { name: 'PatientRegistration', model: PatientRegistrationModel },
    { name: 'PreloadPrescription', model: PreloadPrescriptionModel },
    { name: 'Prescription', model: PrescriptionModel },
    { name: 'Supplier', model: SupplierModel },
    { name: 'TreatmentBill', model: TreatmentBillModel },
    { name: 'TreatmentHistory', model: TreatmentHistoryModel },
    { name: 'TreatmentTracker', model: TreatmentTrackerModel },
    { name: 'User', model: UserModel },
];

const migrate = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected.");

        for (const { name, model } of models) {
            console.log(`Migrating ${name}...`);
            // Update ALL documents that are missing the isDeleted field OR have it as undefined
            const result = await model.updateMany(
                { $or: [{ isDeleted: { $exists: false } }, { isDeleted: null }] },
                { $set: { isDeleted: false } }
            );
            console.log(`  Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        }

        console.log("Migration complete.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
