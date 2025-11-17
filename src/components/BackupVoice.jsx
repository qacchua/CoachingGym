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
import { db } from '../firebaseConfig.js';

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
  }, [history, persona]); // Dependency on history to re-setup potentially

// --- 2. NEW HELPER FUNCTION TO PLAY AUDIO ---
  const playAudio = (audioData, mimeType) => {
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
        setIsSpeaking(false);
        throw new Error("Invalid audio data in response.");
    }
  };


  // --- 3. REWRITTEN handleAiResponse FOR MULTIMODAL ---
  const handleAiResponse = async (currentHistory) => {
    setIsThinking(true);
    
    // 1. Create the prompt and define the chat schema
    const prompt = `You are acting as a coaching client. Persona: "${createDescriptionFromPersona(persona)}". Respond naturally based on history. Keep concise. History:\n${currentHistory.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n')}`;
    const chatSchema = { type: "OBJECT", properties: { responseText: { type: "STRING" } }, required: ["responseText"] };

    // 2. Define the payload for a multimodal request
    const payload = {
      // Send the full history, with the user's prompt last
      contents: [
        ...currentHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: prompt }] } // Send the full prompt again for context
      ],
      generationConfig: {
        // --- THIS IS THE KEY ---
        // Ask for both AUDIO and the JSON text
        responseModalities: ["AUDIO", "JSON"],
        responseMimeType: "application/json",
        responseSchema: chatSchema,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: persona.gender.toLowerCase() === 'male' ? 'Agamemnon' : 'Persephone'
            }
          }
        }
      },
      // Use a model that supports multimodal output
      model: "gemini-2.5-flash-preview" 
    };

    const apiKey = firebaseConfig.apiKey;
    // Note: We are using the 'generateContent' endpoint for the base model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`API failed: ${response.status}`);

      const result = await response.json();
      
      // 3. Process the multimodal response
      const parts = result?.candidates?.[0]?.content?.parts;
      if (!parts || parts.length < 2) {
        throw new Error("Invalid multimodal response structure.");
      }

      // Part 0 will be the JSON text
      const modelResponse = JSON.parse(parts[0].text).responseText || "I'm not sure what to say.";
      
      // Part 1 will be the AUDIO
      const audioData = parts[1]?.inlineData?.data;
      const mimeType = parts[1]?.inlineData?.mimeType;

      // 4. Update state and play audio almost simultaneously
      setIsSpeaking(true);
      setHistory(prev => [...prev, { role: 'model', text: modelResponse }]);
      playAudio(audioData, mimeType); // This will play the audio

    } catch (e) {
      console.error(e);
      const errorMessage = "Sorry, an error occurred.";
      setHistory(prev => [...prev, { role: 'model', text: errorMessage }]);
      // Use old 'speak' as a fallback on error
      speak(errorMessage, 'Female'); 
    } finally {
      setIsThinking(false);
    }
  };

  // --- 4. MODIFIED 'speak' function (now a fallback for errors) ---
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
        
        // Use the new helper to play the audio
        playAudio(audioData, mimeType);

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
    //setIsGeneratingImage(true);
    //setSimulationStep('generatingImage');
    setPersona(personaObject);

    // --- Bypassed Image Generation ---
    console.log("Image generation bypassed. Starting simulation directly.");
    const initialGreeting = "Hello, coach. Thanks for meeting with me.";
    setHistory([{role: 'model', text: initialGreeting}]);
    setSimulationStep('chat');
    speak(initialGreeting, personaObject.gender);
    // --- End Bypass ---
    
    /* --- OLD CODE IS COMMENTED OUT ---
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
        const initialGreeting = "Hello, coach. My Camera isn't working today.";
        setHistory([{role: 'model', text: initialGreeting}]);
        setSimulationStep('chat');
        speak(initialGreeting, personaObject.gender);
    } finally {
        setIsGeneratingImage(false);
    }
        */
  };
