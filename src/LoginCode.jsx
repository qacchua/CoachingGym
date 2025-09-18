import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Bot, FileText, Send, BrainCircuit, Sparkles, User, X, Loader2, Download, MessageSquare, Lightbulb, HelpCircle, PieChart as PieChartIcon, PlusCircle, CheckSquare, Edit, Dices, List, UserPlus, Mic, BookOpenCheck, ShieldCheck, Star, Zap } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, getDoc, setDoc, query, orderBy, limit } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, OAuthProvider, sendPasswordResetEmail, updatePassword } from "firebase/auth";

// --- Firebase Configuration ---
// IMPORTANT: For the PREVIEW to work, you MUST use these placeholder values.
// Only replace them with your actual keys in your LOCAL code editor before deploying.
const firebaseConfig = {
  apiKey: "PREVIEW_ONLY_DUMMY_KEY",
  authDomain: "preview.firebaseapp.com",
  projectId: "preview-project",
  storageBucket: "preview.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:1234567890abcdef",
  measurementId: "G-1234567890"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Components ---

const IconWrapper = ({ children, className = '' }) => (
  <div className={`bg-stone-200 text-stone-700 rounded-lg p-3 inline-flex ${className}`}>
    {children}
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseClasses = 'px-6 py-3 font-semibold rounded-lg transition-transform duration-200 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-stone-700 text-white hover:bg-stone-800 active:scale-95 shadow-lg shadow-stone-500/30',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95',
  };
  return (
    <button onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const LoadingSpinner = ({ text = "Analyzing conversation..." }) => (
    <div className="flex flex-col items-center justify-center gap-4 my-8">
        <Loader2 className="w-12 h-12 text-stone-700 animate-spin" />
        <p className="text-slate-600 text-lg">{text}</p>
    </div>
);


// --- API Call Logic ---
const callGeminiAPI = async (prompt, responseSchema) => {
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    };
    
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    let response;
    let retries = 3;
    let delay = 1000;
    while(retries > 0) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) break; 
        } catch(error) { console.error("Fetch error:", error); }
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
    }

    if (!response || !response.ok) {
        throw new Error(`API error after retries.`);
    }

    const result = await response.json();
    
    if (result.candidates && result.candidates[0].content?.parts?.[0]?.text) {
        const jsonText = result.candidates[0].content.parts[0].text;
        try {
            return JSON.parse(jsonText);
        } catch (e) {
            throw new Error("The model returned a response that was not valid JSON.");
        }
    } else {
        if (result.candidates?.[0]?.finishReason) {
             throw new Error(`API call finished with reason: ${result.candidates[0].finishReason}.`);
        }
        throw new Error("Invalid or empty response structure from API.");
    }
};

// ... (generateImageAPI, TTS Helper Functions remain the same)

// --- Main Application Components ---

const HomePage = ({ setView, handleAction }) => {
  return (
    <div className="text-center">
      <BrainCircuit className="w-24 h-24 mx-auto text-stone-600 mb-4" />
      <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">Coaching Evaluation Hub</h1>
      <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
        Sharpen your coaching skills. Get instant, rubric-based feedback on your coaching conversations.
      </p>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><BookOpenCheck className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">ICF Competency Quiz</h2>
            <p className="text-slate-600 mb-6">Test your knowledge of ICF Core Competencies.</p>
          </div>
          <Button onClick={() => handleAction('quiz')}>Start Quiz</Button>
        </Card>
        {/* ... Other cards using handleAction */}
      </div>
    </div>
  );
};

// ... (All other components like RecordingEvaluator, TranscriptEvaluator, Simulation, etc., would need to be updated to accept userData and perform checks)

const AuthComponent = ({ setUser }) => {
// ... (Auth component remains the same)
};

const UserSettings = ({ setView, userData, user }) => {
    // ... (This will become the Profile Page)
};

