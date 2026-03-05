// src/components/EthicalDilemmaSimulator.jsx

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, CheckSquare, Lightbulb, Sparkles, ArrowLeft, Scale } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import IconWrapper from './IconWrapper';
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
import { db } from '../firebaseConfig.js';
import {icfEthicsRubric2025} from '../utils/rubrics';

// These are now just a fallback in case firestore is empty
const fallbackDilemmas = [
  
  { id: "fallback-1", title: "Coachability Concerns", scenario: "You have been coaching a client for three sessions. In each session, they agree to specific actions but consistently fail to complete them, often blaming external factors. They seem to enjoy the conversation but are not making any progress toward their stated goals. How do you address this in your next session?" },
  { id: "fallback-2",  title: "Blurred Boundaries", scenario: "Your client, with whom you've built a strong rapport over six months, invites you to a celebratory dinner with their family to mark the promotion they achieved through your coaching. They insist on paying and want you to attend as a guest of honor. How do you handle this invitation?" },
  { id: "fallback-3",
    title: "Duty to Disclose Harm",
    scenario: "Your client, a mid-level manager, casually mentions cutting corners on safety protocols for a new product to meet a deadline. They say, It's just paperwork, no one will get hurt, but you know this product is used by the public. The risk isn't immediate, but it's real and could cause future harm. Given this isn't an imminent threat, what is your ethical obligation, and what action, if any, do you take?"
  },
  {
    id: "fallback-4", 
    title: "Corporate Confidentiality",
    scenario: "You have a sponsorship triangle agreement. The client's sponsor, who is paying for the coaching, messages you: Just checking in on [Client]. We're finalizing promotion decisions, and I need to know if they've overcome those 'confidence issues' we talked about. Are they ready, or are they still struggling with their personal challenges?    How do you respond to the sponsor while upholding your ethical agreements with both parties?"
  },
  {
    id: "fallback-5",
    title: "Use of AI Technology",
    scenario: "You've been using a powerful AI transcription tool to save time on session notes, but you never added this to your client agreement. You just read an article about how these AI companies use data for training. You now realize you've retroactively breached confidentiality for dozens of clients.    What steps must you take now to address this past and present ethical breach?"
  },
  {
    id: "fallback-6",
    title: "Inadvertent Data Breach",
    scenario: "You just finished a session with Client A and quickly typed up notes, which included their deep anxieties about their manager. You intended to email the notes to yourself but, due to an email autocomplete, accidentally sent them to Client B... who works at the same company.    What are your immediate three steps, and in what order?"
  },
  {
    id: "fallback-7",
    title: "Legal Subpoena",
    scenario: "A courier delivers a valid subpoena from a court. It demands all notes, emails, and records related to a former client who is now in a messy employment lawsuit. Your notes are informal and include your own speculative hypotheses and the client's raw, unverified statements about their colleagues.    What is your ethical and legal responsibility, and how do you proceed?"
  },
  {
    id: "fallback-8",
    title: "Client Use of Recording",
    scenario: "In a session, your client's phone rings and as they silence it, you see an audio recording app is active and has been running for 45 minutes. When you ask, they say, Oh, I record all our sessions. I use an AI to analyze your speech patterns and question types. I hope that's okay.    How do you address this in the moment, and what does this mean for the coaching relationship?"
  },
  {
    id: "fallback-9",
    title: "Dual Role: Manager/Coach",
    scenario: "Your direct report is struggling with performance. Your company advocates for coach-like management. The employee asks you for real coaching to help them improve, separate from your performance reviews. They say they trust you and don't want to go to an external coach.    How do you navigate this request, and what boundaries must be established, if you even agree at all?"
  },
  {
    id: "fallback-10",
    title: "Developing a Romantic Relationship",
    scenario: "You've been coaching a client for six months, and the rapport is incredible. Lately, you realize your feelings are shifting from professional to personal, and they've started making comments that suggest the attraction is mutual (e.g., I wish I could meet someone like you outside of this).    What action must you take immediately to manage this conflict of interest?"
  },
  {
    id: "fallback-11",
    title: "Bartering Services",
    scenario: "Your client, a highly skilled graphic designer, is struggling financially. They say, I can't afford your next package, but my business is failing because my website is a mess. What if you coach me for three months, and I completely redesign your brand and website? You badly need a new website.    How do you evaluate this offer, and what are the primary risks you must consider?"
  },
  {
    id: "fallback-12",
    title: "Referral Commissions",
    scenario: "You often refer clients who need therapy to a specific psychologist. The psychologist suggests a formal partnership: You send them to me, I'll send you 10% of their first three sessions as a thank-you. It's just a standard referral fee. This could create a good secondary income stream.    How do you respond to the psychologist's offer?"
  },
  {
    id: "fallback-13",
    title: "Coaching a Friend",
    scenario: "Your best friend is facing a major career crisis and asks you to be their professional coach. They say, I only trust you, and you're the best. Please help me. They are insistent that they can separate the friendship from the coaching and will pay your full rate.    What do you tell your friend, and what are the ethical implications of both accepting and refusing?"
  },
  {
    id: "fallback-14",
    title: "Ambiguous Feel Structure",
    scenario: "A potential client is a startup founder seeking funding. They can't afford your fee. They propose: I'll pay you 5% of my total seed round, but only if we're successful. You'll be coaching me on the pitch. If I get $1M, you get $50k. This is vastly more than your normal rate. <Wbr>   What are the ethical conflicts in this success fee arrangement, and how do you respond?"
  },
  {
    id: "fallback-15",
    title: "Client Harassment in the Workplace",
    scenario: "Your client confides in you, with specific and credible details, that their manager is severely harassing them. The client is terrified of retaliation, doesn't want to go to HR, and says, I'm only telling you because I trust you. Please don't make me do anything. I just need to vent.    What is your role and responsibility as a coach in this situation, and what resources or perspectives can you offer without overstepping?"
  },
  {
    id: "fallback-16",
    title: "Conflict of Values",
    scenario: "You are a coach who deeply values environmental sustainability. A client's primary goal is to maximize profits for their new business, and their strategy involves using cheap, non-sustainable materials and working around environmental regulations. You find their goals morally repugnant.    How do you maintain a non-judgmental coaching presence when a client's core values are in direct conflict with your own?"
  },
  {
    id: "fallback-17",
    title: "Doing Good vs. Avoiding Harm",
    scenario: "You are coaching a client who is about to make a major career decision (e.g., leaving a stable job to join a startup) that, based on all their own evidence, seems deeply misguided and likely to fail. You strongly believe it will harm their career and family. It is not illegal or unsafe, just a (in your opinion) terrible idea.    What is your role? Do you challenge them directly (This is a bad idea) or maintain a neutral stance and let them own their choice, even if you see it leading to harm?"
  },
  {
    id: "fallback-18",
    title: "Team Coaching Confidentiality",
    scenario: "You are coaching a leadership team struggling with lack of trust. In a 1-on-1 breakout, one member confides that the real reason for the trust issue is that the team leader is actively interviewing for a job at a competitor and everyone suspects it. They then say, But you can't tell anyone I told you.    How do you use this information (or not) for the benefit of the team, while honoring the individual's request for confidentiality?"
  },
  {
    id: "fallback-19",
    title: "AI Bias and Fairness",
    scenario: "You are using a new AI-powered coaching assistant tool that provides a performance score for clients based on their language. You notice that clients who are non-native English speakers consistently receive lower clarity and confidence scores, which you suspect is algorithmic bias.    What is your ethical responsibility regarding the use of a tool that you suspect is biased, and what action should you take?"
  },
  {
    id: "fallback-20",
    title: "Coach Supervision Hesitation",
    scenario: "You are facing a complex dilemma with a client that blends a boundary-crossing dual relationship and a confidentiality grey area. You know you should take it to your coach supervisor, but you are hesitant because you fear your supervisor will judge you for letting it get this far.    What is the ethical imperative of supervision, and how do you overcome your own ego and fear to get the help you need?"
  },
  {
    id: "fallback-21",
    title: "Client Feedback and Humility",
    scenario: "At the end of a 3-month engagement, a client gives you blunt feedback: I feel like you were just phoning it in. You seemed distracted, and your questions were just generic 'coaching 101' prompts. I didn't get much value. This feedback stings, and your first instinct is to be defensive.    What is your ethical and professional responsibility in responding to this feedback?"
  },
  {
    id: "fallback-22",
    title: "Inappropriate Use of ICF Logo",
    scenario: "You are on the website of a respected colleague and mentor. You notice they are using the official ICF Accredited Coach Training Program (ACTP) logo to advertise a short weekend workshop they designed, which you know has no formal ICF accreditation.    What, if anything, is your responsibility to your colleague, the ICF, and the public, and what action do you take?"
  },
  {
    id: "fallback-23",
    title: "Environmental and Social Responsibility",
    scenario: "You are invited to bid on a large, lucrative contract to provide coaching for the entire senior leadership team of a multinational corporation. This company is globally known for its poor environmental practices and use of sweatshop labor. The money would be transformative for your practice.    How do you decide whether to accept or decline this contract, and what factors do you weigh in your decision?"
  },
   {
    id: "fallback-24",
    title: "Unsolicited Information from HR",
    scenario: "You are having a routine call with the HR sponsor about logistics. They casually say - By the way [Client] is on the shortlist for a big promotion, but also on the Q3 'at-risk' list if their performance does not turn around. They do not know this. I hope your coaching works!   How do you ethically manage this insider information that you now hold, which directly impacts your client's coaching goals? "
  },
   {
    id: "fallback-25",
    title: "Unconscious Bias",
    scenario: "Your client starts talking about their financial struggles and their background in a very low-income community. You realize you are feeling a sense of pity and find yourself softening your normally challenging questions, holding them less capable than your other high-earning clients.    Now that you've recognized this bias in-the-moment, what do you do to regain a non-judgmental presence and ensure it doesn't harm the client?"
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

      // 3. Get AI feedback (STRICT ETHICS RUBRIC INJECTED)
      const feedbackSchema = {
        type: "OBJECT",
        properties: {
          strengths: { type: "STRING", description: "Positive aspects aligned with ICF Standards." },
          pitfalls: { type: "STRING", description: "Potential risks or ICF Standard violations." },
          alternatives: { type: "STRING", description: "Alternative actions aligned with ICF Standards." }
        },
        required: ["strengths", "pitfalls", "alternatives"]
      };

      const feedbackPrompt = `
        ${icfEthicsRubric2025}

        Based strictly on the ethics code provided above, evaluate this coach's proposed solution to the ethical dilemma.
        
        DILEMMA: "${currentDilemma.scenario}"
        COACH'S PROPOSED SOLUTION: "${userResponse}"
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
    <Card className="max-w-4xl mx-auto border-rose-100 shadow-xl fade-in">
      
      <div className="flex justify-between items-start mb-8 border-b border-rose-50 pb-6">
        <div className="flex items-center gap-4">
            <IconWrapper><Scale className="w-8 h-8 text-rose-800" /></IconWrapper>
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Ethical Dilemmas</h1>
                <p className="text-rose-800 text-[10px] font-bold uppercase tracking-widest mt-1">ICF Boundary Practice</p>
            </div>
        </div>
        <Button onClick={() => setView('home')} variant="secondary" className="border-rose-100 text-rose-800 font-bold uppercase tracking-widest text-[10px]">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      {flowStep === 'select' && (
            <>
              <div className="my-8 pb-8">
                <p className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Step 1: Choose dilemma format</p>
                <div className="flex flex-col sm:flex-row gap-6">
                  <label className="flex-1 flex items-center p-4 border border-rose-100 rounded-2xl cursor-pointer hover:bg-rose-50 transition-colors">
                    <input type="radio" name="dilemmaMode" value="random" checked={dilemmaMode === 'random'} onChange={() => setDilemmaMode('random')} className="h-4 w-4 text-rose-800 focus:ring-rose-800" />
                    <span className="ml-3 font-bold text-sm text-slate-700 uppercase tracking-widest">Random Scenario</span>
                  </label>
                  <label className="flex-1 flex items-center p-4 border border-rose-100 rounded-2xl cursor-pointer hover:bg-rose-50 transition-colors">
                    <input type="radio" name="dilemmaMode" value="custom" checked={dilemmaMode === 'custom'} onChange={() => setDilemmaMode('custom')} className="h-4 w-4 text-rose-800 focus:ring-rose-800" />
                    <span className="ml-3 font-bold text-sm text-slate-700 uppercase tracking-widest">Enter Your Own</span>
                  </label>
                </div>
              </div>

                {dilemmaMode === 'random' && currentDilemma && (
                    <div className="p-8 bg-rose-50/50 rounded-3xl border border-rose-100 mb-8">
                        <h2 className="font-black text-xl text-slate-800 uppercase tracking-tight">{currentDilemma?.title}</h2>
                        <p className="mt-4 text-slate-600 leading-relaxed font-medium">{currentDilemma?.scenario}</p>
                    </div>
                )}
                
                {dilemmaMode === 'custom' && (
                    <div className="mb-8">
                        <label htmlFor="custom-dilemma" className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Describe your dilemma:</label>
                        <textarea id="custom-dilemma" value={customDilemma} onChange={(e) => setCustomDilemma(e.target.value)} className="w-full h-40 p-6 border border-rose-100 rounded-3xl bg-slate-50 focus:ring-2 focus:ring-rose-800 outline-none resize-none font-medium text-slate-700" placeholder="A client recently told me..." />
                    </div>
                )}
                
                <div className="flex justify-end gap-4 border-t border-rose-50 pt-8">
                    {dilemmaMode === 'random' && (
                        <Button onClick={loadRandomDilemma} variant="secondary" className="border-rose-200 text-rose-800 font-bold uppercase tracking-widest text-xs px-8 py-4 hover:bg-rose-50">
                            Skip / Next
                        </Button>
                    )}
                    <Button onClick={handleDilemmaSubmit} disabled={isLoading} className="bg-rose-800 hover:bg-rose-900 text-white font-black uppercase tracking-widest text-xs px-8 py-4 shadow-xl shadow-rose-200 transition-all">
                        {isLoading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Preparing...</span> : "Proceed to Solution"}
                    </Button>
                </div>
            </>
        )}

        {flowStep === 'respond' && currentDilemma && (
            <div className="fade-in">
                <div className="p-8 bg-rose-50/50 rounded-3xl border border-rose-100 mb-8">
                    <h2 className="font-black text-xs text-rose-800 uppercase tracking-widest mb-2">Scenario</h2>
                    <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight mb-4">{currentDilemma.title}</h3>
                    <p className="text-slate-600 leading-relaxed font-medium italic">"{currentDilemma.scenario}"</p>
                </div>
                
                <div className="mb-8">
                    <label htmlFor="user-response" className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-4">How would you handle this ethically?</label>
                    <textarea id="user-response" value={userResponse} onChange={(e) => setUserResponse(e.target.value)} className="w-full h-56 p-6 border border-rose-100 rounded-3xl bg-slate-50 focus:ring-2 focus:ring-rose-800 outline-none resize-none font-medium text-slate-700 shadow-inner" placeholder="I would start by..." />
                </div>
                
                <div className="flex justify-end border-t border-rose-50 pt-8">
                    <Button onClick={handleSolutionSubmit} disabled={isLoading} className="bg-rose-800 hover:bg-rose-900 text-white font-black uppercase tracking-widest text-xs px-8 py-4 shadow-xl shadow-rose-200 transition-all w-full md:w-auto">
                         {isLoading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span> : "Submit for Feedback"}
                    </Button>
                </div>
            </div>
        )}

      {isLoading && flowStep !== 'respond' && <LoadingSpinner text="Consulting the ethics board..." />}

      {flowStep === 'feedback' && feedback && currentDilemma && (
         <div className="fade-in">
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 mb-6 shadow-sm">
                 <h2 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-2">Scenario: {currentDilemma.title}</h2>
                 <p className="text-slate-600 font-medium italic">"{currentDilemma.scenario}"</p>
            </div>
            
            <div className="p-8 bg-rose-50/50 rounded-3xl border border-rose-100 mb-10 shadow-sm relative">
                <div className="absolute top-0 right-0 bg-rose-800 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl rounded-tr-3xl shadow-sm">
                    Your Solution
                </div>
                <h2 className="font-black text-xs text-rose-800 uppercase tracking-widest mb-4">Response Provided</h2>
                <p className="text-slate-700 font-medium leading-relaxed">"{userResponse}"</p>
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8 border-b border-rose-50 pb-4">Mentor Coach Feedback</h2>
            
            <div className="space-y-8 mb-10">
                <div className="p-6 border border-emerald-100 bg-emerald-50/30 rounded-[2rem] shadow-sm">
                    <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-3 mb-3">
                        <CheckSquare className="w-5 h-5" /> Strengths
                    </h3>
                    <p className="text-slate-700 font-medium leading-relaxed">{feedback.strengths}</p>
                </div>
                
                <div className="p-6 border border-amber-100 bg-amber-50/30 rounded-[2rem] shadow-sm">
                    <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest flex items-center gap-3 mb-3">
                        <Lightbulb className="w-5 h-5" /> Potential Pitfalls
                    </h3>
                    <p className="text-slate-700 font-medium leading-relaxed">{feedback.pitfalls}</p>
                </div>
                
                <div className="p-6 border border-sky-100 bg-sky-50/30 rounded-[2rem] shadow-sm">
                    <h3 className="text-sm font-black text-sky-800 uppercase tracking-widest flex items-center gap-3 mb-3">
                        <Sparkles className="w-5 h-5" /> Alternative Approaches
                    </h3>
                    <p className="text-slate-700 font-medium leading-relaxed">{feedback.alternatives}</p>
                </div>
            </div>
            
             <div className="flex justify-end border-t border-rose-50 pt-8">
                <Button 
                    onClick={() => {
                        setFeedback(null);
                        setUserResponse('');
                        setFlowStep('select');
                        if(dilemmaMode === 'random') loadRandomDilemma();
                    }}
                    className="bg-slate-900 text-white font-black uppercase tracking-widest text-xs px-8 py-4 hover:bg-slate-800 shadow-lg w-full md:w-auto"
                >
                    Try Another Dilemma
                </Button>
            </div>
         </div>
      )}
    </Card>
  );
};

export default EthicalDilemmaSimulator;