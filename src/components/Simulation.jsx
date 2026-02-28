import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, User, Send, List, UserPlus, ArrowLeft } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import IconWrapper from './IconWrapper';
import LoadingSpinner from './LoadingSpinner';
import { callGeminiAPI } from '../utils/api';
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from '../firebaseConfig.js';

const Simulation = ({ setView, currentUser, setEvaluationResult }) => {
    // --- STATE ---
    const [persona, setPersona] = useState(null);
    const [personas, setPersonas] = useState([]); 
    const [history, setHistory] = useState([]);
    const [simulationStep, setSimulationStep] = useState('options'); // 'options', 'select', 'create', 'chat'
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [customPersona, setCustomPersona] = useState({ name: '', industry: '', role: '', challenges: '', goals: '', gender: 'Female', internalState: '', keyPeople: '' });
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPersonaDetails, setShowPersonaDetails] = useState(false);
    
    // REF FOR AUTO-SCROLL
    const chatWindowRef = useRef(null);

    // --- FALLBACK DATABASE ---
    const fallbackPersonas = [
        { name: 'Alex Chen', gender: 'Female', industry: 'Tech Startup', role: 'New Manager', challenges: "Drowning in work, don't trust team. Ben missed deadline.", goals: "Delegate effectively.", internalState: "Anxious.", keyPeople: "Ben." },
        { name: 'Maria Rodriguez', gender: 'Female', industry: 'Finance', role: 'Senior Exec', challenges: "Promotion feels empty.", goals: "Understand disconnect.", internalState: "Numb.", keyPeople: "Cynthia." },
        { name: "Priya Sharma", gender: "Female", industry: "Technology", role: "Director of Product", challenges: "Identity tied to expertise; fear failure.", goals: "Delegation strategies.", internalState: "Overwhelmed.", keyPeople: "Boss Mark." },
        { name: "David Chen", gender: "Male", industry: "Engineering", role: "Senior Manager", challenges: "Skeptical of soft skills; perfectionism.", goals: "Better communication.", internalState: "Skeptical.", keyPeople: "Director Susan." },
        { name: "Maria Flores", gender: "Female", industry: "Fortune 100", role: "Head of People", challenges: "Conflict avoidance.", goals: "Resolve harmony over accountability.", internalState: "Anxious.", keyPeople: "Jessica and Ben." },
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

    // --- AUTO-SCROLL EFFECT ---
    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [history, isLoading]);

    // --- PERSONA MERGE ---
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "personas"), (snapshot) => {
            const communityPersonas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const combined = [...fallbackPersonas, ...communityPersonas];
            const unique = Array.from(new Set(combined.map(p => p.name)))
                                .map(name => combined.find(p => p.name === name));
            setPersonas(unique);
        }, (error) => {
            setPersonas(fallbackPersonas);
        });
        return () => unsubscribe();
    }, []);

    // --- NAVIGATION HELPERS ---
    const startSimulation = (p) => {
        setPersona(p);
        setHistory([{ role: 'model', text: "Hello coach, thanks for meeting with me today." }]);
        setSimulationStep('chat');
        setShowPersonaDetails(false);
    };

    const startRandomSimulation = () => {
        const p = personas[Math.floor(Math.random() * personas.length)];
        startSimulation(p);
    };

    const startCustomSimulation = async () => {
        const { role, challenges, goals } = customPersona;
        if (!role || !challenges || !goals) { alert("Fill out Role, Challenges, Goals."); return; }
        const newP = { ...customPersona, name: customPersona.name.trim() || `A ${role}`, createdBy: currentUser.uid };
        startSimulation(newP);
        try { await addDoc(collection(db, "personas"), newP); } catch (e) {}
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;
        const newHistory = [...history, { role: 'user', text: userInput }];
        setHistory(newHistory);
        setUserInput('');
        setIsLoading(true);

        try {
            const prompt = `Act as coaching client ${persona.name}. Response: 1-2 sentences. History:\n${newHistory.map(m => `${m.role === 'user' ? 'Coach' : 'Client'}: ${m.text}`).join('\n')}`;
            const chatSchema = { type: "OBJECT", properties: { responseText: { type: "STRING" } }, required: ["responseText"] };
            const result = await callGeminiAPI(prompt, chatSchema);
            setHistory(prev => [...prev, { role: 'model', text: result.responseText }]);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    // --- SEQUENTIAL EVALUATION LOGIC (STABILITY FIX) ---
    const handleEndAndEvaluate = useCallback(async () => {
        if (history.length < 4) { alert("Have a longer conversation first."); return; }
        
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
            // Task 1: Competencies
            setLoadingText("Studio: Rating Competencies (1/3)...");
            const compRes = await callGeminiAPI(`ICF Analysis: ${transcript}`, { 
                type: "OBJECT", 
                properties: { evaluation: { type: "ARRAY", items: { type: "OBJECT", properties: { competency: { type: "STRING" }, rating: { type: "STRING" }, justification: { type: "STRING" } }, required: ["competency", "rating", "justification"] } } } 
            });
            finalReport.evaluation = compRes?.evaluation || [];

            // Task 2: Metrics
            setLoadingText("Studio: Calculating Metrics (2/3)...");
            const metricRes = await callGeminiAPI(`Talk Time % and Question Categories: ${transcript}`, {
                type: "OBJECT", 
                properties: { 
                    speakerAnalysis: { type: "OBJECT", properties: { coachPercentage: { type: "NUMBER" }, clientPercentage: { type: "NUMBER" } }, required: ["coachPercentage", "clientPercentage"] },
                    questionAnalysis: { type: "OBJECT", properties: { openEnded: { type: "NUMBER" }, leading: { type: "NUMBER" }, clarifying: { type: "NUMBER" }, observation: { type: "NUMBER" } }, required: ["openEnded", "leading", "clarifying", "observation"] }
                }
            });
            finalReport.speakerAnalysis = metricRes?.speakerAnalysis || finalReport.speakerAnalysis;
            finalReport.questionAnalysis = metricRes?.questionAnalysis || finalReport.questionAnalysis;

            // Task 3: Insights
            setLoadingText("Studio: Finalizing Insights (3/3)...");
            const insightRes = await callGeminiAPI(`5 insights and 5 questions: ${transcript}`, {
                type: "OBJECT", 
                properties: { keyInsights: { type: "ARRAY", items: { type: "STRING" } }, alternativeQuestions: { type: "ARRAY", items: { type: "STRING" } } }, 
                required: ["keyInsights", "alternativeQuestions"]
            });
            finalReport.keyInsights = insightRes?.keyInsights || [];
            finalReport.alternativeQuestions = insightRes?.alternativeQuestions || [];

            setEvaluationResult(finalReport);
            setView('result');
        } catch(e) { 
            console.error("Evaluation Error:", e);
            alert("The AI had a temporary hiccup. Please click 'Generate Report' one more time.");
        } finally { 
            setIsEvaluating(false); 
        }
    }, [history, setView, setEvaluationResult]);

    // --- RENDER VIEWS ---
    if (isEvaluating) return <LoadingSpinner text={loadingText} />;

    // CHAT VIEW
    if (simulationStep === 'chat') {
        return (
            <Card className="max-w-4xl mx-auto h-[85vh] flex flex-col border-rose-100">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-rose-50">
                    <div>
                        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Studio Session</h1>
                        <p className="text-rose-800 text-[10px] font-black uppercase tracking-widest">Client: {persona.name}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setShowPersonaDetails(!showPersonaDetails)} variant="secondary" className="text-rose-800 border-rose-100 text-xs font-bold">
                            {showPersonaDetails ? 'Hide' : 'Show'} Client Details
                        </Button>
                        <Button onClick={() => setView('home')} variant="secondary" className="text-rose-800 border-rose-100 text-xs font-bold">Exit</Button>
                    </div>
                </div>

                {showPersonaDetails && (
                    <div className="p-4 bg-rose-50/50 rounded-2xl mb-4 text-xs border border-rose-100 space-y-2 animate-in fade-in duration-200">
                        <p><strong>Name:</strong> {persona.name} </p>
                        <p><strong>Role:</strong> {persona.role} ({persona.industry || 'General'})</p>
                        <p><strong>Challenges:</strong> {persona.challenges}</p>
                        <p><strong>Goals:</strong> {persona.goals}</p>
                    </div>
                )}

                <div ref={chatWindowRef} className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {history.map((msg, i) => (
                        <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            <div className={`max-w-md p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-rose-800 text-white rounded-br-none shadow-md' : 'bg-slate-100 text-slate-700 rounded-bl-none border border-slate-200 shadow-sm'}`}>{msg.text}</div>
                        </div>
                    ))}
                    {isLoading && <div className="text-rose-800/50 italic text-[10px] font-bold uppercase tracking-widest animate-pulse ml-2">Client is thinking...</div>}
                </div>

                <div className="mt-4 flex gap-2">
                    <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type your coaching question..." className="flex-grow p-4 border border-rose-100 rounded-2xl outline-none bg-rose-50/10 focus:ring-1 focus:ring-rose-800 text-sm"/>
                    <Button onClick={handleSendMessage} className="bg-rose-800 text-white p-4 rounded-2xl shadow-lg hover:bg-rose-900 transition-all"><Send size={20}/></Button>
                </div>
                <Button onClick={handleEndAndEvaluate} variant="secondary" className="w-full mt-4 border-rose-800 text-rose-800 font-black uppercase text-[10px] py-4 tracking-[0.2em] hover:bg-rose-50">Generate Feedback Report</Button>
            </Card>
        );
    }

    // DATABASE SELECT VIEW
    if (simulationStep === 'select') {
        return (
            <Card className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Client Database</h2>
                    <Button onClick={() => setSimulationStep('options')} variant="secondary" className="text-xs border-rose-100 text-rose-800 font-bold">Back</Button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {personas.map(p => (
                        <button key={p.name} onClick={() => startSimulation(p)} className="w-full text-left p-4 border border-rose-50 rounded-2xl hover:bg-rose-50/50 transition-all bg-slate-50/30 group">
                            <h3 className="font-bold text-slate-800 group-hover:text-rose-800">{p.name}</h3>
                            <p className="text-rose-800 text-[10px] font-black uppercase tracking-widest">{p.role}</p>
                            <p className="text-slate-500 text-xs line-clamp-1">{p.challenges}</p>
                        </button>
                    ))}
                </div>
            </Card>
        );
    }

    // CREATE CUSTOM VIEW
    if (simulationStep === 'create') {
        return (
            <Card className="max-w-2xl mx-auto bg-white border-rose-100 shadow-xl">
                <div className="flex justify-between items-center mb-8 border-b border-rose-50 pb-4">
                    <h2 className="text-2xl font-black text-slate-900 uppercase">New Custom Client</h2>
                    <Button onClick={() => setSimulationStep('options')} variant="secondary" className="text-xs border-rose-100 text-rose-800 font-bold">Back</Button>
                </div>
                <div className="space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                            <input type="text" placeholder="e.g. Alex" value={customPersona.name} onChange={(e) => setCustomPersona({...customPersona, name: e.target.value})} className="w-full p-4 border border-rose-50 bg-slate-50/50 rounded-2xl text-sm focus:ring-1 focus:ring-rose-800 outline-none mt-1"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                            <select value={customPersona.gender} onChange={(e) => setCustomPersona({...customPersona, gender: e.target.value})} className="w-full p-4 border border-rose-50 bg-slate-50/50 rounded-2xl text-sm focus:ring-1 focus:ring-rose-800 outline-none mt-1">
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Role</label>
                        <input type="text" placeholder="e.g. CEO, Senior Manager..." value={customPersona.role} onChange={(e) => setCustomPersona({...customPersona, role: e.target.value})} className="w-full p-4 border border-rose-50 bg-slate-50/50 rounded-2xl text-sm focus:ring-1 focus:ring-rose-800 outline-none mt-1"/>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Challenges</label>
                        <textarea placeholder="What is the core struggle?" value={customPersona.challenges} onChange={(e) => setCustomPersona({...customPersona, challenges: e.target.value})} className="w-full h-24 p-4 border border-rose-50 bg-slate-50/50 rounded-2xl text-sm focus:ring-1 focus:ring-rose-800 outline-none mt-1"/>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Coaching Goals</label>
                        <textarea placeholder="What do they want from this session?" value={customPersona.goals} onChange={(e) => setCustomPersona({...customPersona, goals: e.target.value})} className="w-full h-24 p-4 border border-rose-50 bg-slate-50/50 rounded-2xl text-sm focus:ring-1 focus:ring-rose-800 outline-none mt-1"/>
                    </div>
                    <Button onClick={startCustomSimulation} className="w-full py-5 text-sm font-black uppercase tracking-widest bg-rose-800 hover:bg-rose-900 text-white shadow-xl mt-4">Initialize Custom Studio</Button>
                </div>
            </Card>
        );
    }

    // MAIN OPTIONS VIEW
    return (
        <Card className="max-w-2xl mx-auto text-center py-12 shadow-xl border-rose-50">
            <IconWrapper><Bot className="w-10 h-10 text-rose-800" /></IconWrapper>
            <h1 className="text-4xl font-black text-slate-900 mt-6 tracking-tight uppercase">Text Studio</h1>
            <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium">Deliberate practice for ICF Mastery.</p>
            <div className="grid gap-4 max-w-xs mx-auto">
                <Button onClick={startRandomSimulation} className="bg-rose-800 text-white py-6 text-lg font-bold shadow-xl shadow-rose-100 hover:bg-rose-900 transition-all uppercase tracking-widest">Choose Client at Random </Button>
                <Button onClick={() => setSimulationStep('select')} variant="secondary" className="border-rose-200 text-rose-800 py-4 font-bold uppercase tracking-widest text-xs"><List size={18} className="mr-2"/> Client Database</Button>
                <Button onClick={() => setSimulationStep('create')} variant="secondary" className="border-rose-200 text-rose-800 py-4 font-bold uppercase tracking-widest text-xs"><UserPlus size={18} className="mr-2"/> Custom Client</Button>
            </div>
        </Card>
    );
};

export default Simulation;