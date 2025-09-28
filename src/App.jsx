//Working Code as of 9/10/25 - 21:47 
// Removing the Recording Evaluator. Way too much unstable results

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Bot, FileText, Send, BrainCircuit, Sparkles, User, X, Loader2, Download, MessageSquare, BookOpenCheck, ShieldCheck, Lightbulb, HelpCircle, PieChart as PieChartIcon, PlusCircle, CheckSquare, Edit, Dices, List, UserPlus, Mic } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInAnonymously, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import myLogo from './assets/SiteLogo.png'; // <-- ADD THIS LINE
import { firebaseConfig } from './firebaseConfig.js'; // <-- ADD THIS IMPORT

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);


// --- Helper Components ---

const IconWrapper = ({ children, className = '' }) => (
  <div className={`bg-stone-200 text-stone-700 rounded-lg p-3 inline-flex ${className}`}>
    {children}
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseClasses = 'px-6 py-3 font-semibold rounded-lg transition-transform duration-200 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-stone-700 text-white hover:bg-stone-800 active:scale-95 shadow-lg shadow-stone-500/30',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95',
  };
  return (
    <button onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const LoadingSpinner = ({ text = "Analyzing conversation..." }) => (
    <div className="flex flex-col items-center justify-center gap-4 my-8">
        <Loader2 className="w-12 h-12 text-stone-700 animate-spin" />
        <p className="text-slate-600 text-lg">{text}</p>
    </div>
);


// --- API Call Logic ---
const callGeminiAPI = async (prompt, responseSchema) => {
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    };
    
    // This key is used for the preview environment.
    // For deployment, this MUST be changed to firebaseConfig.apiKey
    const apiKey = firebaseConfig.apiKey; 
    
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
            throw new Error("The model returned a response that was not valid JSON.");
        }
    } else {
        if (result.candidates?.[0]?.finishReason) {
             throw new Error(`API call finished with reason: ${result.candidates[0].finishReason}.`);
        }
        throw new Error("Invalid or empty response structure from API.");
    }
};

const generateImageAPI = async (prompt) => {
    const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } };
    const apiKey = firebaseConfig.apiKey;
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
        throw new Error("Invalid or empty response from image generation API.");
    }
};


// --- TTS Helper Functions ---
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function pcmToWav(pcmData, sampleRate) {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Sub-chunk size
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true); // Bits per sample
    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);

    // PCM data
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

// --- Main Application Components ---

const HomePage = ({ setView, currentUser }) => {
  return (
     <> {/* Fragment to wrap everything */}
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <p className="text-slate-600">Signed in as: <span className="font-semibold">{currentUser.email || 'Guest'}</span></p>
        <Button onClick={() => setView('logout')} variant="secondary">Sign Out</Button>
      </div>

     <div className="text-center">
      <img src={myLogo} alt="CoachQ Logo" className="w-24 h-24 mx-auto mb-4" />
      <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">The Coaching Gym</h1>
      <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
        "Practice doesn't make Perfect. Perfect Practice makes Perfect." - Vince Lombardi
      </p>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><BookOpenCheck className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">ICF Competency Quiz</h2>
            <p className="text-slate-600 mb-6">Updated to reflect the new 2025 ICF Core Competencies.</p>
          </div>
          <Button onClick={() => setView('quiz')}>Start Quiz</Button>
        </Card>
        <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><Bot className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Simulate a Coaching Session (Text)</h2>
            <p className="text-slate-600 mb-6">Engage in a text-based session with an AI client.</p>
          </div>
          <Button onClick={() => setView('simulation')}>Start Text Simulation</Button>
        </Card>
        <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><Mic className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Simulate a Coaching Session (Voice)</h2>
            <p className="text-slate-600 mb-6">Practice by speaking with an AI client and hearing responses (BETA).</p>
          </div>
          <Button onClick={() => setView('voiceSimulation')}>Start Voice Simulation</Button>
        </Card>
        <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><FileText className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Evaluate Transcript</h2>
            <p className="text-slate-600 mb-6">Upload a text transcript for a detailed analysis.</p>
          </div>
          <Button onClick={() => setView('transcript')}>Start Evaluation</Button>
        </Card>           
         <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><ShieldCheck className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Ethical Dilemma Simulator</h2>
            <p className="text-slate-600 mb-6">Navigate tricky ethical scenarios with AI mentor feedback.</p>
          </div>
          <Button onClick={() => setView('dilemma')}>Start Simulation</Button>
        </Card>
      </div>
    </div>
    </> 
  );{/* <-- 2. Add the closing fragment tag here */}
};

