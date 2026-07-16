import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc } from "firebase/firestore";
import { db } from '../firebaseConfig.js';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { BookOpenCheck, FileText, HelpCircle, Bookmark, Lock, BarChart3, Trophy, Flame, Zap, Target, Info, X, Bot, Scale, CheckSquare, ShieldCheck } from 'lucide-react';
import { getUserStatus, getNextTierRequirement, getStreakMultiplier, STATUS_TIERS } from '../utils/gamificationEngine';

const Dashboard = ({ setView, currentUser, setEvaluationResult, isPremium }) => {
  const [savedItems, setSavedItems] = useState([]);
  const [wallet, setWallet] = useState({ xp: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const [showXPGuide, setShowXPGuide] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    // 1. FETCH DASHBOARD HISTORY
    const q = query(
      collection(db, "users", currentUser.uid, "dashboardItems"),
      orderBy("savedAt", "desc")
    );

    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedItems(items);
      setLoading(false);
    });

    // 2. FETCH GAMIFICATION WALLET
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid);
    
    const unsubscribeWallet = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setWallet({
                xp: data.tracks?.icf_coach?.xp || 0,
                streak: data.globalStreak || 0
            });
        }
    });

    return () => {
        unsubscribeItems();
        unsubscribeWallet();
    };
  }, [currentUser]);

  const handleViewItem = (item) => {
    if (item.type === 'Evaluation Report' && item.data) {
      setEvaluationResult({ ...item.data, isHistorical: true });
      setView('result');
    } else {
      alert("Detailed review for this item type is coming soon!");
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  // Check the specific item to see if it's a mock exam, otherwise fall back to standard types
  const getIcon = (item) => {
    if (item.quizMode === 'mock_exam') return <ShieldCheck className="w-5 h-5 text-indigo-600" />;
    
    switch(item.type) {
      case 'Quiz': return <BookOpenCheck className="w-5 h-5 text-blue-500" />;
      case 'Evaluation Report': return <FileText className="w-5 h-5 text-purple-500" />;
      case 'Ethical Dilemma': return <HelpCircle className="w-5 h-5 text-amber-500" />;
      default: return <Bookmark className="w-5 h-5 text-slate-500" />;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading your dashboard..." />;
  }

  // --- GAMIFICATION MATH ---
  const currentXP = wallet.xp;
  const currentStreak = wallet.streak;
  const statusName = getUserStatus(currentXP);
  const xpToNext = getNextTierRequirement(currentXP);
  const multiplier = getStreakMultiplier(currentStreak);
  
  const currentTierObj = STATUS_TIERS.find(t => t.name === statusName);
  const nextTierObj = [...STATUS_TIERS].reverse().find(t => t.minXP > currentXP);

  return (
    <>
      <Card className="max-w-6xl mx-auto border-rose-100 shadow-xl fade-in relative z-10">
        <div className="flex justify-between items-center mb-8 border-b border-rose-50 pb-6">
          <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">My Dashboard</h1>
              <p className="text-rose-800 text-[10px] font-bold uppercase tracking-widest mt-1">Track your coaching mastery</p>
          </div>
          <Button onClick={() => setView('home')} variant="secondary" className="border-rose-100 text-rose-800 font-bold uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl">Back</Button>
        </div>

        {/* --- STANDARDIZED GAMIFICATION PROFILE SECTION --- */}
        <div className="flex flex-wrap gap-4 mb-10">
            <div className="bg-rose-50 text-rose-900 px-5 py-3 rounded-2xl flex items-center gap-4 shadow-sm border border-rose-100">
                <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Active Streak</p>
                    <p className="text-base font-black uppercase tracking-tight">
                        {currentStreak} Days <span className="text-rose-600 font-bold tracking-widest text-[10px] ml-2">({multiplier}x Bonus)</span>
                    </p>
                </div>
            </div>

            <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center gap-4 shadow-lg border border-slate-800 relative pr-14">
                <Trophy className="w-6 h-6 text-rose-400" />
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Rank</p>
                    <p className="text-base font-black uppercase tracking-tight">{statusName} <span className="text-slate-500 font-medium tracking-normal text-xs ml-1">({currentXP} XP)</span></p>
                </div>
                <button 
                    onClick={() => setShowXPGuide(true)} 
                    className="absolute right-4 text-slate-400 hover:text-white transition-colors"
                    title="How to earn XP"
                >
                    <Info size={18} />
                </button>
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

        {/* --- PREMIUM ANALYTICS SECTION --- */}
        <div className="mb-12">
          {isPremium ? (
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-md">
                <div className="flex items-center mb-4">
                    <BarChart3 className="w-6 h-6 mr-3 text-slate-400" />
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Premium Analytics</h2>
                </div>
                <p className="text-slate-600 text-sm font-medium">
                  You have completed <strong className="text-rose-800">{savedItems.length}</strong> learning activities. Detailed skill mapping charts are unlocked and actively tracking your competencies.
                </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center">
              <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm border border-slate-200 transform transition-transform hover:scale-105">
                    <Lock className="w-8 h-8 mx-auto text-rose-800 mb-4" />
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Analytics Locked</h2>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">Upgrade to Premium to visualize your competency growth and unlock detailed progress charts.</p>
                    <Button onClick={() => setView('pricing')} className="w-full bg-rose-800 text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl shadow-lg hover:bg-rose-900">Upgrade Now</Button>
                  </div>
              </div>
              <div className="opacity-20 filter blur-sm h-40 bg-slate-300 rounded-2xl w-full" />
            </div>
          )}
        </div>

        {/* --- SAVED ITEMS LIST --- */}
        <div>
          <h2 className="text-sm font-black mb-6 uppercase tracking-widest flex items-center gap-3 text-slate-400">
            <Bookmark className="w-4 h-4" /> Activity History
          </h2>
          
          {savedItems.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
              <p className="text-slate-500 font-bold mb-2">Your dashboard is looking empty.</p>
              <p className="text-xs text-slate-400 font-medium">Complete a quiz or evaluation and click "Save to Dashboard" to see it here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {savedItems.map((item) => (
                <div key={item.id} className="bg-white border border-slate-100 rounded-[1.5rem] p-6 hover:border-rose-200 hover:shadow-lg transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                  
                  <div className="flex items-start gap-5">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-rose-50 group-hover:border-rose-100 transition-colors">
                      {getIcon(item)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base mb-1">{item.title || item.type}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span>{formatDate(item.savedAt)}</span>
                        <span className="text-rose-300">&bull;</span>
                        <span>{item.type}</span>
                      </p>
                      
                      {item.type === 'Ethical Dilemma' && (
                        <p className="text-xs text-slate-500 mt-2 font-medium italic line-clamp-1">"{item.scenario}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
                    <div className="text-left md:text-right">
                      <span className="block font-black text-2xl text-emerald-600 tracking-tighter">
                        +{item.earnedXP !== undefined ? item.earnedXP : 0}
                      </span>
                      <span className="text-[9px] text-emerald-800 uppercase tracking-[0.2em] font-black">
                        XP Earned
                      </span>
                      
                      {item.score !== undefined && (
                          <div className="mt-1 flex items-center justify-start md:justify-end gap-1 text-slate-500 font-bold">
                              <span className="text-[9px] text-slate-400 uppercase tracking-widest">{item.type === 'Quiz' ? 'Score:' : 'Result:'}</span> 
                              <span className="text-xs">{item.score}</span>
                          </div>
                      )}
                    </div>

                    {item.type === 'Evaluation Report' && (
                      <Button onClick={() => handleViewItem(item)} variant="secondary" className="whitespace-nowrap border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl hover:bg-slate-50 hover:text-slate-900">
                        View Report
                      </Button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* --- XP Guide Modal --- */}
      {showXPGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-200">
            <button 
              onClick={() => setShowXPGuide(false)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-rose-600 transition-colors bg-slate-100 p-2 rounded-full"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">How to Earn XP</h2>
            <p className="text-slate-500 font-medium mb-8">Level up your coaching rank by completing practice sessions and maintaining your daily streak.</p>

            <div className="space-y-6">
              
              {/* Voice/Text Studio & Transcripts */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-3">
                  <Bot className="w-5 h-5 text-rose-500" /> Simulations & Transcripts
                </h3>
                <p className="text-sm text-slate-600 mb-3">Earn a base <strong className="text-emerald-600">+1 XP</strong> for every saved session. Additional points are awarded per competency graded:</p>
                <ul className="text-sm text-slate-700 space-y-2 mb-4">
                  <li className="flex justify-between items-center"><span className="font-bold">Exemplary Rating</span> <span className="font-black text-emerald-600">+9 XP</span></li>
                  <li className="flex justify-between items-center"><span className="font-bold">Proficient Rating</span> <span className="font-black text-emerald-600">+5 XP</span></li>
                  <li className="flex justify-between items-center"><span className="font-bold">Sufficient Rating</span> <span className="font-black text-emerald-600">+3 XP</span></li>
                  <li className="flex justify-between items-center"><span className="font-bold">Needs Development</span> <span className="font-black text-emerald-600">+1 XP</span></li>
                </ul>
                <div className="bg-rose-100/50 p-4 rounded-xl border border-rose-100">
                  <p className="text-sm text-rose-900 font-bold mb-2">Talk Time Bonus:</p>
                  <ul className="text-xs text-rose-900 space-y-2 pl-2 border-l-2 border-rose-300">
                    <li className="flex justify-between"><span>Optimal (5% - 15%)</span> <span className="font-black">+9 XP</span></li>
                    <li className="flex justify-between"><span>Slightly Over (15% - 25%)</span> <span className="font-black">+5 XP</span></li>
                    <li className="flex justify-between"><span>Too Quiet (&lt; 5%)</span> <span className="font-black">+3 XP</span></li>
                    <li className="flex justify-between"><span>Too Talkative (&gt; 25%)</span> <span className="font-black">+1 XP</span></li>
                  </ul>
                </div>
              </div>

              {/* Ethical Dilemmas */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-3">
                  <Scale className="w-5 h-5 text-amber-500" /> Ethical Dilemmas
                </h3>
                <p className="text-sm text-slate-600">Successfully submitting a response to a complex boundary or ethics scenario earns a flat rate.</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-700">Per Completed Dilemma</span> 
                  <span className="font-black text-emerald-600">+5 XP</span>
                </div>
              </div>

              {/* Knowledge Checks & Mock Exams */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-3">
                  <CheckSquare className="w-5 h-5 text-blue-500" /> Knowledge Checks & Exams
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-700">
                  <div>
                    <h4 className="font-black text-slate-900 mb-2">Short Quizzes</h4>
                    <ul className="space-y-1">
                      <li className="flex justify-between"><span>Score &ge; 80%</span> <span className="font-black text-emerald-600">+3 XP</span></li>
                      <li className="flex justify-between"><span>Score &lt; 80%</span> <span className="font-black text-emerald-600">+1 XP</span></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 mb-2">Long Quizzes</h4>
                    <ul className="space-y-1">
                      <li className="flex justify-between"><span>Score &ge; 80%</span> <span className="font-black text-emerald-600">+9 XP</span></li>
                      <li className="flex justify-between"><span>Score 60-79%</span> <span className="font-black text-emerald-600">+3-5 XP</span></li>
                      <li className="flex justify-between"><span>Score &lt; 60%</span> <span className="font-black text-emerald-600">+1 XP</span></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 mb-2">ICF Mock Exams</h4>
                    <ul className="space-y-1">
                      <li className="flex justify-between"><span>Guaranteed Min.</span> <span className="font-black text-emerald-600">25 XP</span></li>
                      <li className="text-xs text-slate-500 mt-2 leading-tight">Scales higher with passing scores and daily streak multipliers!</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Streaks */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-3">
                  <Flame className="w-5 h-5 text-rose-500" /> Daily Streaks
                </h3>
                <p className="text-sm text-slate-600 mb-4">Practicing consecutive days adds a permanent multiplier to the base XP you earn in every session!</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm text-slate-700">
                   <div className="flex justify-between border-b border-slate-200 pb-2"><span>3+ Days</span> <span className="font-black text-rose-600">1.02x</span></div>
                   <div className="flex justify-between border-b border-slate-200 pb-2"><span>10+ Days</span> <span className="font-black text-rose-600">1.05x</span></div>
                   <div className="flex justify-between border-b border-slate-200 pb-2"><span>30+ Days</span> <span className="font-black text-rose-600">1.15x</span></div>
                   <div className="flex justify-between border-b border-slate-200 pb-2"><span>100+ Days</span> <span className="font-black text-rose-600">1.25x</span></div>
                   <div className="flex justify-between"><span>500+ Days</span> <span className="font-black text-rose-600">1.50x</span></div>
                </div>
              </div>

            </div>
            
            <Button onClick={() => setShowXPGuide(false)} className="w-full mt-8 bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800">
              Got it, let's coach!
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;