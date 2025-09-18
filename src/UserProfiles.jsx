import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Bot, FileText, Send, BrainCircuit, Sparkles, User, X, Loader2, Download, MessageSquare, Lightbulb, HelpCircle, PieChart as PieChartIcon, PlusCircle, CheckSquare, Edit, Dices, List, UserPlus, Mic, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
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

const generateImageAPI = async (prompt) => {
    const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    let response;
    for (let i = 0; i < 3; i++) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) break;
        } catch (error) {
            console.error("Image generation fetch error:", error);
        }
        await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }

    if (!response || !response.ok) {
        throw new Error(`Image generation API error after retries.`);
    }

    const result = await response.json();
    if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
        return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
    } else {
        throw new Error("Invalid or empty response from image generation API.");
    }
};


// --- TTS Helper Functions ---
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function pcmToWav(pcmData, sampleRate) {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false); 
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

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
        <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><FileText className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Evaluate Transcript</h2>
            <p className="text-slate-600 mb-6">Upload a text transcript for a detailed analysis.</p>
          </div>
          <Button onClick={() => handleAction('transcript')}>Get Started</Button>
        </Card>
        <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><Upload className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Evaluate Recording</h2>
            <p className="text-slate-600 mb-6">Upload an audio recording for transcription and analysis.</p>
          </div>
          <Button onClick={() => handleAction('recording')}>Get Started</Button>
        </Card>
        <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><Bot className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Simulate (Text)</h2>
            <p className="text-slate-600 mb-6">Engage in a text-based session with an AI client.</p>
          </div>
          <Button onClick={() => handleAction('simulation')}>Start Simulation</Button>
        </Card>
        <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><Mic className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Simulate (Voice)</h2>
            <p className="text-slate-600 mb-6">Practice by speaking with an AI client and hearing responses.</p>
          </div>
          <Button onClick={() => handleAction('voiceSimulation')}>Start Voice Simulation</Button>
        </Card>
         <Card className="hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col h-full">
          <div className="flex-grow">
            <IconWrapper><ShieldCheck className="w-8 h-8" /></IconWrapper>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Ethical Dilemma Simulator</h2>
            <p className="text-slate-600 mb-6">Navigate tricky ethical scenarios with AI mentor feedback.</p>
          </div>
          <Button onClick={() => handleAction('dilemma')}>Start Simulation</Button>
        </Card>
      </div>
    </div>
  );
};

// ... (All other components like RecordingEvaluator, TranscriptEvaluator, Simulation, etc. remain here but are omitted for brevity)

const AuthComponent = ({ setUser }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSocialSignIn = async (provider) => {
        setError('');
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoogleSignIn = () => {
        const provider = new GoogleAuthProvider();
        handleSocialSignIn(provider);
    };

    const handleAppleSignIn = () => {
        const provider = new OAuthProvider('apple.com');
        handleSocialSignIn(provider);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };
    
    return (
        <Card className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-center mb-6">{isLogin ? 'Login' : 'Sign Up'}</h1>
            <div className="space-y-4">
                 <Button onClick={handleGoogleSignIn} variant="secondary" className="w-full">
                    {/* SVG for Google Icon */}
                    Sign in with Google
                </Button>
                <Button onClick={handleAppleSignIn} variant="secondary" className="w-full bg-black text-white hover:bg-gray-800">
                    {/* SVG for Apple Icon */}
                    Sign in with Apple
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

const UserSettings = ({ setView, userData, user }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (newPassword.length < 6) { setError("Password must be at least 6 characters long."); return; }
        if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
        try {
            await updatePassword(auth.currentUser, newPassword);
            setSuccess("Password updated successfully!");
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.message);
        }
    };
    
    return (
        <Card className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-center mb-6">My Profile</h1>
            <div className="space-y-4 mb-8">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Current Plan:</strong> <span className="capitalize font-semibold">{userData.plan}</span></p>
                {userData.plan === 'free' && <p><strong>Remaining Credits:</strong> {userData.credits}</p>}
                <Button onClick={() => setView('pricing')} variant="primary" className="w-full">Upgrade Membership</Button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4 border-t pt-6">
                <h2 className="text-xl font-semibold">Change Password</h2>
                <div>
                    <label htmlFor="new-password">New Password</label>
                    <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 border rounded-lg mt-1" required />
                </div>
                <div>
                    <label htmlFor="confirm-password">Confirm New Password</label>
                    <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 border rounded-lg mt-1" required />
                </div>
                <Button type="submit" className="w-full">Update Password</Button>
            </form>
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            {success && <p className="text-green-600 text-center mt-4">{success}</p>}
            <div className="mt-6 text-center">
                 <Button onClick={() => setView('home')} variant="secondary">Back to Hub</Button>
            </div>
        </Card>
    );
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
      case 'transcript': return <TranscriptEvaluator setView={setView} setEvaluationResult={setEvaluationResult} />;
      case 'recording': return <RecordingEvaluator setView={setView} setEvaluationResult={setEvaluationResult} />;
      case 'simulation': return <Simulation setView={setView} setEvaluationResult={setEvaluationResult} />;
      case 'voiceSimulation': return <VoiceSimulation setView={setView} setEvaluationResult={setEvaluationResult} />;
      case 'quiz': return <QuizComponent setView={setView} />;
      case 'dilemma': return <EthicalDilemmaSimulator setView={setView} />;
      case 'result': return <EvaluationResult result={evaluationResult} setView={setView} />;
      case 'upsell': return <PremiumUpsell setView={setView} />;
      case 'pricing': return <PricingPage setView={setView} user={user} userData={userData} />;
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

export default App;

