import { Chat } from "../models/chat.model.js";

// Get chat history for a specific patient and clinic
export const getChatHistory = async (req, res) => {
    try {
        const { clinicId, patientId } = req.params;

        const chat = await Chat.findOne({ clinicId, patientId });

        if (!chat) {
            return res.status(200).json([]); // Return empty array if no chat exists
        }

        res.status(200).json(chat.messages);
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({ message: "Failed to fetch chat history" });
    }
};

// Get all active sessions for a clinic (for doctor sidebar)
export const getActiveSessions = async (req, res) => {
    try {
        const { clinicId } = req.params;
        const chats = await Chat.find({ clinicId }).sort({ updatedAt: -1 });

        const sessions = chats.map(chat => ({
            patientId: chat.patientId,
            patientName: chat.patientName || "Unknown Patient",
            lastMessage: chat.lastMessage,
            unreadCount: chat.unreadCount,
            updatedAt: chat.updatedAt
        }));

        res.status(200).json(sessions);
    } catch (error) {
        console.error("Error fetching sessions:", error);
        res.status(500).json({ message: "Failed to fetch sessions" });
    }
}
