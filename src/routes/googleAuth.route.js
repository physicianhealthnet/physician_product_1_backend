import express from "express";
import { oauth2Client } from "../config/google.js";
import fs from "fs";
import path from "path";
import GoogleToken from "../models/GoogleToken.model.js";
import { createInstantMeet } from "../services/googleCalendar.service.js";

const authRouter = express.Router();

// Helper function to update .env variable
function updateEnvVariable(key, value) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      if (envContent && !envContent.endsWith("\n")) {
        envContent += "\n";
      }
      envContent += `${key}=${value}\n`;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log(`Successfully updated ${key} in .env`);
  } catch (error) {
    console.error("Failed to update .env variable:", error);
  }
}

authRouter.get("/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/drive",
    ],
    prompt: "consent", // Force consent screen to ensure refresh token is returned
  });

  res.redirect(url);
});

authRouter.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send("Authorization code is missing");
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log("Tokens retrieved successfully:", tokens);

    // Save tokens to database
    const dbTokenData = {
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
    };
    if (tokens.refresh_token) {
      dbTokenData.refreshToken = tokens.refresh_token;
    } else {
      const existingToken = await GoogleToken.findOne();
      if (existingToken && existingToken.refreshToken) {
        dbTokenData.refreshToken = existingToken.refreshToken;
      } else if (process.env.GOOGLE_REFRESH_TOKEN) {
        dbTokenData.refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      }
    }
    
    // Always upsert the token document to ensure a record exists
    const savedToken = await GoogleToken.findOneAndUpdate(
      {},
      dbTokenData,
      { upsert: true, new: true }
    );

    console.log("Token successfully persisted in database:", savedToken);

    // Save the refresh token in the env file if we received it
    if (tokens.refresh_token) {
      updateEnvVariable("GOOGLE_REFRESH_TOKEN", tokens.refresh_token);
    }

    // Redirect to the success page to prevent resubmitting the code on refresh
    res.redirect("/auth/success");
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    
    // Check if we already have a refresh token in DB or Env
    const dbToken = await GoogleToken.findOne();
    if ((dbToken && dbToken.refreshToken) || process.env.GOOGLE_REFRESH_TOKEN) {
      return res.redirect("/auth/success");
    }

    res.status(500).send("OAuth failed: " + error.message);
  }
});

authRouter.get("/success", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Google Connection Success</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          }
          .card {
            background: white;
            padding: 3rem 2rem;
            border-radius: 20px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08), 0 5px 15px rgba(0, 0, 0, 0.05);
            text-align: center;
            max-width: 420px;
            width: 90%;
            transition: transform 0.3s ease;
          }
          .card:hover {
            transform: translateY(-5px);
          }
          .icon-container {
            width: 72px;
            height: 72px;
            background: #e8f5e9;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
          }
          .icon-container svg {
            width: 36px;
            height: 36px;
            color: #2e7d32;
          }
          h1 {
            color: #1e293b;
            font-size: 1.75rem;
            margin: 0 0 0.75rem;
            font-weight: 700;
          }
          p {
            color: #64748b;
            line-height: 1.6;
            margin: 0 0 2rem;
            font-size: 1rem;
          }
          .btn {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 0.75rem 2rem;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.2s ease, transform 0.1s ease;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
          }
          .btn:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
          }
          .btn:active {
            transform: translateY(1px);
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-container">
            <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path>
            </svg>
          </div>
          <h1>Connected Successfully</h1>
          <p>Google has been connected successfully to your account. You can now safely close this window.</p>
          <a href="javascript:window.close()" class="btn">Close Window</a>
        </div>
      </body>
    </html>
  `);
});

authRouter.post("/instant-meet", async (req, res) => {
  try {
    const { attendees } = req.body;
    const result = await createInstantMeet(attendees);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, meetLink: "https://meet.new", error: err.message });
  }
});

authRouter.get("/status", async (req, res) => {
  try {
    const hasToken = !!(await GoogleToken.findOne()) || !!process.env.GOOGLE_REFRESH_TOKEN;
    res.json({ success: true, connected: hasToken });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default authRouter;