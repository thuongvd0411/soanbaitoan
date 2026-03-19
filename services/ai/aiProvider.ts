// services/ai/aiProvider.ts — Interface cho hệ thống AI đa model

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProvider {
  sendMessage(messages: ChatMessage[], systemPrompt?: string): Promise<string>;
}

export type AIModelType = 'gemini' | 'gpt' | 'gpt-nano' | 'openclaw';
