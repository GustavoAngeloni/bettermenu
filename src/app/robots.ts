import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Buscadores e assistentes de IA podem ler tudo o que é público (cardápios, guias, FAQ);
// as áreas da equipe e as comandas das mesas ficam de fora.
const PRIVATE = ["/admin", "/garcom", "/cozinha", "/super", "/login", "/api/", "/m/"];

// Robôs de busca e de respostas por IA (citados aqui para deixar a permissão explícita).
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_BOTS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
