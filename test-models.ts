
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function listModels() {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found in VITE_GEMINI_API_KEY");
        return;
    }

    const genAI = new GoogleGenAI(apiKey);
    try {
        // Note: The specific method to list models might vary by library version
        // but usually it's genAI.listModels() or via a sub-client.
        // Let's try the common one for @google/genai (likely similar to @google/generative-ai)
        const result = await genAI.models.list();
        console.log("Available Models:");
        result.models.forEach((m: any) => {
            console.log(`- ${m.name}`);
        });
    } catch (error: any) {
        console.error("Error listing models:", error.message);
    }
}

listModels();
