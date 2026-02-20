'use client';

import { useState } from 'react';

export default function Home() {
  const [inputData, setInputData] = useState('');
  const [assessmentYear, setAssessmentYear] = useState('2025');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateAssessment = async () => {
    if (!inputData) return;
    setIsLoading(true);
    setOutput('');

    try {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetData: inputData,
          assessmentYear: assessmentYear
        }),
      });

      const data = await res.json();

      // We look specifically for the 'result' key we defined in the API route
      if (data.result) {
        setOutput(data.result);
      } else {
        setOutput(data.error || "The reasoning engine returned an empty result.");
      }
    } catch (error) {
      setOutput('Critical Connection Error: Ensure your local server is running and the API route is configured.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center font-sans">
      <div className="w-full max-w-4xl">
        {/* Header Section */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Facility Condition Assessor <span className="text-blue-600">2025</span>
          </h1>
          <p className="mt-2 text-slate-600">Professional Architectural Assessment Generator</p>
        </div>

        {/* Input Card */}
        <div className="bg-white shadow-xl rounded-xl p-6 border border-slate-200 mb-8">
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              System Name/Description String
            </label>
            <input
              type="text"
              className="w-full border-2 border-slate-200 rounded-lg p-4 text-lg text-slate-800 focus:border-blue-500 focus:ring-0 transition-all outline-none"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="e.g. Exterior Doors / 0 / 15 / 1987"
            />
            <p className="mt-2 text-xs text-slate-400 italic">
              Format: [System Name/Description] / [OYR] / [EUL] / [Install Year]
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Assessment Year
            </label>
            <input
              type="text"
              className="w-full border-2 border-slate-200 rounded-lg p-4 text-lg text-slate-800 focus:border-blue-500 focus:ring-0 transition-all outline-none"
              value={assessmentYear}
              onChange={(e) => setAssessmentYear(e.target.value)}
              placeholder="e.g. 2025"
            />
          </div>

          <button
            onClick={generateAssessment}
            disabled={isLoading || !inputData}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg shadow-blue-200"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Reasoning...
              </>
            ) : 'Generate Technical Report'}
          </button>
        </div>

        {/* Output Section */}
        {output && (
          <div className="bg-white shadow-2xl rounded-xl overflow-hidden border border-blue-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-800 px-6 py-3">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                Generated Assessment Output
              </h2>
            </div>
            <div className="p-8">
              <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                {output}
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-mono italic">Report Ref: 2025-FAC-AUTO</span>
              <button
                onClick={() => navigator.clipboard.writeText(output)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}