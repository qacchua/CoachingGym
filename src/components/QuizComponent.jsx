import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BookOpenCheck, XCircle } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import IconWrapper from './IconWrapper';

// --- DATA (Keep this at the top of the file) ---
const behaviorsData = [
    // ... (Your full behaviorsData array here) ...
     { "behavior": "Demonstrates personal integrity and honesty in interactions with clients, sponsors and relevant stakeholders", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Is sensitive to clients’ identity, environment, experiences, values and beliefs", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Uses language appropriate and respectful to clients, sponsors and relevant stakeholders", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Abides by the ICF Code of Ethics and upholds the ICF Core Values", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Maintains confidentiality with client information per stakeholder agreements and pertinent laws", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Maintains the distinctions between coaching, consulting, psychotherapy and other support professions", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Refers clients to other support professionals, as appropriate", "competency": "Demonstrates Ethical Practice" },
        { "behavior": "Acknowledges that clients are responsible for their own choices", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Engages in ongoing learning and development as a coach, including remaining aware of current coaching best practices and use of technology", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Develops an ongoing reflective practice to enhance one’s coaching", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Remains aware of and open to the influence of biases, context and culture on self and others", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Uses awareness of self and one’s intuition to benefit clients", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Develops and maintains the ability to manage one’s emotions", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Maintains emotional, physical, and mental well-being in preparation for, throughout, and following each session", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Seeks help from outside sources when necessary", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Nurtures openness and curiosity in oneself, the client, and the coaching process", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Remains aware of the influence of one's thoughts and behaviors on the client and others", "competency": "Embodies a Coaching Mindset" },
        { "behavior": "Describes one's coaching philosophy and clearly defines what coaching is and is not for potential clients and stakeholders", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Reaches agreement about what is and is not appropriate in the relationship, what is and is not being offered, and the responsibilities of the client and relevant stakeholders, including commitment to working toward coaching goals", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Reaches agreement about the guidelines and specific parameters of the coaching relationship such as logistics, fees, scheduling and inclusion of others", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to establish the overall coaching plan and goals", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to determine client–coach fit", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to identify or reconfirm what they want to accomplish in the session", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to define what the client believes they need to address or resolve in order to achieve what they want to accomplish in the session", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to define or reconfirm measures of success for what the client wants to accomplish in the session", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to manage the time and focus of the session", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Continues coaching in the direction of the client’s desired outcome unless the client indicates otherwise", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Partners with the client to close the coaching relationship in a way that that respects the client and the coaching experience", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Revisits the coaching agreement when necessary to ensure the coaching approach is meeting the client's needs", "competency": "Establishes and Maintains Agreements" },
        { "behavior": "Seeks to understand the client within their context which may include their identity, environment, experiences, values and beliefs", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Shows respect for the client’s identity, perceptions, style and language and adapts one’s coaching to the client", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Acknowledges and respects the client’s unique talents, insights and work in the coaching process", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Shows support, empathy and concern for the client", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Acknowledges and supports the client’s expression of feelings, perceptions, concerns, beliefs and suggestions", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Demonstrates openness and transparency as a way to display vulnerability and build trust with the client", "competency": "Cultivates Trust and Safety" },
        { "behavior": "Remains focused, observant, empathetic and responsive to the client", "competency": "Maintains Presence" },
        { "behavior": "Demonstrates curiosity during the coaching process", "competency": "Maintains Presence" },
        { "behavior": "Remains aware of what is emerging for self and client in the present moment", "competency": "Maintains Presence" },
        { "behavior": "Manages one’s emotions to stay present with the client", "competency": "Maintains Presence" },
        { "behavior": "Demonstrates confidence in working with strong client emotions during the coaching process", "competency": "Maintains Presence" },
        { "behavior": "Is comfortable working in a space of not knowing", "competency": "Maintains Presence" },
        { "behavior": "Creates or allows space for silence, pause or reflection", "competency": "Maintains Presence" },
        { "behavior": "Considers the client’s context,identity, environment, experiences, values and beliefs to enhance understanding of what the client is communicating", "competency": "Listens Actively" },
        { "behavior": "Reflects or summarizes what the client is communicating to ensure clarity and understanding", "competency": "Listens Actively" },
        { "behavior": "Recognizes and inquires when there is more to what the client is communicating", "competency": "Listens Actively" },
        { "behavior": "Notices and explores the client’s non-verbal cues, such as energy shifts, and what is not being said", "competency": "Listens Actively" },
        { "behavior": "Integrates the client’s words, tone of voice and body language to determine the full meaning of what the client is communicating", "competency": "Listens Actively" },
        { "behavior": "Notices trends in the client’s behaviors and emotions across sessions to discern themes and patterns", "competency": "Listens Actively" },
        { "behavior": "Considers client experience when deciding wheat might be most useful", "competency": "Evokes Awareness" },
        { "behavior": "Challenges the client as a way to evoke awareness or insight", "competency": "Evokes Awareness" },
        { "behavior": "Asks questions about the client, such as their way of thinking, values, needs, wants and beliefs", "competency": "Evokes Awareness" },
        { "behavior": "Asks questions that help the client explore beyond current thinking", "competency": "Evokes Awareness" },
        { "behavior": "Invites the client to share more about their experience in the moment", "competency": "Evokes Awareness" },
        { "behavior": "Notices what is working to enhance client progress", "competency": "Evokes Awareness" },
        { "behavior": "Adjusts the coaching approach in response to the client;s needs", "competency": "Evokes Awareness" },
        { "behavior": "Helps the client identify factors that influence current and future patterns of behavior, thinking or emotion", "competency": "Evokes Awareness" },
        { "behavior": "Invites the client to generate ideas about how they can move forward and what they are willing or able to do", "competency": "Evokes Awareness" },
        { "behavior": "Supports the client in reframing perspectives", "competency": "Evokes Awareness" },
        { "behavior": "Shares observations, knowledge, and feelings, without attachment, that have the potential to create new insights for the client", "competency": "Evokes Awareness" },
        { "behavior": "Works with the client to integrate new awareness, insight or learning into their worldview and behaviors", "competency": "Facilitates Client Growth" },
        { "behavior": "Partners with the client to design goals, actions and accountability measures that integrate and expand new learning", "competency": "Facilitates Client Growth" },
        { "behavior": "Acknowledges and supports client autonomy in the design of goals, actions and methods of accountability", "competency": "Facilitates Client Growth" },
        { "behavior": "Supports the client in identifying potential results or learning from identified action steps", "competency": "Facilitates Client Growth" },
        { "behavior": "Invites the client to consider how to move forward, including resources, support and potential barriers", "competency": "Facilitates Client Growth" },
        { "behavior": "Partners with the client to summarize learning and insight within or between sessions", "competency": "Facilitates Client Growth" },
        { "behavior": "Partners with the client to integrate learning and sustain progress throughout the coaching agreement", "competency": "Facilitates Client Growth" },
        { "behavior": "Acknowledges the client’s progress and successes", "competency": "Facilitates Client Growth" },
        { "behavior": "Partners with the client to close the session", "competency": "Facilitates Client Growth" }
];
const competencies = [
    "Demonstrates Ethical Practice", "Embodies a Coaching Mindset", "Establishes and Maintains Agreements", "Cultivates Trust and Safety",
    "Maintains Presence", "Listens Actively", "Evokes Awareness", "Facilitates Client Growth"
];
// --- END DATA ---


const QuizComponent = ({ setView }) => {
    const [quizState, setQuizState] = useState('intro'); // intro, selectLength, selectCompetency, active, results
    const [quizMode, setQuizMode] = useState('general'); // 'general' or 'competency'
    const [currentCompetency, setCurrentCompetency] = useState(null); // Stores name for competency quiz
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [selectionStatus, setSelectionStatus] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState(null); // --- NEW STATE ---
    const [score, setScore] = useState(0);
    const [competencyAnalysis, setCompetencyAnalysis] = useState({});
    const resultsRef = useRef(null);


    const shuffleArray = (array) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    };

    // --- 'startQuiz' remains unchanged ---
    const startQuiz = (numQuestions) => {
        setQuizMode('general');
        setCurrentCompetency(null);
        
        const shuffledBehaviors = shuffleArray([...behaviorsData]);
        const selectedBehaviors = shuffledBehaviors.slice(0, numQuestions);

        const generatedQuestions = selectedBehaviors.map(item => {
            const correctAnswer = item.competency;
            const otherOptions = shuffleArray(competencies.filter(c => c !== correctAnswer)).slice(0, 3);
            const options = shuffleArray([correctAnswer, ...otherOptions]);
            return { text: item.behavior, options, correctAnswer };
        });
        
        setQuestions(generatedQuestions);
        resetQuizState();
    };

    // --- 'startCompetencyQuiz' remains unchanged ---
    const startCompetencyQuiz = (competencyName) => {
        setQuizMode('competency');
        setCurrentCompetency(competencyName);

        const correctBehaviors = behaviorsData.filter(b => b.competency === competencyName);
        const wrongBehaviors = behaviorsData.filter(b => b.competency !== competencyName);

        const generatedQuestions = correctBehaviors.map(correctBehavior => {
            const text = `Which of the following behaviors best demonstrates **${competencyName}**?`;
            const correctAnswer = correctBehavior.behavior;
            const shuffledWrongs = shuffleArray(wrongBehaviors).slice(0, 3);
            const wrongOptions = shuffledWrongs.map(b => b.behavior);
            const options = shuffleArray([correctAnswer, ...wrongOptions]);
            
            return { text, options, correctAnswer };
        });

        setQuestions(shuffleArray(generatedQuestions));
        resetQuizState();
    };

    // --- UPDATED: Clears feedback message ---
    const resetQuizState = () => {
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setScore(0);
        setSelectionStatus(null);
        setFeedbackMessage(null); // --- ADDED ---
        setQuizState('active');
    };

     // --- UPDATED: Adds feedback logic ---
     const handleAnswerSelect = (questionIndex, selectedAnswer) => {
        if (selectionStatus) return;

        setUserAnswers({ ...userAnswers, [questionIndex]: selectedAnswer });
        const isCorrect = selectedAnswer === questions[questionIndex].correctAnswer;
        if (isCorrect) {
            setSelectionStatus('correct');
            setScore(prevScore => prevScore + 1);
        } else {
            setSelectionStatus('incorrect');
        }

        // --- NEW FEEDBACK LOGIC ---
        if (quizMode === 'competency') {
            if (isCorrect) {
                setFeedbackMessage(
                <span className="text-emerald-700">
                    <strong>Correct!</strong> That behavior is a great example of <strong>{currentCompetency}</strong>.
                </span>
                );
            } else {
                // Find the competency of the wrong answer
                const wrongBehaviorData = behaviorsData.find(b => b.behavior === selectedAnswer);
                const correctCompetencyForWrongAnswer = wrongBehaviorData 
                ? wrongBehaviorData.competency 
                : "a different competency";
                
                setFeedbackMessage(
                <span className="text-rose-700">
                    Not quite. That behavior actually demonstrates <strong>{correctCompetencyForWrongAnswer}</strong>.
                </span>
                );
            }
        } else if (quizMode === 'general') { // Added feedback for general quiz
            if (isCorrect) {
                setFeedbackMessage(
                <span className="text-emerald-700">
                    <strong>Correct!</strong>
                </span>
                );
            } else {
                const correctAnswer = questions[questionIndex].correctAnswer;
                setFeedbackMessage(
                <span className="text-rose-700">
                    The correct competency is <strong>{correctAnswer}</strong>.
                </span>
                );
            }
        }
        // --- END NEW FEEDBACK LOGIC ---
    };

    // --- UPDATED: Clears feedback message ---
    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectionStatus(null);
            setFeedbackMessage(null); // --- ADDED ---
        } else {
            handleSubmitQuiz();
        }
    };

    // --- 'handleSubmitQuiz' remains unchanged ---
     const handleSubmitQuiz = () => {
        let finalScore = 0;
        const analysis = {};
        competencies.forEach(c => { analysis[c] = { correct: 0, total: 0 }; });

        if (quizMode === 'general') {
            questions.forEach((q, index) => {
                const isCorrect = userAnswers[index] === q.correctAnswer;
                analysis[q.correctAnswer].total += 1; 
                if (isCorrect) {
                    finalScore++;
                    analysis[q.correctAnswer].correct += 1;
                }
            });
        } else { // quizMode === 'competency'
            questions.forEach((q, index) => {
                const isCorrect = userAnswers[index] === q.correctAnswer;
                analysis[currentCompetency].total += 1; 
                if (isCorrect) {
                    finalScore++;
                    analysis[currentCompetency].correct += 1;
                }
            });
        }

        setScore(finalScore);
        setCompetencyAnalysis(analysis);
        setQuizState('results');
    };

    // --- 'handleDownloadPdf' remains unchanged ---
    const handleDownloadPdf = async () => {
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
        const { default: jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');

        if (resultsRef.current) {
            const canvas = await html2canvas(resultsRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = canvas.height * pdfWidth / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            pdf.save('quiz-results.pdf');
        }
    };

    // --- 'intro' state remains unchanged ---
    if (quizState === 'intro') {
        return (
            <Card className="max-w-2xl mx-auto text-center">
                <IconWrapper><BookOpenCheck className="w-10 h-10" /></IconWrapper>
                <h1 className="text-3xl font-bold mt-4">ICF Competency Quiz</h1>
                <p className="mt-4 mb-8">Match behaviors to ICF Core Competencies (Updated 2025).</p>
                <div className="flex flex-col gap-4">
                    <Button onClick={() => setQuizState('selectLength')}>
                        General Competency Quiz
                    </Button>
                    <Button onClick={() => setQuizState('selectCompetency')} variant="secondary">
                        Competency-Specific Quiz
                    </Button>
                    <Button onClick={() => setView('home')} variant="secondary">
                        Back to Home
                    </Button>
                </div>
            </Card>
        );
     }

    // --- 'selectLength' state remains unchanged ---
     if (quizState === 'selectLength') {
        return (
            <Card className="max-w-2xl mx-auto text-center">
                <IconWrapper><BookOpenCheck className="w-10 h-10" /></IconWrapper>
                <h1 className="text-3xl font-bold mt-4">General Quiz</h1>
                <p className="mt-4 mb-8">How many questions would you like?</p>
                <div className="flex flex-col gap-4">
                    <Button onClick={() => startQuiz(20)}>
                        20 Questions (Quick)
                    </Button>
                    <Button onClick={() => startQuiz(40)} variant="secondary">
                        40 Questions (Standard)
                    </Button>
                    <Button onClick={() => startQuiz(behaviorsData.length)} variant="secondary">
                        All {behaviorsData.length} Questions (Full)
                    </Button>
                    <Button onClick={() => setQuizState('intro')} variant="secondary">
                        Back
                    </Button>
                </div>
            </Card>
        );
     }

    // --- 'selectCompetency' state remains unchanged ---
     if (quizState === 'selectCompetency') {
        return (
            <Card className="max-w-2xl mx-auto">
                <IconWrapper><BookOpenCheck className="w-10 h-10" /></IconWrapper>
                <h1 className="text-3xl font-bold mt-4">Competency-Specific Quiz</h1>
                <p className="mt-4 mb-8">Which competency would you like to practice?</p>
                <div className="flex flex-col gap-3">
                    {competencies.map(comp => (
                        <Button 
                            key={comp} 
                            onClick={() => startCompetencyQuiz(comp)} 
                            variant="secondary" 
                            className="text-left justify-start"
                        >
                            {comp}
                        </Button>
                    ))}
                    <Button onClick={() => setQuizState('intro')} variant="secondary" className="mt-4">
                        Back
                    </Button>
                </div>
            </Card>
        );
     }

    // --- 'results' state remains unchanged ---
    if (quizState === 'results') {
         return (
            <div className="max-w-4xl mx-auto">
                <Card>
                    <div ref={resultsRef} className="p-8">
                        <h1 className="text-3xl font-bold text-center mb-4">Quiz Results</h1>
                        <p className="text-xl text-center mb-8">Score: <span className="font-bold">{score} / {questions.length}</span></p>
                        <h2 className="text-2xl font-bold mb-4 border-b pb-2">Analysis by Competency</h2>
                        <div className="space-y-4">
                            {Object.entries(competencyAnalysis).map(([competency, data]) => {
                                // Only show competencies that were in this quiz
                                if (data.total === 0) return null; 
                                const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                                return ( <div key={competency}> <div className="flex justify-between items-center mb-1"> <span>{competency}</span> <span>{data.correct} / {data.total}</span> </div> <div className="w-full bg-slate-200 rounded-full h-4"> <div className="bg-stone-600 h-4 rounded-full text-xs text-white flex items-center justify-center" style={{ width: `${percentage}%` }}> {percentage > 10 ? `${percentage}%` : ''} </div> </div> </div> );
                            })}
                        </div>
                    </div>
                     <div className="mt-8 flex justify-center gap-4">
                        <Button onClick={() => setQuizState('intro')}>Back to Quiz Home</Button>
                        <Button onClick={handleDownloadPdf} variant="secondary">Download</Button>
                        <Button onClick={() => setView('home')} variant="secondary">Back to Home</Button>
                    </div>
                </Card>
            </div>
        );
    }

    // --- 'active' state MODIFIED to show feedback ---
    const currentQuestion = questions[currentQuestionIndex];
    const completedQuestions = selectionStatus ? currentQuestionIndex + 1 : currentQuestionIndex;
    
    return (
        <Card className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-2">
                <p>Q {currentQuestionIndex + 1} of {questions.length}</p>
                <p>Score: {score} / {completedQuestions}</p>
            </div>
            
            <p className="text-lg font-semibold mb-6" dangerouslySetInnerHTML={{ __html: currentQuestion.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />

            <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, index) => {
                    let buttonClass = 'bg-white hover:bg-stone-100';
                    if (selectionStatus) {
                        const isCorrect = option === currentQuestion.correctAnswer;
                        const isSelected = userAnswers[currentQuestionIndex] === option;
                        if(isCorrect) buttonClass = 'bg-emerald-100 border-emerald-500';
                        else if (isSelected && !isCorrect) buttonClass = 'bg-rose-100 border-rose-500';
                        else buttonClass = 'bg-slate-50 text-slate-500';
                    }
                    return ( 
                        <button 
                            key={index}
                            onClick={() => handleAnswerSelect(currentQuestionIndex, option)} 
                            disabled={!!selectionStatus} 
                            className={`p-4 rounded-lg border-2 text-left transition ${buttonClass}`}
                        > 
                            {option} 
                        </button> 
                    );
                })}
            </div>

            {/* --- NEW FEEDBACK BLOCK --- */}
            <div className="mt-6 min-h-[3em] flex items-center justify-center">
              {selectionStatus && feedbackMessage && (
                <div className="p-4 rounded-lg bg-slate-50 w-full text-center text-lg">
                  {feedbackMessage}
                </div>
              )}
            </div>
            {/* --- END FEEDBACK BLOCK --- */}

            <div className="mt-4 flex justify-between items-center">
                 <Button onClick={handleSubmitQuiz} variant="secondary" className="text-rose-600 hover:bg-rose-100">
                    <XCircle className="w-5 h-5" /> End Quiz
                </Button>
                <div className="text-right"> 
                    {selectionStatus && ( 
                        <Button onClick={handleNextQuestion}> 
                            {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Submit'} 
                        </Button> 
                    )} 
                </div>
            </div>
        </Card>
    );
};

export default QuizComponent;