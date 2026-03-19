// services/ai/openclawProvider.ts — OpenClaw AI Provider (OpenAI Compatible)

import { AIProvider, ChatMessage } from './aiProvider';

export class OpenClawProvider implements AIProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'http://localhost:1337/v1', apiKey: string = 'open-claw-key') {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
  }

  async sendMessage(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const API_URL = `${this.baseUrl}/chat/completions`;

    // Build OpenAI-compatible messages format
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

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'openclaw', // Tên model có thể tùy biến nhưng mặc định là openclaw
          messages: openaiMessages,
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `OpenClaw API Error ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error?.message || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Không có phản hồi từ OpenClaw.';
    } catch (error: any) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Không thể kết nối tới OpenClaw. Anh hãy kiểm tra xem OpenClaw đã được bật tại ' + this.baseUrl + ' chưa nhé!');
      }
      throw error;
    }
  }
}
