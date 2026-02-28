import React from 'react';
import { 
  Mic, MessageSquare, FileText, Trophy, ArrowRight, 
  Zap, Target, Users, ShieldAlert, MessagesSquare 
} from 'lucide-react';
import Card from './Card';
import Button from './Button';

const HomePage = ({ setView, currentUser, isPremium }) => {
  
  const features = [
    {
      id: 'quiz',
      title: 'ICF Core Competency Quiz',
      desc: 'Test your mastery of the 8 Core Competencies.',
      icon: <Trophy className="w-6 h-6 text-amber-600" />,
      premium: false,
      color: 'bg-amber-50'
    },
    {
      id: 'simulation',
      title: 'Text Simulation',
      desc: 'Practice coaching via text with instant AI feedback.',
      icon: <MessageSquare className="w-6 h-6 text-purple-600" />,
      premium: false,
      color: 'bg-purple-50'
    },
    {
      id: 'transcript',
      title: 'Transcript Evaluator',
      desc: 'Upload real session text for ICF-aligned feedback.',
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      premium: true,
      color: 'bg-blue-50'
    },
    {
      id: 'dilemma',
      title: 'Ethical Dilemma',
      desc: 'Navigate complex ICF ethical scenarios.',
      icon: <ShieldAlert className="w-6 h-6 text-rose-600" />,
      premium: true,
      color: 'bg-rose-50'
    },
    {
      id: 'voiceSimulation',
      title: 'Voice Simulation',
      desc: 'Immersive video-call simulation with AI clients.',
      icon: <Mic className="w-6 h-6 text-emerald-600" />,
      premium: true,
      color: 'bg-indigo-50'
    },    
    {
      id: 'community',
      title: 'Community Chat',
      desc: 'Connect and share insights with fellow coaches.',
      icon: <MessagesSquare className="w-6 h-6 text-indigo-600" />,
      premium: false,
      color: 'bg-indigo-50'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
     {/* --- HERO SECTION --- */}
<section className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 p-8 md:p-12 shadow-xl shadow-slate-200/50">
  <div className="relative z-10 max-w-3xl"> {/* Increased max-width to allow more horizontal room */}
    <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6">
      <Zap className="w-3.5 h-3.5 fill-current" /> 
      {isPremium ? 'Premium Access Active' : '7-Day Free Trial'}
    </div>
    
    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
      Welcome back, <span className="text-rose-800 whitespace-nowrap">{currentUser?.displayName || 'Coach'}</span>
    </h1>
    
    <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed mb-8 max-w-xl">
      The Gym is ready. Are you?
    </p>
    
    <div className="flex flex-wrap gap-4">
      <Button 
        onClick={() => setView('voiceSimulation')} 
        className="py-4 px-8 text-lg bg-rose-800 hover:bg-rose-900 shadow-xl shadow-rose-100 flex items-center gap-2"
      >
        Start Simulation <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  </div>
</section>

      {/* Re-populated Actions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((item) => (
          <Card 
            key={item.id} 
            className="group hover:border-emerald-500 hover:shadow-2xl transition-all" 
            onClick={() => setView(item.id)} // This will now work with updated Card.jsx!
          >
            <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              {item.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              {item.title}
              {item.premium && !isPremium && <Zap className="w-3.5 h-3.5 text-slate-300" />}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {item.desc}
            </p>
            <div className="flex items-center text-emerald-600 font-black text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
              Launch <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HomePage;