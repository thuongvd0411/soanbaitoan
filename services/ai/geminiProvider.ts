// services/ai/geminiProvider.ts — Gemini AI Provider cho Investment

import { AIProvider, ChatMessage } from './aiProvider';

export class GeminiProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

    // Convert ChatMessage[] to Gemini format
    const contents: any[] = [];

    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: `[SYSTEM INSTRUCTION]: ${systemPrompt}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Đã hiểu. Tôi sẽ tuân thủ chính xác.' }] });
    }

    for (const msg of messages) {
      if (msg.role === 'system') continue; // Đã xử lý ở trên
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi từ AI.';
  }
}
