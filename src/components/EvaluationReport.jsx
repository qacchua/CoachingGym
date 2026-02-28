import React from 'react';
import { MessageSquare, PieChart as PieChartIcon, CheckSquare, Edit, Lightbulb, HelpCircle } from 'lucide-react';

const EvaluationReport = ({ result = {} }) => {
    // Defensive Destructuring 
    const { 
        foundationalCompetencies = [], 
        evaluation = [], 
        speakerAnalysis = { clientPercentage: 0, coachPercentage: 0 }, 
        keyInsights = [], 
        alternativeQuestions = [], 
        questionAnalysis = { openEnded: 0, leading: 0, clarifying: 0, observation: 0 } 
    } = result;

    // --- BROADER SEMANTIC COLOR MATCHING ---
    const getRatingColorClasses = (rating) => {
        const normalized = String(rating || '').toLowerCase();
        
        // Green / Emerald
        if (normalized.includes('exemplary') || normalized.includes('excellent') || normalized.includes('masterful') || normalized.includes('outstanding')) {
            return 'border-emerald-500 bg-emerald-50/30 text-emerald-950';
        } 
        // Blue
        else if (normalized.includes('proficient') || normalized.includes('good') || normalized.includes('strong') || normalized.includes('competent')) {
            return 'border-blue-400 bg-blue-50/30 text-blue-950';
        } 
        // Yellow / Amber
        else if (normalized.includes('sufficient') || normalized.includes('adequate') || normalized.includes('fair') || normalized.includes('average')) {
            return 'border-amber-400 bg-amber-50/30 text-amber-950';
        } 
        // Red / Rose (Added 'developing' to catch the AI's output)
        else if (normalized.includes('needs') || normalized.includes('developing') || normalized.includes('poor') || normalized.includes('inadequate')) {
            return 'border-rose-600 bg-rose-50/30 text-rose-950';
        }
        
        // Default fallback
        return 'border-slate-200 bg-slate-50 text-slate-700';
    };

    const getBadgeClasses = (rating) => {
        const normalized = String(rating || '').toLowerCase();
        
        if (normalized.includes('exemplary') || normalized.includes('excellent') || normalized.includes('masterful') || normalized.includes('outstanding')) return 'bg-emerald-100 text-emerald-800';
        if (normalized.includes('proficient') || normalized.includes('good') || normalized.includes('strong') || normalized.includes('competent')) return 'bg-blue-100 text-blue-800';
        if (normalized.includes('sufficient') || normalized.includes('adequate') || normalized.includes('fair') || normalized.includes('average')) return 'bg-amber-100 text-amber-800';
        if (normalized.includes('needs') || normalized.includes('developing') || normalized.includes('poor') || normalized.includes('inadequate')) return 'bg-rose-100 text-rose-800';
        
        return 'bg-slate-200 text-slate-700';
    };

    return (
        <div className="bg-white p-12 font-sans">
            <header className="text-center border-b border-rose-50 pb-10 mb-12">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Performance Analysis</h1>
                <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">ICF Alignment Matrix</p>
            </header>

            {/* Metrics Section */}
            <section className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-16">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">Talk Time Ratio</h3>
                    <div className="space-y-4">
                        <div className="w-full bg-slate-50 rounded-full h-3 overflow-hidden flex">
                            <div className="bg-slate-900 h-full transition-all duration-1000" style={{ width: `${speakerAnalysis.clientPercentage}%` }} />
                            <div className="bg-rose-800 h-full transition-all duration-1000" style={{ width: `${speakerAnalysis.coachPercentage}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                            <span className="text-slate-400">Client ({speakerAnalysis.clientPercentage}%)</span>
                            <span className="text-rose-800">Coach ({speakerAnalysis.coachPercentage}%)</span>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Question Categories</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        {Object.entries(questionAnalysis).map(([key, val]) => (
                            <div key={key} className="flex justify-between border-b border-rose-50 py-1.5 text-[10px] font-bold uppercase text-slate-500">
                                <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                                <span className="text-slate-900">{val}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Competencies Section with Robust Color Coding */}
            <section className="mb-16">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Competency Assessment</h3>
                <div className="space-y-4">
                    {evaluation.length > 0 ? evaluation.map((item, i) => (
                        <div key={i} className={`p-6 rounded-[1.5rem] border-l-4 shadow-sm transition-all ${getRatingColorClasses(item.rating)}`}>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-black text-sm uppercase tracking-tight">{item.competency}</h4>
                                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${getBadgeClasses(item.rating)}`}>
                                    {item.rating}
                                </span>
                            </div>
                            <p className="text-xs leading-relaxed opacity-90 font-medium">{item.justification}</p>
                        </div>
                    )) : <p className="text-slate-400 text-xs italic">Awaiting analysis data...</p>}
                </div>
            </section>

            {/* Insights Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                 <div className="bg-slate-50 p-8 rounded-[2rem]">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                        <Lightbulb size={14}/> Key Insights
                    </h2>
                    <ul className="space-y-3">
                        {keyInsights.map((insight, index) => <li key={index} className="text-xs text-slate-600 font-medium leading-relaxed">• {insight}</li>)}
                    </ul>
                </div>
                <div className="bg-rose-50/30 p-8 rounded-[2rem] border border-rose-100">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                        <HelpCircle size={14}/> Powerful Inquiries
                    </h2>
                    <ul className="space-y-3">
                        {alternativeQuestions.map((q, index) => <li key={index} className="text-xs text-rose-900 italic font-medium leading-relaxed">"{q}"</li>)}
                    </ul>
                </div>
            </section>
        </div>
    );
};

export default EvaluationReport;