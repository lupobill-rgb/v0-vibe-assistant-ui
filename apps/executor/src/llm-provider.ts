import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMProvider {
  readonly name: string;
  generate(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string>;
}

class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(model?: string) {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = model || 'gpt-4-turbo-preview';
  }

  async generate(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content || '';
  }
}

class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(model?: string) {
    this.client = new Anthropic();
    this.model = model || 'claude-sonnet-4-5-20250929';
  }

  async generate(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');
  }
}

class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private model: string;

  constructor(model?: string) {
    this.model = model || 'gemini-pro';
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    let mod: any;
    try {
      mod = require('@google/generative-ai');
    } catch {
      throw new Error(
        'Gemini provider requires @google/generative-ai package. Run: npm install @google/generative-ai'
      );
    }
    const genAI = new mod.GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
    return result.response.text();
  }
}

export function createLLMProvider(provider?: string, model?: string): LLMProvider {
  const p = provider || process.env.LLM_PROVIDER || 'openai';
  switch (p) {
    case 'anthropic':
    case 'claude':
      return new AnthropicProvider(model);
    case 'gemini':
    case 'google':
      return new GeminiProvider(model);
    case 'openai':
    default:
      return new OpenAIProvider(model);
  }
}