const TranscriptEvaluator = ({ setView, setEvaluationResult }) => {
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing conversation...");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setTranscript('');
    setIsParsing(true);

    const reader = new FileReader();
    try {
      if (file.type === "text/plain") {
        reader.onload = (e) => { setTranscript(e.target.result); setIsParsing(false); };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        const { default: pdfjsLib } = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/+esm');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/build/pdf.worker.min.js`;
        reader.onload = async function() {
          try {
            const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              fullText += content.items.map(item => item.str).join(' ');
            }
            setTranscript(fullText);
          } catch (e) { setError("Could not parse PDF."); } 
          finally { setIsParsing(false); }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.docx')) {
        const { default: mammoth } = await import('https://cdn.jsdelivr.net/npm/mammoth@1.7.2/+esm');
        reader.onload = async function() {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer: this.result });
            setTranscript(result.value);
          } catch(e) { setError("Could not parse DOCX."); } 
          finally { setIsParsing(false); }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setError("Unsupported file type.");
        setIsParsing(false);
      }
    } catch (e) {
      setError("Could not load library for this file type.");
      setIsParsing(false);
    }
  };

  const handleEvaluate = useCallback(async (textToEvaluate) => {
    const finalTranscript = textToEvaluate || transcript;
    if (finalTranscript.trim().length < 50) {
      setError("Transcript is too short to evaluate.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    
    const chunkTranscript = (text, chunkSize = 15000) => {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.substring(i, i + chunkSize));
        }
        return chunks;
    };

    try {
      const fullReport = {
        evaluation: [],
        speakerAnalysis: { coachPercentage: 0, clientPercentage: 0 },
        keyInsights: [],
        alternativeQuestions: [],
        questionAnalysis: { openEnded: 0, leading: 0, clarifying: 0, observation: 0 }
      };

      const chunks = chunkTranscript(finalTranscript);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setLoadingText(`Analyzing chunk ${i + 1} of ${chunks.length}...`);

        const competencyPrompt = `Analyze the following coaching transcript chunk based on the official ICF Core Competencies. You must evaluate ONLY the following competencies: 
              - Establishes and Maintains Agreements
              - Cultivates Trust and Safety
              - Maintains Presence
              - Listens Actively
              - Evokes Awareness
              - Facilitates Client Growth
              For each of these competencies, provide a rating (Exemplary, Proficient, Sufficient, Needs Development) and a detailed justification with examples from the transcript. Return a JSON object with a single key "evaluation" containing an array of objects. Transcript Chunk: ${chunk}`;
        const competencySchema = {type: "OBJECT", properties: { evaluation: { type: "ARRAY", items: { type: "OBJECT", properties: { competency: { type: "STRING" }, rating: { type: "STRING" }, justification: { type: "STRING" } } } } } };
        const competencyResult = await callGeminiAPI(competencyPrompt, competencySchema);
        fullReport.evaluation.push(...competencyResult.evaluation);
      }
      
      setLoadingText("Finalizing analysis...");
      
      const talkTimePrompt = `Analyze the speaker talk time in the full transcript. Estimate the percentage of talk time for the Coach and the Client. Return a JSON object with keys "coachPercentage" and "clientPercentage". Full Transcript: ${finalTranscript}`;
      const talkTimeSchema = { type: "OBJECT", properties: { coachPercentage: { type: "NUMBER" }, clientPercentage: { type: "NUMBER" } } };
      fullReport.speakerAnalysis = await callGeminiAPI(talkTimePrompt, talkTimeSchema);

      const insightsPrompt = `Identify up to 5 pivotal moments of client insight from the full transcript. Return a JSON object with a single key "keyInsights" containing an array of strings. Full Transcript: ${finalTranscript}`;
      const insightsSchema = { type: "OBJECT", properties: { keyInsights: { type: "ARRAY", items: { type: "STRING" } } } };
      fullReport.keyInsights = (await callGeminiAPI(insightsPrompt, insightsSchema)).keyInsights;

      const questionsPrompt = `Suggest up to 5 powerful, alternative questions the coach could have asked based on the full transcript. Return a JSON object with a single key "alternativeQuestions" containing an array of strings. Full Transcript: ${finalTranscript}`;
      const questionsSchema = { type: "OBJECT", properties: { alternativeQuestions: { type: "ARRAY", items: { type: "STRING" } } } };
      fullReport.alternativeQuestions = (await callGeminiAPI(questionsPrompt, questionsSchema)).alternativeQuestions;
      
      const questionAnalysisPrompt = `Analyze the Coach's dialogue in the full transcript. Categorize each question into 'Open-Ended', 'Leading', 'Clarifying', or 'Observation'. Provide the percentage breakdown. Return a JSON object with keys "openEnded", "leading", "clarifying", and "observation". Full Transcript: ${finalTranscript}`;
      const questionAnalysisSchema = { type: "OBJECT", properties: { openEnded: { type: "NUMBER" }, leading: { type: "NUMBER" }, clarifying: { type: "NUMBER" }, observation: { type: "NUMBER" } } };
      fullReport.questionAnalysis = await callGeminiAPI(questionAnalysisPrompt, questionAnalysisSchema);
      
      fullReport.foundationalCompetencies = [
          { competency: "1: Demonstrates Ethical Practice", assessmentNote: "Assessed on an 'Observed / Not Observed' basis." },
          { competency: "2: Embodies a Coaching Mindset", assessmentNote: "Assessed via the ICF Credentialing Exam." }
      ];

      const consolidatedEval = {};
      fullReport.evaluation.forEach(item => {
          if (!consolidatedEval[item.competency]) {
              consolidatedEval[item.competency] = { justifications: [], ratings: {} };
          }
          consolidatedEval[item.competency].justifications.push(item.justification);
          consolidatedEval[item.competency].ratings[item.rating] = (consolidatedEval[item.competency].ratings[item.rating] || 0) + 1;
      });

      fullReport.evaluation = Object.keys(consolidatedEval).map(key => {
          const ratings = consolidatedEval[key].ratings;
          const topRating = Object.keys(ratings).reduce((a, b) => ratings[a] > ratings[b] ? a : b);
          return {
              competency: key,
              rating: topRating,
              justification: consolidatedEval[key].justifications.join(' ')
          };
      });

      setEvaluationResult({ ...fullReport, transcript: finalTranscript });
      setView('result');
    } catch (e) {
      setError(e.message || "An unexpected error occurred during evaluation.");
    } finally {
      setIsLoading(false);
    }
  }, [transcript, setView, setEvaluationResult]);

  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Evaluate a Transcript</h1>
        <Button onClick={() => setView('home')} variant="secondary" className="px-4 py-2 text-sm">&larr; Back</Button>
      </div>
      
      <p className="text-slate-600 mb-6">Upload a text transcript (.txt, .pdf, or .docx) or paste the content below. Please ensure your transcript has "Coach" and "Client" clearly identified.</p>
      
      <div>
        <div className="mb-4 flex items-center gap-4">
          <label htmlFor="file-upload" className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg ${isParsing ? 'opacity-50' : 'hover:bg-slate-200'}`}>
            <Upload className="w-5 h-5" />
            <span>Upload Transcript File</span>
          </label>
          <input id="file-upload" type="file" className="hidden" accept=".txt,.pdf,.docx" onChange={handleFileChange} disabled={isParsing} />
           {isParsing && (<div className="flex items-center gap-2 text-slate-600"><Loader2 className="w-5 h-5 animate-spin" /><span>Parsing...</span></div>)}
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Or paste your transcript here..."
          className="w-full h-64 p-4 border border-slate-300 rounded-lg"
          disabled={isParsing}
        />
        <Button onClick={() => handleEvaluate()} disabled={!transcript.trim() || isParsing} className="mt-6 w-full md:w-auto">
          <Sparkles className="w-5 h-5" /> Evaluate Now
        </Button>
      </div>

      {isLoading && <LoadingSpinner text={loadingText} />}
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </Card>
  );
};

const dilemmas = [
  { title: "Conflict of Interest", scenario: "You are coaching a manager, Sarah, in a large tech company. During a session, Sarah tells you she is planning to apply for a senior director role that is about to open up. The next day, another one of your clients from the same company, David, tells you he is also planning to apply for that exact same role. How do you proceed?" },
  { title: "Confidentiality Breach", scenario: "Your client, a VP of Sales, is paying for their own coaching. After a particularly difficult session where the client expressed serious doubts about their role, you receive an email from the company's Head of HR, who referred you to the client. The HR head asks for a 'quick, informal update' on how the coaching is going. What is your response?" },
  { title: "Coachability Concerns", scenario: "You have been coaching a client for three sessions. In each session, they agree to specific actions but consistently fail to complete them, often blaming external factors. They seem to enjoy the conversation but are not making any progress toward their stated goals. How do you address this in your next session?" },
  { title: "Blurred Boundaries", scenario: "Your client, with whom you've built a strong rapport over six months, invites you to a celebratory dinner with their family to mark the promotion they achieved through your coaching. They insist on paying and want you to attend as a guest of honor. How do you handle this invitation?" }
];

const EthicalDilemmaSimulator = ({ setView, currentUser, dilemmaDocId, setDilemmaDocId }) => {
  const [dilemmaMode, setDilemmaMode] = useState('random');
  const [dilemmasList, setDilemmasList] = useState(dilemmas);
  const [currentDilemma, setCurrentDilemma] = useState(null);
  const [customDilemma, setCustomDilemma] = useState('');
  const [userResponse, setUserResponse] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flowStep, setFlowStep] = useState('select'); // 'select', 'respond', 'feedback'

  const loadRandomDilemma = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * dilemmasList.length);
    setCurrentDilemma(dilemmasList[randomIndex]);
    setUserResponse('');
    setFeedback(null);
  }, [dilemmasList]);

  useEffect(() => {
    loadRandomDilemma();
  }, [loadRandomDilemma]);

  // This function handles STEP 1: Creating the dilemma in the database
const handleDilemmaSubmit = async () => {
    setIsLoading(true);
    let dilemmaText;
    if (dilemmaMode === 'random') {
        if (!currentDilemma) {
            alert("Please select a random dilemma first.");
            setIsLoading(false);
            return;
        }
        dilemmaText = currentDilemma.scenario;
    } else { // 'custom'
        if (customDilemma.trim().length < 20) {
            alert("Please describe your dilemma in a bit more detail.");
            setIsLoading(false);
            return;
        }
        dilemmaText = customDilemma;
    }

    try {
        // Create a new document in Firestore with only the dilemma
        const docRef = await addDoc(collection(db, "dilemmas"), {
            userId: currentUser.uid,
            dilemma: dilemmaText,
            timestamp: new Date()
        });
        setDilemmaDocId(docRef.id); // Save the ID of the new document
        setFlowStep('respond');     // Move to the next step
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Could not save dilemma. Please try again.");
    } finally {
        setIsLoading(false);
    }
};

// This function handles STEP 2: Adding the solution and getting feedback
const handleSolutionSubmit = async () => {
  // Guard clause to ensure we have an ID
  if (!dilemmaDocId) {
    console.error("Dilemma Document ID is missing. Cannot proceed.");
    alert("A critical error occurred. Please refresh the page and try again.");
    return;
  }

  if (userResponse.trim().length < 10) {
    alert("Please provide a more detailed response.");
    return;
  }
  setIsLoading(true);

  // --- STEP 1: ATTEMPT TO UPDATE FIRESTORE ---
  try {
    const dilemmaRef = doc(db, "dilemmas", dilemmaDocId);
    await updateDoc(dilemmaRef, {
      solution: userResponse
    });
    console.log("Firestore update successful. Document ID:", dilemmaDocId);

  } catch (error) {
    console.error("FIRESTORE UPDATE FAILED:", error);
    alert("Error saving your solution. This is likely a Firestore security rule issue. Please check the console for details.");
    setIsLoading(false);
    return; // Stop if this fails
  }

  // --- STEP 2: ATTEMPT TO CALL THE AI MODEL ---
  try {
    const dilemmaText = dilemmaMode === 'random' ? currentDilemma.scenario : customDilemma;

    const feedbackSchema = {
      type: "OBJECT",
      properties: {
        strengths: { type: "STRING", description: "Positive aspects of the user's response." },
        pitfalls: { type: "STRING", description: "Potential risks or ethical blind spots." },
        alternatives: { type: "STRING", description: "Suggestions for alternative actions." }
      },
      required: ["strengths", "pitfalls", "alternatives"]
    };

    const feedbackPrompt = `
      You are an ICF Master Certified Coach. A coach has the ethical dilemma: "${dilemmaText}"
      Their proposed solution is: "${userResponse}"
      Analyze this based on ICF Code of Ethics and return feedback as a JSON object with keys "strengths", "pitfalls", and "alternatives".
    `;

    const result = await callGeminiAPI(feedbackPrompt, feedbackSchema);
    setFeedback(result);
    setFlowStep('feedback');

  } catch (error) {
    console.error("GEMINI API CALL FAILED:", error);
    alert("Error getting AI feedback. The API call failed. Please check the console for details.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-3xl font-bold text-slate-800">Ethical Dilemma Simulator</h1>
        <Button onClick={() => setView('home')} variant="secondary" className="px-4 py-2 text-sm">&larr; Back</Button>
      </div>
    
      {/* STEP 1: SELECT DILEMMA */}
        {flowStep === 'select' && (
            <>
                 {/* vvv THIS IS THE MISSING SECTION vvv */}
              <div className="my-6 border-b pb-6">
                <p className="block text-lg font-semibold text-slate-700 mb-3">1. Choose dilemma format</p>
                <div className="flex gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="dilemmaMode" value="random" checked={dilemmaMode === 'random'} onChange={() => setDilemmaMode('random')} className="h-4 w-4 text-stone-600" />
                    <span className="ml-2">Use a Random Dilemma</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="dilemmaMode" value="custom" checked={dilemmaMode === 'custom'} onChange={() => setDilemmaMode('custom')} className="h-4 w-4 text-stone-600" />
                    <span className="ml-2">Enter Your Own Dilemma</span>
                  </label>
                </div>
              </div>
        {/* ^^^ END OF MISSING SECTION ^^^ */}
        {/* ... Radio buttons to choose 'random' or 'custom' ... */}
                {dilemmaMode === 'random' && currentDilemma && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <h2 className="font-bold text-lg">{currentDilemma?.title}</h2>
                        <p className="mt-2">{currentDilemma?.scenario}</p>
                    </div>
                )}
                {dilemmaMode === 'custom' && (
                    <div>
                        <label htmlFor="custom-dilemma" className="block text-lg font-semibold text-slate-700 mb-2">Describe your dilemma:</label>
                        <textarea id="custom-dilemma" value={customDilemma} onChange={(e) => setCustomDilemma(e.target.value)} className="w-full h-32 p-4 border rounded-lg"/>
                    </div>
                )}
                <div className="mt-6 flex justify-end gap-4">
                    {dilemmaMode === 'random' && <Button onClick={loadRandomDilemma} variant="secondary">New Random Dilemma</Button>}
                    <Button onClick={handleDilemmaSubmit} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Proceed to Solution"}
                    </Button>
                </div>
            </>
        )}

        {/* STEP 2: PROVIDE RESPONSE */}
        {flowStep === 'respond' && (
            <>
                <div className="p-4 bg-slate-50 rounded-lg mb-6">
                    <h2 className="font-bold text-lg">The Dilemma:</h2>
                    <p className="italic mt-2">"{dilemmaMode === 'random' ? currentDilemma.scenario : customDilemma}"</p>
                </div>
                <div>
                    <label htmlFor="user-response" className="block text-lg font-semibold text-slate-700 mb-2">How would you handle this?</label>
                    <textarea id="user-response" value={userResponse} onChange={(e) => setUserResponse(e.target.value)} className="w-full h-48 p-4 border rounded-lg"/>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSolutionSubmit} disabled={isLoading}>
                         {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : "Submit for Feedback"}
                    </Button>
                </div>
            </>
        )}
        

      {isLoading && <LoadingSpinner text="Analyzing your response..." />}
      
      {feedback && (
         <div>
            <div className="p-4 bg-slate-100 rounded-lg mb-6">
                 <h2 className="font-bold text-lg">The Dilemma:</h2>
                <p className="italic mt-2">"{dilemmaMode === 'random' ? currentDilemma.scenario : customDilemma}"</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-lg mb-6">
                <h2 className="font-bold text-lg">Your Response:</h2>
                <p className="italic mt-2">"{userResponse}"</p>
            </div>
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">Mentor Coach Feedback</h2>
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-emerald-700 flex items-center gap-2"><CheckSquare /> Strengths</h3>
                    <p className="mt-1">{feedback.strengths}</p>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-amber-700 flex items-center gap-2"><Lightbulb /> Potential Pitfalls</h3>
                    <p className="mt-1">{feedback.pitfalls}</p>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-sky-700 flex items-center gap-2"><Sparkles /> Alternative Approaches</h3>
                    <p className="mt-1">{feedback.alternatives}</p>
                </div>
            </div>
             <div className="mt-8 flex justify-end">
                <Button onClick={() => {
                  setFeedback(null);
                  setUserResponse('');
                  setFlowStep('select');
                  if(dilemmaMode === 'random') loadRandomDilemma();
                }}>Try Another Dilemma</Button>
            </div>
         </div>
      )}
    </Card>
  );
};

const VoiceSimulation = ({ setView, currentUser, setEvaluationResult }) => {
  const [simulationStep, setSimulationStep] = useState('options');
  const [personas, setPersonas] = useState([]);
  const [persona, setPersona] = useState(null);
  const [personaImage, setPersonaImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [history, setHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [customPersona, setCustomPersona] = useState({ name: '', industry: '', role: '', challenges: '', goals: '', gender: 'Female', internalState: '', keyPeople: '' });
  
  const recognitionRef = useRef(null);
  const chatWindowRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in your browser. Please try Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const newHistory = [...history, { role: 'user', text: transcript }];
      setHistory(newHistory);
      handleAiResponse(newHistory);
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}. Please ensure microphone access is granted.`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
  }, [history]);

  const handleAiResponse = async (currentHistory) => {
    setIsThinking(true);
    const prompt = `You are acting as a coaching client. Your persona is: "${createDescriptionFromPersona(persona)}". Based on the conversation history below, provide a natural, in-character response that embodies the persona's internal state and refers to key people by name. Keep your response concise. History:\n${currentHistory.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n')}`;
    const chatSchema = { type: "OBJECT", properties: { responseText: { type: "STRING" } }, required: ["responseText"] };
    try {
      const result = await callGeminiAPI(prompt, chatSchema);
      const modelResponse = result.responseText || "I'm not sure what to say.";
      setHistory(prev => [...prev, { role: 'model', text: modelResponse }]);
      speak(modelResponse, persona.gender);
    } catch (e) {
      console.error(e);
      const errorMessage = "Sorry, an error occurred.";
      setHistory(prev => [...prev, { role: 'model', text: errorMessage }]);
      speak(errorMessage, 'Female');
    } finally {
      setIsThinking(false);
    }
  };
  
  const speak = async (text, gender = 'Female') => {
    if (!text) return;
    setIsSpeaking(true);

    const voiceName = gender.toLowerCase() === 'male' ? 'Charon' : 'Kore'; // Male: Informative, Female: Firm

    const payload = {
        contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName }
                }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    // For deployment, this MUST be changed to firebaseConfig.apiKey
    const apiKey = firebaseConfig.apiKey;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`TTS API request failed with status ${response.status}`);
        }

        const result = await response.json();
        const audioData = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const mimeType = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;

        if (audioData && mimeType && mimeType.startsWith("audio/")) {
            const sampleRateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
            const pcmData = base64ToArrayBuffer(audioData);
            const pcm16 = new Int16Array(pcmData);
            const wavBlob = pcmToWav(pcm16, sampleRate);
            const audioUrl = URL.createObjectURL(wavBlob);
            const audio = new Audio(audioUrl);
            audio.onended = () => setIsSpeaking(false);
            audio.play();
        } else {
            throw new Error("Invalid audio data in TTS response.");
        }
    } catch (e) {
        console.error("Error generating or playing speech:", e);
        setError("Sorry, there was a problem generating the voice.");
        setIsSpeaking(false);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (isSpeaking || isThinking) return;
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setError(null);
      } catch (e) {
        console.error("Could not start recognition:", e);
        setError("Could not start recognition. Please ensure microphone permissions are enabled.");
      }
    }
  };
  
  const startSimulationWithPersona = async (personaObject) => {
    setIsGeneratingImage(true);
    setSimulationStep('generatingImage');
    setPersona(personaObject);
    
    try {
        const imagePrompt = `Professional, photorealistic headshot of a ${personaObject.gender.toLowerCase()} person who is a ${personaObject.role}. They are feeling challenged by ${personaObject.challenges}. Centered, looking at camera, pleasant background.`;
        const imageUrl = await generateImageAPI(imagePrompt);
        setPersonaImage(imageUrl);

        const initialGreeting = "Hello, coach. Thanks for meeting with me.";
        setHistory([{role: 'model', text: initialGreeting}]);
        setSimulationStep('chat');
        speak(initialGreeting, personaObject.gender);
    } catch (e) {
        console.error("Error generating persona image:", e);
        // Fallback if image generation fails
        const initialGreeting = "Hello, coach. Thanks for meeting with me. I couldn't get my camera working today.";
        setHistory([{role: 'model', text: initialGreeting}]);
        setSimulationStep('chat');
        speak(initialGreeting, personaObject.gender);
    } finally {
        setIsGeneratingImage(false);
    }
  };
  
  const handleEndAndEvaluate = useCallback(async () => {
     if (history.length < 2) {
         alert("Please have a slightly longer conversation before evaluating.");
         return;
     };
     setIsEvaluating(true);
     const transcript = history.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n');
     try {
        const fullReport = {};
        const competencyPrompt = `Analyze the following coaching transcript based on ICF competencies 3 through 8. For each competency, provide a rating (Exemplary, Proficient, Sufficient, Needs Development) and a detailed justification. Return a JSON object with a single key "evaluation" containing an array of objects. Transcript: ${transcript}`;
        const competencySchema = {type: "OBJECT", properties: { evaluation: { type: "ARRAY", items: { type: "OBJECT", properties: { competency: { type: "STRING" }, rating: { type: "STRING" }, justification: { type: "STRING" } }, required: ["competency", "rating", "justification"] } } } };
        const competencyResult = await callGeminiAPI(competencyPrompt, competencySchema);
        fullReport.evaluation = competencyResult.evaluation;
        fullReport.foundationalCompetencies = [
            { competency: "1: Demonstrates Ethical Practice", assessmentNote: "This competency is evaluated on an 'Observed / Not Observed' basis during a live or recorded session review by a certified assessor, focusing on adherence to the ICF Code of Ethics." },
            { competency: "2: Embodies a Coaching Mindset", assessmentNote: "This competency reflects ongoing development and is primarily assessed through the written ICF Credentialing Exam and mentor coaching, rather than a single performance evaluation." }
        ];

        const talkTimePrompt = `Analyze the speaker talk time in the following transcript. Estimate the percentage of talk time for the Coach and the Client. Return a JSON object with keys "coachPercentage" and "clientPercentage". Transcript: ${transcript}`;
        const talkTimeSchema = { type: "OBJECT", properties: { coachPercentage: { type: "NUMBER" }, clientPercentage: { type: "NUMBER" } }, required: ["coachPercentage", "clientPercentage"] };
        fullReport.speakerAnalysis = await callGeminiAPI(talkTimePrompt, talkTimeSchema);

        const insightsPrompt = `Identify up to 5 pivotal moments of insight the client experienced in this transcript. Return a JSON object with a single key "keyInsights" containing an array of strings. Transcript: ${transcript}`;
        const insightsSchema = { type: "OBJECT", properties: { keyInsights: { type: "ARRAY", items: { type: "STRING" } } } };
        fullReport.keyInsights = (await callGeminiAPI(insightsPrompt, insightsSchema)).keyInsights;

        const questionsPrompt = `Suggest up to 5 powerful, alternative questions the coach could have asked in this transcript to deepen insight. Return a JSON object with a single key "alternativeQuestions" containing an array of strings. Transcript: ${transcript}`;
        const questionsSchema = { type: "OBJECT", properties: { alternativeQuestions: { type: "ARRAY", items: { type: "STRING" } } } };
        fullReport.alternativeQuestions = (await callGeminiAPI(questionsPrompt, questionsSchema)).alternativeQuestions;

        const questionAnalysisPrompt = `Analyze the Coach's dialogue in this transcript. Categorize each question into 'Open-Ended', 'Leading', 'Clarifying', or 'Observation'. Provide the percentage breakdown. Return a JSON object with keys "openEnded", "leading", "clarifying", and "observation". Transcript: ${transcript}`;
        const questionAnalysisSchema = { type: "OBJECT", properties: { openEnded: { type: "NUMBER" }, leading: { type: "NUMBER" }, clarifying: { type: "NUMBER" }, observation: { type: "NUMBER" } }, required: ["openEnded", "leading", "clarifying", "observation"] };
        fullReport.questionAnalysis = await callGeminiAPI(questionAnalysisPrompt, questionAnalysisSchema);
        setEvaluationResult(fullReport);
        setView('result');
     } catch(e) {
        console.error(e);
        alert(e.message || "Sorry, there was an error evaluating your conversation.");
     } finally {
        setIsEvaluating(false);
     }
  }, [history, setView, setEvaluationResult]);

  const createDescriptionFromPersona = (p) => {
    return `You are to role-play as a coaching client with the following detailed persona. Embody their internal state, refer to the key people by name, and draw from their specific challenges and goals in your responses. Be detailed and realistic.

**Name:** ${p.name || 'Alex'}
**Role:** ${p.role} in the ${p.industry || 'any'} industry.
**Specific Challenges:** "${p.challenges}"
**Goals for this coaching session:** "${p.goals}"
**Internal State (How you feel inside):** "${p.internalState}"
**Key People in your story:** "${p.keyPeople}"`;
  };
  
  const defaultPersonas = [
    { 
      name: 'Alex Chen', 
      gender: 'Female',
      industry: 'Tech Startup', 
      role: 'New Manager', 
      challenges: "I'm drowning in work because I don't trust my team. My direct report, Ben, just missed a major deadline on the Apollo project, and I had to work all weekend to fix it myself. I feel like I have to do everything to get it right.", 
      goals: "To figure out how to delegate effectively without feeling like I'm losing control. I want to trust my team, especially Sarah who has potential, but I'm scared of them failing.",
      internalState: "Anxious, frustrated with my team but also with myself. Feels like a micromanager but doesn't know how to stop. Worried about burning out.",
      keyPeople: "Ben (Direct Report) - Recently missed a key deadline. Sarah (Direct Report) - Shows promise, but I hesitate to give her big tasks."
    },
    { 
      name: 'Maria Rodriguez', 
      gender: 'Female',
      industry: 'Corporate Finance', 
      role: 'Senior Executive', 
      challenges: "I just got out of a 3-hour Q3 planning meeting with my boss, Cynthia, and I felt nothing. We hit our targets, but I'm just going through the motions. The big promotion I wanted for years feels empty now that I'm in the running for it.", 
      goals: "To understand what's causing this disconnect. Is it the job? Is it me? I want to feel engaged and passionate again, even if it means considering a drastic change.",
      internalState: "Feeling numb, apathetic, and trapped. A sense of guilt for not appreciating the success. Confused about future career goals.",
      keyPeople: "Cynthia (My Boss, SVP) - Supportive, but high-pressure. Pushing me for the big promotion."
    },
    { 
      name: 'Sam Jones', 
      gender: 'Male',
      industry: 'Marketing', 
      role: 'Creative Director', 
      challenges: "My peer, a new director named David, is constantly undermining my team's ideas in cross-functional meetings. It's becoming political, and my team's morale is suffering. I avoid confronting him because I don't want to make things worse.", 
      goals: "To find a way to address the conflict with David constructively and protect my team's work and confidence without escalating a war.",
      internalState: "Frustrated, conflict-avoidant, protective of my team. Feeling a bit powerless and resentful.",
      keyPeople: "David (Peer, Director) - Undermines my team in public forums. My Team - Their morale is dropping and they are starting to disengage."
    },
  ];

  useEffect(() => {
    // This is a preview-only version and does not connect to Firestore
    setPersonas(defaultPersonas);
  }, []);
  
  const startCustomSimulation = async () => {
      const { name, industry, role, challenges, goals, gender, internalState, keyPeople } = customPersona;
      if (!role || !challenges || !goals) { alert("Please fill out Role, Challenges, and Goals."); return; }
      const newPersona = { name: name.trim() || `A ${role}`, industry: industry || 'Not specified', role, challenges, goals, gender, internalState, keyPeople };
      
      startSimulationWithPersona(newPersona);

      // NOTE: In the full version, this would save to Firestore. This is disabled for the preview.
      try { await addDoc(collection(db, "personas"), newPersona); } catch (error) { console.error("Error adding persona:", error); }
  };
  
  const startRandomSimulation = () => {
      if (personas.length === 0) { alert("Personas are still loading."); return; }
      const p = personas[Math.floor(Math.random() * personas.length)];
      startSimulationWithPersona(p);
  };

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [history]);
  
  if (error) {
    return (
        <Card className="max-w-2xl mx-auto text-center">
            <div className="flex justify-end">
                <Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm absolute top-6 right-6">&larr; Back</Button>
            </div>
            <IconWrapper><X className="w-8 h-8 text-red-500" /></IconWrapper>
            <h1 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Feature Not Supported</h1>
            <p className="text-slate-600">{error}</p>
        </Card>
    );
  }
  
  if (simulationStep === 'generatingImage') {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <LoadingSpinner text="Generating your AI client's portrait..." />
      </Card>
    );
  }

  if (simulationStep === 'chat') {
    return (
      <Card className="max-w-5xl mx-auto h-[85vh] flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3 flex flex-col items-center justify-center space-y-4">
            {personaImage ? (
                <img src={personaImage} alt="AI Persona" className={`rounded-full w-48 h-48 object-cover shadow-lg transition-all duration-300 ${isSpeaking ? 'ring-4 ring-stone-400 ring-offset-4 animate-pulse' : 'ring-4 ring-transparent'}`} />
            ) : (
                <div className="rounded-full w-48 h-48 bg-slate-200 flex items-center justify-center">
                    <User className="w-24 h-24 text-slate-400" />
                </div>
            )}
            <div className="text-center">
                <button onClick={toggleListen} disabled={isSpeaking || isThinking} className={`relative w-24 h-24 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center text-white disabled:opacity-50 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-stone-600 hover:bg-stone-700'}`}>
                    <Mic size={40} />
                </button>
                <p className="mt-4 text-slate-600 h-6">
                    {isListening ? "Listening..." : isThinking ? "Thinking..." : isSpeaking ? "Client is speaking..." : "Tap the mic to speak"}
                </p>
            </div>
        </div>
        
        <div className="md:w-2/3 flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
              <div><h1 className="text-2xl font-bold text-slate-800">Voice Simulation</h1></div>
              <Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm">&larr; Back</Button>
            </div>

            <div ref={chatWindowRef} className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6">
              {history.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'model' && <div className="bg-stone-700 text-white rounded-full p-2"><Bot size={20} /></div>}
                  <div className={`max-w-md p-4 rounded-2xl ${msg.role === 'user' ? 'bg-slate-200 text-slate-800' : 'bg-stone-700 text-white'}`}>{msg.text}</div>
                  {msg.role === 'user' && <div className="bg-slate-200 text-slate-800 rounded-full p-2"><User size={20} /></div>}
                </div>
              ))}
            </div>
            
            <Button onClick={handleEndAndEvaluate} disabled={isEvaluating} variant="secondary" className="w-full mt-4">
                {isEvaluating ? 'Evaluating...' : 'End Simulation & Evaluate'}
            </Button>
        </div>
      </Card>
    );
  }
  
  if (simulationStep === 'options') {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <div className="flex justify-end">
            <Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm absolute top-6 right-6">&larr; Back</Button>
        </div>
        <IconWrapper><Mic className="w-8 h-8" /></IconWrapper>
        <h1 className="text-3xl font-bold text-slate-800 mt-4 mb-4">Voice Simulation Options</h1>
        <p className="text-slate-600 mb-8">How would you like to start your coaching simulation?</p>
        <div className="space-y-4">
            <Button onClick={startRandomSimulation} variant="secondary" className="w-full" disabled={personas.length === 0}><Dices className="w-5 h-5" /> Select a Random Persona</Button>
            <Button onClick={() => setSimulationStep('select')} variant="secondary" className="w-full"><List className="w-5 h-5" /> Use Pre-populated Persona</Button>
            <Button onClick={() => setSimulationStep('create')} variant="secondary" className="w-full"><UserPlus className="w-5 h-5" /> Create Your Own Custom Persona</Button>
        </div>
      </Card>
    );
  }

  if (simulationStep === 'select') {
    return (
      <Card className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-slate-800">Choose a Client Persona</h1>
            <Button onClick={() => setSimulationStep('options')} variant="secondary" className="px-3 py-1 text-sm">&larr; Back</Button>
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
          {personas.map(p => (
            <button key={p.name} onClick={() => {
                startSimulationWithPersona(p);
            }} className="w-full text-left p-4 border border-slate-200 rounded-lg hover:bg-stone-50 hover:border-stone-400 transition">
              <h3 className="font-bold text-lg text-stone-700">{p.name}</h3>
              <p className="text-slate-600 text-sm"><span className="font-semibold">Role:</span> {p.role}</p>
              <p className="text-slate-600 text-sm"><span className="font-semibold">Challenges:</span> {p.challenges}</p>
            </button>
          ))}
        </div>
      </Card>
    );
  }

  if (simulationStep === 'create') {
    return (
        <Card className="max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-bold text-slate-800">Create Custom Persona</h1>
                <Button onClick={() => setSimulationStep('options')} variant="secondary" className="px-4 py-2 text-sm">&larr; Back</Button>
            </div>
            <div className="space-y-4">
                <div>
                    <label htmlFor="persona-name" className="block text-sm font-medium text-slate-700 mb-1">Name (Optional)</label>
                    <input type="text" id="persona-name" value={customPersona.name} onChange={(e) => setCustomPersona({...customPersona, name: e.target.value})} placeholder="e.g., Alex Chen" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                </div>
                <div className="text-left">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input type="radio" name="gender" value="Female" checked={customPersona.gender === 'Female'} onChange={(e) => setCustomPersona({...customPersona, gender: e.target.value})} className="h-4 w-4 text-stone-600 border-gray-300 focus:ring-stone-500" />
                      <span className="ml-2 text-slate-700">Female</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="gender" value="Male" checked={customPersona.gender === 'Male'} onChange={(e) => setCustomPersona({...customPersona, gender: e.target.value})} className="h-4 w-4 text-stone-600 border-gray-300 focus:ring-stone-500" />
                      <span className="ml-2 text-slate-700">Male</span>
                    </label>
                  </div>
                </div>
                 <div>
                    <label htmlFor="persona-role" className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <input type="text" id="persona-role" value={customPersona.role} onChange={(e) => setCustomPersona({...customPersona, role: e.target.value})} placeholder="e.g., New Manager" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                </div>
                <div>
                    <label htmlFor="persona-challenges" className="block text-sm font-medium text-slate-700 mb-1">Specific Challenges</label>
                    <textarea id="persona-challenges" value={customPersona.challenges} onChange={(e) => setCustomPersona({...customPersona, challenges: e.target.value})} placeholder="e.g., My direct report, Ben, missed a deadline and I had to work all weekend to fix it..." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                </div>
                 <div>
                    <label htmlFor="persona-goals" className="block text-sm font-medium text-slate-700 mb-1">Goals for the coaching session</label>
                    <textarea id="persona-goals" value={customPersona.goals} onChange={(e) => setCustomPersona({...customPersona, goals: e.target.value})} placeholder="e.g., Learn how to delegate effectively without losing control..." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                </div>
                <div>
                    <label htmlFor="persona-internal-state" className="block text-sm font-medium text-slate-700 mb-1">Internal State (How the client feels)</label>
                    <textarea id="persona-internal-state" value={customPersona.internalState} onChange={(e) => setCustomPersona({...customPersona, internalState: e.target.value})} placeholder="e.g., Anxious, frustrated with my team but also with myself..." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                </div>
                 <div>
                    <label htmlFor="persona-key-people" className="block text-sm font-medium text-slate-700 mb-1">Key People (Colleagues, managers, etc.)</label>
                    <textarea id="persona-key-people" value={customPersona.keyPeople} onChange={(e) => setCustomPersona({...customPersona, keyPeople: e.target.value})} placeholder="e.g., Ben (Direct Report) - struggling. Sarah (Direct Report) - has potential." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                </div>
                <Button onClick={startCustomSimulation} className="w-full">Start Simulation with this Persona</Button>
            </div>
        </Card>
    );
  }
};
const Simulation = ({ setView, currentUser, setEvaluationResult }) => {
    const [persona, setPersona] = useState(null);
    const [personas, setPersonas] = useState([]); // Restored this state
    const [history, setHistory] = useState([]);
    const [simulationStep, setSimulationStep] = useState('options'); // Default to options
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [customPersona, setCustomPersona] = useState({ name: '', industry: '', role: '', challenges: '', goals: '', internalState: '', keyPeople: '' });
    const [userInput, setUserInput] = useState(''); // Your original used this name
    const [isLoading, setIsLoading] = useState(false);
    const chatWindowRef = useRef(null);

    // This useEffect for loading community personas is correct!
    useEffect(() => {
        const defaultPersonas = [
          { 
            name: 'Alex Chen', 
            gender: 'Female',
            industry: 'Tech Startup', 
            role: 'New Manager', 
            challenges: "I'm drowning in work because I don't trust my team. My direct report, Ben, just missed a major deadline on the Apollo project, and I had to work all weekend to fix it myself. I feel like I have to do everything to get it right.", 
            goals: "To figure out how to delegate effectively without feeling like I'm losing control. I want to trust my team, especially Sarah who has potential, but I'm scared of them failing.",
            internalState: "Anxious, frustrated with my team but also with myself. Feels like a micromanager but doesn't know how to stop. Worried about burning out.",
            keyPeople: "Ben (Direct Report) - Recently missed a key deadline. Sarah (Direct Report) - Shows promise, but I hesitate to give her big tasks."
          },
          { 
            name: 'Maria Rodriguez', 
            gender: 'Female',
            industry: 'Corporate Finance', 
            role: 'Senior Executive', 
            challenges: "I just got out of a 3-hour Q3 planning meeting with my boss, Cynthia, and I felt nothing. We hit our targets, but I'm just going through the motions. The big promotion I wanted for years feels empty now that I'm in the running for it.", 
            goals: "To understand what's causing this disconnect. Is it the job? Is it me? I want to feel engaged and passionate again, even if it means considering a drastic change.",
            internalState: "Feeling numb, apathetic, and trapped. A sense of guilt for not appreciating the success. Confused about future career goals.",
            keyPeople: "Cynthia (My Boss, SVP) - Supportive, but high-pressure. Pushing me for the big promotion."
          },
          { 
            name: 'Sam Jones', 
            gender: 'Male',
            industry: 'Marketing', 
            role: 'Creative Director', 
            challenges: "My peer, a new director named David, is constantly undermining my team's ideas in cross-functional meetings. It's becoming political, and my team's morale is suffering. I avoid confronting him because I don't want to make things worse.", 
            goals: "To find a way to address the conflict with David constructively and protect my team's work and confidence without escalating a war.",
            internalState: "Frustrated, conflict-avoidant, protective of my team. Feeling a bit powerless and resentful.",
            keyPeople: "David (Peer, Director) - Undermines my team in public forums. My Team - Their morale is dropping and they are starting to disengage."
    }
   ];
    
     const unsubscribe = onSnapshot(collection(db, "personas"), (snapshot) => {
            const communityPersonas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Combine default and community personas, avoiding duplicates
            const combined = [...defaultPersonas, ...communityPersonas];
            const uniquePersonas = Array.from(new Set(combined.map(p => p.name))).map(name => combined.find(p => p.name === name));
            setPersonas(uniquePersonas);
        });

        // Clean up the listener when the component unmounts
        return () => unsubscribe();
    }, []); // The empty array ensures this runs only once


    // Combine default and community personas
    
    const createDescriptionFromPersona = (p) => {
        return `You are to role-play as a coaching client with the following detailed persona. Embody their internal state, refer to the key people by name, and draw from their specific challenges and goals in your responses. Be detailed and realistic.

**Name:** ${p.name || 'Alex'}
**Role:** ${p.role} in the ${p.industry || 'any'} industry.
**Specific Challenges:** "${p.challenges}"
**Goals for this coaching session:** "${p.goals}"
**Internal State (How you feel inside):** "${p.internalState}"
**Key People in your story:** "${p.keyPeople}"`;
    };

    const handleSendMessage = useCallback(async () => {
        if (userInput.trim() === '' || isLoading) return; // FIX: Use 'input'
        const newHistory = [...history, { role: 'user', text: userInput }]; // FIX: Use 'input'
        setHistory(newHistory);
        setUserInput(''); // FIX: Use 'setUserInput'
        setIsLoading(true);

        const prompt = `You are acting as a coaching client. Your persona is: "${createDescriptionFromPersona(persona)}".
        Based on the conversation history below, provide a natural, in-character response that embodies the persona's internal state and refers to key people by name. Keep your response concise. 
        History:\n${newHistory.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n')}`;
        const chatSchema = { type: "OBJECT", properties: { responseText: { type: "STRING" } }, required: ["responseText"] };

        try {
            const result = await callGeminiAPI(prompt, chatSchema);
            const modelResponse = result.responseText || "I'm not sure what to say.";
            setHistory(prev => [...prev, { role: 'model', text: modelResponse }]);
        } catch (e) {
            console.error(e);
            setHistory(prev => [...prev, { role: 'model', text: "Sorry, an error occurred." }]);
        } finally {
            setIsLoading(false);
        }
    }, [userInput, history, isLoading, persona]); // FIX: Use 'input'

    const handleEndAndEvaluate = useCallback(async () => {
        if (history.length < 4) {
         alert("Please have a slightly longer conversation before evaluating.");
         return;
     };
     setIsEvaluating(true);
     const transcript = history.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n');
     try {
        const fullReport = {};
        setLoadingText("Analyzing competencies...");
        const competencyPrompt = `Analyze the following coaching transcript based on ICF competencies 3 through 8. For each competency, provide a rating (Exemplary, Proficient, Sufficient, Needs Development) and a detailed justification. Return a JSON object with a single key "evaluation" containing an array of objects. Transcript: ${transcript}`;
        const competencySchema = {type: "OBJECT", properties: { evaluation: { type: "ARRAY", items: { type: "OBJECT", properties: { competency: { type: "STRING" }, rating: { type: "STRING" }, justification: { type: "STRING" } }, required: ["competency", "rating", "justification"] } } } };
        const competencyResult = await callGeminiAPI(competencyPrompt, competencySchema);
        fullReport.evaluation = competencyResult.evaluation;
        fullReport.foundationalCompetencies = [
            { competency: "1: Demonstrates Ethical Practice", assessmentNote: "This competency is evaluated on an 'Observed / Not Observed' basis during a live or recorded session review by a certified assessor, focusing on adherence to the ICF Code of Ethics." },
            { competency: "2: Embodies a Coaching Mindset", assessmentNote: "This competency reflects ongoing development and is primarily assessed through the written ICF Credentialing Exam and mentor coaching, rather than a single performance evaluation." }
        ];

        setLoadingText("Analyzing talk time...");
        const talkTimePrompt = `Analyze the speaker talk time in the following transcript. Estimate the percentage of talk time for the Coach and the Client. Return a JSON object with keys "coachPercentage" and "clientPercentage". Transcript: ${transcript}`;
        const talkTimeSchema = { type: "OBJECT", properties: { coachPercentage: { type: "NUMBER" }, clientPercentage: { type: "NUMBER" } }, required: ["coachPercentage", "clientPercentage"] };
        fullReport.speakerAnalysis = await callGeminiAPI(talkTimePrompt, talkTimeSchema);

        setLoadingText("Identifying key insights...");
        const insightsPrompt = `Identify up to 5 pivotal moments of insight the client experienced in this transcript. Return a JSON object with a single key "keyInsights" containing an array of strings. Transcript: ${transcript}`;
        const insightsSchema = { type: "OBJECT", properties: { keyInsights: { type: "ARRAY", items: { type: "STRING" } } } };
        fullReport.keyInsights = (await callGeminiAPI(insightsPrompt, insightsSchema)).keyInsights;

        setLoadingText("Suggesting alternative questions...");
        const questionsPrompt = `Suggest up to 5 powerful, alternative questions the coach could have asked in this transcript to deepen insight. Return a JSON object with a single key "alternativeQuestions" containing an array of strings. Transcript: ${transcript}`;
        const questionsSchema = { type: "OBJECT", properties: { alternativeQuestions: { type: "ARRAY", items: { type: "STRING" } } } };
        fullReport.alternativeQuestions = (await callGeminiAPI(questionsPrompt, questionsSchema)).alternativeQuestions;

        setLoadingText("Analyzing question types...");
        const questionAnalysisPrompt = `Analyze the Coach's dialogue in this transcript. Categorize each question into 'Open-Ended', 'Leading', 'Clarifying', or 'Observation'. Provide the percentage breakdown. Return a JSON object with keys "openEnded", "leading", "clarifying", and "observation". Transcript: ${transcript}`;
        const questionAnalysisSchema = { type: "OBJECT", properties: { openEnded: { type: "NUMBER" }, leading: { type: "NUMBER" }, clarifying: { type: "NUMBER" }, observation: { type: "NUMBER" } }, required: ["openEnded", "leading", "clarifying", "observation"] };
        fullReport.questionAnalysis = await callGeminiAPI(questionAnalysisPrompt, questionAnalysisSchema);
        
        setEvaluationResult(fullReport);
        setView('result');
     } catch(e) {
        console.error(e);
        alert(e.message || "Sorry, there was an error evaluating your conversation. Please try again.");
     } finally {
        setIsEvaluating(false);
     }
  }, [history, setView, setEvaluationResult]);

    const startCustomSimulation = async () => {
        const { name, industry, role, challenges, goals, internalState, keyPeople } = customPersona;
        if (!role || !challenges || !goals) {
            alert("Please fill out Role, Challenges, and Goals for your persona.");
            return;
        }

        // FIX: Build the object from the correct state variables
        const newPersonaObject = {
            name: name.trim() || `A ${role}`,
            industry,
            role,
            challenges,
            goals,
            internalState,
            keyPeople,
            createdBy: currentUser.uid, // Track who created it
            creatorEmail: currentUser.email
        };

        setPersona(newPersonaObject);
        setHistory([{role: 'model', text: `Hello, coach. Thanks for meeting with me.`}]);
        setSimulationStep('chat');

        // Save the new persona to the public Firestore collection
        try {
            await addDoc(collection(db, "personas"), newPersonaObject);
        } catch (error) {
            console.error("Error adding custom persona to Firestore: ", error);
        }
    };

    
    
       const startRandomSimulation = () => {
        if (personas.length === 0) {
            alert("Personas are still loading, please try again in a moment.");
            return;
        }
        const randomPersonaObject = personas[Math.floor(Math.random() * personas.length)];
        setPersona(randomPersonaObject);
        setHistory([{role: 'model', text: `Hello, coach. Thanks for meeting with me.`}]);
        setSimulationStep('chat');
    };

    // Scroll effect
    useEffect(() => {
        if (chatWindowRef.current) {
          chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [history]);
    
    // JSX Rendering based on your original, working component
    if (isEvaluating) {
        return <LoadingSpinner text={loadingText} />;
    }

    if (simulationStep === 'options') {
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <div className="flex justify-end">
                <Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm absolute top-6 right-6">&larr; Back</Button>
            </div>
            <IconWrapper><Bot className="w-8 h-8" /></IconWrapper>
            <h1 className="text-3xl font-bold text-slate-800 mt-4 mb-4">Text Simulation Options</h1>
            <div className="space-y-4">
                <Button onClick={startRandomSimulation} variant="secondary" className="w-full" disabled={personas.length === 0}><Dices className="w-5 h-5" /> Select a Random Persona</Button>
                <Button onClick={() => setSimulationStep('select')} variant="secondary" className="w-full"><List className="w-5 h-5" /> Choose a Persona</Button>
                <Button onClick={() => setSimulationStep('create')} variant="secondary" className="w-full"><UserPlus className="w-5 h-5" /> Create Your Own</Button>
            </div>
          </Card>
        );
    }
    
    if (simulationStep === 'select') {
        return (
          <Card className="max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-bold text-slate-800">Choose a Client Persona</h1>
                <Button onClick={() => setSimulationStep('options')} variant="secondary" className="px-3 py-1 text-sm">&larr; Back</Button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
                {personas.map(p => ( // This now correctly uses the 'personas' state
                    <button key={p.name} onClick={() => {
                        setPersona(p);
                        setHistory([{role: 'model', text: `Hello, coach. Thanks for meeting with me.`}])
                        setSimulationStep('chat');
                    }} className="w-full text-left p-4 border rounded-lg hover:bg-stone-50 transition">
                      <h3 className="font-bold text-lg text-stone-700">{p.name}</h3>
                      <p className="text-slate-600 text-sm"><span className="font-semibold">Role:</span> {p.role}</p>
                      <p className="text-slate-600 text-sm"><span className="font-semibold">Challenges:</span> {p.challenges}</p>
                    </button>
                ))}
            </div>
          </Card>
        );
    }

      if (simulationStep === 'create') {
        return (
            <Card className="max-w-2xl mx-auto">
                <div className="flex justify-between items-start mb-4">
                    <h1 className="text-3xl font-bold text-slate-800">Create Custom Persona</h1>
                    <Button onClick={() => setSimulationStep('options')} variant="secondary" className="px-4 py-2 text-sm">&larr; Back</Button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="persona-name" className="block text-sm font-medium text-slate-700 mb-1">Name (Optional)</label>
                        <input type="text" id="persona-name" value={customPersona.name} onChange={(e) => setCustomPersona({...customPersona, name: e.target.value})} placeholder="e.g., Alex Chen" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                     <div>
                        <label htmlFor="persona-role" className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                        <input type="text" id="persona-role" value={customPersona.role} onChange={(e) => setCustomPersona({...customPersona, role: e.target.value})} placeholder="e.g., New Manager" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                    <div>
                        <label htmlFor="persona-challenges" className="block text-sm font-medium text-slate-700 mb-1">Specific Challenges</label>
                        <textarea id="persona-challenges" value={customPersona.challenges} onChange={(e) => setCustomPersona({...customPersona, challenges: e.target.value})} placeholder="e.g., My direct report, Ben, missed a deadline and I had to work all weekend to fix it..." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                     <div>
                        <label htmlFor="persona-goals" className="block text-sm font-medium text-slate-700 mb-1">Goals for the coaching session</label>
                        <textarea id="persona-goals" value={customPersona.goals} onChange={(e) => setCustomPersona({...customPersona, goals: e.target.value})} placeholder="e.g., Learn how to delegate effectively without losing control..." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                    <div>
                        <label htmlFor="persona-internal-state" className="block text-sm font-medium text-slate-700 mb-1">Internal State (How the client feels)</label>
                        <textarea id="persona-internal-state" value={customPersona.internalState} onChange={(e) => setCustomPersona({...customPersona, internalState: e.target.value})} placeholder="e.g., Anxious, frustrated with my team but also with myself..." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                     <div>
                        <label htmlFor="persona-key-people" className="block text-sm font-medium text-slate-700 mb-1">Key People (Colleagues, managers, etc.)</label>
                        <textarea id="persona-key-people" value={customPersona.keyPeople} onChange={(e) => setCustomPersona({...customPersona, keyPeople: e.target.value})} placeholder="e.g., Ben (Direct Report) - struggling. Sarah (Direct Report) - has potential." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                    <Button onClick={startCustomSimulation} className="w-full">Start Simulation with this Persona</Button>
                </div>
            </Card>
        );
      }
    
      return ( // simulationStep === 'chat'
        <Card className="max-w-4xl mx-auto h-[85vh] flex flex-col">
           <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Coaching Simulation</h1>
                <p className="text-slate-600">You are coaching a client. Type your responses below.</p>
            </div>
            <Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm">&larr; Back</Button>
          </div>
          <div ref={chatWindowRef} className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6">
            {history.map((msg, index) => (
              <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'model' && <div className="bg-stone-700 text-white rounded-full p-2"><Bot size={20} /></div>}
                <div className={`max-w-md p-4 rounded-2xl ${msg.role === 'user' ? 'bg-slate-200 text-slate-800 rounded-br-none' : 'bg-stone-700 text-white rounded-bl-none'}`}>
                  {msg.text}
                </div>
                 {msg.role === 'user' && <div className="bg-slate-200 text-slate-800 rounded-full p-2"><User size={20} /></div>}
              </div>
            ))}
            {isLoading && <div className="flex justify-start"><div className="p-4 rounded-2xl bg-stone-700 text-white rounded-bl-none">...</div></div>}
          </div>
          <div className="mt-6 flex gap-4">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your coaching question here..."
              className="flex-grow p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"
            />
            <Button onClick={handleSendMessage} disabled={isLoading}><Send /></Button>
          </div>
          <Button onClick={handleEndAndEvaluate} variant="secondary" className="w-full mt-4">End Simulation & Evaluate</Button>
        </Card>
      );
    };

