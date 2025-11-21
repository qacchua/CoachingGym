import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from '../firebaseConfig.js';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { BookOpenCheck, FileText, MessageSquare, HelpCircle, Bookmark, Lock, BarChart3 } from 'lucide-react';

const Dashboard = ({ setView, currentUser, setEvaluationResult, isPremium }) => {
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH FROM THE NEW "dashboardItems" COLLECTION ---
  useEffect(() => {
    if (!currentUser) return;
    
    // Query the new unified collection
    const q = query(
      collection(db, "users", currentUser.uid, "dashboardItems"),
      orderBy("savedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- 2. HANDLE VIEWING AN OLD REPORT ---
  const handleViewItem = (item) => {
    if (item.type === 'Evaluation Report' && item.data) {
      // Load the saved data into the result viewer
      setEvaluationResult(item.data);
      setView('result');
    } else {
      // For Quizzes or Dilemmas, we might not have a full "re-play" view yet,
      // so we just show an alert or handled differently.
      alert("Detailed review for this item type is coming soon!");
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  // Helper to choose icon based on type
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

  return (
    <Card className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">My Dashboard</h1>
        <Button onClick={() => setView('home')} variant="secondary" className="px-4 py-2 text-sm">&larr; Back to Home</Button>
      </div>

      {/* --- PREMIUM ANALYTICS SECTION (LOCKED FOR FREE USERS) --- */}
      <div className="mb-8">
        {isPremium ? (
           <Card className="bg-blue-50 border border-blue-100 shadow-none">
              <div className="flex items-center mb-4">
                  <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
                  <h2 className="text-xl font-bold text-slate-800">Premium Analytics</h2>
              </div>
              <p className="text-slate-600 text-sm">
                You have completed <strong>{savedItems.length}</strong> learning activities. Great job!
                {/* Placeholder for real charts later */}
              </p>
           </Card>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
             <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="bg-white p-6 rounded-xl shadow-lg text-center max-w-md border border-slate-200">
                   <Lock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                   <h2 className="text-lg font-bold text-slate-800">Analytics Locked</h2>
                   <p className="text-slate-500 text-sm mb-4">Upgrade to Premium to see detailed progress charts.</p>
                   <Button onClick={() => setView('pricing')}>Upgrade</Button>
                </div>
             </div>
             {/* Fake content behind blur */}
             <div className="opacity-20 filter blur-sm">
                <div className="h-32 bg-slate-300 rounded w-full"></div>
             </div>
          </div>
        )}
      </div>

      {/* --- SAVED ITEMS LIST --- */}
      <div>
        <h2 className="text-2xl font-bold mb-4 border-b pb-2 flex items-center gap-2 text-slate-800">
          <Bookmark className="w-6 h-6" /> Saved Reports
        </h2>
        
        {savedItems.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-500 mb-2">Your dashboard is looking empty.</p>
            <p className="text-sm text-slate-400">Complete a quiz or evaluation and click "Save to Dashboard" to see it here.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {savedItems.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-50 rounded-full border border-slate-100">
                    {getIcon(item.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{item.title || item.type}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <span>{formatDate(item.savedAt)}</span>
                      <span>&bull;</span>
                      <span>{item.type}</span>
                    </p>
                    
                    {/* Display extra details if available */}
                    {item.type === 'Ethical Dilemma' && (
                       <p className="text-xs text-slate-600 mt-1 italic line-clamp-1">"{item.scenario}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end pl-14 md:pl-0">
                  {/* Score Badge */}
                  <div className="text-right">
                    <span className="block font-bold text-xl text-slate-700">
                      {item.score !== undefined ? item.score : 'N/A'}
                    </span>
                    <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
                      {item.type === 'Quiz' ? 'Score' : 'Result'}
                    </span>
                  </div>

                  {/* View Button (Only for Reports currently) */}
                  {item.type === 'Evaluation Report' && (
                    <Button onClick={() => handleViewItem(item)} variant="secondary" className="whitespace-nowrap">
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