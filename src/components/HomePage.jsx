import React from 'react';
import { 
  Bot, 
  FileText, 
  BookOpenCheck, 
  ShieldCheck, 
  Mic, 
  Users, 
  Lock, 
  Crown, 
  ArrowRight, 
  Play 
} from 'lucide-react';
import Card from './Card';
import Button from './Button';
import IconWrapper from './IconWrapper';
import myLogo from '../assets/SiteLogo.png';

const HomePage = ({ setView, currentUser, isPremium }) => {

  // 1. Define your features data here to make the rendering logic cleaner
  const features = [
    {
      id: 'quiz',
      title: 'ICF Competency Quiz',
      description: 'Updated to reflect the new 2025 ICF Core Competencies',
      icon: BookOpenCheck,
      view: 'quiz',
      isPremium: false, // Free
    },
    {
      id: 'simulation',
      title: 'Simulate a Coaching Session (Text)',
      description: 'Engage in a text-based session with an AI client.',
      icon: Bot,
      view: 'simulation',
      isPremium: true, // Premium
    },
    {
      id: 'voiceSimulation',
      title: 'Simulate a Coaching Session (Voice)',
      description: 'Practice by speaking with an AI client and hearing responses (BETA).',
      icon: Mic,
      view: 'voiceSimulation',
      isPremium: true, // Premium
    },
    {
      id: 'transcript',
      title: 'Evaluate Past Sessions',
      description: 'Upload a text transcript for a detailed analysis.',
      icon: FileText,
      view: 'transcript',
      isPremium: true, // Premium
    },
    {
      id: 'dilemma',
      title: 'Ethical Dilemma Simulator',
      description: 'Navigate tricky ethical scenarios with AI mentor feedback.',
      icon: ShieldCheck,
      view: 'dilemma',
      isPremium: true, // Premium
    },
    {
      id: 'chat',
      title: 'The Clubhouse',
      description: 'Ask questions, share insights, and connect with other coaches.',
      icon: Users,
      view: 'chat',
      isPremium: false, // Free
    }
  ];

  return (
    <>
      {/* --- HEADER SECTION --- */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-slate-600">
          Signed in as: <span className="font-semibold">{currentUser?.email || 'Guest'}</span>
        </p>
        
        <div className="flex flex-wrap justify-center gap-3">
          {/* Upgrade Button (Visible only if NOT premium) */}
          {!isPremium && (
            <Button 
              onClick={() => setView('pricing')}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-sm"
            >
              <Crown className="w-4 h-4 mr-2" /> Upgrade
            </Button>
          )}

          <Button onClick={() => setView('profile')} variant="secondary">
            My Account
          </Button>
          <Button onClick={() => setView('dashboard')} variant="secondary">
            My Dashboard
          </Button>
          <Button onClick={() => setView('logout')} variant="secondary">
            Sign Out
          </Button>
        </div>
      </div>

      <div className="text-center">
        <img src={myLogo} alt="CoachQ Logo" className="w-24 h-24 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">The Coaching Gym</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          "Practice doesn't make Perfect. Perfect Practice makes Perfect." - Vince Lombardi
        </p>

        {/* --- UPGRADE BANNER (Only visible if NOT premium) --- */}
        {!isPremium && (
          <div className="max-w-4xl mx-auto mb-12 bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden text-left">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-xl font-bold flex items-center gap-2 text-amber-400">
                  <Crown className="w-5 h-5" />
                  Unlock Professional Features
                </h2>
                <p className="text-indigo-100 mt-2">
                  Get unlimited access to AI Transcript Analysis, Voice Simulations, and advanced analytics. 
                </p>
              </div>
              <Button 
                onClick={() => setView('pricing')}
                className="bg-amber-400 text-indigo-950 hover:bg-amber-500 border-0 font-bold whitespace-nowrap"
              >
                View Plans <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* --- DYNAMIC FEATURES GRID --- */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature) => {
            const isLocked = feature.isPremium && !isPremium;
            const Icon = feature.icon;

            return (
              <Card 
                key={feature.id} 
                className={`flex flex-col h-full text-center transition-all duration-300 ${
                  isLocked ? 'bg-slate-50 border-slate-200' : 'hover:shadow-2xl hover:-translate-y-2'
                }`}
              >
                <div className="flex-grow flex flex-col items-center">
                  <div className="relative">
                    <IconWrapper>
                      <Icon className={`w-8 h-8 ${isLocked ? 'text-slate-400' : ''}`} />
                    </IconWrapper>
                    {isLocked && (
                      <div className="absolute -top-2 -right-2 bg-slate-200 rounded-full p-1 border border-white shadow-sm">
                        <Lock className="w-3 h-3 text-slate-500" />
                      </div>
                    )}
                  </div>

                  <h2 className={`text-2xl font-bold mt-4 mb-2 ${isLocked ? 'text-slate-500' : 'text-slate-800'}`}>
                    {feature.title}
                  </h2>
                  <p className={`mb-6 ${isLocked ? 'text-slate-400' : 'text-slate-600'}`}>
                    {feature.description}
                  </p>
                </div>

                {/* Button Logic */}
                <div className="mt-4">
                  {isLocked ? (
                    <div className="flex gap-2 justify-center">
                      <Button 
                        disabled 
                        className="bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200 w-full"
                      >
                        <Lock className="w-4 h-4 mr-2" /> Locked
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setView(feature.view)} className="w-full">
                       {feature.view === 'quiz' ? 'Start Quiz' : 
                        feature.view === 'chat' ? 'Enter Chat' : 'Start Simulation'}
                    </Button>
                  )}
                  
                  {/* Optional "Quick Unlock" text/button for locked items */}
                  {isLocked && (
                     <button 
                       onClick={() => setView('pricing')}
                       className="text-xs text-amber-600 font-semibold mt-2 hover:underline"
                     >
                       Upgrade to unlock
                     </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default HomePage;