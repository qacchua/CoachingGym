// src/components/EthicalDilemmaSimulator.jsx

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, CheckSquare, Lightbulb, Sparkles } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { callGeminiAPI } from '../utils/api';
// Import all the firestore functions you'll need
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, // Use setDoc to specify a doc ID
  getDoc,  // Use getDoc to check for an existing solution
  onSnapshot // Use onSnapshot to get the public dilemma list
} from "firebase/firestore"; 
import { db } from '../App.jsx'; // Correct db import

// These are now just a fallback in case firestore is empty
const fallbackDilemmas = [
  
  { title: "Coachability Concerns", scenario: "You have been coaching a client for three sessions. In each session, they agree to specific actions but consistently fail to complete them, often blaming external factors. They seem to enjoy the conversation but are not making any progress toward their stated goals. How do you address this in your next session?" },
  { title: "Blurred Boundaries", scenario: "Your client, with whom you've built a strong rapport over six months, invites you to a celebratory dinner with their family to mark the promotion they achieved through your coaching. They insist on paying and want you to attend as a guest of honor. How do you handle this invitation?" },
  {    title: "Duty to Disclose Harm",
    scenario: "A client reveals they are engaging in illegal activities that pose a potential, but not immediate, risk of danger to others. How do you handle this situation?"
  },
  {
    title: "Corporate Confidentiality",
    scenario: "Your client's sponsor (their employer) asks for specific details about the client's performance and personal challenges discussed during sessions. What is the most appropriate response for a coach?"
  },
  {
    title: "Use of AI Technology",
    scenario: "You wish to use an AI-powered transcription service for session notes, which you currently use without informing clients. Analyze this from an ethical perspective"
  },
  {
    title: "Inadvertent Data Breach",
    scenario: "You accidentally send a client's coaching notes to the wrong email address, which belongs to another client. What are your possible next steps?"
  },
  {
    title: "Legal Subpoena",
    scenario: "You receive a valid court order (subpoena) demanding the release of all records and notes from a coaching engagement. What would be your next course of action?"
  },
  {
    title: "Client Use of Recording",
    scenario: "You discover your client has been secretly recording all their coaching sessions to analyze your coaching style with their own AI tools. How will you as a coach address this situation?"
  },
  {
    title: "Dual Role: Manager/Coach",
    scenario: "You are asked to provide formal coaching to one of your direct reports or a team you manage. Discuss your next steps"
  },
  {
    title: "Developing a Romantic Relationship",
    scenario: "You feel a growing personal attraction to a current client, and the feeling appears to be mutual. What are your options from an ethical perspective?"
  },
  {
    title: "Bartering Services",
    scenario: "A client is a graphic designer who offers to redesign your website in exchange for a series of coaching sessions. Would you consider taking the offer?"
  },
  {
    title: "Referral Commissions",
    scenario: "You refer a client to a therapist you often collaborate with and receive a commission for the referral. What are the most ethical options here?"
  },
  {
    title: "Coaching a Friend",
    scenario: "A close friend asks you to provide them with professional coaching services to help them with a work crisis. Discuss what are your best options from a coaching perspective."
  },
  {
    title: "Misrepresentation of Credentials",
    scenario: "You find a coach's website where they claim to have a Master Certified Coach (MCC) credential even though you know they only have an ACC. What would you do in this situation?"
  },
  {
    title: "Client Harassment in the Workplace",
    scenario: "Your client confides they are a victim of severe workplace harassment and is unsure how to proceed. Discuss your next options."
  },
  {
    title: "Conflict of Values",
    scenario: "A client's value system (e.g., prioritizing profit over environmental concerns) fundamentally clashes with your personal core values. How will you address this situation?"
  },
  {
    title: "Doing Good vs. Avoiding Harm",
    scenario: "You believe a client's decision is deeply misguided and likely to cause harm to their career, but it is not illegal or immediately dangerous. What would be your preferred next steps?"
  },
  {
    title: "Team Coaching Confidentiality",
    scenario: "In a team coaching setting, one member shares sensitive, individual information that is relevant to the team's progress but asks you not to share it. What would you be doing next?"
  },
  {
    title: "AI Bias and Fairness",
    scenario: "You are using an AI tool that provides a \"performance score\" for clients, but you suspect the algorithm might have cultural biases. Identify your next course of action"
  },
  {
    title: "Coach Supervision Hesitation",
    scenario: "You face a complex ethical title but are hesitant to bring it to supervision because it feels \"too personal\" or a breach of client trust. What will you do next?"
  },
  {
    title: "Client Feedback and Humility",
    scenario: "A client provides harsh feedback, suggesting your coaching style is condescending. What will you do next?"
  },
  {
    title: "Inappropriate Use of ICF Logo",
    scenario: "Another coach you know is using the ICF logo in a way that suggests ICF endorsement of a non-accredited program. What do you do?"
  }
];


