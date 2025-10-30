import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import Button from './Button';
import EvaluationReport from './EvaluationReport'; // Import the report component

const EvaluationResult = ({ result, setView }) => {
    const reportRef = useRef();

    const handleDownload = async () => {
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
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Feedback Report</h1>
                    <p className="text-slate-600">Report ready. Download as PDF.</p>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                    <Button onClick={handleDownload} variant="secondary" className="w-1/2 sm:w-auto">
                        <Download className="w-5 h-5" /> Download PDF
                    </Button>
                    <Button onClick={() => setView('home')} variant="primary" className="w-1/2 sm:w-auto">Start New</Button>
                </div>
            </div>
            {/* The ref is now on the container div */}
            <div ref={reportRef} className="p-2 border rounded-lg shadow-md bg-white">
                <EvaluationReport result={result} />
            </div>
        </div>
    );
};

export default EvaluationResult;