// In functions/index.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { VertexAI } = require("@google-cloud/vertexai");

// Initialize Firebase Admin and Vertex AI
initializeApp();

const vertex_ai = new VertexAI({
  project: "coachq-eb00b", // <-- REPLACE THIS
  location: "us-central1",   // <-- REPLACE THIS (if different)
});