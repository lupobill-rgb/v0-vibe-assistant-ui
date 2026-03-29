import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface LLMResponse {
  text: string;
  usage: LLMUsage;
}

export interface LLMProvider {
  readonly name: string;
  generate(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<LLMResponse>;
}

class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(model?: string) {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = model || 'gpt-4-turbo-preview';
  }

  async generate(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      max_tokens: maxTokens,
    });
    
    const text = response.choices[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    return {
      text,
      usage: {
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      },
    };
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

  async generate(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');
    
    return {
      text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }
}

class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private model: string;

  constructor(model?: string) {
    this.model = model || 'gemini-2.0-flash';
  }

  async generate(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<LLMResponse> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY environment variable is not set');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

    return {
      text,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      },
    };
  }
}

class FireworksProvider implements LLMProvider {
  readonly name = 'fireworks';
  private model: string;

  constructor(model?: string) {
    this.model = model || 'accounts/fireworks/models/deepseek-v3';
  }

  async generate(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<LLMResponse> {
    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) throw new Error('FIREWORKS_API_KEY environment variable is not set');

    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fireworks API error (${response.status}): ${errText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      text,
      usage: {
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      },
    };
  }
}

/**
 * LiteLLM Proxy provider — routes through the LiteLLM sidecar service.
 * This is the recommended provider when LiteLLM is deployed on Railway.
 * It handles multi-provider failover transparently.
 */
class LiteLLMProvider implements LLMProvider {
  readonly name = 'litellm';
  private model: string;
  private proxyUrl: string;

  constructor(model?: string) {
    this.model = model || 'vibe-builder';
    this.proxyUrl = process.env.LITELLM_PROXY_URL || 'http://localhost:4000';
  }

  async generate(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<LLMResponse> {
    const response = await fetch(`${this.proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LiteLLM proxy error (${response.status}): ${errText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      text,
      usage: {
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      },
    };
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
    case 'fireworks':
    case 'deepseek':
      return new FireworksProvider(model);
    case 'litellm':
      return new LiteLLMProvider(model);
    case 'openai':
    default:
      return new OpenAIProvider(model);
  }
}
