// services/ai/openaiProvider.ts — OpenAI GPT-4.1 mini Provider

import { AIProvider, ChatMessage } from './aiProvider';

export class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    // Build OpenAI messages format
    const openaiMessages: { role: string; content: string }[] = [];

    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      openaiMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: openaiMessages,
        temperature: 0.2,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `GPT API Error ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.error?.message || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Không có phản hồi từ GPT.';
  }
}
