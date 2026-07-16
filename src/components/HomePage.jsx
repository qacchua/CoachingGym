import React, { useState, useEffect } from 'react';
import { Bot, Mic, FileText, Scale, Users, CheckSquare, Lock, Crown, Trophy, Flame, Target, ShieldCheck } from 'lucide-react';
import Card from './Card';
import FeatureTour from './FeatureTour';
// --- NEW IMPORTS: Firebase and Gamification Engine ---
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../firebaseConfig';
import { getUserStatus, getNextTierRequirement } from '../utils/gamificationEngine';

const HomePage = ({ setView, currentUser, isPremium }) => {
    // --- NEW STATE: Gamification Wallet ---
    const [wallet, setWallet] = useState({ xp: 0, streak: 0 });

    // --- NEW EFFECT: Real-time listener for XP and Streak ---
    useEffect(() => {
        if (!currentUser) return;
        
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid);
        
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setWallet({
                    xp: data.tracks?.icf_coach?.xp || 0,
                    streak: data.globalStreak || 0
                });
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

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
        // --- NEW: ACC Mock Exam ---
        {
            id: 'mockExam',
            title: 'ACC Mock Exam',
            description: 'Take a 90-minute simulated ACC exam to test your credentialing readiness.',
            icon: ShieldCheck,
            view: 'mockExam',
            premiumOnly: true, // PREMIUM
            color: 'text-indigo-700',
            bg: 'bg-indigo-100'
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

    // --- NEW MATH: Calculate display values ---
    const currentXP = wallet.xp;
    const currentStreak = wallet.streak;
    const statusName = getUserStatus(currentXP);
    const xpToNext = getNextTierRequirement(currentXP);

    return (
        <div className="max-w-6xl mx-auto py-8 fade-in">
            <FeatureTour currentUser={currentUser} />

            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-rose-50 pb-8">
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
                        Welcome back, {currentUser?.displayName?.split(' ')[0] || 'Coach'}
                    </h1>
                    <p className="text-rose-800 font-medium">Select a studio tool to begin your practice.</p>
                </div>

                {!isPremium && (
                    <div className="flex-shrink-0 flex flex-col items-center md:items-end">
                        <button 
                            onClick={() => setView('dashboard')} 
                            className="tour-dashboard group relative flex items-center gap-3 bg-purple-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-rose-900 transition-all shadow-xl shadow-rose-900/20 overflow-hidden transform active:scale-95"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <Crown className="w-5 h-5 text-gold-200" />
                            Unlock All Features
                        </button>
                        
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 text-center md:text-right max-w-sm leading-relaxed">
                            Get unlimited access to AI simulations, transcript evaluations, ethical dilemmas and all new features
                        </p>
                    </div>
                )}
            </header>

            {/* --- NEW: GAMIFICATION HUD --- */}
            <div className="flex flex-wrap gap-4 mb-10">
                
                <div className="bg-rose-50 text-rose-900 px-5 py-3 rounded-2xl flex items-center gap-4 shadow-sm border border-rose-100">
                    <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Active Streak</p>
                        <p className="text-base font-black uppercase tracking-tight">{currentStreak} Days</p>
                    </div>
                </div>

                <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center gap-4 shadow-lg border border-slate-800">
                    <Trophy className="w-6 h-6 text-rose-400" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Rank</p>
                        <p className="text-base font-black uppercase tracking-tight">{statusName} <span className="text-slate-500 font-medium tracking-normal text-xs ml-1">({currentXP} XP)</span></p>
                    </div>
                </div>


                {xpToNext > 0 && (
                    <div className="bg-white text-slate-700 px-5 py-3 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100 flex-1 md:flex-none">
                        <Target className="w-6 h-6 text-emerald-500" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Milestone</p>
                            <p className="text-sm font-bold">{xpToNext} XP needed to level up</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studioFeatures.map((feature) => {
                    const isLocked = !isPremium && feature.premiumOnly;
                    
                    // --- UPDATED: Mapped all tour classes securely ---
                    let tourClass = '';
                    if (feature.id === 'community') tourClass = 'tour-community';
                    if (feature.id === 'quiz') tourClass = 'tour-quiz';
                    // --- NEW: Tour class for Mock Exam ---
                    if (feature.id === 'mockExam') tourClass = 'tour-mock-exam';
                    if (feature.id === 'simulation') tourClass = 'tour-simulation';
                    if (feature.id === 'voiceSimulation') tourClass = 'tour-voice-studio';
                    if (feature.id === 'transcript') tourClass = 'tour-transcript';
                    if (feature.id === 'dilemma') tourClass = 'tour-dilemmas';

                    return (
                        <Card 
                            key={feature.id}
                            onClick={() => setView(feature.view)}
                            className={`
                                ${tourClass}
                                relative cursor-pointer transition-all duration-300 border-2
                                ${isLocked 
                                    ? 'opacity-70 grayscale-[30%] border-slate-200 bg-slate-50 hover:opacity-100 hover:grayscale-0' 
                                    : 'border-transparent hover:border-rose-100 hover:shadow-xl hover:-translate-y-1 bg-white shadow-sm'
                                }
                            `}
                        >
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