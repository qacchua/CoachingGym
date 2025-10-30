import React, { useState, useCallback } from 'react';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { callGeminiAPI } from '../utils/api'; // Assuming api utils are moved to src/utils/api.js

const TranscriptEvaluator = ({ setView, setEvaluationResult }) => {
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing conversation...");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setTranscript('');
    setIsParsing(true);

    const reader = new FileReader();
    try {
      if (file.type === "text/plain") {
        reader.onload = (e) => { setTranscript(e.target.result); setIsParsing(false); };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        const { default: pdfjsLib } = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/+esm');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/build/pdf.worker.min.js`;
        reader.onload = async function() {
          try {
            const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              fullText += content.items.map(item => item.str).join(' ');
            }
            setTranscript(fullText);
          } catch (e) { setError("Could not parse PDF."); }
          finally { setIsParsing(false); }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.docx')) {
        const { default: mammoth } = await import('https://cdn.jsdelivr.net/npm/mammoth@1.7.2/+esm');
        reader.onload = async function() {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer: this.result });
            setTranscript(result.value);
          } catch(e) { setError("Could not parse DOCX."); }
          finally { setIsParsing(false); }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setError("Unsupported file type.");
        setIsParsing(false);
      }
    } catch (e) {
      setError("Could not load library for this file type.");
      setIsParsing(false);
    }
  };

  const handleEvaluate = useCallback(async (textToEvaluate) => {
    const finalTranscript = textToEvaluate || transcript;
    if (finalTranscript.trim().length < 50) {
      setError("Transcript is too short to evaluate.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const chunkTranscript = (text, chunkSize = 15000) => {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.substring(i, i + chunkSize));
        }
        return chunks;
    };

    try {
      const fullReport = {
        evaluation: [],
        speakerAnalysis: { coachPercentage: 0, clientPercentage: 0 },
        keyInsights: [],
        alternativeQuestions: [],
        questionAnalysis: { openEnded: 0, leading: 0, clarifying: 0, observation: 0 }
      };

      const chunks = chunkTranscript(finalTranscript);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setLoadingText(`Analyzing chunk ${i + 1} of ${chunks.length}...`);

        const competencyPrompt = `Analyze the following coaching transcript chunk based on the official ICF Core Competencies. You must evaluate ONLY the following competencies:
              - Establishes and Maintains Agreements
              - Cultivates Trust and Safety
              - Maintains Presence
              - Listens Actively
              - Evokes Awareness
              - Facilitates Client Growth
              For each of these competencies, provide a rating (Exemplary, Proficient, Sufficient, Needs Development) and a detailed justification with examples from the transcript. Return a JSON object with a single key "evaluation" containing an array of objects. Transcript Chunk: ${chunk}`;
        const competencySchema = {type: "OBJECT", properties: { evaluation: { type: "ARRAY", items: { type: "OBJECT", properties: { competency: { type: "STRING" }, rating: { type: "STRING" }, justification: { type: "STRING" } } } } } };
        const competencyResult = await callGeminiAPI(competencyPrompt, competencySchema);
        fullReport.evaluation.push(...competencyResult.evaluation);
      }

      setLoadingText("Finalizing analysis...");

      const talkTimePrompt = `Analyze the speaker talk time in the full transcript. Estimate the percentage of talk time for the Coach and the Client. Return a JSON object with keys "coachPercentage" and "clientPercentage". Full Transcript: ${finalTranscript}`;
      const talkTimeSchema = { type: "OBJECT", properties: { coachPercentage: { type: "NUMBER" }, clientPercentage: { type: "NUMBER" } } };
      fullReport.speakerAnalysis = await callGeminiAPI(talkTimePrompt, talkTimeSchema);

      const insightsPrompt = `Identify up to 5 pivotal moments of client insight from the full transcript. Return a JSON object with a single key "keyInsights" containing an array of strings. Full Transcript: ${finalTranscript}`;
      const insightsSchema = { type: "OBJECT", properties: { keyInsights: { type: "ARRAY", items: { type: "STRING" } } } };
      fullReport.keyInsights = (await callGeminiAPI(insightsPrompt, insightsSchema)).keyInsights;

      const questionsPrompt = `Suggest up to 5 powerful, alternative questions the coach could have asked based on the full transcript. Return a JSON object with a single key "alternativeQuestions" containing an array of strings. Full Transcript: ${finalTranscript}`;
      const questionsSchema = { type: "OBJECT", properties: { alternativeQuestions: { type: "ARRAY", items: { type: "STRING" } } } };
      fullReport.alternativeQuestions = (await callGeminiAPI(questionsPrompt, questionsSchema)).alternativeQuestions;

      const questionAnalysisPrompt = `Analyze the Coach's dialogue in the full transcript. Categorize each question into 'Open-Ended', 'Leading', 'Clarifying', or 'Observation'. Provide the percentage breakdown. Return a JSON object with keys "openEnded", "leading", "clarifying", and "observation". Full Transcript: ${finalTranscript}`;
      const questionAnalysisSchema = { type: "OBJECT", properties: { openEnded: { type: "NUMBER" }, leading: { type: "NUMBER" }, clarifying: { type: "NUMBER" }, observation: { type: "NUMBER" } } };
      fullReport.questionAnalysis = await callGeminiAPI(questionAnalysisPrompt, questionAnalysisSchema);

      fullReport.foundationalCompetencies = [
          { competency: "1: Demonstrates Ethical Practice", assessmentNote: "Assessed on an 'Observed / Not Observed' basis." },
          { competency: "2: Embodies a Coaching Mindset", assessmentNote: "Assessed via the ICF Credentialing Exam." }
      ];

      const consolidatedEval = {};
      fullReport.evaluation.forEach(item => {
          if (!consolidatedEval[item.competency]) {
              consolidatedEval[item.competency] = { justifications: [], ratings: {} };
          }
          consolidatedEval[item.competency].justifications.push(item.justification);
          consolidatedEval[item.competency].ratings[item.rating] = (consolidatedEval[item.competency].ratings[item.rating] || 0) + 1;
      });

      fullReport.evaluation = Object.keys(consolidatedEval).map(key => {
          const ratings = consolidatedEval[key].ratings;
          const topRating = Object.keys(ratings).reduce((a, b) => ratings[a] > ratings[b] ? a : b);
          return {
              competency: key,
              rating: topRating,
              justification: consolidatedEval[key].justifications.join(' ')
          };
      });

      setEvaluationResult({ ...fullReport, transcript: finalTranscript });
      setView('result');
    } catch (e) {
      setError(e.message || "An unexpected error occurred during evaluation.");
    } finally {
      setIsLoading(false);
    }
  }, [transcript, setView, setEvaluationResult]);

  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Evaluate a Transcript</h1>
        <Button onClick={() => setView('home')} variant="secondary" className="px-4 py-2 text-sm">&larr; Back</Button>
      </div>

      <p className="text-slate-600 mb-6">Upload a text transcript (.txt, .pdf, or .docx) or paste the content below. Please ensure your transcript has "Coach" and "Client" clearly identified.</p>

      <div>
        <div className="mb-4 flex items-center gap-4">
          <label htmlFor="file-upload" className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg ${isParsing ? 'opacity-50' : 'hover:bg-slate-200'}`}>
            <Upload className="w-5 h-5" />
            <span>Upload Transcript File</span>
          </label>
          <input id="file-upload" type="file" className="hidden" accept=".txt,.pdf,.docx" onChange={handleFileChange} disabled={isParsing} />
           {isParsing && (<div className="flex items-center gap-2 text-slate-600"><Loader2 className="w-5 h-5 animate-spin" /><span>Parsing...</span></div>)}
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Or paste your transcript here..."
          className="w-full h-64 p-4 border border-slate-300 rounded-lg"
          disabled={isParsing}
        />
        <Button onClick={() => handleEvaluate()} disabled={!transcript.trim() || isParsing} className="mt-6 w-full md:w-auto">
          <Sparkles className="w-5 h-5" /> Evaluate Now
        </Button>
      </div>

      {isLoading && <LoadingSpinner text={loadingText} />}
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </Card>
  );
};

export default TranscriptEvaluator;