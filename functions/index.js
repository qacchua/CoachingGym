const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params"); // <-- Moved to the top!
const { initializeApp } = require("firebase-admin/app");
const { GoogleAuth } = require("google-auth-library"); 

// Initialize Firebase Admin
initializeApp();

// Your specific Google Cloud/Firebase project details
const project = process.env.GCLOUD_PROJECT; 
const location = "us-central1"; 

// 1. Tell Firebase we want to pull this specific secret from the vault
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");


// --- FUNCTION 1: Generate Avatar ---
exports.generateAvatar = onCall({ cors: true }, async (request) => {
    
    // Ensure the user is logged in
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to generate images.');
    }

    const prompt = request.data.prompt;
    if (!prompt) {
        throw new HttpsError('invalid-argument', 'A prompt is required.');
    }

    try {
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const token = await auth.getAccessToken();

        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;

        const payload = {
            instances: [
                { prompt: prompt }
            ],
            parameters: {
                sampleCount: 1, 
                aspectRatio: "1:1",
                personGeneration: "ALLOW_ADULT" 
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Google Cloud API Error:", errorText);
            throw new Error(`Imagen API failed with status: ${response.status}`);
        }

        const data = await response.json();
        
        const base64Image = data.predictions[0].bytesBase64Encoded;
        
        return { 
            success: true, 
            image: `data:image/jpeg;base64,${base64Image}` 
        };

    } catch (error) {
        console.error("Server Error:", error);
        throw new HttpsError('internal', 'Image generation failed on the server.');
    }
}); // <-- Added missing semicolon


// --- FUNCTION 2: Create Stripe Checkout ---
exports.createCheckoutSession = onCall({ 
    cors: true, 
    secrets: [stripeSecretKey] 
}, async (request) => {
    
    // Ensure the user is logged in
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to subscribe.');
    }

    // Initialize Stripe INSIDE the function using the secret's value
    const stripe = require("stripe")(stripeSecretKey.value());
    const priceId = request.data.priceId;

    if (!priceId) {
        throw new HttpsError('invalid-argument', 'A valid price ID is required.');
    }

    // ... inside createCheckoutSession, right before the try/catch block ...

    // Automatically pick the right domain based on the Firebase project environment!
    const baseUrl = process.env.GCLOUD_PROJECT === "coachq-prod" 
        ? "https://coachinggym.app" 
        : "https://coachinggym.dev";

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription', 
            payment_method_types: ['card'],
            customer_email: request.auth.token.email,
            client_reference_id: request.auth.uid, 
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            // Dynamically inject the base URL we determined above
            success_url: `${baseUrl}/payment-success`,
            cancel_url: `${baseUrl}/pricing`,
        });

        return { url: session.url };
        
    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        throw new HttpsError('internal', 'Unable to create checkout session.');
    }
});