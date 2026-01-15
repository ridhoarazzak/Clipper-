import { GoogleGenAI, Type } from "@google/genai";
import { VideoAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
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

export const analyzeVideoContent = async (file: File): Promise<VideoAnalysis> => {
  const videoPart = await fileToGenerativePart(file);

  const prompt = `
    You are an expert video editor and social media strategist. 
    Analyze the provided video. 
    1. Give it a catchy title.
    2. Write a concise summary.
    3. Categorize the video.
    4. Identify 3-5 of the most engaging "clips" suitable for YouTube Shorts, TikTok, or Instagram Reels.
    For each clip, provide a timestamp range (start and end in MM:SS format), a reason why it's viral, and relevant hashtags.
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

export const analyzeYouTubeVideo = async (url: string): Promise<VideoAnalysis> => {
  const prompt = `
    You are an expert video editor. I want you to analyze this YouTube video: ${url}
    
    Since you cannot watch the video directly, use the Google Search tool to find its transcript, description, reviews, or summaries to understand its content.
    Based on the information you find:
    1. Provide the actual or a catchy title.
    2. Write a summary of what happens.
    3. Categorize it.
    4. Suggest 3-5 viral clips. Estimate timestamps (MM:SS) based on the typical flow of such videos or specific mentioned moments in your search results.
    
    Return the result strictly in JSON format.
  `;

  // We use gemini-2.5-flash-latest as it supports search grounding well.
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

export const chatWithVideo = async (source: { type: 'file', file?: File, typeStr: string }, history: {role: string, parts: {text: string}[]}[], message: string) => {
    let parts: any[] = [];
    
    if (source.type === 'file' && source.file) {
        const videoPart = await fileToGenerativePart(source.file);
        parts.push(videoPart);
        parts.push({ text: `Context history: ${JSON.stringify(history)}. User question: ${message}` });
    } else {
        // YouTube Chat mode
        parts.push({ text: `The user is asking about a YouTube video they linked previously. Use your previous knowledge or search tools if needed. Context history: ${JSON.stringify(history)}. User question: ${message}` });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: { parts },
        config: {
            // Enable search for YouTube chat context if needed
            tools: source.typeStr === 'youtube' ? [{ googleSearch: {} }] : undefined
        }
    });

    return response.text || "I couldn't generate a response.";
};