/**
 * WhatsApp Service for sending template messages via Askeva API
 */

export const sendWhatsAppTemplate = async (phone, templateName, variables, mediaUrl = null, fileName = "Document.pdf", mediaType = "document") => {
    if (!phone) {
        console.error("WhatsApp Error: No phone number provided");
        return false;
    }

    try {
        const formattedPhone = phone.replace(/\D/g, "");
        const finalPhone = formattedPhone.length === 10 ? "91" + formattedPhone : formattedPhone;

        const components = [];

        // Add media header if mediaUrl is provided (Headers usually come first)
        if (mediaUrl) {
            console.log(`Sending WhatsApp with ${mediaType} URL:`, mediaUrl);
            const mediaParam = {
                type: mediaType,
                [mediaType]: {
                    link: mediaUrl,
                }
            };

            if (mediaType === "document") {
                mediaParam.document.filename = fileName;
            }

            components.push({
                type: "header",
                parameters: [mediaParam]
            });
        }

        // Add body parameters
        components.push({
            type: "body",
            parameters: variables.map((variable) => ({
                type: "text",
                text: String(variable || "N/A"),
            })),
        });

        const payload = {
            to: finalPhone,
            type: "template",
            template: {
                name: templateName,
                language: {
                    policy: "deterministic",
                    code: "en",
                },
                components: components,
            },
        };

        console.log("WhatsApp Payload:", JSON.stringify(payload, null, 2));

        const res = await fetch(
            "https://backend.askeva.io/v1/message/send-message?token=9a7a05bc8b2b595ad726bdaa8414d2bf3303b7b463cbbcb431729a51e4aa09a85dc57924fbe452ebe0437d4bff4d90b2af25a4d4344ca31b385f35681298e41b",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }
        );

        const resData = await res.json().catch(() => ({}));
        console.log("WhatsApp Response Status:", res.status);
        console.log("WhatsApp Response Data:", JSON.stringify(resData, null, 2));

        if (!res.ok) {
            console.error(`WhatsApp Template Error [${templateName}]:`, JSON.stringify(resData, null, 2));
            return false;
        }

        console.log("WhatsApp Template sent successfully:", templateName);
        return true;
    } catch (error) {
        console.error("Failed to send WhatsApp template:", error);
        return false;
    }
};
