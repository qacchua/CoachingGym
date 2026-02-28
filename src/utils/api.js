import { firebaseConfig, app } from '../firebaseConfig'; // Added 'app' import
import { getFunctions, httpsCallable } from 'firebase/functions';

// --- API Call Logic ---
export const callGeminiAPI = async (prompt, responseSchema) => {
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    };

    const apiKey = firebaseConfig.apiKey; // Use the imported config
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let response;
    let retries = 3;
    let delay = 1000;
    while(retries > 0) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) break;
        } catch(error) { console.error("Fetch error:", error); }
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
    }

    if (!response || !response.ok) {
        throw new Error(`API error after retries.`);
    }

    const result = await response.json();

    if (result.candidates && result.candidates[0].content?.parts?.[0]?.text) {
        const jsonText = result.candidates[0].content.parts[0].text;
        try {
            return JSON.parse(jsonText);
        } catch (e) {
            throw new Error("Model returned invalid JSON.");
        }
    } else {
        if (result.candidates?.[0]?.finishReason) {
             throw new Error(`API finished with reason: ${result.candidates[0].finishReason}.`);
        }
        throw new Error("Invalid API response structure.");
    }
};

// --- Imagen Avatar Generation Call ---
export const generateImageAPI = async (prompt) => {
  try {
    console.log("Calling Cloud Function 'generateAvatar'...");
    
    // Initialize Firebase Functions
    const functions = getFunctions(app);
    
    // Reference the exact name of your deployed cloud function
    const generateAvatar = httpsCallable(functions, 'generateAvatar'); 
    
    // Call the function with the prompt
    const result = await generateAvatar({ prompt: prompt });
    
    if (!result.data || !result.data.image) {
      throw new Error("No image data returned from function.");
    }

    console.log("Successfully received image from Cloud Function.");
    
    // Return the base64 string directly to the UI
    return result.data.image; 
    
  } catch (error) {
    console.error("Error calling generateAvatar Cloud Function:", error);
    // Return null so the UI knows to fall back to the default avatar icon
    return null; 
  }
};

// --- Stripe Checkout Logic ---
export const startStripeCheckout = async (priceId) => {
  try {
    console.log("Starting Stripe Checkout...");
    
    // Initialize Firebase Functions
    const functions = getFunctions(app);
    const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession'); 
    
    // Call the backend function and pass the price ID
    const result = await createCheckoutSession({ priceId: priceId });
    
    // If successful, Stripe sends back a secure URL. Redirect the user there!
    if (result.data && result.data.url) {
      window.location.href = result.data.url; 
    } else {
      throw new Error("No Stripe URL returned from the server.");
    }
  } catch (error) {
    console.error("Error creating checkout session:", error);
    alert("Unable to start checkout. Please check the console for details.");
  }
};