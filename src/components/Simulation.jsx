import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, User, Send, Dices, List, UserPlus } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import IconWrapper from './IconWrapper';
import LoadingSpinner from './LoadingSpinner';
import { callGeminiAPI } from '../utils/api';
// Import 'collection', 'addDoc', and 'onSnapshot'
import { collection, addDoc, onSnapshot } from "firebase/firestore";
// Correct the db import path to App.jsx
import { db } from '../App.jsx';

const Simulation = ({ setView, currentUser, setEvaluationResult }) => {
    const [persona, setPersona] = useState(null);
    const [personas, setPersonas] = useState([]); // Will be populated from Firestore
    const [history, setHistory] = useState([]);
    const [simulationStep, setSimulationStep] = useState('options');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [customPersona, setCustomPersona] = useState({ name: '', industry: '', role: '', challenges: '', goals: '',gender: 'Female', internalState: '', keyPeople: '' });
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPersonaDetails, setShowPersonaDetails] = useState(false);
    const chatWindowRef = useRef(null);

    // --- defaultPersonas array is REMOVED ---

    // --- This useEffect now fetches from Firestore ---
     useEffect(() => {
        // Keep a few defaults as a fallback in case Firestore is empty/fails
        const fallbackPersonas = [
             { name: 'Alex Chen', gender: 'Female', industry: 'Tech Startup', role: 'New Manager', challenges: "Drowning in work, don't trust team. Ben missed deadline, fixed it myself. Feel like I must do everything.", goals: "Delegate effectively without losing control. Trust team, especially Sarah, but fear failure.", internalState: "Anxious, frustrated, micromanaging but can't stop. Worried about burnout.", keyPeople: "Ben (Direct Report) - Missed deadline. Sarah (DR) - Has potential." },
             { name: 'Maria Rodriguez', gender: 'Female', industry: 'Corp Finance', role: 'Senior Exec', challenges: "Felt nothing in Q3 planning with boss Cynthia. Hit targets, but going through motions. Promotion feels empty.", goals: "Understand disconnect. Is it job or me? Want passion again, maybe drastic change.", internalState: "Numb, apathetic, trapped. Guilty for not appreciating success. Confused.", keyPeople: "Cynthia (Boss, SVP) - Supportive but high-pressure." }
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
    }, []); // The empty array ensures this runs only once


    const createDescriptionFromPersona = (p) => {
        return `Role-play as: Name: ${p.name || 'Alex'}, Role: ${p.role} (${p.industry || 'any'}). Challenges: "${p.challenges}". Goals: "${p.goals}". Internal State: "${p.internalState}". Key People: "${p.keyPeople}". Embody state, use names, be realistic.`;
    };

    const handleSendMessage = useCallback(async () => {
        if (userInput.trim() === '' || isLoading) return;
        const newHistory = [...history, { role: 'user', text: userInput }];
        setHistory(newHistory);
        setUserInput('');
        setIsLoading(true);

        const prompt = `You are acting as a coaching client. Persona: "${createDescriptionFromPersona(persona)}". Respond naturally based on history. Keep concise. History:\n${newHistory.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n')}`;
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
    }, [userInput, history, isLoading, persona]);

    const handleEndAndEvaluate = useCallback(async () => {
        if (history.length < 4) {
         alert("Have a longer conversation first.");
         return;
     };
     setIsEvaluating(true);
     const transcript = history.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n');
     try {
        const fullReport = {};
        setLoadingText("Analyzing competencies...");
         // Competency Analysis
        const competencyPrompt = `Analyze transcript based on ICF competencies 3-8. Rate (Exemplary, Proficient, Sufficient, Needs Development) & justify. Return JSON { "evaluation": [...] }. Transcript: ${transcript}`;
        const competencySchema = {type: "OBJECT", properties: { evaluation: { type: "ARRAY", items: { type: "OBJECT", properties: { competency: { type: "STRING" }, rating: { type: "STRING" }, justification: { type: "STRING" } }, required: ["competency", "rating", "justification"] } } } };
        const competencyResult = await callGeminiAPI(competencyPrompt, competencySchema);
        fullReport.evaluation = competencyResult.evaluation;
        fullReport.foundationalCompetencies = [
            { competency: "1: Demonstrates Ethical Practice", assessmentNote: "Observed/Not Observed basis by assessor." },
            { competency: "2: Embodies a Coaching Mindset", assessmentNote: "Assessed via ICF Exam & mentor coaching." }
        ];

        setLoadingText("Analyzing talk time...");
        // Talk Time
        const talkTimePrompt = `Analyze talk time: Coach vs Client %. Return JSON { "coachPercentage": #, "clientPercentage": # }. Transcript: ${transcript}`;
        const talkTimeSchema = { type: "OBJECT", properties: { coachPercentage: { type: "NUMBER" }, clientPercentage: { type: "NUMBER" } }, required: ["coachPercentage", "clientPercentage"] };
        fullReport.speakerAnalysis = await callGeminiAPI(talkTimePrompt, talkTimeSchema);

        setLoadingText("Identifying key insights...");
         // Key Insights
        const insightsPrompt = `Identify up to 5 client insights. Return JSON { "keyInsights": [...] }. Transcript: ${transcript}`;
        const insightsSchema = { type: "OBJECT", properties: { keyInsights: { type: "ARRAY", items: { type: "STRING" } } } };
        fullReport.keyInsights = (await callGeminiAPI(insightsPrompt, insightsSchema)).keyInsights;

        setLoadingText("Suggesting alternative questions...");
        // Alternative Questions
        const questionsPrompt = `Suggest up to 5 powerful alternative questions. Return JSON { "alternativeQuestions": [...] }. Transcript: ${transcript}`;
        const questionsSchema = { type: "OBJECT", properties: { alternativeQuestions: { type: "ARRAY", items: { type: "STRING" } } } };
        fullReport.alternativeQuestions = (await callGeminiAPI(questionsPrompt, questionsSchema)).alternativeQuestions;


        setLoadingText("Analyzing question types...");
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

    // --- This function now saves to Firestore ---
    const startCustomSimulation = async () => {
        const { name, industry, role, challenges, goals, internalState, keyPeople } = customPersona;
        if (!role || !challenges || !goals) {
            alert("Fill out Role, Challenges, Goals.");
            return;
        }

        const newPersonaObject = {
            name: name.trim() || `A ${role}`,
            industry: industry || 'Not specified',
            role,
            challenges,
            goals,
            internalState: internalState || 'Not specified',
            keyPeople: keyPeople || 'Not specified',
            gender: customPersona.gender, 
            createdBy: currentUser.uid, // Track who created it
            creatorEmail: currentUser.email // Track who created it
        };

        setPersona(newPersonaObject);
        setHistory([{role: 'model', text: `Hello, coach. Thanks for meeting with me.`}]);
        setSimulationStep('chat');

        // Save the new persona to the public Firestore collection
        try {
            await addDoc(collection(db, "personas"), newPersonaObject);
        } catch (error) {
            console.error("Error adding custom persona to Firestore: ", error);
            // Don't block the user, just log the error
        }
    };

    const startRandomSimulation = () => {
        if (personas.length === 0) {
            alert("Personas loading, try again.");
            return;
        }
        const randomPersonaObject = personas[Math.floor(Math.random() * personas.length)];
        setPersona(randomPersonaObject);
        setHistory([{role: 'model', text: `Hello, coach. Thanks for meeting with me.`}]);
        setSimulationStep('chat');
    };

    useEffect(() => {
        if (chatWindowRef.current) {
          chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [history]);

    // JSX Rendering based on original component
    if (isEvaluating) { return <LoadingSpinner text={loadingText} />; }

    if (simulationStep === 'options') {
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <div className="flex justify-end"> <Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm absolute top-6 right-6">&larr; Back</Button> </div>
            <IconWrapper><Bot className="w-8 h-8" /></IconWrapper>
            <h1 className="text-3xl font-bold mt-4 mb-4">Text Simulation Options</h1>
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
            <div className="flex justify-between items-start mb-4"> <h1 className="text-3xl font-bold">Choose a Client Persona</h1> <Button onClick={() => setSimulationStep('options')} variant="secondary" className="px-3 py-1 text-sm">&larr; Back</Button> </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
                {personas.map(p => (
                    <button key={p.name} onClick={() => { setPersona(p); setHistory([{role: 'model', text: `Hello, coach.`}]); setSimulationStep('chat'); }} className="w-full text-left p-4 border rounded-lg hover:bg-stone-50 transition">
                      <h3 className="font-bold text-lg">{p.name}</h3>
                      <p className="text-sm"><span className="font-semibold">Role:</span> {p.role}</p>
                      <p className="text-sm"><span className="font-semibold">Challenges:</span> {p.challenges}</p>
                    </button>
                ))}
            </div>
          </Card>
        );
    }

      if (simulationStep === 'create') {
        return (
            <Card className="max-w-2xl mx-auto">
                <div className="flex justify-between items-start mb-4"> <h1 className="text-3xl font-bold">Create Custom Persona</h1> <Button onClick={() => setSimulationStep('options')} variant="secondary" className="px-4 py-2 text-sm">&larr; Back</Button> </div>
                <div className="space-y-4">
                    {/* Form inputs identical to original component */}
                    <div> <label htmlFor="persona-name">Name (Optional)</label> <input type="text" id="persona-name" value={customPersona.name} onChange={(e) => setCustomPersona({...customPersona, name: e.target.value})} placeholder="e.g., Alex Chen" className="w-full p-2 border rounded-lg"/> </div>
                    {/* --- ADD THIS BLOCK FOR GENDER --- */}
                    <div>
                        <label className="block text-slate-700 mb-2">Gender</label>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input type="radio" name="gender" value="Female" checked={customPersona.gender === 'Female'} onChange={(e) => setCustomPersona({...customPersona, gender: e.g.target.value})} className="h-4 w-4 text-stone-600" />
                                <span className="ml-2 text-slate-700">Female</span>
                            </label>
                            <label className="flex items-center">
                                <input type="radio" name="gender" value="Male" checked={customPersona.gender === 'Male'} onChange={(e) => setCustomPersona({...customPersona, gender: e.target.value})} className="h-4 w-4 text-stone-600" />
                                <span className="ml-2 text-slate-700">Male</span>
                            </label>
                        </div>
                    </div>
                    {/* --- END OF BLOCK TO ADD --- */}
                    <div> <label htmlFor="persona-role">Role</label> <input type="text" id="persona-role" value={customPersona.role} onChange={(e) => setCustomPersona({...customPersona, role: e.target.value})} placeholder="e.g., New Manager" className="w-full p-2 border rounded-lg"/> </div>
                    <div> <label htmlFor="persona-challenges">Specific Challenges</label> <textarea id="persona-challenges" value={customPersona.challenges} onChange={(e) => setCustomPersona({...customPersona, challenges: e.target.value})} placeholder="e.g., My direct report, Ben, missed a deadline..." className="w-full h-24 p-2 border rounded-lg"/> </div>
                    <div> <label htmlFor="persona-goals">Goals for the session</label> <textarea id="persona-goals" value={customPersona.goals} onChange={(e) => setCustomPersona({...customPersona, goals: e.target.value})} placeholder="e.g., Learn how to delegate..." className="w-full h-24 p-2 border rounded-lg"/> </div>
                    <div> <label htmlFor="persona-internal-state">Internal State</label> <textarea id="persona-internal-state" value={customPersona.internalState} onChange={(e) => setCustomPersona({...customPersona, internalState: e.target.value})} placeholder="e.g., Anxious, frustrated..." className="w-full h-24 p-2 border rounded-lg"/> </div>
                    <div> <label htmlFor="persona-key-people">Key People</label> <textarea id="persona-key-people" value={customPersona.keyPeople} onChange={(e) => setCustomPersona({...customPersona, keyPeople: e.target.value})} placeholder="e.g., Ben (Direct Report) - struggling." className="w-full h-24 p-2 border rounded-lg"/> </div>
                    <Button onClick={startCustomSimulation} className="w-full">Start Simulation</Button>
                </div>
            </Card>
        );
      }

      return ( // simulationStep === 'chat'
        <Card className="max-w-4xl mx-auto h-[85vh] flex flex-col">
           <div className="flex justify-between items-center mb-4 pb-4 border-b"> <div> <h1 className="text-2xl font-bold">Coaching Simulation</h1> <p>You are coaching. Type below.</p> </div> <div className="flex-shrink-0 flex gap-2">
          <Button onClick={() => setShowPersonaDetails(!showPersonaDetails)} variant="secondary" className="px-3 py-1 text-sm">
            {showPersonaDetails ? 'Hide' : 'Show'} Details
          </Button>
          <Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm">&larr; Back</Button> 
       </div>
    </div>
    
     {/* --- ADD THIS CONDITIONAL BLOCK --- */}
     {showPersonaDetails && (
      <div className="p-4 bg-slate-50 rounded-lg mb-4 text-sm border">
        <h4 className="font-bold text-stone-700">Persona Details</h4>
        <p className="mt-1"><strong>Name:</strong> {persona.name}</p>
        <p className="mt-1"><strong>Role:</strong> {persona.role}</p>
        <p className="mt-1"><strong>Challenges:</strong> {persona.challenges}</p>
        <p className="mt-1"><strong>Goals:</strong> {persona.goals}</p>
      </div>
     )}
     {/* --- END ADD --- */}

          <div ref={chatWindowRef} className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6">
            {history.map((msg, index) => (
              <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'model' && <div className="bg-stone-700 text-white rounded-full p-2"><Bot size={20} /></div>}
                <div className={`max-w-md p-4 rounded-2xl ${msg.role === 'user' ? 'bg-slate-200 rounded-br-none' : 'bg-stone-700 text-white rounded-bl-none'}`}> {msg.text} </div>
                {msg.role === 'user' && <div className="bg-slate-200 rounded-full p-2"><User size={20} /></div>}
              </div>
            ))}
            {isLoading && <div className="flex justify-start"><div className="p-4 rounded-2xl bg-stone-700 text-white rounded-bl-none">...</div></div>}
          </div>
          <div className="mt-6 flex gap-4"> <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type question..." className="flex-grow p-3 border rounded-lg"/> <Button onClick={handleSendMessage} disabled={isLoading}><Send /></Button> </div>
          <Button onClick={handleEndAndEvaluate} variant="secondary" className="w-full mt-4">End & Evaluate</Button>
        </Card>
      );
    };

export default Simulation;