import React, { useState, useRef } from 'react';
import { Hero } from './components/Hero';
import { VideoPlayer, VideoPlayerRef } from './components/VideoPlayer';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { ChatBot } from './components/ChatBot';
import { analyzeVideoContent, analyzeYouTubeVideo } from './services/geminiService';
import { VideoAnalysis, AppState, VideoSource } from './types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null);
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const playerRef = useRef<VideoPlayerRef>(null);

  const extractYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleFileSelect = async (selectedFile: File) => {
    setVideoSource({ type: 'file', file: selectedFile });
    setState(AppState.ANALYZING);
    setErrorMsg('');

    try {
      const result = await analyzeVideoContent(selectedFile);
      setAnalysis(result);
      setState(AppState.READY);
    } catch (err) {
      console.error(err);
      setState(AppState.ERROR);
      setErrorMsg("Failed to analyze video. Ensure the file is not too large (>20MB) and your API key is valid.");
    }
  };

  const handleYoutubeSubmit = async (url: string) => {
    const id = extractYoutubeId(url);
    if (!id) {
      alert("Invalid YouTube URL");
      return;
    }

    setVideoSource({ type: 'youtube', url, id });
    setState(AppState.ANALYZING);
    setErrorMsg('');

    try {
      const result = await analyzeYouTubeVideo(url);
      setAnalysis(result);
      setState(AppState.READY);
    } catch (err) {
      console.error(err);
      setState(AppState.ERROR);
      setErrorMsg("Failed to analyze YouTube video. The AI might not have found sufficient data via search.");
    }
  };

  const handleSeek = (timeStr: string) => {
    if (playerRef.current) {
      const [minutes, seconds] = timeStr.split(':').map(Number);
      const timeInSeconds = minutes * 60 + seconds;
      playerRef.current.seekTo(timeInSeconds);
    }
  };

  const handleReset = () => {
    setVideoSource(null);
    setAnalysis(null);
    setState(AppState.IDLE);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-purple-600 rounded-lg flex items-center justify-center">
               <span className="font-bold text-white text-lg">C</span>
            </div>
            <span className="font-bold text-xl hidden sm:block">ClipGenius AI</span>
          </div>
          <div className="flex gap-4">
             {state === AppState.READY && (
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw size={16} /> New Analysis
                </button>
             )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {state === AppState.IDLE && (
          <Hero onFileSelect={handleFileSelect} onYoutubeSubmit={handleYoutubeSubmit} />
        )}

        {state === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 className="animate-spin text-red-500 mb-4" size={48} />
            <h2 className="text-2xl font-bold mb-2">Analyzing Video Content</h2>
            <p className="text-slate-400 max-w-md text-center">
              Gemini is processing the content to extract highlights. This usually takes about 30-60 seconds.
            </p>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center h-[60vh]">
             <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl flex flex-col items-center text-center max-w-lg">
                <AlertCircle className="text-red-500 mb-4" size={48} />
                <h3 className="text-xl font-bold text-red-400 mb-2">Analysis Failed</h3>
                <p className="text-slate-300 mb-6">{errorMsg}</p>
                <button 
                  onClick={handleReset}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors"
                >
                  Try Again
                </button>
             </div>
          </div>
        )}

        {state === AppState.READY && videoSource && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Player & Chat */}
            <div className="lg:col-span-7 space-y-6">
              <div className="sticky top-24 space-y-6">
                 <VideoPlayer source={videoSource} ref={playerRef} />
                 <ChatBot source={videoSource} /> 
              </div>
            </div>

            {/* Right Column: Analysis Results */}
            <div className="lg:col-span-5">
              <AnalysisDashboard analysis={analysis} onSeek={handleSeek} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;