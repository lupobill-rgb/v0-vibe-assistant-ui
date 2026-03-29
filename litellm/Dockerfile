# VIBE LiteLLM Proxy — Railway Deployment
# Provides multi-provider LLM failover (Anthropic → OpenAI → Google → Fireworks)
FROM ghcr.io/berriai/litellm:main-stable

COPY litellm_config.yaml /app/config.yaml

EXPOSE 4000

CMD ["--config", "/app/config.yaml", "--port", "4000", "--detailed_debug", "false"]
