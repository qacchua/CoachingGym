import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { firebaseConfig } from './firebaseConfig.js'; // Import the config

// Import Components
import HomePage from './components/HomePage';
import TranscriptEvaluator from './components/TranscriptEvaluator';
import Simulation from './components/Simulation';
import VoiceSimulation from './components/VoiceSimulation';
import QuizComponent from './components/QuizComponent';
import EthicalDilemmaSimulator from './components/EthicalDilemmaSimulator';
import EvaluationResult from './components/EvaluationResult';
import AuthComponent from './components/AuthComponent';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';


// Initialize Firebase (can also be done in firebaseConfig.js)
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app); // Export db if needed by components directly
export const auth = getAuth(app);    // Export auth if needed


function App() {
  const [view, setView] = useState('home');
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dilemmaDocId, setDilemmaDocId] = useState(null); // Keep state needed across components

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthLoading(false);
       if (!user) {
         setView('home'); // Reset view if user logs out
       }
    });
    return unsubscribe;
  }, []);

  const handleSetView = (newView) => {
    if (newView === 'logout') {
        signOut(auth);
        // onAuthStateChanged will set currentUser to null and trigger re-render
        return;
    }
    setView(newView);
  }

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner text="Loading..." /></div>;
  }

  return (
    <main className="font-sans p-4 md:p-8 flex items-center justify-center min-h-screen">
      <div className="w-full">
        {!currentUser ? (
          <AuthComponent /> // No props needed as auth state is handled here
        ) : (
           <>
            <Header /> {/* Header shown when logged in */}

           {(() => {
              // Pass necessary props down to components
              const props = {
                setView: handleSetView,
                setEvaluationResult,
                currentUser,
                dilemmaDocId,    // Pass dilemmaDocId down
                setDilemmaDocId // Pass setter down
                // Pass auth or db if components need them directly, though preferably pass functions
              };

            switch (view) {
              case 'transcript':    return <TranscriptEvaluator {...props} />;
              case 'simulation':    return <Simulation {...props} />;
              case 'voiceSimulation': return <VoiceSimulation {...props} />;
              case 'quiz':          return <QuizComponent {...props} />;
              case 'dilemma':       return <EthicalDilemmaSimulator {...props} />;
              case 'result':        return <EvaluationResult result={evaluationResult} {...props} />;
              case 'home':
              default:              return <HomePage {...props} />;
            }
         })()}
          </>
        )}
      </div>
    </main>
  );
}

export default App;