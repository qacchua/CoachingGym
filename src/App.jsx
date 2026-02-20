import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db } from './firebaseConfig';

// --- Components ---
import Header from './components/Header';
import AuthComponent from './components/AuthComponent'; // Kept in case you need it elsewhere, though LandingPage uses it internally
import LandingPage from './components/LandingPage'; // <--- NEW IMPORT
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
    if (window.location.pathname === '/payment-success') {
      return 'success';
    }
    return 'home';
  };

  const [view, setView] = useState(getInitialView());
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [viewParams, setViewParams] = useState(null); 

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // --- Auth & Real-time Data Logic ---
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      
      // If we have an old snapshot listener active, kill it before creating a new one
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        
        // Real-Time Updates
        unsubscribeSnapshot = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            // Existing User: Load profile and check premium status
            const userData = userSnap.data();
            setCurrentUser({ ...user, ...userData });
            
            // Check if trial/subscription is still valid
            if (userData.premiumExpires) {
              const now = new Date();
              const expires = userData.premiumExpires.toDate(); 
              setIsPremium(expires > now);
            } else {
              setIsPremium(false);
            }
            setLoading(false); // Data loaded

          } else {
            // New User: Create profile with 7-Day Trial
            const now = new Date();
            const trialExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); 
            
            const newProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              tier: 'Free',
              joined: serverTimestamp(),
              premiumExpires: trialExpires
            };
            
            await setDoc(userRef, newProfile);
          }
        }, (error) => {
           console.error("Real-time fetch error:", error);
           setLoading(false);
        });

      } else {
        setCurrentUser(null);
        setIsPremium(false);
        setLoading(false);
      }
    });

    // Cleanup function
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [appId]); 

  const handleSetView = (newView, params = null) => {
    if (newView === 'logout') {
      signOut(auth); 
      return; 
    }
    setView(newView);
    if (params) setViewParams(params);
  };

  const ProtectedComponent = ({ component }) => {
    if (isPremium) {
      return component;
    } else {
      return <PricingPage setView={handleSetView} currentUser={currentUser} />;
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><LoadingSpinner text="Loading Coaching Gym..." /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* LOGIC CHANGE 1: Only show the global Header if the user is logged in. 
        The Landing Page has its own header/logo section.
      */}
      {currentUser && (
        <Header 
          currentUser={currentUser} 
          setView={handleSetView} 
          isPremium={isPremium} 
        />
      )}

      {/* LOGIC CHANGE 2: Conditional padding. 
        Landing pages usually need full width (no padding), 
        while the dashboard views need the p-4/p-6 padding.
      */}
      <main className={currentUser ? "p-4 md:p-6" : ""}>
        {!currentUser ? (
          <div className="w-full">
            {view === 'terms' ? (
              <TermsOfService setView={handleSetView} />
            ) : view === 'privacy' ? (
              <PrivacyPolicy setView={handleSetView} />
            ) : (
              // LOGIC CHANGE 3: Replaced AuthComponent with LandingPage
              <LandingPage setView={handleSetView} />
            )}
          </div>
        ) : (
          <div className="w-full fade-in">
            {(() => {
              switch (view) {
                // --- PUBLIC FEATURES (Available to All Logged In Users) ---
                case 'home':
                  return <HomePage setView={handleSetView} currentUser={currentUser} isPremium={isPremium} />;
                
                case 'quiz':
                  return <QuizComponent setView={handleSetView} currentUser={currentUser} isPremium={isPremium} />;
                
                case 'chat':
                  return <Chat setView={handleSetView} currentUser={currentUser} />;

                case 'profile':
                  return <Profile currentUser={currentUser} setView={handleSetView} />;

                case 'publicProfile':
                   return (
                    <PublicProfile 
                      setView={handleSetView} 
                      viewingProfileId={viewParams?.userId} 
                      currentUser={currentUser} 
                    />
                  );

                // --- PREMIUM FEATURES (Protected) ---
                case 'dashboard':
                  return (
                    <ProtectedComponent 
                      component={<Dashboard setView={handleSetView} currentUser={currentUser} isPremium={isPremium} setEvaluationResult={setEvaluationResult} />} 
                    />
                  );
                
                case 'transcript':
                  return (
                    <ProtectedComponent 
                      component={<TranscriptEvaluator setView={handleSetView} setEvaluationResult={setEvaluationResult} />} 
                    />
                  );
                
                case 'voiceSimulation':
                  return (
                    <ProtectedComponent 
                      component={<VoiceSimulation setView={handleSetView} currentUser={currentUser} setEvaluationResult={setEvaluationResult} />} 
                    />
                  );

                case 'simulation':
                   return (
                    <ProtectedComponent 
                      component={<Simulation setView={handleSetView} currentUser={currentUser} setEvaluationResult={setEvaluationResult} />} 
                    />
                   );
                
                case 'dilemma':
                  return (
                    <ProtectedComponent 
                      component={<EthicalDilemmaSimulator setView={handleSetView} currentUser={currentUser} />} 
                    />
                  );

                // --- UTILITY PAGES ---
                case 'result':
                  return <EvaluationResult result={evaluationResult} setView={handleSetView} currentUser={currentUser} />;

                case 'pricing':
                  return <PricingPage setView={handleSetView} currentUser={currentUser} />;

                case 'terms':
                  return <TermsOfService setView={handleSetView} />;

                case 'privacy':
                  return <PrivacyPolicy setView={handleSetView} />;
                
                case 'success':
                  return <PaymentSuccess setView={handleSetView} currentUser={currentUser} />;

                default:
                  return <HomePage setView={handleSetView} currentUser={currentUser} isPremium={isPremium} />;
              }
            })()}
          </div>
        )}
        
        {/* LOGIC CHANGE 4: Only show the global Footer if the user is logged in. 
          The LandingPage usually has its own footer designed into the page.
        */}
        {currentUser && <Footer setView={handleSetView} />}
      </main>
    </div>
  );
}

export default App;