import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckSquare, Save, XCircle, ArrowRight, AlertTriangle, ShieldCheck, Coffee } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from '../firebaseConfig';
import Card from './Card';
import Button from './Button';
import IconWrapper from './IconWrapper';
import { calculateSessionXP, calculateNewStreak } from '../utils/gamificationEngine';
import { accMockExamDatabase } from '../utils/mockExamData';
// Add this near your other imports
import MockExamReport from './MockExamReport';

const MockExamComponent = ({ setView, currentUser, isPremium }) => {
    // 1. Upgraded Exam Phases
    const [examState, setExamState] = useState('intro'); // 'intro', 'instructions', 'section_1', 'break', 'section_2', 'results'
    
    // 2. Dual-Array Question State
    const [sectionOneQuestions, setSectionOneQuestions] = useState([]);
    const [sectionTwoQuestions, setSectionTwoQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    
    // 3. Segmented Timer State
    const SECTION_TIME_SECONDS = 2340; // 39 minutes
    const BREAK_TIME_SECONDS = 600;    // 10 minutes
    const INSTRUCTIONS_TIME_SECONDS = 120; // 2 minutes
    const [timeLeft, setTimeLeft] = useState(0);
    
    // Results & Saving State
    const [score, setScore] = useState(0);
    const [domainAnalysis, setDomainAnalysis] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); 
    const resultsRef = useRef(null);

    // --- HELPER: Shuffle Array ---
    const shuffleArray = (array) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    };

    // --- PHASE TRANSITIONS ---
    const startInstructions = () => {
        // Draft and split the 60 questions
        const shuffled = shuffleArray([...accMockExamDatabase]).slice(0, 60);
        setSectionOneQuestions(shuffled.slice(0, 30));
        setSectionTwoQuestions(shuffled.slice(30, 60));
        
        setUserAnswers({});
        setScore(0);
        setDomainAnalysis({});
        setSaveStatus(null);
        
        setTimeLeft(INSTRUCTIONS_TIME_SECONDS);
        setExamState('instructions');
    };

    const startSectionOne = () => {
        setCurrentQuestionIndex(0);
        setTimeLeft(SECTION_TIME_SECONDS);
        setExamState('section_1');
    };

    const startBreak = () => {
        setTimeLeft(BREAK_TIME_SECONDS);
        setExamState('break');
    };

    const startSectionTwo = () => {
        setCurrentQuestionIndex(0);
        setTimeLeft(SECTION_TIME_SECONDS);
        setExamState('section_2');
    };

    // --- TIMER EFFECT ---
    useEffect(() => {
        let timer;
        const isTimedPhase = ['instructions', 'section_1', 'break', 'section_2'].includes(examState);

        if (isTimedPhase && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isTimedPhase) {
            // Auto-advance logic when time runs out
            if (examState === 'instructions') startSectionOne();
            if (examState === 'section_1') startBreak();
            if (examState === 'break') startSectionTwo();
            if (examState === 'section_2') handleSubmitExam();
        }
        return () => clearInterval(timer);
    }, [examState, timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // --- NAVIGATION & SUBMISSION ---
    const handleOptionSelect = (optionIndex) => {
        // We need a unique key for the answer regardless of which section we are in.
        // For Section 1, index is 0-29. For Section 2, index is effectively 30-59.
        const absoluteIndex = examState === 'section_1' ? currentQuestionIndex : currentQuestionIndex + 30;
        setUserAnswers({ ...userAnswers, [absoluteIndex]: optionIndex });
    };

    const handleNextQuestion = () => {
        const currentArray = examState === 'section_1' ? sectionOneQuestions : sectionTwoQuestions;
        
        if (currentQuestionIndex < currentArray.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            // End of Section Logic
            if (examState === 'section_1') {
                startBreak();
            } else {
                handleSubmitExam();
            }
        }
    };

    const handleSubmitExam = () => {
        let finalScore = 0;
        const analysis = {};
        const allQuestions = [...sectionOneQuestions, ...sectionTwoQuestions];

        allQuestions.forEach((q, index) => {
            const domain = q.domain;
            if (!analysis[domain]) {
                analysis[domain] = { correct: 0, total: 0 };
            }
            analysis[domain].total += 1;
            
            if (userAnswers[index] === q.correctIndex) {
                finalScore += 1;
                analysis[domain].correct += 1;
            }
        });

        setScore(finalScore);
        setDomainAnalysis(analysis);
        setExamState('results');
    };

    // --- SAVE TO DASHBOARD ---
    const handleSaveToDashboard = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        setSaveStatus(null);
        try {
            const percentage = Math.round((score / 60) * 100);
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            let currentStreak = 0;
            let lastActivityDate = null;
            let earnedXP = 0;
            let newStreak = 0;

            if (userSnap.exists()) {
                const userData = userSnap.data();
                currentStreak = userData.globalStreak || 0;
                lastActivityDate = userData.lastActivityDate || null;
                newStreak = calculateNewStreak(lastActivityDate, currentStreak);
                
                // 1. Calculate the standard gamified XP first
                const standardXP = calculateSessionXP({ type: 'Quiz', percentage: percentage, totalQuestions: 60 }, currentStreak);
                
                // 2. Enforce a strict 25 XP minimum for this grueling 90-minute exam
                earnedXP = Math.max(25, standardXP);
            }

            await addDoc(collection(db, 'users', currentUser.uid, 'dashboardItems'), {
                type: 'Quiz', title: 'ICF ACC Mock Exam', score: `${score} / 60`, percentage: percentage, earnedXP: earnedXP, savedAt: serverTimestamp(), quizMode: 'mock_exam', totalQuestions: 60
            });

            if (userSnap.exists()) {
                await updateDoc(userRef, {
                    "tracks.icf_coach.xp": increment(earnedXP),
                    "globalStreak": newStreak,
                    "lastActivityDate": serverTimestamp()
                });
            }
            setSaveStatus('success');
        } catch (error) {
            console.error("Error saving exam:", error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================
    // RENDER SCREENS
    // ==========================================

    if (examState === 'intro') {
        return (
            <Card className="max-w-2xl mx-auto text-center py-12 border-slate-200 shadow-xl fade-in">
                <IconWrapper><ShieldCheck className="w-10 h-10 text-slate-800" /></IconWrapper>
                <h1 className="text-4xl font-black text-slate-900 mt-6 tracking-tighter uppercase">ACC Mock Exam</h1>
                <p className="mt-4 mb-8 text-slate-600 font-medium px-8 leading-relaxed">
                    Test your readiness for the official ICF ACC Credentialing Exam. This simulation mirrors the real testing environment: strict section timers, situational questions, and no immediate feedback.
                </p>
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-left max-w-sm mx-auto mb-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">90 Minutes Total (Optional 10-Min Break)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckSquare className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">60 Questions (Two 30-Question Sections)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-bold text-slate-700">Passing Score: 76%</span>
                    </div>
                </div>
                <div className="flex flex-col gap-4 max-w-sm mx-auto">
                    {isPremium ? (
                        <Button onClick={startInstructions} className="bg-slate-900 text-white hover:bg-slate-800 font-black uppercase tracking-widest shadow-xl py-4 text-xs">
                            Start Exam Now
                        </Button>
                    ) : (
                        <Button disabled className="bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-[10px] py-4">
                            Premium Feature Locked
                        </Button>
                    )}
                    <Button onClick={() => setView('home')} variant="secondary" className="border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 mt-2">
                        Back to Home
                    </Button>
                </div>
            </Card>
        );
    }

    if (examState === 'instructions') {
        return (
            <Card className="max-w-2xl mx-auto py-12 border-slate-200 shadow-xl fade-in text-center">
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-6">Exam Instructions</h2>
                <div className="bg-slate-50 p-6 rounded-2xl text-left mb-8 space-y-4">
                    <p className="text-slate-700 text-sm font-medium">1. The exam consists of two sections, each with 30 questions.</p>
                    <p className="text-slate-700 text-sm font-medium">2. You have exactly 39 minutes to complete each section.</p>
                    <p className="text-slate-700 text-sm font-medium">3. You cannot return to Section 1 once you proceed to the break.</p>
                </div>
                <p className="text-sm font-bold text-rose-600 mb-8 animate-pulse">
                    Auto-starting in {formatTime(timeLeft)}
                </p>
                <Button onClick={startSectionOne} className="bg-slate-900 text-white font-black uppercase tracking-widest text-xs px-8 py-4">
                    I understand, start Section 1
                </Button>
            </Card>
        );
    }

    if (examState === 'break') {
        return (
            <Card className="max-w-2xl mx-auto text-center py-12 border-slate-200 shadow-xl fade-in">
                <IconWrapper><Coffee className="w-10 h-10 text-slate-800" /></IconWrapper>
                <h2 className="text-3xl font-black text-slate-900 mt-6 tracking-tighter uppercase mb-2">Scheduled Break</h2>
                <p className="text-slate-600 font-medium mb-8">You have completed Section 1. Take a moment to rest.</p>
                <div className="text-5xl font-black text-slate-800 mb-10 tracking-tighter font-mono">
                    {formatTime(timeLeft)}
                </div>
                <Button onClick={startSectionTwo} className="bg-slate-900 text-white font-black uppercase tracking-widest text-xs px-8 py-4">
                    Skip Break & Start Section 2
                </Button>
            </Card>
        );
    }

    if (examState === 'section_1' || examState === 'section_2') {
        const isSectionOne = examState === 'section_1';
        const currentArray = isSectionOne ? sectionOneQuestions : sectionTwoQuestions;
        
        // Safety check to ensure we have questions loaded
        if (!currentArray || currentArray.length === 0) {
            return <div className="text-center p-10">Loading exam data... If this persists, please ensure your question bank is fully loaded.</div>;
        }

        const currentQuestion = currentArray[currentQuestionIndex];
        const absoluteIndex = isSectionOne ? currentQuestionIndex : currentQuestionIndex + 30;
        const hasAnswered = userAnswers[absoluteIndex] !== undefined;

        return (
            <div className="max-w-4xl mx-auto fade-in">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {isSectionOne ? 'Section 1 of 2' : 'Section 2 of 2'}
                        </p>
                        <p className="text-lg font-black text-slate-800 tracking-tight">Question {currentQuestionIndex + 1} / 30</p>
                    </div>
                    <div className={`text-right ${timeLeft < 300 ? 'animate-pulse' : ''}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section Time Remaining</p>
                        <p className={`text-2xl font-black tracking-tighter ${timeLeft < 300 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {formatTime(timeLeft)}
                        </p>
                    </div>
                </div>

                <Card className="border-slate-200 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-800 mb-4">{currentQuestion.domain}</p>
                    <p className="text-xl font-medium leading-relaxed mb-8 text-slate-800">{currentQuestion.question}</p>

                    <div className="grid grid-cols-1 gap-4 mb-8">
                        {currentQuestion.options.map((option, index) => {
                            const isSelected = userAnswers[absoluteIndex] === index;
                            return ( 
                                <button 
                                    key={index}
                                    onClick={() => handleOptionSelect(index)} 
                                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 text-sm font-medium ${
                                        isSelected ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-700'
                                    }`}
                                > 
                                    {option} 
                                </button> 
                            );
                        })}
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                        <Button onClick={() => { if(window.confirm("Abort Exam? Progress will be lost.")) setExamState('intro'); }} variant="secondary" className="text-slate-400 hover:bg-rose-50 hover:text-rose-600 border-transparent text-[10px] font-black uppercase tracking-widest px-4">
                            <XCircle className="w-4 h-4 mr-2" /> Abort Exam
                        </Button>
                        <Button 
                            onClick={handleNextQuestion} 
                            disabled={!hasAnswered}
                            className={`${hasAnswered ? 'bg-rose-800 hover:bg-rose-900 shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} text-white font-black uppercase tracking-widest text-[10px] px-8 py-4 transition-all flex items-center`}
                        > 
                            {currentQuestionIndex < 29 ? (
                                <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
                            ) : (
                                isSectionOne ? 'Finish Section 1' : 'Submit Exam'
                            )} 
                        </Button> 
                    </div>
                </Card>
            </div>
        );
    }

    if (examState === 'results') {
        const rawPercentage = (score / 60) * 100;
        const percentage = Math.round(rawPercentage);
        const passed = percentage >= 76;

        return (
            <div className="max-w-4xl mx-auto fade-in">
                <Card className="border-slate-200 shadow-2xl mb-8">
                    <div ref={resultsRef} className="p-4 md:p-8 bg-white">
                        <div className="text-center mb-10 pb-8 border-b border-slate-100">
                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-lg ${passed ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                {passed ? <CheckSquare className="w-10 h-10 text-emerald-600" /> : <XCircle className="w-10 h-10 text-rose-600" />}
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">Exam Complete</h1>
                            <p className={`font-black uppercase tracking-widest text-sm ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {passed ? 'PASSED' : 'NOT PASSED'} &bull; SCORE: {percentage}%
                            </p>
                        </div>
                        
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Domain Breakdown</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {Object.entries(domainAnalysis).map(([domain, data]) => {
                                const domainPercent = Math.round((data.correct / data.total) * 100);
                                return ( 
                                    <div key={domain} className="bg-slate-50 p-6 rounded-3xl border border-slate-100"> 
                                        <div className="mb-4"> 
                                            <span className="block text-xs font-bold text-slate-700 leading-tight mb-1">{domain}</span> 
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.correct} / {data.total} Correct</span> 
                                        </div> 
                                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden"> 
                                            <div className={`h-full transition-all duration-1000 ${domainPercent >= 76 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${domainPercent}%` }} /> 
                                        </div> 
                                    </div> 
                                );
                            })}
                        </div>
                    </div>
                </Card>

                <div className="flex flex-wrap justify-center gap-4 mb-16">
                    <Button onClick={() => setExamState('intro')} className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] px-6 py-4 shadow-lg">Take Again</Button>
                    
                    {/* NEW REVIEW BUTTON */}
                    <Button onClick={() => setExamState('report')} className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-black uppercase tracking-widest text-[10px] px-6 py-4 shadow-sm">
                        Review Answers
                    </Button>
                    
                    <Button 
                        onClick={handleSaveToDashboard} 
                        disabled={isSaving || saveStatus === 'success'}
                        className={saveStatus === 'success' ? "bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] px-6 py-4 shadow-md" : "bg-rose-800 hover:bg-rose-900 text-white font-black uppercase tracking-widest text-[10px] px-6 py-4 shadow-md"}
                    >
                        {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : <><Save className="w-4 h-4 mr-2" /> Save to Dashboard</>}
                    </Button>
                    <Button onClick={() => setView('home')} variant="secondary" className="border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-[10px] px-6 py-4 bg-white">Back to Hub</Button>
                </div>
            </div>
        );
    }
    if (examState === 'report') {
        return (
            <MockExamReport 
                questions={[...sectionOneQuestions, ...sectionTwoQuestions]}
                userAnswers={userAnswers}
                score={score}
                domainAnalysis={domainAnalysis}
                onBack={() => setExamState('results')}
                // --- NEW PROPS ADDED HERE ---
                onSave={handleSaveToDashboard}
                isSaving={isSaving}
                saveStatus={saveStatus}
            />
        );
    }
    return null;
};

export default MockExamComponent;