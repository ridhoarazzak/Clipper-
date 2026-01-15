import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Youtube, 
  Link as LinkIcon, 
  Play, 
  Hash, 
  Award, 
  TrendingUp, 
  Scissors,
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Key
} from 'lucide-react';

// --- TYPES ---

export interface SuggestedClip {
  title: string;
  startTime: string; // "MM:SS" format
  endTime: string; // "MM:SS" format
  description: string;
  viralScore: number; // 1-10
  hashtags: string[];
}

export interface VideoAnalysis {
  videoTitle: string;
  summary: string;
  category: string;
  suggestedClips: SuggestedClip[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export type VideoSource = 
  | { type: 'file'; file: File }
  | { type: 'youtube'; url: string; id: string };

// --- SERVICE (Gemini) ---

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    videoTitle: { type: Type.STRING },
    summary: { type: Type.STRING },
    category: { type: Type.STRING },
    suggestedClips: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          startTime: { type: Type.STRING },
          endTime: { type: Type.STRING },
          description: { type: Type.STRING },
          viralScore: { type: Type.NUMBER, description: "Score from 1 to 10" },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "startTime", "endTime", "description", "viralScore", "hashtags"]
      }
    }
  },
  required: ["videoTitle", "summary", "category", "suggestedClips"]
};

// Dynamic service functions that accept the apiKey
const analyzeVideoContent = async (file: File, apiKey: string): Promise<VideoAnalysis> => {
  const ai = new GoogleGenAI({ apiKey });
  const videoPart = await fileToGenerativePart(file);

  const prompt = `
    You are an expert video editor and social media strategist. 
    Analyze the provided video. 
    1. Give it a catchy title.
    2. Write a detailed and engaging description/summary of the video content.
    3. Categorize the video.
    4. Identify exactly 10 of the most important and engaging "clips" or key moments.
    For each clip, provide a timestamp range (start and end in MM:SS format), a detailed description of why it matters, and relevant hashtags.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-latest', 
    contents: {
      parts: [videoPart, { text: prompt }]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: ANALYSIS_SCHEMA
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as VideoAnalysis;
};

const analyzeYouTubeVideo = async (url: string, apiKey: string): Promise<VideoAnalysis> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    You are an expert video editor. I want you to analyze this YouTube video: ${url}
    
    Since you cannot watch the video directly, use the Google Search tool to find its transcript, description, reviews, or summaries to understand its content.
    Based on the information you find:
    1. Provide the actual or a catchy title.
    2. Write a detailed description/summary of what happens in the video.
    3. Categorize it.
    4. Suggest exactly 10 viral clips or important key points. Estimate timestamps (MM:SS) based on the typical flow of such videos or specific mentioned moments in your search results.
    
    Return the result strictly in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-latest',
    contents: { text: prompt },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: ANALYSIS_SCHEMA
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as VideoAnalysis;
};

const chatWithVideo = async (source: VideoSource, history: {role: string, parts: {text: string}[]}[], message: string, apiKey: string) => {
    const ai = new GoogleGenAI({ apiKey });
    let parts: any[] = [];
    
    if (source.type === 'file') {
        const videoPart = await fileToGenerativePart(source.file);
        parts.push(videoPart);
        parts.push({ text: `Context history: ${JSON.stringify(history)}. User question: ${message}` });
    } else {
        parts.push({ text: `The user is asking about a YouTube video they linked previously (${source.url}). Use your previous knowledge or search tools if needed. Context history: ${JSON.stringify(history)}. User question: ${message}` });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: { parts },
        config: {
            tools: source.type === 'youtube' ? [{ googleSearch: {} }] : undefined
        }
    });

    return response.text || "I couldn't generate a response.";
};

// --- COMPONENTS ---

// 1. API KEY MODAL
interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [inputKey, setInputKey] = useState('');

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
             <Key className="text-white" size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-white mb-2">Enter Gemini API Key</h2>
        <p className="text-slate-400 text-center text-sm mb-8">
          To use ClipGenius, you need a free API key from Google. 
          <br/>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">
            Get your key here
          </a>
        </p>

        <form onSubmit={(e) => { e.preventDefault(); if(inputKey) onSave(inputKey); }}>
          <input 
            type="password" 
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIzaSy..." 
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors mb-4"
          />
          <button 
            type="submit"
            disabled={!inputKey}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start App
          </button>
        </form>
      </div>
    </div>
  );
};


// 2. HERO
interface HeroProps {
  onFileSelect: (file: File) => void;
  onYoutubeSubmit: (url: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onFileSelect, onYoutubeSubmit }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (activeTab === 'upload' && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      } else {
        alert("Please upload a video file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl.trim()) {
      onYoutubeSubmit(youtubeUrl);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="mb-8 relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative px-7 py-4 bg-slate-900 ring-1 ring-slate-800 rounded-lg leading-none flex items-top justify-start space-x-6">
          <span className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-purple-500">
            ClipGenius AI
          </span>
        </div>
      </div>
      
      <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12">
        Transform videos into viral social media clips in seconds. 
        Powered by Google Gemini 2.5 Flash.
      </p>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 bg-slate-800/50 p-1 rounded-full border border-slate-700">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'upload' 
              ? 'bg-slate-700 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Upload size={16} /> Upload Video
          </div>
        </button>
        <button
          onClick={() => setActiveTab('youtube')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'youtube' 
              ? 'bg-red-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Youtube size={16} /> YouTube Link
          </div>
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div 
          className="w-full max-w-xl p-8 border-2 border-dashed border-slate-700 rounded-2xl hover:border-red-500 transition-colors cursor-pointer bg-slate-800/50 backdrop-blur-sm"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <div className="flex flex-col items-center">
            <div className="p-4 bg-slate-800 rounded-full mb-4 text-red-500">
              <Upload size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Drop your video here</h3>
            <p className="text-slate-400 text-sm mb-4">MP4, WebM, MOV (Max 50MB for demo)</p>
            <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-all">
              Browse Files
            </button>
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept="video/*" 
              onChange={handleFileChange}
            />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xl p-8 border border-slate-700 rounded-2xl bg-slate-800/50 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-slate-800 rounded-full mb-4 text-red-500">
              <LinkIcon size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-6">Paste YouTube URL</h3>
            <form onSubmit={handleUrlSubmit} className="w-full flex gap-2">
              <input 
                type="text" 
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..." 
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              />
              <button 
                type="submit"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
              >
                Analyze
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. VIDEO PLAYER
interface VideoPlayerProps {
  source: VideoSource;
}

export interface VideoPlayerRef {
  seekTo: (time: number) => void;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ source }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    seekTo: (timeInSeconds: number) => {
      if (source.type === 'file' && videoRef.current) {
        videoRef.current.currentTime = timeInSeconds;
        videoRef.current.play();
      } else if (source.type === 'youtube' && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [timeInSeconds, true]
          }), 
          '*'
        );
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: []
          }), 
          '*'
        );
      }
    }
  }));

  if (source.type === 'youtube') {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-800">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${source.id}?enablejsapi=1&autoplay=0&rel=0`}
          title="YouTube video player"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  const url = React.useMemo(() => URL.createObjectURL(source.file), [source.file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-800">
      <video
        ref={videoRef}
        src={url}
        controls
        className="w-full h-auto max-h-[60vh]"
      />
    </div>
  );
});
VideoPlayer.displayName = 'VideoPlayer';

