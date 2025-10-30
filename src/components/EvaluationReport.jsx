import React from 'react';
import { MessageSquare, PieChart as PieChartIcon, CheckSquare, Edit, Lightbulb, HelpCircle } from 'lucide-react';

const EvaluationReport = ({ result }) => {
    const { foundationalCompetencies, evaluation, speakerAnalysis, keyInsights, alternativeQuestions, questionAnalysis } = result;

    const getRatingColorClasses = (rating) => {
        switch (rating) {
            case 'Exemplary': return 'border-emerald-500 bg-emerald-50 text-emerald-800';
            case 'Proficient': return 'border-lime-500 bg-lime-50 text-lime-800';
            case 'Sufficient': return 'border-amber-500 bg-amber-50 text-amber-800';
            case 'Needs Development': return 'border-rose-500 bg-rose-50 text-rose-800';
            default: return 'border-slate-500 bg-slate-50 text-slate-800';
        }
    };

    return (
        <div className="bg-white p-12 font-sans">
            <header className="text-center border-b-2 border-slate-100 pb-6 mb-8">
                <h1 className="text-3xl font-bold text-stone-800">Coaching Conversation Report</h1>
                <p className="text-md text-slate-500 mt-2">AI-Powered Analysis. Not a formal evaluation.</p>
            </header>

            <section className="mb-10">
                <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">Session Analysis</h2>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2"><MessageSquare /> Talk Time</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between mb-1 text-sm"><span>Client</span><span>{speakerAnalysis.clientPercentage}%</span></div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-stone-600 h-2.5 rounded-full" style={{ width: `${speakerAnalysis.clientPercentage}%` }}></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1 text-sm"><span>Coach</span><span>{speakerAnalysis.coachPercentage}%</span></div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-stone-500 h-2.5 rounded-full" style={{ width: `${speakerAnalysis.coachPercentage}%` }}></div></div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2"><PieChartIcon /> Question Analysis</h3>
                        <ul className="space-y-1 text-sm">
                            {Object.entries(questionAnalysis).map(([key, value]) => (
                                <li key={key} className="flex justify-between">
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="font-semibold">{value}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

             <section className="mb-10">
                <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">Foundational Competencies</h2>
                <div className="space-y-4">
                    {foundationalCompetencies.map((item, index) => (
                        <div key={index} className="p-4 rounded-lg bg-slate-50">
                            <h3 className="text-lg font-semibold flex items-center gap-2">{item.competency.includes("Ethical") ? <CheckSquare /> : <Edit />} {item.competency}</h3>
                            <p className="text-sm mt-1">{item.assessmentNote}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">Core Competency Evaluation</h2>
                <div className="space-y-4">
                    {evaluation.map((item, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${getRatingColorClasses(item.rating)}`}>
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-lg font-bold">{item.competency}</h3>
                                <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${getRatingColorClasses(item.rating)}`}>{item.rating}</span>
                            </div>
                            <p className="text-sm">{item.justification}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-2 gap-8">
                 <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2"><Lightbulb /> Key Client Insights</h2>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        {keyInsights.map((insight, index) => <li key={index}>{insight}</li>)}
                    </ul>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2"><HelpCircle /> Alternative Questions</h2>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        {alternativeQuestions.map((q, index) => <li key={index}>"{q}"</li>)}
                    </ul>
                </div>
            </section>
        </div>
    );
};

export default EvaluationReport;