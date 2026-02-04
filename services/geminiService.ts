import api from './api';
import { AnalysisResult } from '../types';

export const analyzeResume = async (
  base64: string,
  mimeType: string,
  itemDescription: string
): Promise<AnalysisResult> => {
  try {
    const response = await api.post<AnalysisResult>('/ai/analyze', {
      resume_text: base64,
      job_description: itemDescription
    });
    return response.data;
  } catch (error) {
    console.error('Error analyzing resume:', error);
    throw error;
  }
};

export const generateExperienceContent = async (
  role: string,
  company: string,
  description: string
): Promise<string[]> => {
  try {
    const response = await api.post<string[]>('/ai/generate-bullets', {
      role,
      company,
      description
    });
    return response.data;
  } catch (error) {
    console.error('Error generating bullets:', error);
    return ["Error generating content. Please try again."];
  }
};

export const generateProfessionalSummary = async (
  role: string,
  skills: string[]
): Promise<string> => {
  try {
    const response = await api.post<{ summary: string }>('/ai/generate-summary', {
      role,
      skills
    });
    return response.data.summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    return "Error generating summary. Please try again.";
  }
};