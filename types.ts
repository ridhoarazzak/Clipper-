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
