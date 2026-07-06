import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        enum: ["doctor", "patient", "system"],
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    read: {
        type: Boolean,
        default: false,
    },
});

const chatSchema = new mongoose.Schema(
    {
        clinicId: {
            type: String,
            required: true,
            index: true,
        },
        patientId: {
            type: String,
            required: true,
            index: true,
        },
        patientName: {
            type: String, // Useful for list display without joins
            required: false,
        },
        lastMessage: {
            type: messageSchema, // Snapshot of last message for sorting
        },
        unreadCount: {
            type: Number,
            default: 0,
        },
        messages: [messageSchema],
    },
    { timestamps: true }
);

// Compound index for unique chat per patient/clinic pair
chatSchema.index({ clinicId: 1, patientId: 1 }, { unique: true });

export const Chat = mongoose.model("Chat", chatSchema);
