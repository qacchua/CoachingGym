import React, { useState, useCallback } from 'react';
import { Upload, Sparkles, Loader2, FileText, ArrowLeft, Users } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { callGeminiAPI } from '../utils/api';
import { icfGradingRubric2025 } from '../utils/rubrics';

const TranscriptEvaluator = ({ setView, setEvaluationResult }) => {
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing conversation...");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);

  // --- NEW STATE: UX Mapping Step ---
  const [showMapping, setShowMapping] = useState(false);
  const [coachLabel, setCoachLabel] = useState('Coach');
  const [clientLabel, setClientLabel] = useState('Client');

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setError(null);
    setTranscript('');
    setIsParsing(true);
    setShowMapping(false); // Reset mapping UI on new file
    
    const reader = new FileReader();
    
    if (file.type === "text/plain") {
      reader.onload = (e) => { setTranscript(e.target.result); setIsParsing(false); };
      reader.onerror = () => { setError("Failed to read text file."); setIsParsing(false); }
      reader.readAsText(file);
    } else if (file.type === "application/pdf") {
      reader.onload = async function() {
        try {
          const { default: pdfjsLib } = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/+esm');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/build/pdf.worker.min.js`;
          const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ');
          }
          setTranscript(fullText);
        } catch (e) { 
            console.error(e);
            setError("Could not parse PDF."); 
        } finally { setIsParsing(false); }
      };
      reader.onerror = () => { setError("Failed to read PDF file."); setIsParsing(false); }
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.docx')) {
      reader.onload = async function() {
        try {
          const { default: mammoth } = await import('https://cdn.jsdelivr.net/npm/mammoth@1.7.2/+esm');
          const result = await mammoth.extractRawText({ arrayBuffer: this.result });
          setTranscript(result.value);
        } catch(e) { 
            console.error(e);
            setError("Could not parse DOCX."); 
        } finally { setIsParsing(false); }
      };
      reader.onerror = () => { setError("Failed to read DOCX file."); setIsParsing(false); }
      reader.readAsArrayBuffer(file);
    } else {
      setError("Unsupported file type. Please upload a .txt, .pdf, or .docx file.");
      setIsParsing(false);
    }
  };

  const handleEvaluate = useCallback(async () => {
    if (!transcript || transcript.trim().length < 50) {
      setError("Transcript is too short to evaluate.");
      return;
    }
    
    setIsLoading(true);
    setShowMapping(false); // Hide the mapping UI while loading
    setError(null);

    // --- MAPPING INSTRUCTIONS FOR GEMINI ---
    const mappingInstruction = `IMPORTANT CONTEXT: In the following transcript, the speaker labeled as "${coachLabel}" is the Coach, and the speaker labeled as "${clientLabel}" is the Client. Evaluate them strictly based on these assigned roles.`;

    try {
      const fullReport = {
        evaluation: [],
        speakerAnalysis: { coachPercentage: 0, clientPercentage: 0 },
        questionAnalysis: { openEnded: 0, leading: 0, clarifying: 0, observation: 0 },
        keyInsights: [],
        alternativeQuestions: [],
        foundationalCompetencies: [
            { competency: "1: Ethics", assessmentNote: "Observed basis." },
            { competency: "2: Mindset", assessmentNote: "N/A" }
        ]
      };

      setLoadingText("Studio: Rating Competencies (1/3)...");
      // Inject the mapping instruction
      const compPrompt = `${icfGradingRubric2025}\n\n${mappingInstruction}\n\nBased STRICTLY on the rubric above, perform an ICF Analysis on this transcript:\n\n${transcript}`;
      const compSchema = {
          type: "OBJECT", 
          properties: { 
              evaluation: { 
                  type: "ARRAY", 
                  items: { 
                      type: "OBJECT", 
                      properties: { competency: { type: "STRING" }, rating: { type: "STRING" }, justification: { type: "STRING" } }, 
                      required: ["competency", "rating", "justification"] 
                  } 
              } 
          } 
      };
      const compRes = await callGeminiAPI(compPrompt, compSchema);
      fullReport.evaluation = compRes?.evaluation || [];

      setLoadingText("Studio: Calculating Metrics (2/3)...");
      // Inject the mapping instruction
      const metricPrompt = `${mappingInstruction}\n\nCalculate Talk Time % and Question Categories for the Coach (${coachLabel}) in this transcript: \n\n${transcript}`;
      const metricSchema = {
        type: "OBJECT", 
        properties: { 
            speakerAnalysis: { 
                type: "OBJECT", 
                properties: { coachPercentage: { type: "NUMBER" }, clientPercentage: { type: "NUMBER" } }, 
                required: ["coachPercentage", "clientPercentage"] 
            },
            questionAnalysis: { 
                type: "OBJECT", 
                properties: { openEnded: { type: "NUMBER" }, leading: { type: "NUMBER" }, clarifying: { type: "NUMBER" }, observation: { type: "NUMBER" } }, 
                required: ["openEnded", "leading", "clarifying", "observation"] 
            }
        }
      };
      const metricRes = await callGeminiAPI(metricPrompt, metricSchema);
      fullReport.speakerAnalysis = metricRes?.speakerAnalysis || fullReport.speakerAnalysis;
      fullReport.questionAnalysis = metricRes?.questionAnalysis || fullReport.questionAnalysis;

      setLoadingText("Studio: Finalizing Insights (3/3)...");
      // Inject the mapping instruction
      const insightPrompt = `${icfGradingRubric2025}\n\n${mappingInstruction}\n\nBased strictly on the ICF rubric above, provide 5 key insights and 5 alternative powerful questions for the Coach in this transcript:\n\n${transcript}`;
      const insightSchema = {
        type: "OBJECT", 
        properties: { 
            keyInsights: { type: "ARRAY", items: { type: "STRING" } }, 
            alternativeQuestions: { type: "ARRAY", items: { type: "STRING" } } 
        }, 
        required: ["keyInsights", "alternativeQuestions"]
      };
      const insightRes = await callGeminiAPI(insightPrompt, insightSchema);
      fullReport.keyInsights = insightRes?.keyInsights || [];
      fullReport.alternativeQuestions = insightRes?.alternativeQuestions || [];

      if (typeof setEvaluationResult === 'function') {
          setEvaluationResult({ ...fullReport, transcript: transcript });
          setView('result'); 
      } else {
          setError("Configuration error: Cannot save results.");
      }

    } catch (e) {
      console.error("Analysis Crash:", e);
      setError("The AI had a temporary hiccup. Please try generating the report again.");
    } finally {
      setIsLoading(false);
    }
  }, [transcript, coachLabel, clientLabel, setView, setEvaluationResult]);

  return (
    <Card className="max-w-4xl mx-auto border-rose-100 shadow-xl fade-in">
      <div className="flex justify-between items-start mb-8 border-b border-rose-50 pb-6">
        <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Evaluate Transcripts</h1>
            <p className="text-rose-800 text-[10px] font-bold uppercase tracking-widest mt-1">Upload your session and map your speakers</p>
        </div>
        <Button onClick={() => setView('home')} variant="secondary" className="border-rose-100 text-rose-800 font-bold uppercase tracking-widest text-[10px]">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <label htmlFor="file-upload" className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-900 font-bold rounded-2xl border border-rose-100 transition-all hover:bg-rose-100 ${isParsing ? 'opacity-50' : ''}`}>
            <Upload className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest font-black">Upload (.txt, .pdf, .docx)</span>
          </label>
          <input id="file-upload" type="file" className="hidden" accept=".txt,.pdf,.docx" onChange={handleFileChange} disabled={isParsing} />
           {isParsing && (<div className="flex items-center gap-2 text-rose-800 font-bold italic animate-pulse"><Loader2 className="w-5 h-5 animate-spin" /><span>Parsing Document...</span></div>)}
        </div>

        <div className="relative">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your transcript here..."
              className="w-full h-80 p-6 border border-rose-50 rounded-[2rem] bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-rose-800 outline-none text-sm leading-relaxed shadow-inner transition-all"
              disabled={isParsing || showMapping || isLoading}
            />
            {!transcript && !isParsing && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                    <FileText size={120} className="text-slate-900" />
                </div>
            )}
        </div>

        {/* --- UX MAPPING STEP --- */}
        {!showMapping && !isLoading && (
            <Button 
                onClick={() => setShowMapping(true)} 
                disabled={!transcript.trim() || isParsing} 
                className="w-full py-5 bg-rose-800 hover:bg-rose-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-200 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Sparkles className="w-4 h-4 mr-2" /> Prepare Evaluation
            </Button>
        )}

        {showMapping && !isLoading && (
            <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4 text-rose-900">
                    <Users className="w-5 h-5" />
                    <h3 className="font-black uppercase tracking-widest text-sm">Who is who in this transcript?</h3>
                </div>
                <p className="text-sm text-rose-800 mb-6">Tell us exactly how the speakers are labeled in your text (e.g., "Speaker 1", "Me", "John").</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-2">Coach Label</label>
                        <input 
                            type="text" 
                            value={coachLabel}
                            onChange={(e) => setCoachLabel(e.target.value)}
                            className="w-full p-3 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-800 outline-none text-sm"
                            placeholder="e.g., Speaker 1"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-2">Client Label</label>
                        <input 
                            type="text" 
                            value={clientLabel}
                            onChange={(e) => setClientLabel(e.target.value)}
                            className="w-full p-3 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-800 outline-none text-sm"
                            placeholder="e.g., Speaker 2"
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <Button onClick={() => setShowMapping(false)} variant="secondary" className="w-1/3 bg-white border-rose-200 text-rose-800 text-xs tracking-widest uppercase font-bold">
                        Cancel
                    </Button>
                    <Button onClick={handleEvaluate} className="w-2/3 bg-rose-800 text-white text-xs tracking-widest uppercase font-black">
                        Confirm & Analyze
                    </Button>
                </div>
            </div>
        )}
      </div>

      {isLoading && <div className="mt-8"><LoadingSpinner text={loadingText} /></div>}
      
      {error && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-sm font-bold flex items-center gap-3">
            <div className="w-2 h-2 bg-rose-800 rounded-full animate-ping shrink-0" />
            {error}
        </div>
      )}
    </Card>
  );
};

export default TranscriptEvaluator;