// --- END OF MODIFIED FUNCTION ---

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
        {
        name: "Priya Sharma",
        gender: "Female",
        industry: "Technology / Software",
        role: "Director of Product Management",
        challenges: "My identity is tied to being the expert; I fear failure and becoming irrelevant if I fully delegate.",
        goals: "Get practical time management and delegation strategies.",
        internalState: "Overwhelmed, anxious, impatient.",
        keyPeople: "Her boss, Mark (VP of Product)."
    },
    {
        name: "David Chen",
        gender: "Male",
        industry: "Technology / Engineering",
        role: "Senior Engineering Manager",
        challenges: "I believe soft skills are useless; I am uncomfortable with emotions; my perfectionism prevents me from trusting my team.",
        goals: "Learn to communicate better to satisfy his director after a bad 360 review.",
        internalState: "Skeptical, reserved, defensive.",
        keyPeople: "His boss, Susan (Director)."
    },
    {
        name: "Maria Flores",
        gender: "Female",
        industry: "Fortune 100 Conglomerate",
        role: "Head of People & Culture",
        challenges: "I have extreme conflict avoidance; I fear being disliked; I prioritize harmony over accountability.",
        goals: "Find a strategy to resolve a toxic conflict between two of her direct reports.",
        internalState: "Anxious, worried, agreeable.",
        keyPeople: "Conflicting reports:  Jessica and Ben."
    },
    {
        name: "Alex Petrov",
        gender: "Male",
        industry: "Startup",
        role: "Founder & CEO",
        challenges: "I change priorities constantly; I struggle to translate vision into actionable steps; I get bored with execution details.",
        goals: "Get his team to be more proactive and take more ownership.",
        internalState: "Energetic, charming, but also frustrated.",
        keyPeople: "His COO, Laura, who tries to manage the chaos."
    },
    {
        name: "Sarah Jenkins",
        gender: "Female",
        industry: "Small Investment Bank",
        role: "Chief Financial Officer",
        challenges: "I feel my work is stale and unfulfilling; I am grappling with a loss of purpose and identity outside my successful career.",
        goals: "Figure out a plan for the next phase of her career.",
        internalState: "Bored, conflicted, guilty, analytical.",
        keyPeople: "Her husband, David, who is supportive but doesn't understand."
    },
    {
        name: "James Williams",
        gender: "Male",
        industry: "Advertising conglomerate",
        role: "Art Director",
        challenges: "I am a new manager and I am overwhelmed by the demands of leading a team; I struggle with setting boundaries and saying no.",
        goals: "Get his team to produce higher quality work so he doesn't have to redo it himself.",
        internalState: "Passionate, frustrated, defensive.",
        keyPeople: "Two junior designers threatening to quit:  Leo and Mia."
    },
    {
        name: "Dr. Emily Carter",
        gender: "Female",
        industry: "The largest hospital in a large metropolis",
        role: "Chief of Surgery",
        challenges: "I am a high-achiever who is constantly seeking external validation; I struggle with imposter syndrome and burnout.",
        goals: "Find ways to reduce burnout and turnover in her department.",
        internalState: "Confident, decisive, perhaps a bit annoyed.",
        keyPeople: "A senior resident, Dr. Evans, who gave her direct feedback about her recent performance."
    },
    {
        name: "Michael Thompson",
        gender: "Male",
        industry: "Tier 1 automotive supplier",
        role: "VP of Sales",
        challenges: "I am a creative who struggles with structure and discipline; I procrastinate and miss deadlines.",
        goals: "Find a way to trust his team to close big deals so he can focus on strategy.",
        internalState: "Charismatic, impatient, competitive.",
        keyPeople: "His top Sales Director, Karen, who is ready for more responsibility."
    },
    {
        name: "Chloe Davis",
        gender: "Female",
        industry: "Small insurance agency",
        role: "New CEO (Internal Promote)",
        challenges: "I am a seasoned executive who is resistant to change; I cling to old methods and fear disrupting the status quo.",
        goals: "Gain confidence and stop feeling like a fraud in her new role.",
        internalState: "Hesitant, anxious, seeks validation.",
        keyPeople: "The Board Chairman, Mr. Harrison, who championed her promotion."
    },
    {
        name: "Kenji Tanaka",
        gender: "Male",
        industry: "Pharmaceuticals",
        role: "Head of R&D",
        challenges: "I am a team player who avoids the spotlight; I struggle with self-promotion and advocating for my ideas.",
        goals: "Get his team to think bigger and be more innovative.",
        internalState: "Intellectual, calm, risk-averse.",
        keyPeople: "A promising but cautious scientist on his team, Dr. Anya Sharma."
    },
    {
        name: "Fatima Al-Jamil",
        gender: "Female",
        industry: "Big 3 Consumer Goods company",
        role: "Head of Ops (Post-Merger)",
        challenges: "I am a visionary leader who struggles with the day-to-day operations; I delegate poorly and micromanage when stressed.",
        goals: "Find a way to successfully merge the two company cultures.",
        internalState: "Stressed, diplomatic, overwhelmed.",
        keyPeople: "Two vocal managers from each side:  Steve (old guard) and Nora (new way)."
    },
    {
        name: "Ben Carter",
        gender: "Male",
        industry: "Startup",
        role: "First-time Entrepreneur",
        challenges: "I am a technical expert who struggles with communicating complex ideas to non-technical stakeholders; I get frustrated when others do not understand.",
        goals: "Get help with being less overwhelmed and learning to prioritize.",
        internalState: "Passionate, exhausted, scattered.",
        keyPeople: "His co-founder, Sam, who is worried about Ben having burnout."
    },
    {
        name: "Olivia Martinez",
        gender: "Female",
        industry: "Large manufacturing multinational",
        role: "General Manager",
        challenges: "I am a passionate advocate who struggles with diplomacy; I can be perceived as aggressive and confrontational.",
        goals: "Figure out how to manage former peers who do not respect her new authority.",
        internalState: "Empathetic, conflicted, harmonious.",
        keyPeople: "Her former peer and now direct report, Chris."
    },
    {
        name: "Samuel Jones",
        gender: "Male",
        industry: "Boutique law firm",
        role: "Senior Partner, Law Firm",
        challenges: "I am a natural networker who struggles with deep, meaningful connections; I have many acquaintances but few close confidantes.",
        goals: "Find motivation for his last two years and explore what is next.",
        internalState: "Esteemed, reflective, but also dismissive.",
        keyPeople: "A junior partner he is supposed to mentor, Alicia."
    },
    {
        name: "Dr. Aisha Adebayo",
        gender: "Female",
        industry: "Specialty Biotech company",
        role: "Head of Medical Research",
        challenges: "I am a data-driven decision-maker who struggles with intuition and emotional intelligence; I over-rely on logic and dismiss feelings.",
        goals: "Learn how to get her strategic input taken seriously by the board and donors.",
        internalState: "Brilliant, humble, frustrated.",
        keyPeople: "The foundation main donor, Mrs. Gable who is going to make a decision on a big grant in the coming days and Aisha needs to impress her."
    },
    {
        name: "Daniel Miller",
        gender: "Male",
        industry: "Large distribution warehouse",
        role: "Plant Manager",
        challenges: "I am a mentor who struggles with letting go and allowing others to make their own mistakes; I tend to rescue rather than empower.",
        goals: "Figure out why his team never brings him problems until they are crises.",
        internalState: "Results-oriented, impatient, intimidating.",
        keyPeople: "His shift supervisor, Rick, who stopped reporting small issues."
    },
    {
        name: "Isabella Rossi",
        gender: "Female",
        industry: "E-commerce startup",
        role: "Founder, Fashion Brand",
        challenges: "I am a strategic thinker who struggles with execution; I have great ideas but lack the follow-through to implement them.",
        goals: "Find a better work-life balance without feeling like the business will fail.",
        internalState: "Creative, driven, anxious, guilt-ridden.",
        keyPeople: "Her sister, Maria, who is concerned about her health."
    },
    {
        name: "Marcus Thorne",
        gender: "Male",
        industry: "Fortune 100 Technology company",
        role: "Chief Information Officer",
        challenges: "I am a resilient individual who struggles with asking for help; I believe I must handle everything myself.",
        goals: "Get business units to adopt the new IT systems from his failing transformation project.",
        internalState: "Logical, systematic, frustrated.",
        keyPeople: "The head of Marketing, Brenda, who is his biggest critic and is waiting for Marcus to fail."
    },
    {
        name: "Carlos Garcia",
        gender: "Male",
        industry: "Government / public sector",
        role: "City Planning Director",
        challenges: "I am a meticulous planner who struggles with spontaneity and adaptability; I get flustered when things do not go according to plan.",
        goals: "Find a way to influence stakeholders to get a controversial public project approved.",
        internalState: "Methodical, patient, struggles to persuade.",
        keyPeople: "A vocal city council member opposing the project, Eleanor Vance."
    },
    {
        name: "Liam O'Connell",
        gender: "Male",
        industry: "Military",
        role: "Veteran (Career Transition)",
        challenges: "I am a natural problem-solver who struggles with celebrating successes; I immediately move on to the next challenge.",
        goals: "Learn how to translate his military skills for the corporate world and get a job.",
        internalState: "Frustrated, mission-focused, feels like an outsider.",
        keyPeople: "His wife, Sarah, who is his main support."
    },
    {
        name: "Rachel Goldstein",
        gender: "Female",
        industry: "Large law firm",
        role: "Lawyer (Career Transition)",
        challenges: "I am an empathetic listener who struggles with setting boundaries; I take on too much of others emotional burdens.",
        goals: "Explore creative career options and overcome the fear of leaving a safe profession.",
        internalState: "Pessimistic, analytical, trapped, risk-averse.",
        keyPeople: "Her father, Jacob, who is a renowned lawyer and has been a role model for Rachel."
    },
    {
        name: "Maya Singh",
        gender: "Female",
        industry: "human resources",
        role: "Stay-at-Home Parent (Career Transition)",
        challenges: "I am a confident presenter who struggles with receiving constructive criticism; I become defensive and shut down.",
        goals: "Regain her confidence and create a plan to re-enter the marketing field.",
        internalState: "Anxious, self-deprecating, apologetic.",
        keyPeople: "Her supportive husband, Ravi.",
    },
    {
        name: "Tom Henderson",
        gender: "Male",
        industry: "Technology consulting",
        role: "Mid-level Manager (Laid Off)",
        challenges: "I am a creative innovator who struggles with the practicalities of commercialization; I have brilliant ideas but cannot bring them to market.",
        goals: "Figure out where to begin his job search after being laid off.",
        internalState: "Overwhelmed, sad, loyal, resistant.",
        keyPeople: "His former long-time manager, Paul who is looking for opportunities for Tom to try out his ideas"
    },
    {
        name: "Dr. Evelyn Reed",
        gender: "Female",
        industry: "Academia",
        role: "Tenured Professor (Career Transition)",
        challenges: "I am a decisive leader who struggles with patience; I expect immediate results and get frustrated by delays.",
        goals: "Explore a potential move into corporate consulting and resolve her internal conflict.",
        internalState: "Intellectual, conflicted, cynical, curious.",
        keyPeople: "A former student, Brian, who is successful in consulting."
    },
    {
        name: "Kevin Wu",
        gender: "Male",
        industry: "Technology Development",
        role: "Software Engineer (Career Coaching)",
        challenges: "I am a supportive colleague who struggles with self-care; I put others needs before my own and neglect my well-being.",
        goals: "Understand why he is not getting promoted and what he needs to do differently.",
        internalState: "Introverted, logical, frustrated.",
        keyPeople: "His manager, Phil, and a recently promoted peer, Anna who Kevin helped prepare for promotion, while also applying for the same promotional opportunity."
    },
    {
        name: "Sofia Petrova",
        gender: "Female",
        industry: "Consulting",
        role: "Junior Consultant (Career Coaching)",
        challenges: "I am a detail-oriented professional who struggles with the big picture; I get lost in the weeds and miss strategic opportunities.",
        goals: "Understand and act on the feedback she is receiving to improve her performance.",
        internalState: "Eager to please, sensitive, detail-oriented.",
        keyPeople: "Her project manager, Diane who has recently provided this feedback."
    },
    {
        name: "Jordan Lee",
        gender: "Male",
        industry: "Graphic design",
        role: "Freelance Designer (Career Coaching)",
        challenges: "I am a persuasive communicator who struggles with active listening; I am more focused on getting my point across than understanding others.",
        goals: "Gain confidence to negotiate higher rates and land bigger clients.",
        internalState: "Creative, passionate, insecure.",
        keyPeople: "A potential large client, Frank from Acme Corp. who is looking for a fresh face in the field of graphic design."
    },
    {
        name: "Brenda Johnson",
        gender: "Female",
        industry: "Rural hospital",
        role: "Nurse Manager (Career Coaching)",
        challenges: "I am a collaborative team member who struggles with independent decision-making; I always seek consensus and avoid taking sole responsibility.",
        goals: "Decide whether to go back to school or apply for the Director role now.",
        internalState: "Practical, caring, indecisive.",
        keyPeople: "The current Director of Nursing who is retiring, Mary-Anne and who wants Brenda to apply for her position."
    },
    {
        name: "Amir Khan",
        gender: "Male",
        industry: "AI based startup",
        role: "Data Scientist (Career Coaching)",
        challenges: "I am an ambitious individual who struggles with work-life balance; I am constantly striving for more and neglect my personal life.",
        goals: "Figure out how to proactively ask his manager for more challenging projects.",
        internalState: "Thoughtful, quiet, passive, non-confrontational.",
        keyPeople: "His manager, Chen who is a hard task master when it comes to project quality."
    },
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
// This step is now skipped by the bypass
  //if (simulationStep === 'generatingImage') {
    //return ( <Card className="max-w-2xl mx-auto text-center"><LoadingSpinner text="Generating client portrait..." /></Card> );
  //}

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