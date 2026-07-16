import React, { useRef, useState } from 'react';
import { CheckSquare, XCircle, Info, Download, ArrowLeft, Save } from 'lucide-react';
import Card from './Card';
import Button from './Button';

// Added onSave, isSaving, and saveStatus to the props
const MockExamReport = ({ questions, userAnswers, score, domainAnalysis, onBack, onSave, isSaving, saveStatus }) => {
    const reportRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 76;

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = reportRef.current;
            const opt = {
                margin: 0.5,
                filename: 'ICF_ACC_Mock_Exam_Report.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-white p-4 md:p-12 font-sans fade-in max-w-5xl mx-auto">
            {/* Header Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 pb-6 border-b border-slate-100">
                <Button onClick={onBack} variant="secondary" className="border-transparent text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 w-full md:w-auto">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Results
                </Button>
                
                {/* Action Buttons Group */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button 
                        onClick={onSave} 
                        disabled={isSaving || saveStatus === 'success'}
                        className={saveStatus === 'success' 
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center justify-center px-6 py-4 rounded-xl" 
                            : "bg-rose-800 hover:bg-rose-900 text-white font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center justify-center px-6 py-4 rounded-xl"}
                    >
                        {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : <><Save className="w-4 h-4 mr-2" /> Save to Dashboard</>}
                    </Button>

                    <Button 
                        onClick={handleDownloadPDF} 
                        disabled={isDownloading}
                        className="bg-slate-900 text-white hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center justify-center px-6 py-4 rounded-xl"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {isDownloading ? 'Generating...' : 'Download PDF'}
                    </Button>
                </div>
            </div>

            {/* --- START OF PRINTABLE PDF CONTENT --- */}
            <div ref={reportRef} className="bg-white">
                <header className="text-center mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Exam Diagnostics Report</h1>
                    <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">ICF ACC Credentialing Simulation</p>
                </header>

                {/* Score Summary Banner */}
                <div className={`mb-12 p-6 border rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm ${passed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Final Outcome</p>
                        <h2 className={`text-2xl font-black uppercase tracking-tight ${passed ? 'text-emerald-800' : 'text-rose-800'}`}>
                            {passed ? 'Passed Simulation' : 'Did Not Pass'}
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Overall Score</p>
                        <h2 className={`text-3xl font-black ${passed ? 'text-emerald-900' : 'text-rose-900'}`}>{percentage}%</h2>
                        <p className="text-xs font-bold text-slate-500 mt-1">{score} / {questions.length} Correct</p>
                    </div>
                </div>

                {/* AI Disclaimer Banner */}
                <div className="mb-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 shadow-sm break-inside-avoid">
                    <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        <strong>Reviewing Your Answers:</strong> The rationale provided below is designed to align with the 2025 ICF Core Competencies and Code of Ethics. Use these insights to identify patterns in your situational judgment rather than memorizing specific scenarios.
                    </p>
                </div>

                {/* Questions Breakdown */}
                <div className="space-y-8">
                    {questions.map((q, index) => {
                        const userAnswer = userAnswers[index];
                        const isCorrect = userAnswer === q.correctIndex;

                        return (
                            <Card key={index} className="border-slate-200 shadow-none border break-inside-avoid">
                                <div className="flex items-center gap-3 mb-4">
                                    {isCorrect ? <CheckSquare className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Question {index + 1} &bull; {q.domain}
                                    </p>
                                </div>
                                
                                <p className="text-lg font-medium leading-relaxed mb-6 text-slate-800">{q.question}</p>

                                <div className="space-y-3 mb-6">
                                    {q.options.map((option, optIndex) => {
                                        let optionClass = "bg-slate-50 border-slate-100 text-slate-500";
                                        if (optIndex === q.correctIndex) {
                                            optionClass = "bg-emerald-50 border-emerald-500 text-emerald-900 border-2 font-bold shadow-sm";
                                        } else if (optIndex === userAnswer && !isCorrect) {
                                            optionClass = "bg-rose-50 border-rose-500 text-rose-900 border-2 font-bold opacity-70"; 
                                        }

                                        return (
                                            <div key={optIndex} className={`p-4 rounded-xl border ${optionClass} flex items-start gap-3`}>
                                                <div className="mt-0.5 font-black text-xs">{['A', 'B', 'C', 'D'][optIndex]}.</div>
                                                <div className="text-sm">{option}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 mt-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-2">ICF Rationale</p>
                                    <p className="text-sm text-blue-900 font-medium leading-relaxed">{q.explanation}</p>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MockExamReport;