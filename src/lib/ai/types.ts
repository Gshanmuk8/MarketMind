/**
 * AI layer contracts. Business logic depends ONLY on these types —
 * never on a concrete provider or model name.
 */

export type AiProviderId =
  | "openrouter"
  | "openai"
  | "gemini"
  | "anthropic"
  | "groq"
  | "cerebras"
  | "deepseek";

/** What the model is being asked to do — drives model routing. */
export type AiTaskKind =
  | "company-analysis" // deep understanding of a company website
  | "competitor-discovery" // reasoning over search results
  | "extraction" // structured data from raw HTML/text (cheap + fast)
  | "summarization" // signal digests, report sections
  | "scoring" // threat/opportunity scoring
  | "strategy" // SWOT, gap analysis, recommendations (highest quality)
  | "chat"; // conversational interface

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  task: AiTaskKind;
  messages: AiMessage[];
  /** Force strict JSON output (response_format: json_object). */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Override routing; use sparingly. */
  model?: string;
}

export interface CompletionResponse {
  text: string;
  provider: AiProviderId;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AiProvider {
  readonly id: AiProviderId;
  /** True when the required API key is present. */
  isConfigured(): boolean;
  complete(req: CompletionRequest, model: string): Promise<CompletionResponse>;
  stream(req: CompletionRequest, model: string): AsyncIterable<string>;
}
