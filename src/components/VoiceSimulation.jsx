import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, User, Mic, MicOff, X, Dices, List, UserPlus, Video, PhoneOff, Settings, Info, LogOut, Home, ArrowLeft } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import IconWrapper from './IconWrapper';
import LoadingSpinner from './LoadingSpinner';
import { callGeminiAPI, generateImageAPI } from '../utils/api';
import { base64ToArrayBuffer, pcmToWav } from '../utils/tts';
import { firebaseConfig, db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot } from "firebase/firestore";
// --- IMPORT THE RUBRIC ---
import { icfGradingRubric2025 } from '../utils/rubrics';

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
  const [loadingText, setLoadingText] = useState(''); // Added for sequential evaluation
  const [isMuted, setIsMuted] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [error, setError] = useState(null);
  const [customPersona, setCustomPersona] = useState({ name: '', industry: '', role: '', challenges: '', goals: '', gender: 'Female', internalState: '', keyPeople: '' });

  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatWindowRef = useRef(null);

  // --- AUDIO VISUALIZER ---
  const startVisualizer = (audioElement) => {
    if (!canvasRef.current) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 64;
    audioContextRef.current = audioCtx;
    analyserRef.current = analyser;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(159, 18, 57)`; 
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 4;
      }
    };
    draw();
  };

  const createDescriptionFromPersona = (p) => {
    return `Role-play as: Name: ${p.name}, Role: ${p.role} (${p.industry}). Challenges: "${p.challenges}". Goals: "${p.goals}". Internal State: "${p.internalState || 'N/A'}". Key People: "${p.keyPeople || 'N/A'}".`;
  };

  const speak = async (text, gender = 'Female') => {
    if (!text) return;
    setIsSpeaking(true);
    setShowHint(false);
    const voiceName = gender.toLowerCase() === 'male' ? 'Charon' : 'Kore';
    const payload = {
        contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
        model: "gemini-2.5-flash"
    };
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${firebaseConfig.apiKey}`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
        });
        const result = await response.json();
        const audioData = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            const pcmData = base64ToArrayBuffer(audioData);
            const wavBlob = pcmToWav(new Int16Array(pcmData), 24000);
            const audio = new Audio(URL.createObjectURL(wavBlob));
            audio.onplay = () => startVisualizer(audio);
            audio.onended = () => {
                setIsSpeaking(false);
                setShowHint(true);
                if (audioContextRef.current) audioContextRef.current.close();
                cancelAnimationFrame(animationFrameRef.current);
            };
            audio.play().catch(e => console.error("Playback blocked.", e));
        }
    } catch (e) { setIsSpeaking(false); setShowHint(true); }
  };

  const handleAiResponse = async (currentHistory) => {
    setIsThinking(true);
    setShowHint(false);
    const prompt = `Act as coaching client ${persona.name}. Response: 1-3 sentences. \nPERSONA: ${createDescriptionFromPersona(persona)}\nHISTORY:\n${currentHistory.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n')}\nClient Response:`;
    const chatSchema = { type: "OBJECT", properties: { responseText: { type: "STRING" } }, required: ["responseText"] };
    try {
      const result = await callGeminiAPI(prompt, chatSchema);
      const modelResponse = result.responseText || "I'm processing that.";
      setHistory(prev => [...prev, { role: 'model', text: modelResponse }]);
      speak(modelResponse, persona.gender);
    } catch (e) { setShowHint(true); } finally { setIsThinking(false); }
  };

  const toggleListen = () => {
    if (isMuted) return;
    if (isListening) { recognitionRef.current?.stop(); } 
    else {
      if (isSpeaking || isThinking) return;
      try { recognitionRef.current?.start(); setIsListening(true); } catch (e) { console.error(e); }
    }
  };

  const startSimulationWithPersona = async (personaObject) => {
    setPersona(personaObject);
    setIsGeneratingImage(true);
    setSimulationStep('generatingImage');
    const imagePrompt = `High-quality 4k video conference shot of a ${personaObject.gender.toLowerCase()} ${personaObject.role}, chest up, modern home office background, soft bokeh.`;
    try {
        const base64ImageUrl = await generateImageAPI(imagePrompt);
        setPersonaImage(base64ImageUrl || null);
    } catch (error) { setPersonaImage(null); } finally {
        setIsGeneratingImage(false);
        const initialGreeting = "Hi coach. Thanks for meeting with me.";
        setHistory([{role: 'model', text: initialGreeting}]);
        setSimulationStep('chat');
        speak(initialGreeting, personaObject.gender);
    }
  };

  const startRandomSimulation = () => {
    if (personas.length === 0) return;
    const p = personas[Math.floor(Math.random() * personas.length)];
    startSimulationWithPersona(p);
  };

  const startCustomSimulation = async () => {
    const { role, challenges, goals } = customPersona;
    if (!role || !challenges || !goals) { alert("Fill out Role, Challenges, Goals."); return; }
    const newPersona = { ...customPersona, name: customPersona.name.trim() || `A ${role}`, createdBy: currentUser?.uid || 'guest' };
    startSimulationWithPersona(newPersona);
    try { await addDoc(collection(db, "personas"), newPersona); } catch (e) {}
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const newHistory = [...history, { role: 'user', text: transcript }];
      setShowHint(false);
      setHistory(newHistory);
      handleAiResponse(newHistory);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, [history]);

  useEffect(() => {
    const fallbackPersonas = [
        { name: 'Alex Chen', gender: 'Female', industry: 'Tech Startup', role: 'New Manager', challenges: "Drowning in work, don't trust team. Ben missed deadline, fixed it myself.", goals: "Delegate effectively without losing control.", internalState: "Anxious, frustrated.", keyPeople: "Ben (Direct Report)." },
        { name: 'Maria Rodriguez', gender: 'Female', industry: 'Corp Finance', role: 'Senior Exec', challenges: "Promotion feels empty.", goals: "Understand disconnect.", internalState: "Numb, apathetic.", keyPeople: "Cynthia (Boss)." },
        { name: "Priya Sharma", gender: "Female", industry: "Technology", role: "Director of Product", challenges: "Identity tied to expertise; fear failure.", goals: "Delegation strategies.", internalState: "Overwhelmed.", keyPeople: "Boss Mark." },
        { name: "David Chen", gender: "Male", industry: "Engineering", role: "Senior Manager", challenges: "Skeptical of soft skills; perfectionism.", goals: "Better communication.", internalState: "Defensive.", keyPeople: "Director Susan." },
        { name: "Maria Flores", gender: "Female", industry: "Fortune 100", role: "Head of People", challenges: "Conflict avoidance.", goals: "Resolve toxic conflict.", internalState: "Anxious.", keyPeople: "Jessica and Ben." },
        { name: "Alex Petrov", gender: "Male", industry: "Startup", role: "Founder & CEO", challenges: "Changing priorities.", goals: "Team ownership.", internalState: "Frustrated.", keyPeople: "COO Laura." },
        { name: "Sarah Jenkins", gender: "Female", industry: "Investment Bank", role: "CFO", challenges: "Loss of purpose.", goals: "Next career phase.", internalState: "Bored.", keyPeople: "Husband David." },
        { name: "James Williams", gender: "Male", industry: "Advertising", role: "Art Director", challenges: "Boundary setting.", goals: "Quality output.", internalState: "Frustrated.", keyPeople: "Leo and Mia." },
        { name: "Dr. Emily Carter", gender: "Female", industry: "Hospital", role: "Chief of Surgery", challenges: "Burnout; imposter syndrome.", goals: "Reduce turnover.", internalState: "Decisive.", keyPeople: "Resident Dr. Evans." },
        { name: "Michael Thompson", gender: "Male", industry: "Automotive", role: "VP of Sales", challenges: "Procrastination.", goals: "Trust team with deals.", internalState: "Competitive.", keyPeople: "Director Karen." },
        { name: "Chloe Davis", gender: "Female", industry: "Insurance", role: "New CEO", challenges: "Resistant to change.", goals: "Gain confidence.", internalState: "Hesitant.", keyPeople: "Board Chair Mr. Harrison." },
        { name: "Kenji Tanaka", gender: "Male", industry: "Pharma", role: "Head of R&D", challenges: "Team player avoiding spotlight.", goals: "Innovation.", internalState: "Calm.", keyPeople: "Anya Sharma." },
        { name: "Fatima Al-Jamil", gender: "Female", industry: "Consumer Goods", role: "Head of Ops", challenges: "Poor delegation.", goals: "Culture merger.", internalState: "Overwhelmed.", keyPeople: "Steve and Nora." },
        { name: "Ben Carter", gender: "Male", industry: "Startup", role: "Entrepreneur", challenges: "Communication gaps.", goals: "Prioritization.", internalState: "Exhausted.", keyPeople: "Co-founder Sam." },
        { name: "Olivia Martinez", gender: "Female", industry: "Manufacturing", role: "General Manager", challenges: "Aggressive perception.", goals: "Manage peers.", internalState: "Empathetic.", keyPeople: "Chris." },
        { name: "Samuel Jones", gender: "Male", industry: "Law Firm", role: "Partner", challenges: "Lack of deep connections.", goals: "Retirement plan.", internalState: "Reflective.", keyPeople: "Junior Alicia." },
        { name: "Dr. Aisha Adebayo", gender: "Female", industry: "Biotech", role: "Head of Research", challenges: "Logic vs intuition.", goals: "Strategic input.", internalState: "Frustrated.", keyPeople: "Donor Mrs. Gable." },
        { name: "Daniel Miller", gender: "Male", industry: "Distribution", role: "Plant Manager", challenges: "Rescuing vs empowering.", goals: "Team autonomy.", internalState: "Impatient.", keyPeople: "Supervisor Rick." },
        { name: "Isabella Rossi", gender: "Female", industry: "E-commerce", role: "Founder", challenges: "Lack of follow-through.", goals: "Work-life balance.", internalState: "Anxious.", keyPeople: "Sister Maria." },
        { name: "Marcus Thorne", gender: "Male", industry: "Technology", role: "CIO", challenges: "Resilient but won't ask for help.", goals: "System adoption.", internalState: "Systematic.", keyPeople: "Brenda." },
        { name: "Carlos Garcia", gender: "Male", industry: "Public Sector", role: "Director", challenges: "Flustered by change.", goals: "Influence stakeholders.", internalState: "Methodical.", keyPeople: "Eleanor Vance." },
        { name: "Liam O'Connell", gender: "Male", industry: "Military", role: "Veteran", challenges: "Moves immediately to next challenge.", goals: "Military skill translation.", internalState: "Mission-focused.", keyPeople: "Wife Sarah." },
        { name: "Rachel Goldstein", gender: "Female", industry: "Law Firm", role: "Lawyer", challenges: "Emotional burdens.", goals: "Creative options.", internalState: "Trapped.", keyPeople: "Father Jacob." },
        { name: "Maya Singh", gender: "Female", industry: "HR", role: "Stay-at-Home Parent", challenges: "Constructive criticism defensiveness.", goals: "Regain confidence.", internalState: "Anxious.", keyPeople: "Husband Ravi." },
        { name: "Tom Henderson", gender: "Male", industry: "Consulting", role: "Manager", challenges: "Commercialization gaps.", goals: "Job search.", internalState: "Sad.", keyPeople: "Manager Paul." },
        { name: "Dr. Evelyn Reed", gender: "Female", industry: "Academia", role: "Professor", challenges: "Decisive but impatient.", goals: "Consulting move.", internalState: "Cynical.", keyPeople: "Brian." },
        { name: "Kevin Wu", gender: "Male", industry: "Technology", role: "Engineer", challenges: "Neglecting well-being.", goals: "Promotion path.", internalState: "Introverted.", keyPeople: "Manager Phil." },
        { name: "Sofia Petrova", gender: "Female", industry: "Consulting", role: "Junior Consultant", challenges: "Missing strategic opportunities.", goals: "Performance improvement.", internalState: "Detail-oriented.", keyPeople: "Diane." },
        { name: "Jordan Lee", gender: "Male", industry: "Design", role: "Freelance Designer", challenges: "Listening gaps.", goals: "Negotiate rates.", internalState: "Insecure.", keyPeople: "Frank." },
        { name: "Brenda Johnson", gender: "Female", industry: "Hospital", role: "Nurse Manager", challenges: "Avoiding sole responsibility.", goals: "Decision path.", internalState: "Practical.", keyPeople: "Mary-Anne." },
        { name: "Amir Khan", gender: "Male", industry: "AI Startup", role: "Data Scientist", challenges: "Work-life balance.", goals: "Challenging projects.", internalState: "Quiet.", keyPeople: "Manager Chen." }
       ];

    const unsubscribe = onSnapshot(collection(db, "personas"), (snapshot) => {
        const community = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPersonas([...fallbackPersonas, ...community]);
    }, () => setPersonas(fallbackPersonas));
    return () => unsubscribe();
  }, []);

  // --- STABILIZED SEQUENTIAL EVALUATION WITH RUBRIC INJECTION ---
  const handleEndAndEvaluate = useCallback(async () => {
    if (history.length < 4) { alert("Have a longer conversation first to get accurate feedback."); return; }
    
    setIsEvaluating(true);
    const transcript = history.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n');
    
    const finalReport = {
        evaluation: [],
        speakerAnalysis: { coachPercentage: 0, clientPercentage: 0 },
        questionAnalysis: { openEnded: 0, leading: 0, clarifying: 0, observation: 0 },
        keyInsights: [],
        alternativeQuestions: [],
        foundationalCompetencies: [
            { competency: "1: Ethics", assessmentNote: "Observed basis." },
            { competency: "2: Mindset", assessmentNote: "N/A" }
        ]
    };

    try {
        // Task 1: Competencies (STRICT RUBRIC INJECTED)
        setLoadingText("Studio: Rating Competencies (1/3)...");
        const compRes = await callGeminiAPI(
            `${icfGradingRubric2025}\n\nBased STRICTLY on the rubric above, perform an ICF Analysis on this transcript:\n\n${transcript}`, 
            { 
                type: "OBJECT", 
                properties: { evaluation: { type: "ARRAY", items: { type: "OBJECT", properties: { competency: { type: "STRING" }, rating: { type: "STRING" }, justification: { type: "STRING" } }, required: ["competency", "rating", "justification"] } } } 
            }
        );
        finalReport.evaluation = compRes?.evaluation || [];

        // Task 2: Metrics
        setLoadingText("Studio: Calculating Metrics (2/3)...");
        const metricRes = await callGeminiAPI(`Talk Time % and Question Categories: ${transcript}`, {
            type: "OBJECT", 
            properties: { speakerAnalysis: { type: "OBJECT", properties: { coachPercentage: { type: "NUMBER" }, clientPercentage: { type: "NUMBER" } } }, questionAnalysis: { type: "OBJECT", properties: { openEnded: { type: "NUMBER" }, leading: { type: "NUMBER" }, clarifying: { type: "NUMBER" }, observation: { type: "NUMBER" } } } }
        });
        finalReport.speakerAnalysis = metricRes?.speakerAnalysis || finalReport.speakerAnalysis;
        finalReport.questionAnalysis = metricRes?.questionAnalysis || finalReport.questionAnalysis;

        // Task 3: Insights (STRICT RUBRIC INJECTED)
        setLoadingText("Studio: Finalizing Insights (3/3)...");
        const insightRes = await callGeminiAPI(
            `${icfGradingRubric2025}\n\nBased on the ICF rubric above, provide 5 key insights and 5 alternative powerful questions for this transcript:\n\n${transcript}`, 
            {
                type: "OBJECT", 
                properties: { keyInsights: { type: "ARRAY", items: { type: "STRING" } }, alternativeQuestions: { type: "ARRAY", items: { type: "STRING" } } }, 
                required: ["keyInsights", "alternativeQuestions"]
            }
        );
        finalReport.keyInsights = insightRes?.keyInsights || [];
        finalReport.alternativeQuestions = insightRes?.alternativeQuestions || [];

        setEvaluationResult(finalReport);
        setView('result');
        
    } catch(e) { 
        console.error("Evaluation Error:", e);
        alert("The AI had a temporary hiccup. Please try generating the report again.");
    } finally { 
        setIsEvaluating(false); 
    }
  }, [history, setView, setEvaluationResult]);

  // --- RENDERING LOGIC ---
  if (isEvaluating) return <Card className="max-w-2xl mx-auto text-center h-[50vh] flex flex-col justify-center bg-white border-rose-100 shadow-xl fade-in"><LoadingSpinner text={loadingText || "Evaluating Session..."} /></Card>;

  if (simulationStep === 'generatingImage') return <Card className="max-w-2xl mx-auto text-center h-[50vh] flex flex-col justify-center bg-white border-rose-100 shadow-xl fade-in"><LoadingSpinner text="Connecting to Studio..." /></Card>;

  if (simulationStep === 'chat') {
    return (
      <div className="max-w-6xl mx-auto h-[85vh] flex flex-col md:flex-row gap-6 fade-in">
        <div className="md:w-2/3 relative bg-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
            {personaImage ? <img src={personaImage} alt="Client" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center"><User className="w-32 h-32 text-slate-300" /></div>}
            <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/30"><div className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-pulse" /><span className="text-white text-[10px] font-black uppercase tracking-widest">Live</span></div>
            <button onClick={() => setSimulationStep('options')} className="absolute top-6 right-6 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-2.5 rounded-2xl transition-all"><LogOut className="w-5 h-5" /></button>
            <div className="absolute bottom-10 left-8 bg-white/80 backdrop-blur-2xl px-6 py-3 rounded-[1.5rem] border border-white/50 shadow-xl"><p className="text-slate-900 font-black text-sm uppercase tracking-tight">{persona.name}</p><p className="text-rose-800 text-[10px] font-bold uppercase tracking-widest">{persona.role}</p></div>
            <div className="absolute bottom-10 right-8 w-32 h-12 flex items-end"><canvas ref={canvasRef} width="128" height="48" className="w-full h-full" /></div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                {showHint && !isMuted && !isListening && <div className="bg-rose-800 text-white text-[10px] font-black px-4 py-1.5 rounded-full animate-bounce shadow-xl uppercase tracking-widest">Your Turn</div>}
                <div className="bg-white/10 backdrop-blur-3xl p-3 rounded-[2rem] border border-white/20 flex items-center gap-4 shadow-2xl">
                    <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-rose-600 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}>{isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}</button>
                    <button onClick={toggleListen} disabled={isSpeaking || isThinking || isMuted} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-rose-800 scale-110' : 'bg-white text-rose-800 shadow-lg hover:bg-rose-50'}`}><div className={`w-3.5 h-3.5 rounded-full ${isListening ? 'bg-white animate-ping' : 'bg-rose-800'}`} /></button>
                    <button onClick={handleEndAndEvaluate} className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center shadow-lg transition-colors"><PhoneOff className="text-white w-6 h-6" /></button>
                </div>
            </div>
        </div>
        <div className="md:w-1/3 flex flex-col gap-4">
            <div className="bg-rose-800 rounded-[2rem] p-6 text-white shadow-xl shadow-rose-200"><h3 className="text-[10px] font-black uppercase tracking-widest text-rose-200 mb-2">Focus</h3><p className="text-sm font-medium leading-relaxed">{persona.challenges}</p></div>
            <div className="bg-white flex-grow rounded-[2rem] border border-slate-100 shadow-xl flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex justify-between bg-slate-50/50"><h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Live Transcript</h3></div>
                <div ref={chatWindowRef} className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {history.map((msg, index) => (<div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}><div className={`max-w-[90%] p-4 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-rose-50 text-rose-900 border border-rose-100 rounded-br-none' : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-bl-none'}`}>{msg.text}</div></div>))}
                  {isThinking && <div className="text-rose-800/50 text-[10px] font-black animate-pulse uppercase tracking-widest text-center w-full mt-4">Thinking...</div>}
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (simulationStep === 'select') {
    return (
      <Card className="max-w-2xl mx-auto bg-white border-rose-100 shadow-xl fade-in">
        <div className="flex justify-between items-center mb-10 border-b border-rose-50 pb-6"><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Client Database</h2><Button onClick={() => setSimulationStep('options')} variant="secondary" className="border-rose-100 text-rose-800 font-bold uppercase tracking-widest text-[10px]">Back</Button></div>
        <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {personas.map(p => (
            <button key={p.name} onClick={() => startSimulationWithPersona(p)} className="w-full text-left p-6 border border-slate-100 rounded-3xl hover:border-rose-200 hover:bg-rose-50/50 transition-all bg-slate-50/30"><div className="flex justify-between items-start mb-3"><h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{p.name}</h3><span className="text-[9px] bg-white text-slate-400 border border-slate-100 px-3 py-1 rounded-full font-black uppercase tracking-widest">{p.industry}</span></div><p className="text-rose-800 text-[10px] font-black mb-3 uppercase tracking-widest">{p.role}</p><p className="text-slate-500 text-xs line-clamp-2 leading-relaxed font-medium">{p.challenges}</p></button>
          ))}
        </div>
      </Card>
    );
  }

  if (simulationStep === 'create') {
    return (
        <Card className="max-w-2xl mx-auto bg-white border-rose-100 shadow-xl fade-in">
            <div className="flex justify-between items-center mb-8 border-b border-rose-50 pb-6"><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">New Client</h2><Button onClick={() => setSimulationStep('options')} variant="secondary" className="border-rose-100 text-rose-800 font-bold uppercase tracking-widest text-[10px]">Back</Button></div>
            <div className="space-y-6 text-left">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Name</label><input type="text" placeholder="e.g. Alex" value={customPersona.name} onChange={(e) => setCustomPersona({...customPersona, name: e.target.value})} className="w-full p-4 border border-slate-100 bg-slate-50/50 rounded-2xl text-sm mt-1 focus:ring-2 focus:ring-rose-800 outline-none font-medium text-slate-800"/></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Gender</label><select value={customPersona.gender} onChange={(e) => setCustomPersona({...customPersona, gender: e.target.value})} className="w-full p-4 border border-slate-100 bg-slate-50/50 rounded-2xl text-sm mt-1 focus:ring-2 focus:ring-rose-800 outline-none font-medium text-slate-800"><option value="Female">Female</option><option value="Male">Male</option></select></div>
                </div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Professional Role</label><input type="text" placeholder="e.g. Senior Manager" value={customPersona.role} onChange={(e) => setCustomPersona({...customPersona, role: e.target.value})} className="w-full p-4 border border-slate-100 bg-slate-50/50 rounded-2xl text-sm mt-1 focus:ring-2 focus:ring-rose-800 outline-none font-medium text-slate-800"/></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Challenges</label><textarea placeholder="Describe the problem..." value={customPersona.challenges} onChange={(e) => setCustomPersona({...customPersona, challenges: e.target.value})} className="w-full h-24 p-4 border border-slate-100 bg-slate-50/50 rounded-2xl text-sm mt-1 focus:ring-2 focus:ring-rose-800 outline-none font-medium text-slate-800"/></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Goals</label><textarea placeholder="What do they want to achieve?" value={customPersona.goals} onChange={(e) => setCustomPersona({...customPersona, goals: e.target.value})} className="w-full h-24 p-4 border border-slate-100 bg-slate-50/50 rounded-2xl text-sm mt-1 focus:ring-2 focus:ring-rose-800 outline-none font-medium text-slate-800"/></div>
                <Button onClick={startCustomSimulation} className="w-full py-5 text-xs font-black tracking-widest uppercase bg-rose-800 hover:bg-rose-900 text-white shadow-xl shadow-rose-200 mt-4 transition-all active:scale-95">Initialize Studio Session</Button>
            </div>
        </Card>
    );
  }

  // --- DEFAULT OPTIONS VIEW ---
  return (
    <Card className="max-w-2xl mx-auto text-center py-12 bg-white border-rose-100 shadow-xl fade-in relative">
      <Button onClick={() => setView('home')} variant="secondary" className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-rose-100 text-rose-800 absolute top-6 right-6 hover:bg-rose-50"><ArrowLeft className="w-4 h-4 mr-2 inline" /> Back</Button>
      <IconWrapper><Mic className="w-10 h-10 text-rose-800" /></IconWrapper>
      <h1 className="text-4xl font-black text-slate-900 mt-6 mb-4 tracking-tighter uppercase">Voice Studio</h1>
      <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed">Immersive virtual meeting room for real-time ICF competency practice.</p>
      <div className="grid gap-4 max-w-sm mx-auto">
          <Button onClick={startRandomSimulation} className="w-full py-6 text-xs font-black uppercase tracking-widest bg-rose-800 hover:bg-rose-900 shadow-xl shadow-rose-200 text-white transition-all">Instant Random Client</Button>
          <Button onClick={() => setSimulationStep('select')} variant="secondary" className="w-full py-4 text-[10px] font-black uppercase tracking-widest border-rose-100 text-rose-800 hover:bg-rose-50 transition-colors"><List size={16} className="mr-2 inline"/> Browse Client Database</Button>
          <Button onClick={() => setSimulationStep('create')} variant="secondary" className="w-full py-4 text-[10px] font-black uppercase tracking-widest border-rose-100 text-rose-800 hover:bg-rose-50 transition-colors"><UserPlus size={16} className="mr-2 inline"/> Create Custom Client</Button>
      </div>
    </Card>
  );
};

export default VoiceSimulation;