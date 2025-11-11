import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  onSnapshot // For real-time updates
} from "firebase/firestore"; 
import { getAnalytics } from "firebase/analytics";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

// --- THIS IS THE CLEAN IMPORT YOU SUGGESTED ---
import { firebaseConfig } from './firebaseConfig.js'; 

// --- Import Components ---
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
import Chat from './components/Chat.jsx';
import Dashboard from './components/Dashboard.jsx';
import Profile from './components/Profile.jsx';


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);


function App() {
  const [view, setView] = useState('home');
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dilemmaDocId, setDilemmaDocId] = useState(null);

  // --- Real-time Auth & Profile Listener ---
  useEffect(() => {
    let profileListenerUnsubscribe = null;

    // Listen for auth state changes
    const authStateListenerUnsubscribe = onAuthStateChanged(auth, (userAuth) => {
      if (userAuth) {
        // User is logged in. Stop any previous profile listener.
        if (profileListenerUnsubscribe) {
          profileListenerUnsubscribe();
        }

        // --- Start a new real-time listener for their profile doc ---
        const userRef = doc(db, "users", userAuth.uid);
        profileListenerUnsubscribe = onSnapshot(userRef, async (userSnap) => {
          
          if (userSnap.exists()) {
            // Profile exists, merge Auth data + Firestore data
            setCurrentUser({
              ...userAuth, // uid, email, etc. from Auth
              ...userSnap.data() // tier, joined, displayName, etc. from Firestore
            });
          } else {
            // Profile doesn't exist. Create it.
            const newProfile = {
              uid: userAuth.uid,
              email: userAuth.email,
              displayName: userAuth.displayName || userAuth.email.split('@')[0] || "New User",
              tier: 'Free',
              joined: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
            
            // Set current user with this new profile data
            setCurrentUser({ ...userAuth, ...newProfile });
          }
          setAuthLoading(false);
        });

      } else {
        // User is logged out
        setCurrentUser(null);
        setAuthLoading(false);
        // Stop listening to the (now-logged-out) user's profile
        if (profileListenerUnsubscribe) {
          profileListenerUnsubscribe();
        }
      }
    });

    // Cleanup both listeners when the App component unmounts
    return () => {
      authStateListenerUnsubscribe();
      if (profileListenerUnsubscribe) {
        profileListenerUnsubscribe();
      }
    };
  }, []);

  const handleSetView = (newView) => {
    if (newView === 'logout') {
        signOut(auth);
        return;
    }
    // Clear old evaluation report when moving away from the result screen
    if (view === 'result' && newView !== 'result') {
      setEvaluationResult(null);
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
          <AuthComponent />
        ) : (
           <>
            <Header /> {/* Header shown when logged in */}

           {(() => {
              // This prop object is passed to all components
              const props = {
                setView: handleSetView,
                setEvaluationResult,
                currentUser, // This now contains { ...auth, ...profile }
                dilemmaDocId,
                setDilemmaDocId
              };

            // --- Updated Switch Statement ---
            switch (view) {
              case 'transcript':    return <TranscriptEvaluator {...props} />;
              case 'simulation':    return <Simulation {...props} />;
              case 'voiceSimulation': return <VoiceSimulation {...props} />;
              case 'quiz':          return <QuizComponent {...props} />;
              case 'dilemma':       return <EthicalDilemmaSimulator {...props} />;
              case 'result':        return <EvaluationResult result={evaluationResult} {...props} />;
              case 'chat':          return <Chat {...props} />;
              case 'dashboard':     return <Dashboard {...props} />;
              case 'profile':       return <Profile {...props} />;
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