const PricingPage = ({ setView, user, userData }) => {
    const handleUpgrade = async (plan) => {
        const userDocRef = doc(db, 'users', user.uid);
        const planData = { plan: plan, credits: plan === 'free' ? 2 : Infinity, isPremium: plan !== 'free' };
        
        await setDoc(userDocRef, planData, { merge: true });
        alert(`You've been upgraded to the ${plan} plan!`);
        setView('home');
    };
    
    return (
        <Card className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">Upgrade Your Plan</h1>
            <div className="grid md:grid-cols-3 gap-8">
                {/* Free Plan Card */}
                <Card>
                    <h2 className="text-2xl font-bold">Free</h2>
                    <p className="text-lg font-semibold my-4">$0 / month</p>
                    <ul className="text-left space-y-2 text-sm">
                        <li>✅ 2 credits per feature / month</li>
                        <li>❌ Access user-defined personas</li>
                        <li>❌ Access past reports</li>
                    </ul>
                    {userData.plan === 'free' ? <Button disabled className="w-full mt-6">Current Plan</Button> : <Button onClick={() => handleUpgrade('free')} variant="secondary" className="w-full mt-6">Downgrade</Button>}
                </Card>
                {/* Professional Plan Card */}
                <Card className="border-2 border-stone-700 relative">
                     <div className="absolute -top-4 right-4 bg-stone-700 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
                    <h2 className="text-2xl font-bold">Professional</h2>
                    <p className="text-lg font-semibold my-4">$24.99 / month</p>
                    <ul className="text-left space-y-2 text-sm">
                        <li>✅ Unlimited access</li>
                        <li>✅ Access user-defined personas</li>
                        <li>✅ Access past reports</li>
                    </ul>
                    {userData.plan === 'professional' ? <Button disabled className="w-full mt-6">Current Plan</Button> : <Button onClick={() => handleUpgrade('professional')} className="w-full mt-6">Upgrade</Button>}
                </Card>
                {/* Elite Plan Card */}
                <Card>
                    <h2 className="text-2xl font-bold">Elite</h2>
                    <p className="text-lg font-semibold my-4">$49.99 / month</p>
                    <ul className="text-left space-y-2 text-sm">
                        <li>✅ All Professional features</li>
                        <li>✅ Feedback & trends (Coming Soon)</li>
                        <li>✅ User Chat (Coming Soon)</li>
                    </ul>
                     {userData.plan === 'elite' ? <Button disabled className="w-full mt-6">Current Plan</Button> : <Button onClick={() => handleUpgrade('elite')} className="w-full mt-6">Upgrade</Button>}
                </Card>
            </div>
             <div className="text-center mt-8">
                <Button onClick={() => setView('home')} variant="secondary">Back to Hub</Button>
            </div>
        </Card>
    );
};

const PremiumUpsell = ({ setView }) => (
    <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-bold text-slate-800">You've used all your free credits!</h2>
        <p className="text-slate-600 my-4">Upgrade to a paid plan for unlimited session evaluations, simulations, and access to all our coaching tools.</p>
        <Button onClick={() => setView('pricing')}>View Plans</Button>
        <button onClick={() => setView('home')} className="mt-4 text-sm text-slate-500">Back to home</button>
    </Card>
);

