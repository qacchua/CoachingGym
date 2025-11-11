import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from '../firebaseConfig.js';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { PieChart, BookOpenCheck } from 'lucide-react'; // Import icons

const Dashboard = ({ setView, currentUser, setEvaluationResult }) => {
  const [reports, setReports] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all evaluation reports
  useEffect(() => {
    if (!currentUser) return;
    const reportsQuery = query(
      collection(db, "users", currentUser.uid, "reports"),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch all quiz results
  useEffect(() => {
    if (!currentUser) return;
    const quizQuery = query(
      collection(db, "users", currentUser.uid, "quizResults"),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(quizQuery, (snapshot) => {
      setQuizResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Function to re-open an old report
  const handleViewReport = (report) => {
    // The 'EvaluationResult' component just needs the report object.
    // We already saved the full report, so we can pass it directly.
    setEvaluationResult(report);
    setView('result');
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  if (loading) {
    return <LoadingSpinner text="Loading your history..." />;
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl font-bold text-slate-800">My Dashboard</h1>
        <Button onClick={() => setView('home')} variant="secondary" className="px-4 py-2 text-sm">&larr; Back to Home</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* --- Evaluation Reports Column --- */}
        <div>
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 flex items-center gap-2">
            <BookOpenCheck /> My Reports
          </h2>
          <div className="space-y-4">
            {reports.length > 0 ? reports.map(report => (
              <div key={report.id} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{report.type}</h3>
                  <p className="text-sm text-slate-600">
                    {formatDate(report.timestamp)}
                  </p>
                </div>
                <Button onClick={() => handleViewReport(report)} variant="secondary">
                  View
                </Button>
              </div>
            )) : <p>You haven't completed any evaluations yet.</p>}
          </div>
        </div>

        {/* --- Quiz Results Column --- */}
        <div>
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 flex items-center gap-2">
            <PieChart /> My Quiz Results
          </h2>
          <div className="space-y-4">
            {quizResults.length > 0 ? quizResults.map(result => (
              <div key={result.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">
                    {result.quizMode === 'general' ? 'General Quiz' : `Quiz: ${result.competency}`}
                  </h3>
                  <span className="font-bold text-lg">
                    {result.score} / {result.totalQuestions}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {formatDate(result.timestamp)}
                </p>
              </div>
            )) : <p>You haven't completed any quizzes yet.</p>}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Dashboard;