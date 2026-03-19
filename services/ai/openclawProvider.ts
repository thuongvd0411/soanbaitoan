// services/ai/openclawProvider.ts — OpenClaw AI Provider (OpenAI Compatible)

import { AIProvider, ChatMessage } from './aiProvider';

export class OpenClawProvider implements AIProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'https://02d1964e9dd901e2-14-177-42-188.serveousercontent.com/v1', apiKey: string = '684555a8e838303994fccd60f654e6e71bd13c71c31f5c9c') {
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
        const isHttps = window.location.protocol === 'https:';
        const isLocalHost = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');
        
        if (isHttps && isLocalHost) {
          throw new Error('Lỗi bảo mật trình duyệt (Mixed Content): Trình duyệt không cho phép trang web HTTPS kết nối tới HTTP (localhost). Anh hãy chạy ứng dụng ở LOCAL (http://localhost:5173) hoặc dùng link HTTPS (Ngrok) cho OpenClaw nhé!');
        }
        throw new Error(`Không thể kết nối tới OpenClaw. Anh hãy kiểm tra xem OpenClaw đã được bật tại ${this.baseUrl} chưa, hoặc có lỗi CORS không nhé!`);
      }
      throw error;
    }
  }
}
