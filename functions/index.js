const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params"); 
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore"); 
const { GoogleAuth } = require("google-auth-library"); 
const { VertexAI } = require('@google-cloud/vertexai'); // Use the installed SDK
const GEMINI_VOICE_KEY = defineSecret("GEMINI_VOICE_KEY");

// Initialize Firebase Admin and Database
initializeApp();
const db = getFirestore(); 

const project = process.env.GCLOUD_PROJECT; 
const location = "us-central1"; 

// Define secrets
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET"); 

// --- NEW FUNCTION: Generate Feedback (Gemini via Vertex AI) ---
exports.generateFeedback = onCall({ 
    cors: true, 
    timeoutSeconds: 600, // Gives the AI up to 5 minutes to read the transcript
    memory: "1GiB"       // Bumps the RAM so it doesn't struggle with massive text walls
}, async (request) => {
    // Optional: Ensure only logged-in users can evaluate
    // if (!request.auth) {
    //     throw new HttpsError('unauthenticated', 'You must be logged in to evaluate transcripts.');
    // }

    const { prompt, responseSchema } = request.data;

    if (!prompt) {
        throw new HttpsError('invalid-argument', 'Missing prompt.');
    }

    try {
        // 1. Initialize Vertex AI with Application Default Credentials (ADC)
        const vertexAi = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: "us-central1" });

        // 2. Instantiate the model
        const generativeModel = vertexAi.getGenerativeModel({
            model: 'gemini-2.5-pro',
            generationConfig: {
                responseMimeType: "application/json",
                ...(responseSchema && { responseSchema: responseSchema }) // Inject schema if provided
            }
        });

        // 3. Make the call
        const responseStream = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const result = await responseStream.response;

        // 4. Parse and return the JSON
        if (result.candidates && result.candidates[0].content?.parts?.[0]?.text) {
            const jsonText = result.candidates[0].content.parts[0].text;
            try {
                return JSON.parse(jsonText); 
            } catch (e) {
                console.error("Model returned invalid JSON:", jsonText);
                throw new HttpsError('internal', 'Model returned invalid JSON formatting.');
            }
        } else {
            throw new HttpsError('internal', 'Invalid response structure from AI.');
        }

    } catch (error) {
        console.error("Vertex AI execution error:", error);
        throw new HttpsError('internal', 'An error occurred while processing the request.');
    }
});


// --- FUNCTION 1: Generate Avatar ---
exports.generateAvatar = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to generate images.');
    }

    const prompt = request.data.prompt;
    if (!prompt) {
        throw new HttpsError('invalid-argument', 'A prompt is required.');
    }

    try {
        const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
        const token = await auth.getAccessToken();

        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;

        const payload = {
            instances: [{ prompt: prompt }],
            parameters: { sampleCount: 1, aspectRatio: "1:1", personGeneration: "ALLOW_ADULT" }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Imagen API failed with status: ${response.status}`);

        const data = await response.json();
        const base64Image = data.predictions[0].bytesBase64Encoded;
        
        return { success: true, image: `data:image/jpeg;base64,${base64Image}` };

    } catch (error) {
        console.error("Server Error:", error);
        throw new HttpsError('internal', 'Image generation failed on the server.');
    }
}); 


// --- FUNCTION 2: Create Stripe Checkout ---
exports.createCheckoutSession = onCall({ 
    cors: true, 
    secrets: [stripeSecretKey] 
}, async (request) => {
    
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to subscribe.');
    }

    const stripe = require("stripe")(stripeSecretKey.value());
    const priceId = request.data.priceId;

    if (!priceId) throw new HttpsError('invalid-argument', 'A valid price ID is required.');

    const baseUrl = process.env.GCLOUD_PROJECT === "coachq-prod" 
        ? "https://coachinggym.app" 
        : "https://coachinggym.dev";

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription', 
            payment_method_types: ['card'],
            customer_email: request.auth.token.email,
            client_reference_id: request.auth.uid, 
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${baseUrl}/payment-success`,
            cancel_url: `${baseUrl}/pricing`,
            allow_promotion_codes: true,
        });

        return { url: session.url };
    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        throw new HttpsError('internal', 'Unable to create checkout session.');
    }
});

