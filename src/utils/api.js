import { firebaseConfig } from '../firebaseConfig'; // Import your config
import { httpsCallable } from "firebase/functions";
import { functions } from '../App.jsx'; // <-- ADD THIS IMPORT

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
    //const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`;
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

//const generateImageFromFunction = httpsCallable(functions, 'generateImage');

//export const generateImageAPI = async (prompt) => {
  //try {
    //console.log("Calling Cloud Function 'generateImage'...");
    //const result = await generateImageFromFunction({ prompt: prompt });

    // The data is wrapped in 'result.data'
    //const base64Image = result.data.base64Image;

    //if (!base64Image) {
      //throw new Error("No image data returned from function.");
    //}

    //console.log("Successfully received image from Cloud Function.");
    //return `data:image/png;base64,${base64Image}`;

  //} catch (error) {
    //console.error("Error calling generateImage Cloud Function:", error);
    // This will pass the HttpsError message (e.g., "unauthenticated") to the UI
    //throw new Error(`Function Error: ${error.message}`);
  //}
//};