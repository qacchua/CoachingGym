import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc } from "firebase/firestore";
import { db } from '../firebaseConfig.js';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { BookOpenCheck, FileText, HelpCircle, Bookmark, Lock, BarChart3, Trophy, Flame, Zap, Target } from 'lucide-react';
import { getUserStatus, getNextTierRequirement, getStreakMultiplier, STATUS_TIERS } from '../utils/gamificationEngine';

const Dashboard = ({ setView, currentUser, setEvaluationResult, isPremium }) => {
  const [savedItems, setSavedItems] = useState([]);
  const [wallet, setWallet] = useState({ xp: 0, streak: 0 });
  const [loading, setLoading] = useState(true);

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

  // --- UPDATED: Anti-Cheat Flag Injection ---
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

  const getIcon = (type) => {
    switch(type) {
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
  
  let progressPercentage = 100; 
  if (nextTierObj && currentTierObj) {
      const tierRange = nextTierObj.minXP - currentTierObj.minXP;
      const xpIntoTier = currentXP - currentTierObj.minXP;
      progressPercentage = Math.round((xpIntoTier / tierRange) * 100);
  }

  return (
    <Card className="max-w-6xl mx-auto border-rose-100 shadow-xl fade-in">
      <div className="flex justify-between items-center mb-8 border-b border-rose-50 pb-6">
        <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">My Dashboard</h1>
            <p className="text-rose-800 text-[10px] font-bold uppercase tracking-widest mt-1">Track your coaching mastery</p>
        </div>
        <Button onClick={() => setView('home')} variant="secondary" className="border-rose-100 text-rose-800 font-bold uppercase tracking-widest text-[10px] px-6 py-3">Back</Button>
      </div>

      {/* --- GAMIFICATION PROFILE SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between border border-slate-800">
            <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
                <Trophy size={200} className="text-rose-400" />
            </div>
            <div>
                <h2 className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-1">Current Status</h2>
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-6">{statusName}</h3>
                
                <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-300">
                        <span>{currentXP} XP</span>
                        {nextTierObj ? <span>{nextTierObj.name} ({nextTierObj.minXP} XP)</span> : <span>Max Rank Achieved</span>}
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner"> 
                        <div className="bg-rose-600 h-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }} /> 
                    </div>
                    {xpToNext > 0 && (
                        <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-2">
                            <Target className="w-3 h-3 inline mr-1 text-rose-400" /> {xpToNext} XP needed to level up.
                        </p>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-rose-50 rounded-[2rem] p-8 border border-rose-100 shadow-md flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-rose-100">
                <Flame className={`w-8 h-8 ${currentStreak > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-300'}`} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Current Streak</h2>
            <h3 className="text-4xl font-black text-rose-900 tracking-tighter mb-2">{currentStreak} <span className="text-lg">Days</span></h3>
            <div className="bg-white border border-rose-100 px-4 py-2 rounded-xl flex items-center gap-2 mt-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{multiplier}x XP Bonus</span>
            </div>
        </div>
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
                   <Button onClick={() => setView('pricing')} className="w-full bg-rose-800 text-white font-black uppercase tracking-widest text-xs py-4 shadow-lg hover:bg-rose-900">Upgrade Now</Button>
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
                    {getIcon(item.type)}
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
                  {/* --- UPDATED: XP Receipt Display --- */}
                  <div className="text-left md:text-right">
                    <span className="block font-black text-2xl text-slate-800 tracking-tighter">
                      {item.score !== undefined ? item.score : 'N/A'}
                    </span>
                    <span className="text-[9px] text-rose-800 uppercase tracking-[0.2em] font-black">
                      {item.type === 'Quiz' ? 'Score' : 'Result'}
                    </span>
                    {item.earnedXP !== undefined && (
                        <div className="mt-1 flex items-center justify-start md:justify-end gap-1 text-emerald-600 font-bold">
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest">Earned:</span> 
                            <span className="text-xs">+{item.earnedXP} XP</span>
                        </div>
                    )}
                  </div>

                  {item.type === 'Evaluation Report' && (
                    <Button onClick={() => handleViewItem(item)} variant="secondary" className="whitespace-nowrap border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 hover:text-slate-900">
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
  );
};

export default Dashboard;