function App() {
  const [view, setView] = useState('home'); 
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setLoading(true);
        setUser(currentUser);
        if (currentUser) {
            const userDocRef = doc(db, 'users', currentUser.uid);
            onSnapshot(userDocRef, async (docSnap) => {
                if (!docSnap.exists()) {
                    const lastResetDate = new Date();
                    const initialData = { credits: { quiz: 2, evaluate: 2, simulate: 2 }, plan: 'free', lastResetDate };
                    await setDoc(userDocRef, initialData);
                    setUserData(initialData);
                } else {
                    const data = docSnap.data();
                    // Check if credits need to be reset
                    const lastReset = data.lastResetDate.toDate();
                    const now = new Date();
                    if(now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()){
                        const updatedData = {...data, credits: { quiz: 2, evaluate: 2, simulate: 2 }, lastResetDate: new Date()};
                        await setDoc(userDocRef, updatedData);
                        setUserData(updatedData);
                    } else {
                         setUserData(data);
                    }
                }
            });
        } else {
            setUserData(null);
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAction = (feature) => {
      if (userData?.plan !== 'free' || (userData?.credits[feature] > 0)) {
          if(userData.plan === 'free') {
              const userDocRef = doc(db, 'users', user.uid);
              const newCredits = {...userData.credits, [feature]: userData.credits[feature] - 1};
              setDoc(userDocRef, { ...userData, credits: newCredits }, { merge: true });
          }
          setView(feature);
      } else {
          setView('upsell');
      }
  };

  const mainContent = () => {
    switch (view) {
      // ... cases for transcript, recording, simulation, etc.
      case 'pricing':
        return <PricingPage setView={setView} user={user} userData={userData} />;
      case 'upsell':
        return <PremiumUpsell setView={setView} />;
      case 'settings':
        return <UserSettings setView={setView} userData={userData} user={user} />;
      case 'home':
      default:
        return <HomePage setView={handleAction} />;
    }
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner text="Loading Hub..." /></div>
  }

  return (
    <main className="font-sans p-4 md:p-8 flex items-center justify-center min-h-screen">
      <div className="w-full">
        {user ? (
            <>
                <div className="max-w-6xl mx-auto flex justify-between items-center mb-4">
                    <div>
                        {userData && (
                            <p className="text-sm text-slate-600 font-semibold">
                                {userData.plan === 'elite' ? <span className="flex items-center"><Star className="w-4 h-4 mr-1 text-amber-500"/>Elite Member</span> : userData.plan === 'professional' ? <span className="flex items-center"><Zap className="w-4 h-4 mr-1 text-sky-500"/>Professional Member</span> : `Credits Remaining`}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <Button onClick={() => setView('settings')} variant="secondary" className="px-4 py-2 text-sm">My Profile</Button>
                        <Button onClick={() => signOut(auth)} variant="secondary" className="px-4 py-2 text-sm">Sign Out</Button>
                    </div>
                </div>
                {mainContent()}
            </>
        ) : (
            <AuthComponent setUser={setUser} />
        )}
      </div>
    </main>
  );
}

export default App;

//****Need to Evaluate. Other Code from Google Gemini */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInAnonymously, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { Star, Zap, Loader2, User as UserIcon, ShieldCheck, BookOpenCheck, Upload, Bot, Mic, FileText } from 'lucide-react';

// --- Firebase Configuration ---
// This would be your actual Firebase config in the live application
const firebaseConfig = {
  apiKey: "PREVIEW_ONLY_DUMMY_KEY",
  authDomain: "preview.firebaseapp.com",
  projectId: "preview-project",
  storageBucket: "preview.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:1234567890abcdef",
  measurementId: "G-1234567890"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 ${className}`}>{children}</div>);
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseClasses = 'px-6 py-3 font-semibold rounded-lg flex items-center justify-center gap-2';
  const variants = { primary: 'bg-stone-700 text-white hover:bg-stone-800', secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200' };
  return <button onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`} disabled={disabled}>{children}</button>;
};
const LoadingSpinner = ({ text }) => (<div className="flex flex-col items-center justify-center gap-4 my-8"><Loader2 className="w-12 h-12 text-stone-700 animate-spin" /><p>{text}</p></div>);

// --- Main App Component (Gatekeeper) ---
function App() {
  const [view, setView] = useState('home'); 
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setLoading(true);
        setUser(currentUser);
        if (currentUser) {
            const userDocRef = doc(db, 'users', currentUser.uid);
            onSnapshot(userDocRef, async (docSnap) => {
                if (!docSnap.exists()) {
                    const lastResetDate = new Date();
                    const initialData = { 
                        credits: { quiz: 2, evaluate: 2, simulate: 2 }, 
                        plan: 'free', 
                        lastResetDate,
                        isAnonymous: currentUser.isAnonymous
                    };
                    await setDoc(userDocRef, initialData);
                    setUserData(initialData);
                } else {
                    const data = docSnap.data();
                    const lastReset = data.lastResetDate.toDate();
                    const now = new Date();
                    if(now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()){
                        const updatedData = {...data, credits: { quiz: 2, evaluate: 2, simulate: 2 }, lastResetDate: new Date()};
                        await setDoc(userDocRef, updatedData);
                        setUserData(updatedData);
                    } else {
                         setUserData(data);
                    }
                }
            });
        } else {
            setUserData(null);
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAction = (featureKey) => {
      if (userData?.plan !== 'free' || (userData?.credits[featureKey] > 0)) {
          if(userData.plan === 'free') {
              const userDocRef = doc(db, 'users', user.uid);
              const newCredits = {...userData.credits, [featureKey]: userData.credits[featureKey] - 1};
              setDoc(userDocRef, { ...userData, credits: newCredits }, { merge: true });
          }
          setView(featureKey);
      } else {
          setView('upsell');
      }
  };

  const mainContent = () => {
    // This switch would render the actual app components (omitted for brevity)
    switch (view) {
      case 'pricing': return <PricingPage setView={setView} user={user} userData={userData} />;
      case 'upsell': return <PremiumUpsell setView={setView} />;
      case 'settings': return <UserSettings setView={setView} userData={userData} user={user} />;
      case 'home':
      default:
        return <HomePage setView={handleAction} />;
    }
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner text="Loading Hub..." /></div>
  }

  return (
    <main className="font-sans p-4 md:p-8 flex items-center justify-center min-h-screen">
      <div className="w-full">
        {user ? (
            <>
                <div className="max-w-6xl mx-auto flex justify-between items-center mb-4">
                    <div>
                        {userData && (
                            <p className="text-sm text-slate-600 font-semibold">
                                {userData.plan === 'elite' ? <span className="flex items-center"><Star className="w-4 h-4 mr-1 text-amber-500"/>Elite Member</span> : userData.plan === 'professional' ? <span className="flex items-center"><Zap className="w-4 h-4 mr-1 text-sky-500"/>Professional Member</span> : `Credits Remaining`}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <Button onClick={() => setView('settings')} variant="secondary" className="px-4 py-2 text-sm">My Profile</Button>
                        <Button onClick={() => signOut(auth)} variant="secondary" className="px-4 py-2 text-sm">Sign Out</Button>
                    </div>
                </div>
                {mainContent()}
            </>
        ) : (
            <AuthComponent setUser={setUser} />
        )}
      </div>
    </main>
  );
}

// --- Authentication UI Component ---
const AuthComponent = ({ setUser }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSocialSignIn = async (provider) => {
        setError('');
        try {
            await signInWithPopup(auth, provider);
        } catch (err) { setError(err.message); }
    };
    
    const handleGuestSignIn = async () => {
        setError('');
        try {
            await signInAnonymously(auth);
        } catch(err) { setError(err.message); }
    }

    const handleGoogleSignIn = () => handleSocialSignIn(new GoogleAuthProvider());

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) { setError(err.message); }
    };
    
    return (
        <Card className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-center mb-6">{isLogin ? 'Login' : 'Sign Up'}</h1>
            <div className="space-y-4">
                 <Button onClick={handleGoogleSignIn} variant="secondary" className="w-full">
                    {/* SVG for Google Icon */} Sign in with Google
                </Button>
                <Button onClick={handleGuestSignIn} variant="secondary" className="w-full">
                    <UserIcon className="w-5 h-5 mr-2" /> Continue as Guest
                </Button>
            </div>
            <div className="my-6 flex items-center">
                <div className="flex-grow border-t border-slate-300"></div>
                <span className="flex-shrink mx-4 text-slate-500">OR</span>
                <div className="flex-grow border-t border-slate-300"></div>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg" required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg" required />
                <Button type="submit" className="w-full">{isLogin ? 'Login' : 'Sign Up'}</Button>
            </form>
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            <p className="text-center mt-6">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button onClick={() => setIsLogin(!isLogin)} className="text-stone-700 font-semibold ml-2">
                    {isLogin ? 'Sign Up' : 'Login'}
                </button>
            </p>
        </Card>
    );
};

// --- User Profile & Subscription Pages ---
const UserSettings = ({ setView, userData, user }) => {
    // ... code for changing password and managing profile ...
    return <Card>
        <h1 className="text-3xl font-bold text-center mb-6">My Profile</h1>
        <p><strong>Email:</strong> {user.email || 'Guest Account'}</p>
        <p><strong>Current Plan:</strong> <span className="capitalize font-semibold">{userData.plan}</span></p>
        {userData.plan === 'free' && <p><strong>Credits Remaining:</strong> {JSON.stringify(userData.credits)}</p>}
        <div className="mt-6 flex gap-4">
            <Button onClick={() => setView('pricing')} variant="primary">Upgrade Membership</Button>
            <Button onClick={() => setView('home')} variant="secondary">Back to Hub</Button>
        </div>
    </Card>
};

const PricingPage = ({ setView, user, userData }) => {
    // ... code for displaying pricing tiers and handling upgrades ...
    return <Card>Pricing Page</Card>
};

const PremiumUpsell = ({ setView }) => (
    <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-bold text-slate-800">You've used all your free credits!</h2>
        <p className="text-slate-600 my-4">Upgrade to a paid plan for unlimited access.</p>
        <Button onClick={() => setView('pricing')}>View Plans</Button>
        <button onClick={() => setView('home')} className="mt-4 text-sm text-slate-500">Back to home</button>
    </Card>
);

const HomePage = ({ setView, handleAction }) => {
    // Dummy home page for demonstration
    return <Card>
        <h1 className="text-2xl text-center">Welcome to the Coaching Hub</h1>
        <div className="grid grid-cols-2 gap-4 mt-6">
            <Button onClick={() => handleAction('quiz')}>Start Quiz</Button>
            <Button onClick={() => handleAction('evaluate')}>Evaluate Session</Button>
            <Button onClick={() => handleAction('simulate')}>Start Simulation</Button>
        </div>
    </Card>
}

export default App;

