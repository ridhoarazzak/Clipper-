import React, { useState, useRef } from 'react';
import { Hero } from './components/Hero.tsx';
import { VideoPlayer, VideoPlayerRef } from './components/VideoPlayer.tsx';
import { AnalysisDashboard } from './components/AnalysisDashboard.tsx';
import { ChatBot } from './components/ChatBot.tsx';
import { analyzeVideoContent, analyzeYouTubeVideo } from './services/geminiService.ts';
import { VideoAnalysis, AppState, VideoSource } from './types.ts';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null);
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const playerRef = useRef<VideoPlayerRef>(null);

  const handleFileSelect = async (file: File) => {
    setVideoSource({ type: 'file', file });
    setState(AppState.ANALYZING);
    setErrorMsg('');

    try {
      const result = await analyzeVideoContent(file);
      setAnalysis(result);
      setState(AppState.READY);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze video. Please try again.");
      setState(AppState.ERROR);
    }
  };

  const handleYoutubeSubmit = async (url: string) => {
    // Extract ID
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[2].length === 11) ? match[2] : null;

    if (!id) {
      setErrorMsg("Invalid YouTube URL");
      return;
    }

    setVideoSource({ type: 'youtube', url, id });
    setState(AppState.ANALYZING);
    setErrorMsg('');

    try {
      const result = await analyzeYouTubeVideo(url);
      setAnalysis(result);
      setState(AppState.READY);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze YouTube video. Gemini might not be able to access this specific video's transcripts.");
      setState(AppState.ERROR);
    }
  };

  const handleSeek = (timeStr: string) => {
    const [min, sec] = timeStr.split(':').map(Number);
    const timeInSeconds = min * 60 + sec;
    playerRef.current?.seekTo(timeInSeconds);
  };

  const handleReset = () => {
    setVideoSource(null);
    setAnalysis(null);
    setState(AppState.IDLE);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">
              CG
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">ClipGenius AI</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {state === AppState.IDLE && (
          <Hero onFileSelect={handleFileSelect} onYoutubeSubmit={handleYoutubeSubmit} />
        )}

        {state === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
              <Loader2 size={64} className="text-red-500 animate-spin relative z-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Analyzing Content...</h2>
              <p className="text-slate-400 max-w-md mx-auto">
                Gemini is watching your video, extracting transcripts, and identifying the most viral moments. This may take a minute.
              </p>
            </div>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
              <AlertCircle size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
              <p className="text-red-400 max-w-md mx-auto mb-6">{errorMsg}</p>
              <button 
                onClick={handleReset}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          </div>
        )}

        {state === AppState.READY && videoSource && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Player & Chat */}
            <div className="lg:col-span-2 space-y-6">
              <VideoPlayer ref={playerRef} source={videoSource} />
              <div className="hidden lg:block">
                 <ChatBot source={videoSource} />
              </div>
            </div>

            {/* Right Column: Analysis & Clips */}
            <div className="space-y-6">
              <AnalysisDashboard analysis={analysis} onSeek={handleSeek} />
              <div className="lg:hidden">
                <ChatBot source={videoSource} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;