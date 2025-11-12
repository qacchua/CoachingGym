// In functions/index.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { VertexAI } = require("@google-cloud/vertexai");

// Initialize Firebase Admin and Vertex AI
initializeApp();

const vertex_ai = new VertexAI({
  project: "YOUR_PROJECT_ID", // <-- REPLACE THIS
  location: "us-central1",   // <-- REPLACE THIS (if different)
});

// Create the HTTPS Callable Function
exports.generateImage = onCall(async (request) => {
  // Check for authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to call this function.");
  }

  const prompt = request.data.prompt;
  if (!prompt) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'prompt' argument.");
  }

  // Initialize the Vertex AI model
  const generativeModel = vertex_ai.getGenerativeModel({
    model: "imagen-3.0-generate-002",
  });

  try {
    // Generate the image
    const resp = await generativeModel.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
    });

    if (!resp.response || !resp.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      throw new Error("Invalid response structure from Vertex AI.");
    }

    // Get the base64 image data
    const base64Image = resp.response.candidates[0].content.parts[0].inlineData.data;

    // Return the data to the client
    return { base64Image: base64Image };

  } catch (error) {
    console.error("Error generating image:", error);
    throw new HttpsError("internal", "Failed to generate image.", error.message);
  }
});