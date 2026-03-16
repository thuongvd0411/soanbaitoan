// services/ai/aiRouter.ts — Route requests to correct AI provider

import { AIProvider, AIModelType, ChatMessage } from './aiProvider';
import { GeminiProvider } from './geminiProvider';
import { OpenAIProvider } from './openaiProvider';

export class AIRouter {
  private geminiProvider: AIProvider | null = null;
  private openaiProvider: AIProvider | null = null;

  setGeminiKey(key: string) {
    if (key) {
      this.geminiProvider = new GeminiProvider(key);
    }
  }

  setOpenAIKey(key: string) {
    if (key) {
      this.openaiProvider = new OpenAIProvider(key);
    }
  }

  async sendMessage(
    model: AIModelType,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<string> {
    if (model === 'gpt') {
      if (!this.openaiProvider) {
        throw new Error('Chưa nhập OpenAI API Key. Vui lòng nhập key trong phần Cấu hình.');
      }
      return this.openaiProvider.sendMessage(messages, systemPrompt);
    }

    // Default: Gemini
    if (!this.geminiProvider) {
      throw new Error('Chưa có Gemini API Key. Vui lòng kiểm tra cấu hình.');
    }
    return this.geminiProvider.sendMessage(messages, systemPrompt);
  }

  hasProvider(model: AIModelType): boolean {
    if (model === 'gpt') return !!this.openaiProvider;
    return !!this.geminiProvider;
  }
}

// Singleton instance
export const aiRouter = new AIRouter();
