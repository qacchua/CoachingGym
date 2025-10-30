import React from 'react';
import { Bot, FileText, BookOpenCheck, ShieldCheck, Mic } from 'lucide-react';
import Card from './Card'; // Assuming Card, Button, IconWrapper are in the same folder or adjust path
import Button from './Button';
import IconWrapper from './IconWrapper';
import myLogo from '../assets/SiteLogo.png'; // Correct path to logo

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
            <p className="text-slate-600 mb-6">Updated to reflect the new 2025 ICF Core Competencies</p>
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
  );
};

export default HomePage;