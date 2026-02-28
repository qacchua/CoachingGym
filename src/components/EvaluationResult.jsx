import React, { useRef, useState } from 'react';
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; 
import { db } from '../firebaseConfig';
import { Download, Save, ArrowLeft } from 'lucide-react';
import Button from './Button';
import EvaluationReport from './EvaluationReport';

const EvaluationResult = ({ result, setView, currentUser }) => {
    const reportRef = useRef();
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

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

    const handleSaveToDashboard = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
          await addDoc(collection(db, 'users', currentUser.uid, 'dashboardItems'), {
            type: 'Evaluation Report',
            title: `Session Analysis - ${new Date().toLocaleDateString()}`,
            savedAt: serverTimestamp(),
            data: result 
          });
          setSaveStatus('success');
        } catch (e) { setSaveStatus('error'); } finally { setIsSaving(false); }
    };

    return (
        <div className="max-w-4xl mx-auto py-6">
            <div className="flex flex-col sm:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Feedback Report</h1>
                    <p className="text-rose-800 font-bold uppercase text-[10px] tracking-widest mt-1">Studio Analysis Complete</p>
                </div>
                
                <div className="flex gap-2">
                    <Button onClick={() => setView('home')} variant="secondary" className="border-rose-100 text-rose-800"><ArrowLeft className="w-4 h-4 mr-2" /> Home</Button>
                    <Button onClick={handleDownload} variant="secondary" className="border-rose-100 text-rose-800"><Download className="w-4 h-4 mr-2" /> PDF</Button>
                    <Button onClick={handleSaveToDashboard} className="bg-rose-800 hover:bg-rose-900 text-white font-black uppercase tracking-widest text-[10px] px-6">
                        {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved' : 'Save Report'}
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