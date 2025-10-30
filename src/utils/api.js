import { firebaseConfig } from '../firebaseConfig'; // Import your config

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
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

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

export const generateImageAPI = async (prompt) => {
    const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } };
    const apiKey = firebaseConfig.apiKey; // Use the imported config
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    let response;
    for (let i = 0; i < 3; i++) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) break;
        } catch (error) {
            console.error("Image generation fetch error:", error);
        }
        await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }

    if (!response || !response.ok) {
        throw new Error(`Image generation API error after retries.`);
    }

    const result = await response.json();
    if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
        return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
    } else {
        throw new Error("Invalid response from image generation API.");
    }
};