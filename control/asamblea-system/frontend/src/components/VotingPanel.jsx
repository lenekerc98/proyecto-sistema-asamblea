import { useState, useEffect } from 'react';
import ResultsChart from './ResultsChart';

export default function VotingPanel() {
    const [questions, setQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [results, setResults] = useState([]);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/voting/questions');
            const data = await res.json();
            setQuestions(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchResults = async (questionId) => {
        try {
            const res = await fetch(`http://localhost:3000/api/voting/questions/${questionId}/results`);
            const data = await res.json();
            setResults(data);
        } catch (err) {
            console.error(err);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await fetch(`http://localhost:3000/api/voting/questions/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            fetchQuestions();
        } catch (err) {
            console.error(err);
        }
    };

    const selectQuestion = (q) => {
        setSelectedQuestion(q);
        fetchResults(q.id);
    };

    return (
        <div className="p-4 bg-white shadow rounded-lg mt-4">
            <h2 className="text-xl font-bold mb-4">Voting Panel</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 className="font-semibold mb-2">Questions</h3>
                    <ul>
                        {questions.map(q => (
                            <li key={q.id} className={`p-2 border mb-2 rounded cursor-pointer ${selectedQuestion?.id === q.id ? 'bg-blue-50' : ''}`} onClick={() => selectQuestion(q)}>
                                <div className="flex justify-between items-center">
                                    <span>{q.text}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${q.status === 'OPEN' ? 'bg-green-200' : 'bg-gray-200'}`}>{q.status}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    {selectedQuestion && (
                        <div>
                            <h3 className="font-semibold mb-2">Manage Question</h3>
                            <p className="mb-4">{selectedQuestion.text}</p>
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => updateStatus(selectedQuestion.id, 'OPEN')} className="bg-green-500 text-white px-4 py-2 rounded">Open Voting</button>
                                <button onClick={() => updateStatus(selectedQuestion.id, 'CLOSED')} className="bg-red-500 text-white px-4 py-2 rounded">Close & Finalize</button>
                            </div>

                            <ResultsChart results={results} />
                            <button onClick={() => fetchResults(selectedQuestion.id)} className="mt-2 text-sm text-blue-500">Refresh Results</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
