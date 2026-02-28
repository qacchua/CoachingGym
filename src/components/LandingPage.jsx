import React from 'react';
import AuthComponent from './AuthComponent';
import { 
  Bot, 
  FileText, 
  BookOpenCheck, 
  ShieldCheck, 
  Mic, 
  Users, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import myLogo from '../assets/SiteLogo.png';

const LandingPage = ({ setView }) => {
  
  const features = [
    {
      title: 'ICF Competency Quiz',
      description: 'Test your knowledge with 60+ questions based on the 2025 Core Competencies.',
      icon: BookOpenCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'AI Client Simulations',
      description: 'Practice coaching difficult clients in a risk-free text or voice environment.',
      icon: Bot,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      title: 'Transcript Analysis',
      description: 'Upload your session transcripts and get instant, rubric-based feedback.',
      icon: FileText,
      color: 'text-emerald-600',
      bg: 'bg-indigo-50'
    },
    {
      title: 'Ethical Dilemmas',
      description: 'Navigate complex ethical scenarios with guidance from an AI mentor coach.',
      icon: ShieldCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* --- HERO SECTION --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Value Prop */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
                <img src={myLogo} alt="Logo" className="w-12 h-12" />
                <span className="text-xl font-bold text-slate-800 tracking-tight">The Coaching Gym</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Perfect your coaching practice <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">with AI.</span>
            </h1>
            
            <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
              "Practice doesn't make Perfect. Perfect Practice makes Perfect."
              <br/>
              Join the ultimate training ground for coaches to simulate sessions, evaluate skills, and master the ICF competencies.
            </p>

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Risk-free simulation environment</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Instant feedback on your transcripts</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Updated for 2025 ICF Standards</span>
                </div>
            </div>
          </div>

          {/* Right Column: Auth Card */}
          <div className="relative">
            {/* Decorative blob behind the card */}
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            
            <div className="relative">
                {/* We pass setView down so links inside AuthComponent work */}
                <AuthComponent setView={setView} />
            </div>
          </div>

        </div>
      </div>

      {/* --- FEATURE PREVIEW SECTION --- */}
      <div className="bg-white py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to grow</h2>
                <p className="text-slate-600 text-lg">Whether you are a student coach or an MCC, our tools help you refine your craft.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.bg}`}>
                            <feature.icon className={`w-6 h-6 ${feature.color}`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* --- FOOTER SIMULATION --- */}
      <div className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} The Coaching Gym. All rights reserved.</p>
      </div>

    </div>
  );
};

export default LandingPage;