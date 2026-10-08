import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const ImportedMenuSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          description: z.string().nullable(),
          /** preço em reais, ex.: 39.9 */
          price: z.number().nullable(),
        }),
      ),
    }),
  ),
});

export type ImportedMenu = z.infer<typeof ImportedMenuSchema>;

export const aiImportEnabled = () => !!process.env.ANTHROPIC_API_KEY;

const INSTRUCTIONS = `Você recebe fotos do cardápio impresso de um restaurante brasileiro.
Transcreva o cardápio em categorias e itens, exatamente como aparecem.

- Mantenha os nomes e descrições no idioma original, corrigindo apenas erros óbvios de leitura.
- "price" é o valor em reais como número (R$ 39,90 → 39.9). Se o item tiver vários tamanhos/preços,
  crie um item para cada variação, com o tamanho no nome (ex.: "Pizza Calabresa (grande)").
- Se não houver preço legível, use null. Se não houver descrição, use null.
- Ignore cabeçalhos, endereços, telefones, avisos de taxa e itens repetidos entre fotos.
- Se algum trecho estiver ilegível, simplesmente não o invente.`;

/**
 * Lê fotos de um cardápio e devolve categorias e itens estruturados (Claude, visão + saída estruturada).
 * As imagens chegam já reduzidas pelo navegador (JPEG, ~1600px).
 */
export async function extractMenuFromImages(images: { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string }[]): Promise<ImportedMenu> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // Se o modelo recusar por engano, a API tenta de novo em um modelo de reserva automaticamente.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(ImportedMenuSchema) },
    messages: [
      {
        role: "user",
        content: [
          ...images.map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 } })),
          { type: "text", text: INSTRUCTIONS },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Não foi possível ler este cardápio. Tente outra foto.");
  if (response.stop_reason === "max_tokens") throw new Error("Cardápio muito grande para uma vez só. Envie menos fotos por vez.");
  if (!response.parsed_output) throw new Error("Não consegui entender as fotos. Tente fotos mais nítidas e de frente.");
  return response.parsed_output;
}