const EvaluationReport = ({ result, setView }) => {
    const { foundationalCompetencies, evaluation, speakerAnalysis, keyInsights, alternativeQuestions, questionAnalysis } = result;

    const getRatingColorClasses = (rating) => {
        switch (rating) {
            case 'Exemplary': return 'border-emerald-500 bg-emerald-50 text-emerald-800';
            case 'Proficient': return 'border-lime-500 bg-lime-50 text-lime-800';
            case 'Sufficient': return 'border-amber-500 bg-amber-50 text-amber-800';
            case 'Needs Development': return 'border-rose-500 bg-rose-50 text-rose-800';
            default: return 'border-slate-500 bg-slate-50 text-slate-800';
        }
    };

    return (
        <div className="bg-white p-12 font-sans">
            <header className="text-center border-b-2 border-slate-100 pb-6 mb-8">
                <h1 className="text-3xl font-bold text-stone-800">Coaching Conversation Report</h1>
                <p className="text-md text-slate-500 mt-2">An AI-Powered Analysis of Your Coaching Session. This is analysis was generated with the assistance of AI and should not be used as a formal evaluation</p>
            </header>

            <section className="mb-10">
                <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">Session Analysis</h2>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2"><MessageSquare className="text-stone-500" /> Talk Time</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between mb-1 text-sm"><span>Client</span><span>{speakerAnalysis.clientPercentage}%</span></div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-stone-600 h-2.5 rounded-full" style={{ width: `${speakerAnalysis.clientPercentage}%` }}></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1 text-sm"><span>Coach</span><span>{speakerAnalysis.coachPercentage}%</span></div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-stone-500 h-2.5 rounded-full" style={{ width: `${speakerAnalysis.coachPercentage}%` }}></div></div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2"><PieChartIcon className="text-stone-600" /> Question Analysis</h3>
                        <ul className="space-y-1 text-sm">
                            {Object.entries(questionAnalysis).map(([key, value]) => (
                                <li key={key} className="flex justify-between">
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="font-semibold">{value}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">Foundational Competencies</h2>
                <div className="space-y-4">
                    {foundationalCompetencies.map((item, index) => (
                        <div key={index} className="p-4 rounded-lg bg-slate-50 text-slate-800">
                            <h3 className="text-lg font-semibold flex items-center gap-2">{item.competency.includes("Ethical") ? <CheckSquare className="w-5 h-5" /> : <Edit className="w-5 h-5" />} {item.competency}</h3>
                            <p className="text-slate-700 text-sm mt-1">{item.assessmentNote}</p>
                        </div>
                    ))}
                </div>
            </section>
            
            <section className="mb-10">
                <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">Core Competency Evaluation</h2>
                <div className="space-y-4">
                    {evaluation.map((item, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${getRatingColorClasses(item.rating)}`}>
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-lg font-bold">{item.competency}</h3>
                                <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${getRatingColorClasses(item.rating)}`}>{item.rating}</span>
                            </div>
                            <p className="text-sm">{item.justification}</p>
                        </div>
                    ))}
                </div>
            </section>
            
            <section className="grid grid-cols-2 gap-8">
                 <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2"><Lightbulb className="text-amber-500" /> Key Client Insights</h2>
                    <ul className="list-disc list-inside space-y-2 text-slate-700 text-sm">
                        {keyInsights.map((insight, index) => <li key={index}>{insight}</li>)}
                    </ul>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2"><HelpCircle className="text-sky-500" /> Alternative Questions</h2>
                    <ul className="list-disc list-inside space-y-2 text-slate-700 text-sm">
                        {alternativeQuestions.map((q, index) => <li key={index}>"{q}"</li>)}
                    </ul>
                </div>
            </section>
        </div>
    );
};

const EvaluationResult = ({ result, setView }) => {
    const reportRef = useRef();

    const handleDownload = async () => {
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
        const { default: jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');

        if (reportRef.current) {
            const input = reportRef.current;
            const canvas = await html2canvas(input, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasAspectRatio = canvasHeight / canvasWidth;

            const imgWidth = pdfWidth;
            const imgHeight = pdfWidth * canvasAspectRatio;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save('coaching-report.pdf');
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Feedback Report</h1>
                    <p className="text-slate-600">Your report is ready. You can now download it as a PDF.</p>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                    <Button onClick={handleDownload} variant="secondary" className="w-1/2 sm:w-auto">
                        <Download className="w-5 h-5" /> Download PDF
                    </Button>
                    <Button onClick={() => setView('home')} variant="primary" className="w-1/2 sm:w-auto">Start New</Button>
                </div>
            </div>
            <div ref={reportRef} className="p-2 border rounded-lg shadow-md bg-white">
                <EvaluationReport result={result} />
            </div>
        </div>
    );
};

const QuizComponent = ({ setView, currentUser }) => {
    const [quizState, setQuizState] = useState('intro'); // intro, active, results
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [selectionStatus, setSelectionStatus] = useState(null); // null, 'correct', 'incorrect'
    const [score, setScore] = useState(0);
    const [competencyAnalysis, setCompetencyAnalysis] = useState({});
    const resultsRef = useRef(null);

    const behaviorsData = [
        { "behavior": "Demonstrates personal integrity and honesty in interactions with clients, sponsors and relevant stakeholders", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Is sensitive to clients’ identity, environment, experiences, values and beliefs", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Uses language appropriate and respectful to clients, sponsors and relevant stakeholders", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Abides by the ICF Code of Ethics and upholds the ICF Core Values", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Maintains confidentiality with client information per stakeholder agreements and pertinent laws", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Maintains the distinctions between coaching, consulting, psychotherapy and other support professions", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Refers clients to other support professionals, as appropriate", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Acknowledges that clients are responsible for their own choices", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Engages in ongoing learning and development as a coach, including remaining aware of current coaching best practices and use of technology", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Develops an ongoing reflective practice to enhance one’s coaching", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Remains aware of and open to the influence of biases, context and culture on self and others", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Uses awareness of self and one’s intuition to benefit clients", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Develops and maintains the ability to manage one’s emotions", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Maintains emotional, physical, and mental well-being in preparation for, throughout, and following each session", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Seeks help from outside sources when necessary", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Nurtures openness and curiosity in oneself, the client, and the coaching process", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Remains aware of the influence of one's thoughts and behaviors on the client and others", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Describes one's coaching philosophy and clearly defines what coaching is and is not for potential clients and stakeholders", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Reaches agreement about what is and is not appropriate in the relationship, what is and is not being offered, and the responsibilities of the client and relevant stakeholders, including commitment to working toward coaching goals", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Reaches agreement about the guidelines and specific parameters of the coaching relationship such as logistics, fees, scheduling and inclusion of others", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to establish the overall coaching plan and goals", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to determine client–coach fit", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to identify or reconfirm what they want to accomplish in the session", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to define what the client believes they need to address or resolve in order to achieve what they want to accomplish in the session", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to define or reconfirm measures of success for what the client wants to accomplish in the session", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to manage the time and focus of the session", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Continues coaching in the direction of the client’s desired outcome unless the client indicates otherwise", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to close the coaching relationship in a way that that respects the client and the coaching experience", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Revisits the coaching agreement when necessary to ensure the coaching approach is meeting the client's needs", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Seeks to understand the client within their context which may include their identity, environment, experiences, values and beliefs", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Shows respect for the client’s identity, perceptions, style and language and adapts one’s coaching to the client", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Acknowledges and respects the client’s unique talents, insights and work in the coaching process", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Shows support, empathy and concern for the client", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Acknowledges and supports the client’s expression of feelings, perceptions, concerns, beliefs and suggestions", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Demonstrates openness and transparency as a way to display vulnerability and build trust with the client", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Remains focused, observant, empathetic and responsive to the client", "competency": "Maintains Presence" },
        { "behavior": "Demonstrates curiosity during the coaching process", "competency": "Maintains Presence" },
        { "behavior": "Remains aware of what is emerging for self and client in the present moment", "competency": "Maintains Presence" },
        { "behavior": "Manages one’s emotions to stay present with the client", "competency": "Maintains Presence" },
        { "behavior": "Demonstrates confidence in working with strong client emotions during the coaching process", "competency": "Maintains Presence" },
        { "behavior": "Is comfortable working in a space of not knowing", "competency": "Maintains Presence" },
        { "behavior": "Creates or allows space for silence, pause or reflection", "competency": "Maintains Presence" },
        { "behavior": "Considers the client’s context,identity, environment, experiences, values and beliefs to enhance understanding of what the client is communicating", "competency": "Listens Actively" },
        { "behavior": "Reflects or summarizes what the client is communicating to ensure clarity and understanding", "competency": "Listens Actively" },
        { "behavior": "Recognizes and inquires when there is more to what the client is communicating", "competency": "Listens Actively" },
        { "behavior": "Notices and explores the client’s non-verbal cues, such as energy shifts, and what is not being said", "competency": "Listens Actively" },
        { "behavior": "Integrates the client’s words, tone of voice and body language to determine the full meaning of what the client is communicating", "competency": "Listens Actively" },
        { "behavior": "Notices trends in the client’s behaviors and emotions across sessions to discern themes and patterns", "competency": "Listens Actively" },
        { "behavior": "Considers client experience when deciding wheat might be most useful", "competency": "Evokes Awareness" },
        { "behavior": "Challenges the client as a way to evoke awareness or insight", "competency": "Evokes Awareness" },
        { "behavior": "Asks questions about the client, such as their way of thinking, values, needs, wants and beliefs", "competency": "Evokes Awareness" },
        { "behavior": "Asks questions that help the client explore beyond current thinking", "competency": "Evokes Awareness" },
        { "behavior": "Invites the client to share more about their experience in the moment", "competency": "Evokes Awareness" },
        { "behavior": "Notices what is working to enhance client progress", "competency": "Evokes Awareness" },
        { "behavior": "Adjusts the coaching approach in response to the client;s needs", "competency": "Evokes Awareness" },
        { "behavior": "Helps the client identify factors that influence current and future patterns of behavior, thinking or emotion", "competency": "Evokes Awareness" },
        { "behavior": "Invites the client to generate ideas about how they can move forward and what they are willing or able to do", "competency": "Evokes Awareness" },
        { "behavior": "Supports the client in reframing perspectives", "competency": "Evokes Awareness" },
        { "behavior": "Shares observations, knowledge, and feelings, without attachment, that have the potential to create new insights for the client", "competency": "Evokes Awareness" },
        { "behavior": "Works with the client to integrate new awareness, insight or learning into their worldview and behaviors", "competency": "Facilitates Client Growth" },
        { "behavior": "Partners with the client to design goals, actions and accountability measures that integrate and expand new learning", "competency": "Facilitates Client Growth" },
        { "behavior": "Acknowledges and supports client autonomy in the design of goals, actions and methods of accountability", "competency": "Facilitates Client Growth" },
        { "behavior": "Supports the client in identifying potential results or learning from identified action steps", "competency": "Facilitates Client Growth" },
        { "behavior": "Invites the client to consider how to move forward, including resources, support and potential barriers", "competency": "Facilitates Client Growth" },
        { "behavior": "Partners with the client to summarize learning and insight within or between sessions", "competency": "Facilitates Client Growth" },
        { "behavior": "Partners with the client to integrate learning and sustain progress throughout the coaching agreement", "competency": "Facilitates Client Growth" },
        { "behavior": "Acknowledges the client’s progress and successes", "competency": "Facilitates Client Growth" },
        { "behavior": "Partners with the client to close the session", "competency": "Facilitates Client Growth" }
    ];

    const competencies = [
        "Demonstrates Ethical Practice", "Embodies a Coaching Mindset", "Establishes and Maintains Agreements", "Cultivates Trust and Safety",
        "Maintains Presence", "Listens Actively", "Evokes Awareness", "Facilitates Client Growth"
    ];

    const shuffleArray = (array) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    };
    
    const startQuiz = () => {
        const shuffledBehaviors = shuffleArray([...behaviorsData]);
        const generatedQuestions = shuffledBehaviors.map(item => {
            const correctAnswer = item.competency;
            const otherOptions = shuffleArray(competencies.filter(c => c !== correctAnswer)).slice(0, 3);
            const options = shuffleArray([correctAnswer, ...otherOptions]);
            return {
                text: item.behavior,
                options: options,
                correctAnswer: correctAnswer
            };
        });
        setQuestions(generatedQuestions);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setScore(0);
        setSelectionStatus(null);
        setQuizState('active');
    };

    const handleAnswerSelect = (questionIndex, selectedAnswer) => {
        if (selectionStatus) return;

        setUserAnswers({ ...userAnswers, [questionIndex]: selectedAnswer });
        const isCorrect = selectedAnswer === questions[questionIndex].correctAnswer;
        if (isCorrect) {
            setSelectionStatus('correct');
            setScore(prevScore => prevScore + 1);
        } else {
            setSelectionStatus('incorrect');
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectionStatus(null);
        } else {
            handleSubmitQuiz();
        }
    };

    const handleSubmitQuiz = () => {
        let finalScore = 0;
        const analysis = {};
        competencies.forEach(c => {
            analysis[c] = { correct: 0, total: 0 };
        });

        questions.forEach((q, index) => {
            const isCorrect = userAnswers[index] === q.correctAnswer;
            analysis[q.correctAnswer].total += 1;
            if (isCorrect) {
                finalScore++;
                analysis[q.correctAnswer].correct += 1;
            }
        });
        
        setScore(finalScore);
        setCompetencyAnalysis(analysis);
        setQuizState('results');
    };

    const handleDownloadPdf = async () => {
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
        const { default: jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');

        if (resultsRef.current) {
            const canvas = await html2canvas(resultsRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = canvas.height * pdfWidth / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            pdf.save('quiz-results.pdf');
        }
    };
    
    if (quizState === 'intro') {
        return (
            <Card className="max-w-2xl mx-auto text-center">
                <IconWrapper><BookOpenCheck className="w-10 h-10" /></IconWrapper>
                <h1 className="text-3xl font-bold mt-4">ICF Competency Quiz</h1>
                <p className="mt-4 mb-8">Test your knowledge by matching coaching behaviors to the correct ICF Core Competency - Updated for the 2025 ICF Core Competencies.</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={startQuiz}>Start Quiz</Button>
                    <Button onClick={() => setView('home')} variant="secondary">Back to Hub</Button>
                </div>
            </Card>
        );
    }
    
    if (quizState === 'results') {
        return (
            <div className="max-w-4xl mx-auto">
                <Card>
                    <div ref={resultsRef} className="p-8">
                        <h1 className="text-3xl font-bold text-center mb-4">Quiz Results</h1>
                        <p className="text-xl text-center mb-8">Your final score: <span className="font-bold">{score} / {questions.length}</span></p>
                        <h2 className="text-2xl font-bold mb-4 border-b pb-2">Analysis by Competency</h2>
                        <div className="space-y-4">
                            {Object.entries(competencyAnalysis).map(([competency, data]) => {
                                const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                                return (
                                    <div key={competency}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span>{competency}</span>
                                            <span>{data.correct} / {data.total}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-4">
                                            <div className="bg-stone-600 h-4 rounded-full text-xs text-white flex items-center justify-center" style={{ width: `${percentage}%` }}>
                                                {percentage > 10 ? `${percentage}%` : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                     <div className="mt-8 flex justify-center gap-4">
                        <Button onClick={startQuiz}>Retake Quiz</Button>
                        <Button onClick={handleDownloadPdf} variant="secondary">Download Results</Button>
                        <Button onClick={() => setView('home')} variant="secondary">Back to Hub</Button>
                    </div>
                </Card>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const completedQuestions = selectionStatus ? currentQuestionIndex + 1 : currentQuestionIndex;
    
    return (
        <Card className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <p className="text-sm font-semibold text-stone-700">Score: {score} / {completedQuestions}</p>
            </div>
            <p className="text-lg font-semibold text-slate-800 mb-6">{currentQuestion.text}</p>
            <div className="grid md:grid-cols-2 gap-4">
                {currentQuestion.options.map(option => {
                    let buttonClass = 'bg-white hover:bg-stone-100';
                    if (selectionStatus) {
                        const isCorrect = option === currentQuestion.correctAnswer;
                        const isSelected = userAnswers[currentQuestionIndex] === option;
                        
                        if(isCorrect) {
                            buttonClass = 'bg-emerald-100 border-emerald-500';
                        } else if (isSelected && selectionStatus === 'incorrect') {
                            buttonClass = 'bg-rose-100 border-rose-500';
                        } else {
                            buttonClass = 'bg-slate-50 text-slate-500';
                        }
                    }

                    return (
                        <button 
                            key={option}
                            onClick={() => handleAnswerSelect(currentQuestionIndex, option)}
                            disabled={!!selectionStatus}
                            className={`p-4 rounded-lg border-2 text-left transition ${buttonClass}`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
            <div className="mt-8 text-right">
                {selectionStatus && (
                    <Button onClick={handleNextQuestion}>
                        {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Submit'}
                    </Button>
                )}
            </div>
        </Card>
    );
};

// Add this new component before your App function
const AuthComponent = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // The onAuthStateChanged listener in App will handle the redirect
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <img src={myLogo} alt="CoachQ Logo" className="w-20 h-20 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-center mb-6">{isLogin ? 'Welcome Back' : 'Create an Account'}</h1>
      <form onSubmit={handleAuthAction} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3 border border-slate-300 rounded-lg"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 border border-slate-300 rounded-lg"
          required
        />
        <Button type="submit" className="w-full">{isLogin ? 'Log In' : 'Sign Up'}</Button>
      </form>
      <div className="my-4 text-center text-slate-500">or</div>
      <Button onClick={handleGoogleSignIn} variant="secondary" className="w-full">
          Sign in with Google
      </Button>
      <p className="mt-6 text-center">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-stone-700 hover:underline">
          {isLogin ? 'Sign Up' : 'Log In'}
        </button>
      </p>
      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </Card>
  );
};

const Header = () => {
  return (
    <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4">
      <img src={myLogo} alt="CoachQ Logo" className="w-12 h-12" />
      <h1 className="text-3xl font-bold text-slate-800">The Coaching Gym</h1>
    </div>
  );
};

function App() {
  const [view, setView] = useState('home');
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // To handle the initial auth check
  const [dilemmaDocId, setDilemmaDocId] = useState(null);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const handleSetView = (newView) => {
    // If user logs out, always return to home (which will become the auth page)
    if (newView === 'logout') {
        signOut(auth);
        setView('home');
        return;
    }
    setView(newView);
  }

  // Show a loading spinner while checking for user
  if (authLoading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner text="Loading..." /></div>;
  }

  return (
    <main className="font-sans p-4 md:p-8 flex items-center justify-center min-h-screen">
      <div className="w-full">
        {!currentUser ? (
          <AuthComponent />
        ) : (
           <>
            <Header /> {/* <-- Your new header will always be displayed here */}
  
           {(() => {
              const props = {
                setView: handleSetView,
                setEvaluationResult,
                currentUser,
                dilemmaDocId,
                setDilemmaDocId
              };

            switch (view) {
              case 'transcript':
                return <TranscriptEvaluator {...props} />;
              case 'simulation':
                return <Simulation {...props} />;
              case 'voiceSimulation':
                return <VoiceSimulation {...props} />;
              case 'quiz':
                return <QuizComponent {...props} />;
              case 'dilemma':
                return <EthicalDilemmaSimulator {...props} />;
              case 'result':
                return <EvaluationResult result={evaluationResult} {...props} />;
              case 'home':
              default:
                return <HomePage {...props} />;
            }
         })()}
          </>
        )}
      </div>
    </main>
  );
}

export default App;


