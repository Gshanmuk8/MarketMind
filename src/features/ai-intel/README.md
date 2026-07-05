# ai-intel

Market-wide AI ecosystem monitor: model releases, pricing, capabilities (memory, voice, MCP, tool calling) across OpenAI, Google, Anthropic, Groq, Cerebras, OpenRouter, DeepSeek. Writes AiProviderUpdate rows + AI_MODELS signals.

## Convention

Each feature module owns its vertical slice:

```
ai-intel/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
