import React, { useRef, useState } from 'react';
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; 
import { db } from '../firebaseConfig';
import { Download, Save, ArrowLeft } from 'lucide-react';
import Button from './Button';
import EvaluationReport from './EvaluationReport'; // Assuming you have this component

const EvaluationResult = ({ result, setView, currentUser }) => {
    const reportRef = useRef();
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error'

    // --- 1. PDF Download Logic (Your original code) ---
    const handleDownload = async () => {
        try {
            const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
            const { default: jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');

            if (reportRef.current) {
                const input = reportRef.current;
                const canvas = await html2canvas(input, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');

                const pdf = new jsPDF('p', 'pt', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const canvasAspectRatio = canvasHeight / canvasWidth;

                const imgWidth = pdfWidth;
                const imgHeight = pdfWidth * canvasAspectRatio;

                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }

                pdf.save('coaching-report.pdf');
            }
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Could not generate PDF. Please try again.");
        }
    };

    // --- 2. Save to Dashboard Logic (New code) ---
    const handleSaveToDashboard = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        setSaveStatus(null);
    
        try {
          // Calculate a simple score metric for the dashboard list
          const scoreMetric = result.speakerAnalysis?.coachPercentage 
            ? `${result.speakerAnalysis.coachPercentage}% Talk Ratio` 
            : 'N/A';
    
          await addDoc(collection(db, 'users', currentUser.uid, 'dashboardItems'), {
            type: 'Evaluation Report',
            title: `Session Analysis - ${new Date().toLocaleDateString()}`,
            score: scoreMetric,
            savedAt: serverTimestamp(),
            data: result // We save the ENTIRE result object so you can reload it later
          });
          
          setSaveStatus('success');
        } catch (error) {
          console.error("Error saving report:", error);
          setSaveStatus('error');
        } finally {
          setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Feedback Report</h1>
                    <p className="text-slate-600">Review your analysis below.</p>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-center sm:justify-end">
                    {/* Back Button */}
                    <Button onClick={() => setView('home')} variant="secondary">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Home
                    </Button>

                    {/* PDF Download Button */}
                    <Button onClick={handleDownload} variant="secondary">
                        <Download className="w-4 h-4 mr-2" /> PDF
                    </Button>

                    {/* Save to Dashboard Button */}
                    <Button 
                        onClick={handleSaveToDashboard} 
                        disabled={isSaving || saveStatus === 'success'}
                        className={saveStatus === 'success' ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : ""}
                    >
                        {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : (
                            <>
                                <Save className="w-4 h-4 mr-2" /> Save
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Report Container (Ref is here for PDF capture) */}
            <div ref={reportRef} className="p-1 bg-white"> 
                {/* We wrap EvaluationReport in a div with white bg so the PDF looks clean */}
                <EvaluationReport result={result} />
            </div>
        </div>
    );
};

export default EvaluationResult;