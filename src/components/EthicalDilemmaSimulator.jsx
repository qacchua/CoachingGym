import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, CheckSquare, Lightbulb, Sparkles } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { callGeminiAPI } from '../utils/api'; // Assuming api utils
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from '../firebaseConfig'; // Assuming firebase config is moved

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
        const docRef = await addDoc(collection(db, "dilemmas"), {
            userId: currentUser.uid,
            dilemma: dilemmaText,
            timestamp: new Date()
        });
        setDilemmaDocId(docRef.id);
        setFlowStep('respond');
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Could not save dilemma. Please try again.");
    } finally {
        setIsLoading(false);
    }
};

const handleSolutionSubmit = async () => {
  if (!dilemmaDocId) {
    console.error("Dilemma Document ID is missing.");
    alert("A critical error occurred. Please refresh and try again.");
    return;
  }

  if (userResponse.trim().length < 10) {
    alert("Please provide a more detailed response.");
    return;
  }
  setIsLoading(true);

  try {
    const dilemmaRef = doc(db, "dilemmas", dilemmaDocId);
    await updateDoc(dilemmaRef, {
      solution: userResponse
    });
    console.log("Firestore update successful. Document ID:", dilemmaDocId);

  } catch (error) {
    console.error("FIRESTORE UPDATE FAILED:", error);
    alert("Error saving your solution. Check console for details.");
    setIsLoading(false);
    return;
  }

  try {
    const dilemmaText = dilemmaMode === 'random' ? currentDilemma.scenario : customDilemma;

    const feedbackSchema = {
      type: "OBJECT",
      properties: {
        strengths: { type: "STRING", description: "Positive aspects." },
        pitfalls: { type: "STRING", description: "Potential risks." },
        alternatives: { type: "STRING", description: "Alternative actions." }
      },
      required: ["strengths", "pitfalls", "alternatives"]
    };

    const feedbackPrompt = `
      You are an ICF MCC. Dilemma: "${dilemmaText}"
      Solution: "${userResponse}"
      Analyze based on ICF Code of Ethics. Return JSON: "strengths", "pitfalls", "alternatives".
    `;

    const result = await callGeminiAPI(feedbackPrompt, feedbackSchema);
    setFeedback(result);
    setFlowStep('feedback');

  } catch (error) {
    console.error("GEMINI API CALL FAILED:", error);
    alert("Error getting AI feedback. Check console.");
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

      {flowStep === 'select' && (
            <>
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

export default EthicalDilemmaSimulator;