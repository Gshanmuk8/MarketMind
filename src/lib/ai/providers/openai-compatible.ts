import type {
  AiProvider,
  AiProviderId,
  CompletionRequest,
  CompletionResponse,
} from "@/lib/ai/types";

/**
 * Base implementation for every provider that speaks the OpenAI
 * chat-completions dialect. OpenRouter, OpenAI, Groq, Cerebras, DeepSeek,
 * Gemini (openai/ endpoint) and Anthropic (compat endpoint) all qualify —
 * one implementation, seven providers.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  constructor(
    public readonly id: AiProviderId,
    private readonly baseUrl: string,
    private readonly apiKey: string | undefined,
    private readonly extraHeaders: Record<string, string> = {}
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.extraHeaders,
    };
  }

  private body(req: CompletionRequest, model: string, stream: boolean) {
    return JSON.stringify({
      model,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
      // Never let a gateway default to the model's maximum — that inflates
      // cost estimates and 402s low-credit accounts. Callers raise as needed.
      max_tokens: req.maxTokens ?? 4096,
      ...(req.json ? { response_format: { type: "json_object" } } : {}),
      stream,
    });
  }

  async complete(req: CompletionRequest, model: string): Promise<CompletionResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      // A hung gateway must reject so the fallback chain can engage.
      signal: AbortSignal.timeout(90_000),
      body: this.body(req, model, false),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`[ai:${this.id}] ${res.status} ${res.statusText} — ${detail.slice(0, 500)}`);
    }

    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      provider: this.id,
      model: data.model ?? model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  async *stream(req: CompletionRequest, model: string): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      // A hung gateway must reject so the fallback chain can engage.
      signal: AbortSignal.timeout(90_000),
      body: this.body(req, model, true),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`[ai:${this.id}] ${res.status} ${res.statusText} — ${detail.slice(0, 500)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Skip malformed keep-alive chunks.
        }
      }
    }
  }
}
