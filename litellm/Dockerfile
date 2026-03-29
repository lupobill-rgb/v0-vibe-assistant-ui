# VIBE LiteLLM Proxy — Railway Deployment
# Provides multi-provider LLM failover (Anthropic → OpenAI → Google → Fireworks)
FROM ghcr.io/berriai/litellm:main-stable

COPY litellm_config.yaml /app/config.yaml

ENV PORT=4000

EXPOSE 4000

ENTRYPOINT ["litellm"]
CMD ["--config", "/app/config.yaml", "--port", "4000"]
