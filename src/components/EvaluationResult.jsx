import React, { useRef, useState } from 'react';
// --- NEW IMPORTS: Added doc, getDoc, updateDoc, and increment ---
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "firebase/firestore"; 
import { db } from '../firebaseConfig';
import { Download, Save, ArrowLeft } from 'lucide-react';
import Button from './Button';
import EvaluationReport from './EvaluationReport';
// --- NEW IMPORT: Gamification Engine ---
import { calculateSessionXP, calculateNewStreak } from '../utils/gamificationEngine';

const EvaluationResult = ({ result, setView, currentUser }) => {
    const reportRef = useRef();
    const [isSaving, setIsSaving] = useState(false);
    
    // --- UPDATED: Anti-Cheat Initial State ---
    // If the dashboard passed us the historical flag, the button starts out locked.
    const [saveStatus, setSaveStatus] = useState(result?.isHistorical ? 'success' : null);

    const handleDownload = async () => {
        try {
            const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
            const { default: jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');
            if (reportRef.current) {
                const canvas = await html2canvas(reportRef.current, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'pt', 'a4');
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), (pdf.internal.pageSize.getWidth() * canvas.height) / canvas.width);
                pdf.save('coaching-report.pdf');
            }
        } catch (e) { alert("PDF Error."); }
    };

    // --- UPDATED: Save to Dashboard Function & Gamification Engine ---
    const handleSaveToDashboard = async () => {
        // DOUBLE ANTI-CHEAT: Kills the function if they somehow click it anyway
        if (!currentUser || saveStatus === 'success') return; 
        
        setIsSaving(true);
        try {
            // 1. Map the AI result for the Gamification Engine
            const coachTalkTime = result.speakerAnalysis?.coachPercentage || 0;
            const competencyRatings = result.evaluation ? result.evaluation.map(item => item.rating) : [];
            const reportData = { type: 'Simulation', talkTime: coachTalkTime, competencies: competencyRatings };

            // 2. Fetch User Data to calculate points FIRST
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            let earnedXP = 0;
            let newStreak = 0;

            if (userSnap.exists()) {
                const userData = userSnap.data();
                const currentStreak = userData.globalStreak || 0;
                const lastActivityDate = userData.lastActivityDate || null;
                
                // Calculate engine values
                newStreak = calculateNewStreak(lastActivityDate, currentStreak);
                earnedXP = calculateSessionXP(reportData, currentStreak);
            }

            // 3. Save the report receipt (NOW INCLUDES THE EARNED XP)
            await addDoc(collection(db, 'users', currentUser.uid, 'dashboardItems'), {
                type: 'Evaluation Report',
                title: `Session Analysis - ${new Date().toLocaleDateString()}`,
                savedAt: serverTimestamp(),
                data: result,
                earnedXP: earnedXP 
            });

            // 4. Deposit the points into the Gamification Wallet
            if (userSnap.exists()) {
                await updateDoc(userRef, {
                    "tracks.icf_coach.xp": increment(earnedXP),
                    "globalStreak": newStreak,
                    "lastActivityDate": serverTimestamp()
                });
            }

            setSaveStatus('success');
        } catch (e) { 
            console.error("Error saving report:", e);
            setSaveStatus('error'); 
        } finally { 
            setIsSaving(false); 
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-6">
            <div className="flex flex-col sm:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Feedback Report</h1>
                    <p className="text-rose-800 font-bold uppercase text-[10px] tracking-widest mt-1">Studio Analysis Complete</p>
                </div>
                
                <div className="flex gap-2">
                    <Button onClick={() => setView('home')} variant="secondary" className="border-rose-100 text-rose-800">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Home
                    </Button>
                    <Button onClick={handleDownload} variant="secondary" className="border-rose-100 text-rose-800">
                        <Download className="w-4 h-4 mr-2" /> PDF
                    </Button>
                    
                    {/* ANTI-CHEAT UI: Disabled when saving or already saved */}
                    <Button 
                        onClick={handleSaveToDashboard} 
                        disabled={isSaving || saveStatus === 'success'}
                        className={saveStatus === 'success' ? "bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] px-6" : "bg-rose-800 hover:bg-rose-900 text-white font-black uppercase tracking-widest text-[10px] px-6"}
                    >
                        {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved to Dashboard' : 'Save Report'}
                    </Button>
                </div>
            </div>

            <div ref={reportRef} className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 bg-white"> 
                <EvaluationReport result={result} />
            </div>
        </div>
    );
};

export default EvaluationResult;