// 4. ANALYSIS DASHBOARD
interface DashboardProps {
  analysis: VideoAnalysis;
  onSeek: (time: string) => void;
}

const AnalysisDashboard: React.FC<DashboardProps> = ({ analysis, onSeek }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-white">{analysis.videoTitle}</h1>
          <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-full uppercase tracking-wider w-fit">
            {analysis.category}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Video Description</h3>
        <p className="text-slate-300 leading-relaxed">{analysis.summary}</p>
      </div>

      <h2 className="text-xl font-bold flex items-center gap-2 mt-8 mb-4">
        <TrendingUp className="text-red-500" /> 10 Key Highlights
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {analysis.suggestedClips.map((clip, index) => (
          <div 
            key={index}
            className="bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-red-500/50 transition-all hover:shadow-lg group"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg text-white group-hover:text-red-400 transition-colors">
                {index + 1}. {clip.title}
              </h3>
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded text-xs text-yellow-500 font-mono">
                <Award size={12} /> {clip.viralScore}/10
              </div>
            </div>
            
            <p className="text-sm text-slate-400 mb-4">{clip.description}</p>
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-300 font-mono bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
                <Scissors size={14} className="text-slate-500" />
                <span className="text-red-400">{clip.startTime}</span> 
                <span className="text-slate-600">-</span> 
                <span className="text-red-400">{clip.endTime}</span>
              </div>
              
              <button 
                onClick={() => onSeek(clip.startTime)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Play size={16} fill="currentColor" /> Preview Clip
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {clip.hashtags.map((tag, i) => (
                <span key={i} className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer flex items-center">
                  <Hash size={10} className="mr-0.5" />{tag.replace('#', '')}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 5. CHATBOT
interface ChatBotProps {
  source: VideoSource | null;
  apiKey: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ source, apiKey }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'I have analyzed the video. Ask me anything about specific details, timestamps, or content ideas!' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !source) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await chatWithVideo(source, history, userMsg, apiKey);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error responding to that.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center gap-2">
        <Bot className="text-purple-500" size={20} />
        <h3 className="font-semibold text-white">AI Assistant</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-red-600' : 'bg-purple-600'}`}>
              {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${m.role === 'user' ? 'bg-red-600/20 text-red-100 border border-red-500/30' : 'bg-slate-700 text-slate-200'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm ml-11">
            <Loader2 className="animate-spin" size={14} /> Thinking...
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={source ? "Ask about the video..." : "Upload a video to start chat"}
            disabled={!source}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !source}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- APP ---

const App: React.FC = () => {
  // Initialize with env key or empty
  const [apiKey, setApiKey] = useState<string>(() => {
    const envKey = process.env.API_KEY;
    if (envKey && envKey !== 'YOUR_API_KEY_HERE') {
      return envKey;
    }
    return '';
  });

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
      const result = await analyzeVideoContent(selectedFile, apiKey);
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
      const result = await analyzeYouTubeVideo(url, apiKey);
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

  // If no API Key is set, show the Key Entry Modal
  if (!apiKey) {
    return <ApiKeyModal onSave={setApiKey} />;
  }

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
                 <ChatBot source={videoSource} apiKey={apiKey} /> 
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

// --- MOUNT ---
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}