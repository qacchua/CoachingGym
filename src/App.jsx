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
  
  const getInitialView = () => {
    if (window.location.pathname === '/payment-success') return 'success';
    return 'home';
  };

  const [view, setView] = useState(getInitialView());
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
            // --- NEW: Retroactive Patch for Existing Users ---
            // If they are an old user missing the gamification fields, patch them silently!
            if (!userData.tracks) {
              setDoc(userRef, {
                activeTrack: 'icf_coach',
                globalStreak: 0,
                tracks: {
                  icf_coach: { xp: 0, practiceHours: 0 }
                }
              }, { merge: true }); 
            }
            // -------------------------------------------------

            setCurrentUser({ ...user, ...userData });
            
            // Evaluates if their 7-day trial or paid subscription is still active
            setIsPremium(userData.premiumExpires?.toDate() > new Date());
            
            // --- NEW: Forced Onboarding Check ---
            // If the user doesn't have a displayName set, force them to the profile page.
            // Using a functional state update prevents the window from scrolling to top on every keystroke if they are editing.
            if (!userData.displayName) {
              setView((prevView) => prevView !== 'profile' ? 'profile' : prevView);
            }

            setLoading(false);
          } else {
            // Grants 7-day trial to brand new users
            const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
            setDoc(userRef, { 
              uid: user.uid, 
              email: user.email, 
              joined: serverTimestamp(),
              tier: 'Trial',
              premiumExpires: trialExpires,
              
              // --- NEW: GAMIFICATION SKELETON ---
              activeTrack: 'icf_coach',
              globalStreak: 0,
              tracks: {
                icf_coach: {
                  xp: 0,
                  practiceHours: 0
                }
              }
              // ----------------------------------
              
            }).then(() => {
              // Once the initial document is created, force them to the profile page
              setView('profile');
            });
          }
        }, () => setLoading(false));
      } else {
        setCurrentUser(null);
        setIsPremium(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [appId]); 

  const handleSetView = (newView, params = null) => {
    if (newView === 'logout') { signOut(auth); return; }
    setView(newView);
    // --- FIX: Properly clear old view parameters if none are passed ---
    setViewParams(params || null); 
    window.scrollTo(0, 0);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner text="Opening the Studio..." /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-rose-100 selection:text-rose-900">
      {currentUser && (
        <Header 
          currentUser={currentUser} 
          setView={handleSetView} 
          isPremium={isPremium} 
        />
      )}

      <main className={currentUser ? "max-w-7xl mx-auto p-4 md:p-8" : "w-full"}>
        {!currentUser ? (
          view === 'terms' ? <TermsOfService setView={handleSetView} /> :
          view === 'privacy' ? <PrivacyPolicy setView={handleSetView} /> :
          <LandingPage setView={handleSetView} />
        ) : (
          <div className="fade-in">
            {(() => {
              switch (view) {
                // --- FREE VIEWS ---
                case 'home': 
                  return <HomePage setView={handleSetView} currentUser={currentUser} isPremium={isPremium} />;
                case 'quiz': 
                  return <QuizComponent setView={handleSetView} currentUser={currentUser} isPremium={isPremium} />;
                
                // UNLOCKED: Community Chat is now free for everyone!
                case 'community': 
                  return <Chat setView={handleSetView} currentUser={currentUser} />;
                  
                case 'profile': 
                  return <Profile currentUser={currentUser} setView={handleSetView} />;
                
                // --- FIX: Added alias and fallback UID ---
                case 'publicProfile': 
                case 'public-profile':
                  return <PublicProfile setView={handleSetView} uid={viewParams?.uid || currentUser.uid} />;
                
                case 'privacy': 
                  return <PrivacyPolicy setView={handleSetView} uid={viewParams?.uid} />;
                case 'terms': 
                  return <TermsOfService setView={handleSetView} uid={viewParams?.uid} />;
                case 'result': 
                  return <EvaluationResult result={evaluationResult} setView={handleSetView} currentUser={currentUser} />;
                case 'success': 
                  return <PaymentSuccess setView={handleSetView} currentUser={currentUser} />;
                
                // --- PREMIUM LOCKED VIEWS ---
                case 'transcript': 
                case 'transcript-evaluator': 
                  return isPremium ? <TranscriptEvaluator setView={handleSetView} setEvaluationResult={setEvaluationResult} currentUser={currentUser} isPremium={isPremium} /> : <PricingPage setView={handleSetView} currentUser={currentUser} />;
                
                case 'dilemma': 
                  return isPremium ? <EthicalDilemmaSimulator setView={handleSetView} currentUser={currentUser} isPremium={isPremium}/> : <PricingPage setView={handleSetView} currentUser={currentUser} />;
                
                case 'chat': 
                case 'simulation': 
                  return isPremium ? <Simulation setView={handleSetView} currentUser={currentUser} setEvaluationResult={setEvaluationResult} isPremium={isPremium}/> : <PricingPage setView={handleSetView} currentUser={currentUser} />;
                
                case 'dashboard': 
                  return isPremium ? <Dashboard setView={handleSetView} currentUser={currentUser} isPremium={isPremium} setEvaluationResult={setEvaluationResult} /> : <PricingPage setView={handleSetView} currentUser={currentUser} />;
                
                case 'voiceSimulation': 
                  return isPremium ? <VoiceSimulation setView={handleSetView} currentUser={currentUser} setEvaluationResult={setEvaluationResult} /> : <PricingPage setView={handleSetView} currentUser={currentUser} />;
                
                default: 
                  return <HomePage setView={handleSetView} currentUser={currentUser} isPremium={isPremium} />;
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