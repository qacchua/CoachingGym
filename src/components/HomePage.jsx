import React from 'react';
import { Bot, Mic, FileText, Scale, Users, CheckSquare, Lock, Crown } from 'lucide-react';
import Card from './Card';

const HomePage = ({ setView, currentUser, isPremium }) => {

    // Centralized array of your Studio tools
    const studioFeatures = [
        {
            id: 'community',
            title: 'Community Lounge',
            description: 'Connect with other coaches, share insights, and discuss ICF competencies.',
            icon: Users,
            view: 'community',
            premiumOnly: false, // FREE
            color: 'text-emerald-600',
            bg: 'bg-emerald-100'
        },
        {
            id: 'quiz',
            title: 'Knowledge Check',
            description: 'Test your grasp on coaching frameworks and ethics with quick quizzes.',
            icon: CheckSquare,
            view: 'quiz',
            premiumOnly: false, // FREE
            color: 'text-blue-600',
            bg: 'bg-blue-100'
        },
        {
            id: 'simulation',
            title: 'Text Studio',
            description: 'Deliberate text-based practice with AI personas. Includes full ICF feedback.',
            icon: Bot,
            view: 'simulation',
            premiumOnly: true, // PREMIUM
            color: 'text-rose-700',
            bg: 'bg-rose-100'
        },
        {
            id: 'voiceSimulation',
            title: 'Voice Studio',
            description: 'Real-time spoken conversations with AI clients. Practice your vocal presence.',
            icon: Mic,
            view: 'voiceSimulation',
            premiumOnly: true, // PREMIUM
            color: 'text-violet-600',
            bg: 'bg-violet-100'
        },
        {
            id: 'transcript',
            title: 'Transcript Evaluator',
            description: 'Upload your recorded session transcripts for a deep-dive performance audit.',
            icon: FileText,
            view: 'transcript',
            premiumOnly: true, // PREMIUM
            color: 'text-amber-600',
            bg: 'bg-amber-100'
        },
        {
            id: 'dilemma',
            title: 'Ethical Dilemmas',
            description: 'Navigate complex coaching scenarios to build your ethical decision-making muscle.',
            icon: Scale,
            view: 'dilemma',
            premiumOnly: true, // PREMIUM
            color: 'text-cyan-600',
            bg: 'bg-cyan-100'
        }
    ];

    return (
        <div className="max-w-6xl mx-auto py-8 fade-in">
            <header className="mb-12 text-center md:text-left">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
                    Welcome back, {currentUser?.displayName?.split(' ')[0] || 'Coach'}
                </h1>
                <p className="text-rose-900 font-medium">Select a studio tool to begin your practice.</p>
                {/* PROMINENT TOP-RIGHT UPGRADE CTA */}
                {!isPremium && (
                    <div className="flex-shrink-0 flex flex-col items-center md:items-end">
                        <button 
                            onClick={() => setView('dashboard')} 
                            className="group relative flex items-center gap-3 bg-rose-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-rose-900 transition-all shadow-xl shadow-rose-900/20 overflow-hidden transform active:scale-95"
                        >
                            {/* Subtle shine effect on hover */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            
                            <Crown className="w-5 h-5 text-rose-200" />
                            Unlock all features
                        </button>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 text-center md:text-right">
                            Get unlimited access to AI simulations, transcript evaluations, ethical dilemmas and all new features
                        </p>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studioFeatures.map((feature) => {
                    // Determine if this specific card should be locked for this user
                    const isLocked = !isPremium && feature.premiumOnly;

                    return (
                        <Card 
                            key={feature.id}
                            onClick={() => setView(feature.view)}
                            className={`
                                relative cursor-pointer transition-all duration-300 border-2
                                ${isLocked 
                                    ? 'opacity-70 grayscale-[30%] border-slate-200 bg-slate-50 hover:opacity-100 hover:grayscale-0' 
                                    : 'border-transparent hover:border-rose-100 hover:shadow-xl hover:-translate-y-1 bg-white shadow-sm'
                                }
                            `}
                        >
                            {/* The Lock/Crown Badge */}
                            {isLocked && (
                                <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <Lock size={12} />
                                    <span>Premium</span>
                                </div>
                            )}

                            <div className="p-2">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${isLocked ? 'bg-slate-200 text-slate-500' : feature.bg + ' ' + feature.color}`}>
                                    <feature.icon size={28} />
                                </div>
                                <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${isLocked ? 'text-slate-700' : 'text-slate-900'}`}>
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                    {feature.description}
                                </p>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default HomePage;