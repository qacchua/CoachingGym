import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, User, Mic, X, Dices, List, UserPlus } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import IconWrapper from './IconWrapper';
import LoadingSpinner from './LoadingSpinner';
import { callGeminiAPI, generateImageAPI } from '../utils/api';
import { base64ToArrayBuffer, pcmToWav } from '../utils/tts';
import { firebaseConfig } from '../firebaseConfig';
// Import 'collection', 'addDoc', and 'onSnapshot'
import { collection, addDoc, onSnapshot } from "firebase/firestore";
// Correct the db import path to App.jsx
import { db } from '../App.jsx';

const VoiceSimulation = ({ setView, currentUser, setEvaluationResult }) => {
  const [simulationStep, setSimulationStep] = useState('options');
  const [personas, setPersonas] = useState([]); // Will be populated from Firestore
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
      setError(`Speech recognition error: ${event.error}. Ensure microphone access.`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [history]); // Dependency on history to re-setup potentially


  const handleAiResponse = async (currentHistory) => {
    setIsThinking(true);
    const prompt = `You are acting as a coaching client. Persona: "${createDescriptionFromPersona(persona)}". Respond naturally based on history. Keep concise. History:\n${currentHistory.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n')}`;
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
      speak(errorMessage, 'Female'); // Default voice on error
    } finally {
      setIsThinking(false);
    }
  };


   const speak = async (text, gender = 'Female') => {
    if (!text) return;
    setIsSpeaking(true);

    const voiceName = gender.toLowerCase() === 'male' ? 'Charon' : 'Kore';

    const payload = {
        contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    const apiKey = firebaseConfig.apiKey;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`TTS API failed: ${response.status}`);

        const result = await response.json();
        const audioData = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const mimeType = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;

        if (audioData && mimeType?.startsWith("audio/")) {
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
        console.error("Error generating/playing speech:", e);
        setError("Problem generating voice.");
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
        setError("Could not start recognition. Check permissions.");
      }
    }
  };


  const startSimulationWithPersona = async (personaObject) => {
    setIsGeneratingImage(true);
    setSimulationStep('generatingImage');
    setPersona(personaObject);

    try {
        const imagePrompt = `Photorealistic headshot: ${personaObject.gender.toLowerCase()} ${personaObject.role}, challenged by ${personaObject.challenges}. Centered, pleasant background.`;
        const imageUrl = await generateImageAPI(imagePrompt);
        setPersonaImage(imageUrl);

        const initialGreeting = "Hello, coach. Thanks for meeting with me.";
        setHistory([{role: 'model', text: initialGreeting}]);
        setSimulationStep('chat');
        speak(initialGreeting, personaObject.gender);
    } catch (e) {
        console.error("Error generating image:", e);
        const initialGreeting = "Hello, coach. Camera isn't working today.";
        setHistory([{role: 'model', text: initialGreeting}]);
        setSimulationStep('chat');
        speak(initialGreeting, personaObject.gender);
    } finally {
        setIsGeneratingImage(false);
    }
  };


  const handleEndAndEvaluate = useCallback(async () => {
     if (history.length < 2) {
         alert("Have a longer conversation first.");
         return;
     };
     setIsEvaluating(true);
     const transcript = history.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n');
     try {
        const fullReport = {};
        // Competency Analysis
        const competencyPrompt = `Analyze transcript based on ICF competencies 3-8. Rate (Exemplary, Proficient, Sufficient, Needs Development) & justify. Return JSON { "evaluation": [...] }. Transcript: ${transcript}`;
        const competencySchema = {type: "OBJECT", properties: { evaluation: { type: "ARRAY", items: { type: "OBJECT", properties: { competency: { type: "STRING" }, rating: { type: "STRING" }, justification: { type: "STRING" } }, required: ["competency", "rating", "justification"] } } } };
        const competencyResult = await callGeminiAPI(competencyPrompt, competencySchema);
        fullReport.evaluation = competencyResult.evaluation;
        fullReport.foundationalCompetencies = [
            { competency: "1: Demonstrates Ethical Practice", assessmentNote: "Observed/Not Observed basis by assessor." },
            { competency: "2: Embodies a Coaching Mindset", assessmentNote: "Assessed via ICF Exam & mentor coaching." }
        ];
        // Talk Time
        const talkTimePrompt = `Analyze talk time: Coach vs Client %. Return JSON { "coachPercentage": #, "clientPercentage": # }. Transcript: ${transcript}`;
        const talkTimeSchema = { type: "OBJECT", properties: { coachPercentage: { type: "NUMBER" }, clientPercentage: { type: "NUMBER" } }, required: ["coachPercentage", "clientPercentage"] };
        fullReport.speakerAnalysis = await callGeminiAPI(talkTimePrompt, talkTimeSchema);
        // Key Insights
        const insightsPrompt = `Identify up to 5 client insights. Return JSON { "keyInsights": [...] }. Transcript: ${transcript}`;
        const insightsSchema = { type: "OBJECT", properties: { keyInsights: { type: "ARRAY", items: { type: "STRING" } } } };
        fullReport.keyInsights = (await callGeminiAPI(insightsPrompt, insightsSchema)).keyInsights;
        // Alternative Questions
        const questionsPrompt = `Suggest up to 5 powerful alternative questions. Return JSON { "alternativeQuestions": [...] }. Transcript: ${transcript}`;
        const questionsSchema = { type: "OBJECT", properties: { alternativeQuestions: { type: "ARRAY", items: { type: "STRING" } } } };
        fullReport.alternativeQuestions = (await callGeminiAPI(questionsPrompt, questionsSchema)).alternativeQuestions;
        // Question Analysis
        const questionAnalysisPrompt = `Analyze Coach questions: 'Open-Ended', 'Leading', 'Clarifying', 'Observation'. Return JSON percentage breakdown { "openEnded": #, ... }. Transcript: ${transcript}`;
        const questionAnalysisSchema = { type: "OBJECT", properties: { openEnded: { type: "NUMBER" }, leading: { type: "NUMBER" }, clarifying: { type: "NUMBER" }, observation: { type: "NUMBER" } }, required: ["openEnded", "leading", "clarifying", "observation"] };
        fullReport.questionAnalysis = await callGeminiAPI(questionAnalysisPrompt, questionAnalysisSchema);

        setEvaluationResult(fullReport);
        setView('result');
     } catch(e) {
        console.error(e);
        alert(e.message || "Error evaluating conversation.");
     } finally {
        setIsEvaluating(false);
     }
  }, [history, setView, setEvaluationResult]);

  const createDescriptionFromPersona = (p) => {
    return `Role-play as: Name: ${p.name || 'Alex'}, Role: ${p.role} (${p.industry || 'any'}). Challenges: "${p.challenges}". Goals: "${p.goals}". Internal State: "${p.internalState}". Key People: "${p.keyPeople}". Embody state, use names, be realistic.`;
  };

  // --- defaultPersonas array is REMOVED ---

  // --- This useEffect now fetches from Firestore ---
  useEffect(() => {
     // Keep a few defaults as a fallback in case Firestore is empty/fails
     const fallbackPersonas = [
        { name: 'Alex Chen', gender: 'Female', industry: 'Tech Startup', role: 'New Manager', challenges: "Drowning in work, don't trust team. Ben missed deadline, fixed it myself. Feel like I must do everything.", goals: "Delegate effectively without losing control. Trust team, especially Sarah, but fear failure.", internalState: "Anxious, frustrated, micromanaging but can't stop. Worried about burnout.", keyPeople: "Ben (Direct Report) - Missed deadline. Sarah (DR) - Has potential." },
        { name: 'Maria Rodriguez', gender: 'Female', industry: 'Corp Finance', role: 'Senior Exec', challenges: "Felt nothing in Q3 planning with boss Cynthia. Hit targets, but going through motions. Promotion feels empty.", goals: "Understand disconnect. Is it job or me? Want passion again, maybe drastic change.", internalState: "Numb, apathetic, trapped. Guilty for not appreciating success. Confused.", keyPeople: "Cynthia (Boss, SVP) - Supportive but high-pressure." },
     ];

    const unsubscribe = onSnapshot(collection(db, "personas"), (snapshot) => {
        const communityPersonas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Combine fallback and community personas, avoiding duplicates by name
        const combined = [...fallbackPersonas, ...communityPersonas];
        const uniquePersonas = Array.from(new Set(combined.map(p => p.name)))
                                    .map(name => combined.find(p => p.name === name));
        
        setPersonas(uniquePersonas.length > 0 ? uniquePersonas : fallbackPersonas);
    }, (error) => {
        console.error("Error fetching personas: ", error);
        setPersonas(fallbackPersonas); // Fallback on error
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty array ensures this runs only on mount

  // --- This function now saves to Firestore ---
  const startCustomSimulation = async () => {
      const { name, industry, role, challenges, goals, gender, internalState, keyPeople } = customPersona;
      if (!role || !challenges || !goals) { alert("Fill out Role, Challenges, Goals."); return; }
      
      const newPersona = { 
          name: name.trim() || `A ${role}`, 
          industry: industry || 'Not specified', 
          role, 
          challenges, 
          goals, 
          gender, // Gender is included from the form
          internalState: internalState || 'Not specified', 
          keyPeople: keyPeople || 'Not specified',
          createdBy: currentUser.uid, // Track who created it
          creatorEmail: currentUser.email // Track who created it
      };
      
      startSimulationWithPersona(newPersona);
      
      // Save the new persona to the public Firestore collection
      try { 
          await addDoc(collection(db, "personas"), newPersona); 
      } catch (error) { 
          console.error("Error adding persona:", error); 
          // Don't block the user, just log the error
      }
  };

  const startRandomSimulation = () => {
      if (personas.length === 0) { alert("Personas loading."); return; }
      const p = personas[Math.floor(Math.random() * personas.length)];
      startSimulationWithPersona(p);
  };

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [history]);

  if (error) {
    return ( <Card className="max-w-2xl mx-auto text-center"><Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm absolute top-6 right-6">&larr; Back</Button><IconWrapper><X className="w-8 h-8 text-red-500" /></IconWrapper><h1 className="text-2xl mt-4 mb-2">Not Supported</h1><p>{error}</p></Card> );
  }

  if (simulationStep === 'generatingImage') {
    return ( <Card className="max-w-2xl mx-auto text-center"><LoadingSpinner text="Generating client portrait..." /></Card> );
  }

  // Render logic for 'chat', 'options', 'select', 'create' steps follows...
  // (Keeping the JSX structure the same as in your original App.jsx for these steps)
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
                {/* --- ADD THIS ENTIRE BLOCK --- */}
        <div className="text-center w-full px-4">
            <h2 className="text-2xl font-bold text-slate-800">{persona.name}</h2>
            <p className="text-slate-600 italic">{persona.role}</p>
            <div className="text-left text-sm mt-4 border-t pt-4">
              <p className="text-slate-700"><strong>Challenges:</strong> {persona.challenges}</p>
              <p className="text-slate-700 mt-2"><strong>Goals:</strong> {persona.goals}</p>
            </div>
        </div>
        {/* --- END OF BLOCK TO ADD --- */}
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
                    {/* Form inputs identical to original App.jsx */}
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
                        <textarea id="persona-challenges" value={customPersona.challenges} onChange={(e) => setCustomPersona({...customPersona, challenges: e.target.value})} placeholder="e.g., My direct report, Ben, missed a deadline..." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                    <div>
                        <label htmlFor="persona-goals" className="block text-sm font-medium text-slate-700 mb-1">Goals for the coaching session</label>
                        <textarea id="persona-goals" value={customPersona.goals} onChange={(e) => setCustomPersona({...customPersona, goals: e.target.value})} placeholder="e.g., Learn how to delegate effectively..." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                    <div>
                        <label htmlFor="persona-internal-state" className="block text-sm font-medium text-slate-700 mb-1">Internal State (How the client feels)</label>
                        <textarea id="persona-internal-state" value={customPersona.internalState} onChange={(e) => setCustomPersona({...customPersona, internalState: e.target.value})} placeholder="e.g., Anxious, frustrated..." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                    <div>
                        <label htmlFor="persona-key-people" className="block text-sm font-medium text-slate-700 mb-1">Key People (Colleagues, managers, etc.)</label>
                        <textarea id="persona-key-people" value={customPersona.keyPeople} onChange={(e) => setCustomPersona({...customPersona, keyPeople: e.target.value})} placeholder="e.g., Ben (Direct Report) - struggling." className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-stone-500"/>
                    </div>
                    <Button onClick={startCustomSimulation} className="w-full">Start Simulation with this Persona</Button>
                </div>
            </Card>
        );
      }
};
export default VoiceSimulation;