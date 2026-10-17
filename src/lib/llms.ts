import { FAQ } from "./faq";
import { absoluteUrl, PUBLIC_PAGES, SITE } from "./site";

// llms.txt (https://llmstxt.org): resumo em Markdown para assistentes de IA
// entenderem e citarem o Better Menu com precisão.

export function llmsTxt() {
  return `# ${SITE.name}

> ${SITE.definition}

Público: donos e gerentes de restaurantes, bares e cafés no Brasil. Idiomas do cardápio: português, inglês e espanhol. Não exige aplicativo: tudo abre no navegador do celular a partir do QR Code da mesa.

## Páginas
${PUBLIC_PAGES.map((p) => `- [${p.title}](${absoluteUrl(p.path)}): ${p.summary}`).join("\n")}

## Para quem cada tela serve
- Cliente (QR Code da mesa): cardápio com fotos, pedido pelo celular, acompanhamento do preparo, chamar garçom, pedir a conta, conta dividida por pessoa, avaliação.
- Garçom: alertas sonoros e no celular bloqueado, mapa de mesas, lançamento de pedidos, transferir e juntar mesas, pagamento por pessoa.
- Cozinha e bar: comandas por estação (Novos, Em preparo, Prontos), totais por prato, esgotado, impressão em 80 mm.
- Dono: faturamento, ticket médio, custo e lucro por prato, pratos mais vendidos, horários de pico, avaliações, cardápio por horário e happy hour, estoque, combos, equipe, QR Codes, identidade visual, fechamento de caixa e exportação para Excel.

## Planos
- Essencial: até 10 mesas, 1 restaurante, 1 estação de preparo; cardápio digital, pedidos lançados pelo garçom, avaliações e acessibilidade.
- Profissional: até 30 mesas, 3 restaurantes, 2 estações; tudo do Essencial + o cliente faz o pedido pelo celular + controle financeiro (ticket médio por mesa e por pessoa, custo do produto, lucro e margem por prato, fechamento de caixa, relatórios em Excel).
- Premium: mesas e estações ilimitadas, até 5 restaurantes; tudo do Profissional + happy hour e cardápio por horário + cardápio em inglês e espanhol.

## Acessibilidade
- Pessoas cegas e com baixa visão: compatível com VoiceOver e TalkBack, "Ouvir o cardápio" (leitura em voz alta de pratos e preços), ditado por voz, texto ampliado até 130%, alto contraste, aviso à equipe com orientações de atendimento.
- Pessoas surdas ou que não falam: pedido e chamados sem falar, mensagens escritas e frases prontas para o garçom, mensagem em letras grandes para mostrar na tela, tradução em Libras (VLibras), avisos por vibração e na tela.
- Todos: redução de animações, navegação por teclado, textos alternativos e marcação ARIA.

## Mais detalhes
- [Versão completa para IAs](${absoluteUrl("/llms-full.txt")})
`;
}

export function llmsFullTxt() {
  const groups = [...new Set(FAQ.map((f) => f.group))];
  return `${llmsTxt()}
## Perguntas frequentes
${groups
  .map((g) => `### ${g}\n\n${FAQ.filter((f) => f.group === g).map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}`)
  .join("\n\n")}

## Como funciona, passo a passo
1. O restaurante cadastra o cardápio (manual, por planilha ou por foto lida por IA) e imprime os cartões de QR Code das mesas.
2. O cliente aponta a câmera para o QR Code, digita o primeiro nome e entra na mesa. Quem chega depois entra na mesma mesa.
3. O cliente escolhe os pratos, adicionais e observações, decide se divide o item e confirma. O pedido vai direto para a tela da cozinha ou do bar.
4. A cozinha marca "Em preparo" e "Pronto"; o garçom é avisado e marca "Entregue". O cliente acompanha cada etapa no celular.
5. Na hora de ir embora, cada pessoa vê a própria parte da conta, com a taxa de serviço. O garçom registra o pagamento de cada um e libera a mesa.

## Fatos
- Nome: ${SITE.name}
- Site: ${SITE.url}
- Uma solução da ${SITE.publisher.name}
- Categoria: software de cardápio digital, pedidos e gestão de salão para restaurantes
- País: Brasil
`;
}
