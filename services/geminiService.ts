import { GoogleGenAI, Type } from "@google/genai";
import { VideoAnalysis, VideoSource } from "../types.ts";

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

// Helper to safely parse JSON that might be wrapped in markdown code blocks
const safeJsonParse = (text: string) => {
  try {
    const cleanedText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw new Error("Failed to parse AI response.");
  }
};

export const analyzeVideoContent = async (file: File): Promise<VideoAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    model: 'gemini-3-flash-preview', 
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
  
  return safeJsonParse(text) as VideoAnalysis;
};

export const analyzeYouTubeVideo = async (url: string): Promise<VideoAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    You are an expert video editor. Analyze this YouTube video: ${url}
    
    Use Google Search to find its transcript, description, reviews, or summaries.
    
    TASK:
    1. Provide a catchy title.
    2. Write a detailed summary.
    3. Categorize it.
    4. Suggest exactly 10 viral clips.
    
    CRITICAL INSTRUCTION:
    Since you cannot watch the video directly, if you cannot find exact timestamps, YOU MUST ESTIMATE THEM based on the typical flow of this type of content. 
    Do NOT return an error saying you can't find the video. Create the best possible analysis based on available metadata and your knowledge of the topic.
    
    Return the result strictly in valid JSON format matching the schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { text: prompt },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: ANALYSIS_SCHEMA
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return safeJsonParse(text) as VideoAnalysis;
};

export const chatWithVideo = async (source: VideoSource, history: {role: string, parts: {text: string}[]}[], message: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let parts: any[] = [];
    
    if (source.type === 'file') {
        const videoPart = await fileToGenerativePart(source.file);
        parts.push(videoPart);
        parts.push({ text: `Context history: ${JSON.stringify(history)}. User question: ${message}` });
    } else {
        // YouTube Chat mode
        parts.push({ text: `The user is asking about a YouTube video they linked previously (${source.url}). Use your previous knowledge or search tools if needed. Context history: ${JSON.stringify(history)}. User question: ${message}` });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
            // Enable search for YouTube chat context if needed
            tools: source.type === 'youtube' ? [{ googleSearch: {} }] : undefined
        }
    });

    return response.text || "I couldn't generate a response.";
};