import { AiHttpError, parseRetryAfterMs } from "@/lib/ai/errors";
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
    // OpenAI's reasoning family (gpt-5*, o*) rejects `max_tokens` and any
    // non-default temperature — adapt here so the routing table stays
    // declarative and a future OPENAI_API_KEY doesn't 400 on every call.
    const reasoningFamily = this.id === "openai" && /^(gpt-5|o\d)/.test(model);
    // Never let a gateway default to the model's maximum — that inflates
    // cost estimates and 402s low-credit accounts. Callers raise as needed.
    const maxTokens = req.maxTokens ?? 4096;
    return JSON.stringify({
      model,
      messages: req.messages,
      ...(reasoningFamily
        ? { max_completion_tokens: maxTokens }
        : { temperature: req.temperature ?? 0.3, max_tokens: maxTokens }),
      ...(req.json ? { response_format: { type: "json_object" } } : {}),
      stream,
    });
  }

  private async throwHttpError(res: Response): Promise<never> {
    const detail = await res.text().catch(() => "");
    throw new AiHttpError(
      `[ai:${this.id}] ${res.status} ${res.statusText} — ${detail.slice(0, 500)}`,
      res.status,
      res.status === 429 ? parseRetryAfterMs(res, detail) : undefined
    );
  }

  async complete(req: CompletionRequest, model: string): Promise<CompletionResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      // A hung gateway must reject so the fallback chain can engage.
      signal: AbortSignal.timeout(90_000),
      body: this.body(req, model, false),
    });

    if (!res.ok) await this.throwHttpError(res);

    const data = await res.json();
    const choice = data.choices?.[0];
    const text: string = choice?.message?.content ?? "";

    // A 200 with nothing in it, or JSON cut off mid-object, must fail HERE
    // so the chain falls through — never surface as a parse error downstream.
    if (!text.trim()) {
      throw new Error(`[ai:${this.id}] ${model} returned an empty completion`);
    }
    if (req.json && choice?.finish_reason === "length") {
      throw new Error(
        `[ai:${this.id}] ${model} truncated JSON output (finish_reason=length) — raise maxTokens`
      );
    }

    return {
      text,
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

    if (!res.ok || !res.body) await this.throwHttpError(res);

    const reader = res.body!.getReader();
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
