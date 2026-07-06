import { Chat } from "../models/chat.model.js";

export const initializeSocket = (io) => {
    io.on("connection", (socket) => {
        const { userType, clinicId, userName, patientId, patientName } = socket.handshake.auth;
        console.log(`Socket Connected: ${socket.id} (${userType}) - Clinic: ${clinicId}`);

        // Join room based on user type
        if (userType === "doctor" || userType === "clinic") {
            socket.join(`clinic:${clinicId}`);
            console.log(`Doctor ${userName} joined clinic:${clinicId}`);

            // Fetch and emit active sessions
            Chat.find({ clinicId })
                .sort({ updatedAt: -1 })
                .then(chats => {
                    const sessions = chats.map(chat => ({
                        patientId: chat.patientId,
                        patientName: chat.patientName || "Unknown Patient",
                        lastMessage: chat.lastMessage,
                        unreadCount: chat.unreadCount,
                        lastActivity: chat.updatedAt
                    }));
                    socket.emit("patient:sessions", sessions);
                })
                .catch(err => console.error("Error fetching sessions on connect:", err));
        } else if (userType === "patient") {
            // Patient joins their specific chat room
            const room = `chat:${clinicId}:${patientId}`;
            socket.join(room);
            console.log(`Patient ${patientName} joined ${room}`);
        }

        // Handle Doctor Sending Message
        socket.on("doctor:message", async (data) => {
            try {
                const { patientId: targetPatientId, message } = data;
                // Verify doctor has access? (Assume yes if in clinic room)

                const chatRoom = `chat:${clinicId}:${targetPatientId}`;

                // Save to DB
                let chat = await Chat.findOne({ clinicId, patientId: targetPatientId });
                if (!chat) {
                    // Should exist if patient initiated, but maybe doctor initiates?
                    // UserDashboard initiates usually.
                    chat = new Chat({
                        clinicId,
                        patientId: targetPatientId,
                        patientName: data.patientName || "Unknown Patient",
                        messages: []
                    });
                }

                const newMessage = {
                    sender: "doctor",
                    message,
                    timestamp: new Date(),
                    read: false
                };

                chat.messages.push(newMessage);
                chat.lastMessage = newMessage;
                chat.unreadCount = 0; // Reset unread count for doctor? No, for patient reading it.
                // Actually unreadCount usually tracks what the *viewer* hasn't read.
                // Keep simple: unreadCount = messages from patient not read by doctor.
                // If doctor sends, it doesn't affect their unread count.

                await chat.save();

                // Emit to Patient
                io.to(chatRoom).emit("doctor:message", newMessage); // Patient listens to this (need to impl)

                // Emit back to Doctor (confirmation/update UI)
                socket.emit("message:sent", newMessage);

            } catch (error) {
                console.error("Error sending doctor message:", error);
            }
        });

        // Handle Generic Sending Message (compatible with chatSocketService)
        socket.on("message:send", async (data) => {
            try {
                // Determine if this is clinic-to-patient or clinic-to-PHN
                // For now, if we have patientId in auth or data, it's clinic-to-patient
                const targetPatientId = data.patientId || patientId;

                if (targetPatientId) {
                    // Logic same as doctor:message
                    const chatRoom = `chat:${clinicId}:${targetPatientId}`;
                    let chat = await Chat.findOne({ clinicId, patientId: targetPatientId });
                    if (!chat) {
                        chat = new Chat({
                            clinicId,
                            patientId: targetPatientId,
                            patientName: data.patientName || "Patient",
                            messages: []
                        });
                    }

                    const newMessage = {
                        sender: userType === "patient" ? "patient" : "doctor",
                        message: data.message,
                        timestamp: new Date(),
                        read: false
                    };

                    chat.messages.push(newMessage);
                    chat.lastMessage = newMessage;
                    if (userType === "patient") chat.unreadCount += 1;
                    else chat.unreadCount = 0;

                    await chat.save();

                    if (userType === "patient") {
                        io.to(`clinic:${clinicId}`).emit("patient:message", { patientId, patientName: chat.patientName, ...newMessage });
                        io.to(`clinic:${clinicId}`).emit("message:received", newMessage);
                    } else {
                        io.to(chatRoom).emit("doctor:message", newMessage);
                        io.to(chatRoom).emit("message:received", newMessage);
                    }
                    socket.emit("message:sent", newMessage);
                }
            } catch (error) {
                console.error("Error in message:send:", error);
            }
        });

        // Handle Patient Sending Message
        socket.on("patient:message", async (data) => {
            try {
                const { message } = data; // patientId, clinicId from auth

                const chatRoom = `chat:${clinicId}:${patientId}`;

                // Save to DB
                let chat = await Chat.findOne({ clinicId, patientId });
                if (!chat) {
                    chat = new Chat({
                        clinicId,
                        patientId,
                        patientName: patientName || "Patient",
                        messages: []
                    });
                }

                // Update patient name if provided/changed
                if (patientName) chat.patientName = patientName;

                const newMessage = {
                    sender: "patient",
                    message,
                    timestamp: new Date(),
                    read: false
                };

                chat.messages.push(newMessage);
                chat.lastMessage = newMessage;
                chat.unreadCount += 1;

                await chat.save();

                // Emit to Doctor (all doctors in clinic)
                io.to(`clinic:${clinicId}`).emit("patient:message", {
                    patientId,
                    patientName: chat.patientName,
                    ...newMessage
                });

                // Emit back to Patient (confirmation)
                socket.emit("message:sent", newMessage);

            } catch (error) {
                console.error("Error sending patient message:", error);
            }
        });

        // Handle Read Receipt
        socket.on("doctor:read_messages", async (data) => {
            try {
                const { patientId: targetPatientId } = data;
                await Chat.updateOne(
                    { clinicId, patientId: targetPatientId },
                    { $set: { unreadCount: 0 } } // Reset unread count
                );
            } catch (e) {
                console.error(e);
            }
        });

        // --- WebRTC Video Signaling ---
        socket.on("join-video-room", (roomId) => {
            socket.join(roomId);
            socket.to(roomId).emit("user-connected", socket.id);
            
            socket.on("disconnect", () => {
                socket.to(roomId).emit("user-disconnected", socket.id);
            });
        });

        socket.on("video-offer", (data) => {
            socket.to(data.roomId).emit("video-offer", { offer: data.offer, sender: socket.id });
        });

        socket.on("video-answer", (data) => {
            socket.to(data.roomId).emit("video-answer", { answer: data.answer, sender: socket.id });
        });

        socket.on("new-ice-candidate", (data) => {
            socket.to(data.roomId).emit("new-ice-candidate", { candidate: data.candidate, sender: socket.id });
        });

        socket.on("disconnect", () => {
            console.log("Socket Disconnected:", socket.id);
        });
    });
};