// --- FUNCTION 3: STRIPE WEBHOOK LISTENER ---
exports.stripeWebhook = onRequest({ 
    secrets: [stripeSecretKey, stripeWebhookSecret] 
}, async (req, res) => {
    
    const stripe = require("stripe")(stripeSecretKey.value());
    const sig = req.headers["stripe-signature"];
    const endpointSecret = stripeWebhookSecret.value();

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    switch (event.type) {
        
        // 1. User signs up and pays successfully
        case "checkout.session.completed": {
            const session = event.data.object;
            const userId = session.client_reference_id; 

            if (userId) {
                try {
                    await db.collection("users").doc(userId).set({
                        isPremium: true,
                        stripeCustomerId: session.customer,
                        subscriptionStatus: "active"
                    }, { merge: true });
                    console.log(`Successfully upgraded user: ${userId}`);
                } catch (error) {
                    console.error("Error updating Firestore on checkout complete:", error);
                    res.status(500).send("Database error");
                    return;
                }
            }
            break;
        }

        // 2. A user updates their card after a failure, or a recurring renewal goes through
        case "invoice.payment_succeeded": {
            const succeededInvoice = event.data.object;
            if (succeededInvoice.subscription) {
                try {
                    const snap = await db.collection("users").where("stripeCustomerId", "==", succeededInvoice.customer).get();
                    if (!snap.empty) {
                        for (const doc of snap.docs) {
                            await db.collection("users").doc(doc.id).update({
                                isPremium: true,
                                subscriptionStatus: "active"
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error processing invoice.payment_succeeded:", error);
                    res.status(500).send("Database error");
                    return;
                }
            }
            break;
        }

        // 3. A recurring payment fails (e.g. card expired, insufficient funds)
        case "invoice.payment_failed": {
            const failedInvoice = event.data.object;
            try {
                const snapshot = await db.collection("users").where("stripeCustomerId", "==", failedInvoice.customer).get();
                if (!snapshot.empty) {
                    for (const doc of snapshot.docs) {
                        await db.collection("users").doc(doc.id).update({
                            isPremium: false,
                            subscriptionStatus: "past_due"
                        });
                    }
                }
            } catch (error) {
                console.error("Error processing invoice.payment_failed:", error);
                res.status(500).send("Database error");
                return;
            }
            break;
        }

        // 4. The user actively cancels their subscription
        case "customer.subscription.deleted": {
            const deletedSub = event.data.object;
            try {
                const delSnapshot = await db.collection("users").where("stripeCustomerId", "==", deletedSub.customer).get();
                if (!delSnapshot.empty) {
                    for (const doc of delSnapshot.docs) {
                        await db.collection("users").doc(doc.id).update({
                            isPremium: false,
                            subscriptionStatus: "canceled"
                        });
                    }
                }
            } catch (error) {
                console.error("Error processing customer.subscription.deleted:", error);
                res.status(500).send("Database error");
                return;
            }
            break;
        }

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
});

exports.generateSpeech = onCall({ 
    cors: true,
    secrets: [GEMINI_VOICE_KEY] 
}, async (request) => {
    const { text, gender } = request.data;
    
    if (!text) {
        throw new HttpsError('invalid-argument', 'Text is required');
    }

    // Assign the correct Gemini voice model
    const voiceName = gender?.toLowerCase() === 'male' ? 'Charon' : 'Kore';
    
    const payload = {
        contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
        generationConfig: { 
            responseModalities: ["AUDIO"], 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } 
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_VOICE_KEY.value()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("Gemini API Error:", response.statusText);
            throw new HttpsError('internal', 'Failed to generate speech from Gemini API');
        }

        const result = await response.json();
        const audioData = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (!audioData) {
            throw new HttpsError('internal', 'No audio data returned');
        }

        return { audioData };
        
    } catch (error) {
        console.error("Speech Generation Error:", error);
        throw new HttpsError('internal', error.message);
    }
});