// Note: 'dilemmaDocId' and 'setDilemmaDocId' props are no longer needed
const EthicalDilemmaSimulator = ({ setView, currentUser }) => {
  const [dilemmaMode, setDilemmaMode] = useState('random');
  const [dilemmasList, setDilemmasList] = useState(fallbackDilemmas); // Will be filled from Firestore
  const [currentDilemma, setCurrentDilemma] = useState(null); // Will store { id, title, scenario }
  const [customDilemma, setCustomDilemma] = useState('');
  const [userResponse, setUserResponse] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flowStep, setFlowStep] = useState('select'); // 'select', 'respond', 'feedback'

  // --- NEW: Load public dilemmas from Firestore ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "dilemmas"), (snapshot) => {
        const communityDilemmas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const combined = [...fallbackDilemmas, ...communityDilemmas];
        const uniqueDilemmas = Array.from(new Set(combined.map(p => p.title)))
                                    .map(title => combined.find(p => p.title === title));
        
        setDilemmasList(uniqueDilemmas.length > 0 ? uniqueDilemmas : fallbackDilemmas);
    }, (error) => {
        console.error("Error fetching dilemmas: ", error);
        setDilemmasList(fallbackDilemmas); // Fallback on error
    });

    // Clean up the listener
    return () => unsubscribe();
  }, []);

  // --- NEW: Function to load a dilemma AND check for a user's prior solution ---
  const loadDilemma = async (dilemma) => {
    setCurrentDilemma(dilemma);
    setUserResponse(''); // Clear previous response
    setFeedback(null); // Clear previous feedback

    // Check if this user already has a private solution for this dilemma
    const solutionRef = doc(db, "dilemmas", dilemma.id, "solutions", currentUser.uid);
    const solutionSnap = await getDoc(solutionRef);

    if (solutionSnap.exists()) {
      // If they do, load their old solution and feedback
      setUserResponse(solutionSnap.data().solution || '');
      setFeedback(solutionSnap.data().feedback || null);
    }
  };

  const loadRandomDilemma = () => {
    const randomIndex = Math.floor(Math.random() * dilemmasList.length);
    // Use the new loadDilemma function
    loadDilemma(dilemmasList[randomIndex]);
  };

  // Run 'loadRandomDilemma' once on mount after dilemmasList is populated
  useEffect(() => {
    if (dilemmasList.length > 0) {
      loadRandomDilemma();
    }
  }, [dilemmasList]); // Re-run if dilemmasList changes

  // --- UPDATED: This now creates the PUBLIC dilemma doc ---
  const handleDilemmaSubmit = async () => {
    setIsLoading(true);
    let dilemmaToProcess;

    if (dilemmaMode === 'random') {
        if (!currentDilemma) {
            alert("Please select a random dilemma first.");
            setIsLoading(false);
            return;
        }
        dilemmaToProcess = currentDilemma;
    } else { // 'custom'
        if (customDilemma.trim().length < 20) {
            alert("Please describe your dilemma in a bit more detail.");
            setIsLoading(false);
            return;
        }
        // 1. Create the new PUBLIC dilemma document
        try {
            const docData = {
              title: "Community-Submitted Dilemma",
              scenario: customDilemma,
              createdBy: currentUser.uid,
              creatorEmail: currentUser.email,
              timestamp: new Date()
            };
            const docRef = await addDoc(collection(db, "dilemmas"), docData);
            dilemmaToProcess = { id: docRef.id, ...docData };
        } catch (error) {
            console.error("Error adding custom dilemma: ", error);
            alert("Could not save your custom dilemma. Please try again.");
            setIsLoading(false);
            return;
        }
    }

    // 2. Load this dilemma (and any prior solution) into the response screen
    await loadDilemma(dilemmaToProcess);
    setFlowStep('respond');
    setIsLoading(false);
  };

  // --- UPDATED: This now writes the PRIVATE solution doc ---
  const handleSolutionSubmit = async () => {
    if (!currentDilemma || !currentDilemma.id) {
      alert("A critical error occurred. Please re-select a dilemma.");
      return;
    }
    if (userResponse.trim().length < 10) {
      alert("Please provide a more detailed response.");
      return;
    }
    setIsLoading(true);

    try {
      // 1. Get a reference to the user's PRIVATE solution doc
      // Path: /dilemmas/{dilemmaId}/solutions/{userId}
      const solutionRef = doc(db, "dilemmas", currentDilemma.id, "solutions", currentUser.uid);

      // 2. Save their solution there
      await setDoc(solutionRef, { 
        solution: userResponse,
        dilemmaTitle: currentDilemma.title, // Good to store for context
        timestamp: new Date()
      }, { merge: true }); // Merge, so we don't overwrite feedback

      // 3. Get AI feedback
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
        You are an ICF MCC. Dilemma: "${currentDilemma.scenario}"
        Solution: "${userResponse}"
        Analyze based on ICF Code of Ethics. Return JSON: "strengths", "pitfalls", "alternatives".
      `;
      const result = await callGeminiAPI(feedbackPrompt, feedbackSchema);
      
      // 4. Save the AI feedback to that SAME private doc
      await setDoc(solutionRef, { feedback: result }, { merge: true });

      setFeedback(result);
      setFlowStep('feedback');

    } catch (error) {
      console.error("Error submitting solution or getting feedback:", error);
      alert("Error saving your solution. Check console for details.");
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

        {flowStep === 'respond' && currentDilemma && (
            <>
                <div className="p-4 bg-slate-50 rounded-lg mb-6">
                    <h2 className="font-bold text-lg">The Dilemma: ({currentDilemma.title})</h2>
                    <p className="italic mt-2">"{currentDilemma.scenario}"</p>
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

      {isLoading && flowStep !== 'respond' && <LoadingSpinner text="Analyzing your response..." />}

      {flowStep === 'feedback' && feedback && currentDilemma && (
         <div>
            <div className="p-4 bg-slate-100 rounded-lg mb-6">
                 <h2 className="font-bold text-lg">The Dilemma: ({currentDilemma.title})</h2>
                <p className="italic mt-2">"{currentDilemma.scenario}"</p>
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