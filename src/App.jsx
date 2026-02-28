import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db } from './firebaseConfig';

// --- Components ---
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import QuizComponent from './components/QuizComponent';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';
import TranscriptEvaluator from './components/TranscriptEvaluator';
import VoiceSimulation from './components/VoiceSimulation';
import EthicalDilemmaSimulator from './components/EthicalDilemmaSimulator';
import Simulation from './components/Simulation';
import Profile from './components/Profile';
import PublicProfile from './components/PublicProfile';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import PricingPage from './components/PricingPage';
import PaymentSuccess from './components/PaymentSuccess';
import LoadingSpinner from './components/LoadingSpinner';
import EvaluationResult from './components/EvaluationResult';
import Footer from './components/Footer';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [viewParams, setViewParams] = useState(null); 

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  useEffect(() => {
    let unsubscribeSnapshot = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (user) {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        unsubscribeSnapshot = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setCurrentUser({ ...user, ...userData });
            setIsPremium(userData.premiumExpires?.toDate() > new Date());
            setLoading(false);
          } else {
            setDoc(userRef, { uid: user.uid, email: user.email, joined: serverTimestamp() });
          }
        }, () => setLoading(false));
      } else {
        setCurrentUser(null);
        setIsPremium(false);
        setLoading(false);
      }
    });
    return () => { unsubscribeAuth(); if (unsubscribeSnapshot) unsubscribeSnapshot(); };
  }, [appId]); 

  const handleSetView = (newView, params = null) => {
    if (newView === 'logout') { signOut(auth); return; }
    setView(newView);
    if (params) setViewParams(params);
    window.scrollTo(0, 0);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner text="Opening the Studio..." /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-rose-100 selection:text-rose-900">
      {currentUser && <Header currentUser={currentUser} setView={handleSetView} isPremium={isPremium} />}

      <main className={currentUser ? "max-w-7xl mx-auto p-4 md:p-8" : "w-full"}>
        {!currentUser ? (
          view === 'terms' ? <TermsOfService setView={handleSetView} /> :
          view === 'privacy' ? <PrivacyPolicy setView={handleSetView} /> :
          <LandingPage setView={handleSetView} />
        ) : (
          <div className="fade-in">
            {(() => {
              switch (view) {
                case 'home': return <HomePage setView={handleSetView} currentUser={currentUser} isPremium={isPremium} />;
                
                // MAPPED TO COMMUNITY CHAT (FIXED)
                case 'chat': 
                case 'community': 
                  return <Chat setView={handleSetView} currentUser={currentUser} />;
                
                // MAPPED TO COACHING SIMULATION
                case 'simulation': 
                  return <Simulation setView={handleSetView} currentUser={currentUser} setEvaluationResult={setEvaluationResult} />;
                
                // MAPPED TO TRANSCRIPT EVALUATOR
                case 'transcript':
                case 'transcript-evaluator': 
                  return <TranscriptEvaluator setView={handleSetView} setEvaluationResult={setEvaluationResult} />;

                case 'dashboard': 
                  return isPremium ? <Dashboard setView={handleSetView} currentUser={currentUser} setEvaluationResult={setEvaluationResult} /> : <PricingPage setView={handleSetView} currentUser={currentUser} />;
                
                case 'result': return <EvaluationResult result={evaluationResult} setView={handleSetView} currentUser={currentUser} />;
                case 'voiceSimulation': return <VoiceSimulation setView={handleSetView} currentUser={currentUser} setEvaluationResult={setEvaluationResult} />;
                case 'quiz': return <QuizComponent setView={handleSetView} currentUser={currentUser} isPremium={isPremium} />;
                case 'dilemma': return <EthicalDilemmaSimulator setView={handleSetView} currentUser={currentUser} />;
                case 'profile': return <Profile currentUser={currentUser} setView={handleSetView} />;
                case 'publicProfile': return <PublicProfile setView={handleSetView} uid={viewParams?.uid} />;
                default: return <HomePage setView={handleSetView} currentUser={currentUser} isPremium={isPremium} />;
              }
            })()}
          </div>
        )}
      </main>
      {currentUser && <Footer setView={handleSetView} />}
    </div>
  );
}

export default App;