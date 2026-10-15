// Perguntas frequentes: respostas curtas e diretas na primeira frase
// (é o trecho que Google, assistentes de voz e IAs costumam citar).
// Usadas na home, em /perguntas-frequentes, no JSON-LD FAQPage e no llms-full.txt.

export interface Faq {
  q: string;
  a: string;
  group: "Produto" | "Clientes" | "Acessibilidade" | "Operação";
  /** aparece também na página inicial */
  home?: boolean;
}

export const FAQ: Faq[] = [
  {
    group: "Produto",
    home: true,
    q: "O que é o Better Menu?",
    a: "O Better Menu é um cardápio digital com QR Code para restaurantes, bares e cafés. O cliente escaneia o código da mesa, pede pelo celular, acompanha o preparo e vê a conta dividida por pessoa, enquanto a cozinha e os garçons recebem tudo em tempo real.",
  },
  {
    group: "Produto",
    home: true,
    q: "Como funciona um cardápio digital com QR Code?",
    a: "Cada mesa tem um QR Code impresso. Ao apontar a câmera do celular, o cliente abre o cardápio do restaurante no navegador, digita o nome, escolhe os pratos e confirma. O pedido aparece na tela da cozinha ou do bar, e o garçom é avisado quando fica pronto.",
  },
  {
    group: "Clientes",
    home: true,
    q: "O cliente precisa baixar algum aplicativo?",
    a: "Não. O cardápio abre direto no navegador do celular (Android ou iPhone) a partir do QR Code. Não há cadastro, senha nem download: basta digitar o primeiro nome.",
  },
  {
    group: "Acessibilidade",
    home: true,
    q: "O Better Menu é acessível para pessoas cegas ou com baixa visão?",
    a: "Sim. O cardápio funciona com os leitores de tela VoiceOver (iPhone) e TalkBack (Android), tem a opção “Ouvir o cardápio”, que lê pratos, descrições e preços em voz alta, permite ditar mensagens por voz, ampliar o texto e usar alto contraste. O cliente também pode avisar a equipe que tem deficiência visual, e o garçom recebe orientações de como atender.",
  },
  {
    group: "Acessibilidade",
    home: true,
    q: "E para pessoas surdas ou que não falam?",
    a: "O cliente pede, chama o garçom e pede a conta sem precisar falar. Pode mandar mensagens escritas ou frases prontas (“Água, por favor”, “Tenho alergia”) direto para o celular do garçom, mostrar a mensagem em letras grandes na tela, usar a tradução em Libras do VLibras e receber os avisos de pedido pronto por vibração e na tela.",
  },
  {
    group: "Clientes",
    home: true,
    q: "Como funciona a divisão da conta?",
    a: "Cada pessoa da mesa entra com o próprio nome e o sistema soma o que cada uma pediu. Um item pode ser só de quem pediu, dividido com todos (inclusive quem chegar depois) ou com pessoas escolhidas. A taxa de serviço é aplicada sobre a parte de cada um, sem perder centavos.",
  },
  {
    group: "Clientes",
    q: "Em quais idiomas o cardápio funciona?",
    a: "Português, inglês e espanhol. O cardápio abre no idioma do celular do cliente, que pode trocar a qualquer momento. Os nomes e descrições dos pratos usam as traduções cadastradas pelo restaurante.",
  },
  {
    group: "Produto",
    q: "O cardápio fica com a cara do meu restaurante?",
    a: "Sim. Cada restaurante define logo, foto de capa, cor principal, tipografia dos títulos, tema claro ou escuro e uma frase de apresentação. A cor aparece no cardápio, nas telas da equipe e nos cartões de QR Code impressos.",
  },
  {
    group: "Operação",
    q: "Como a cozinha e os garçons recebem os pedidos?",
    a: "Em tempo real. A cozinha vê os pedidos em colunas (Novos, Em preparo, Prontos), separados por estação, e pode imprimir a comanda em 80 mm. O garçom recebe um alerta sonoro, e também no celular bloqueado, quando uma mesa chama, pede a conta ou um prato fica pronto.",
  },
  {
    group: "Operação",
    q: "Preciso comprar algum equipamento?",
    a: "Não. Funciona em qualquer celular, tablet ou computador com navegador. A impressora térmica de 80 mm é opcional, para quem quer comanda em papel na cozinha.",
  },
  {
    group: "Operação",
    q: "Dá para importar o cardápio que eu já tenho?",
    a: "Sim, por planilha (CSV) ou por foto do cardápio impresso: a leitura das fotos é feita por inteligência artificial e você revisa antes de publicar.",
  },
  {
    group: "Produto",
    q: "O garçom ainda pode lançar pedidos?",
    a: "Pode. O garçom lança pedidos pelo celular para quem prefere pedir falando, transfere e junta mesas, move itens entre pessoas e marca o pagamento de cada um. O restaurante também pode desligar o pedido pelo cliente e usar o QR só como cardápio.",
  },
  {
    group: "Produto",
    q: "Quanto custa o Better Menu?",
    a: "Há três planos mensais, definidos pelo número de mesas: Essencial (até 10 mesas), Profissional (até 30) e Premium (mesas ilimitadas). Todos incluem cardápio, pedidos, conta dividida e acessibilidade. Fale com a equipe para uma proposta.",
  },
  {
    group: "Produto",
    q: "Meu cardápio aparece no Google?",
    a: "Sim, se você quiser. Cada restaurante pode ter uma página pública do cardápio, com dados estruturados que ajudam Google e assistentes de IA a mostrar seus pratos e preços. Os pedidos continuam acontecendo só pelo QR Code da mesa.",
  },
  {
    group: "Operação",
    q: "Para que tipo de negócio o Better Menu serve?",
    a: "Restaurantes, bares, pubs, cafés, hamburguerias, pizzarias, bistrôs e qualquer casa com atendimento na mesa, de 1 a centenas de mesas.",
  },
];
