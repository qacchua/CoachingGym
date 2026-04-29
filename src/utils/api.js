import { app } from '../firebaseConfig'; 
import { getFunctions, httpsCallable } from 'firebase/functions';

// --- API Call Logic (Now secured via Backend) ---
export const callGeminiAPI = async (prompt, responseSchema) => {
    try {
        console.log("Calling Cloud Function 'generateFeedback'...");
        
        // Initialize Firebase Functions
        const functions = getFunctions(app);
       const generateFeedback = httpsCallable(functions, 'generateFeedback', {
            timeout: 600000 
        });
        // Call the backend function and pass the payload
        const result = await generateFeedback({ 
            prompt: prompt, 
            responseSchema: responseSchema 
        });
        
        // Return the parsed JSON directly to the React components
        return result.data; 
        
    } catch (error) {
        console.error("Error calling Gemini Cloud Function:", error);
        throw new Error(`Evaluation failed: ${error.message}`);
    }
};

// --- Imagen Avatar Generation Call ---
export const generateImageAPI = async (prompt) => {
  try {
    console.log("Calling Cloud Function 'generateAvatar'...");
    
    const functions = getFunctions(app);
    const generateAvatar = httpsCallable(functions, 'generateAvatar'); 
    
    const result = await generateAvatar({ prompt: prompt });
    
    if (!result.data || !result.data.image) {
      throw new Error("No image data returned from function.");
    }

    console.log("Successfully received image from Cloud Function.");
    
    return result.data.image; 
    
  } catch (error) {
    console.error("Error calling generateAvatar Cloud Function:", error);
    return null; 
  }
};

// --- Stripe Checkout Logic ---
export const startStripeCheckout = async (priceId) => {
  try {
    console.log("Starting Stripe Checkout...");
    
    const functions = getFunctions(app);
    const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession'); 
    
    const result = await createCheckoutSession({ priceId: priceId });
    
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

// --- Voice Generation Call (Secured via Backend) ---
export const generateSpeechAPI = async (text, gender) => {
  try {
    const functions = getFunctions(app);
    // Call the exact name of the Cloud Function we just made
    const generateSpeech = httpsCallable(functions, 'generateSpeech'); 
    
    const result = await generateSpeech({ text, gender });
    
    if (!result.data || !result.data.audioData) {
      throw new Error("No audio data returned from server.");
    }
    
    return result.data.audioData; 
  } catch (error) {
    console.error("Error calling generateSpeech function:", error);
    return null; 
  }
};