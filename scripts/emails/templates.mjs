// Os e-mails do Better Menu. Cada um vira um template publicado no Resend (alias fixo, editável no painel).
// Variáveis: {{{CHAVE}}} no HTML; declaradas em `vars` como [chave, tipo, valor padrão].
import { button, card, layout, p, small, steps } from "./layout.mjs";

export function templates(appUrl) {
  const L = (o) => layout({ appUrl, ...o });
  return [
    // ------------------------------------------------------------ depois do pagamento
    {
      alias: "bm-acesso-liberado",
      name: "Better Menu · Acesso liberado (pós-pagamento)",
      subject: "Seu Better Menu está pronto, {{{NOME}}} 🎉",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "seu restaurante"], ["PLANO", "string", ""], ["CICLO", "string", ""], ["VALOR", "string", ""], ["CODIGO", "string", ""], ["USUARIO", "string", ""], ["LINK_LOGIN", "string", `${appUrl}/login`], ["PROXIMA_COBRANCA", "string", ""]],
      html: L({
        preheader: "Pagamento aprovado. Seu código e usuário para entrar estão aqui.",
        kicker: "Pagamento aprovado",
        title: "Bem-vindo, {{{NOME}}}! O {{{RESTAURANTE}}} já está no ar.",
        body:
          p("Seu plano <strong>{{{PLANO}}}</strong> ({{{CICLO}}}, {{{VALOR}}}) está ativo. Estes são os seus dados para entrar no painel:") +
          card([["Código do restaurante", "{{{CODIGO}}}"], ["Usuário", "{{{USUARIO}}}"]], { mono: true }) +
          small("A senha é a que você criou no cadastro. Esqueceu? Use “Esqueci minha senha” na tela de login.") +
          button("Entrar no painel", "{{{LINK_LOGIN}}}") +
          p("<strong>Seus primeiros 15 minutos:</strong>", "margin-top:24px") +
          steps([
            ["Monte o cardápio", "Cadastre pratos com foto, ou importe por planilha ou pela foto do cardápio impresso."],
            ["Coloque a sua cara", "Logo, cor e foto de capa em Identidade visual."],
            ["Imprima os QR Codes", "Em Mesas e QR Codes, imprima os cartões e faça um pedido de teste."],
          ]) +
          small("A próxima cobrança será em {{{PROXIMA_COBRANCA}}}. Os manuais e vídeos de cada tela estão em <strong>Aprender</strong>, no painel. Guarde este e-mail: o código do restaurante é o mesmo que a sua equipe usa para entrar."),
      }),
      text: "Bem-vindo, {{{NOME}}}! O {{{RESTAURANTE}}} já está no ar.\n\nPlano {{{PLANO}}} ({{{CICLO}}}, {{{VALOR}}}) ativo.\nCódigo do restaurante: {{{CODIGO}}}\nUsuário: {{{USUARIO}}}\nSenha: a que você criou no cadastro\n\nEntrar: {{{LINK_LOGIN}}}\n\nPróxima cobrança: {{{PROXIMA_COBRANCA}}}.",
    },

    // ------------------------------------------------------------ senha
    {
      alias: "bm-redefinir-senha",
      name: "Better Menu · Redefinir senha",
      subject: "Crie uma nova senha do Better Menu",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "Better Menu"], ["USUARIO", "string", ""], ["LINK", "string", `${appUrl}/recuperar-senha`], ["VALIDADE", "string", "1 hora"]],
      html: L({
        preheader: "Use o botão para criar uma nova senha. O link vale por {{{VALIDADE}}}.",
        kicker: "Recuperar acesso",
        title: "Vamos criar uma nova senha, {{{NOME}}}",
        body:
          p("Recebemos um pedido para trocar a senha do usuário <strong>{{{USUARIO}}}</strong> no <strong>{{{RESTAURANTE}}}</strong>.") +
          button("Criar nova senha", "{{{LINK}}}") +
          small("O link vale por {{{VALIDADE}}} e só pode ser usado uma vez. Se não foi você, ignore este e-mail: a sua senha atual continua valendo."),
        footerNote: "Por segurança, a equipe do Better Menu nunca pede a sua senha.",
      }),
      text: "Olá, {{{NOME}}}. Para criar uma nova senha do usuário {{{USUARIO}}} ({{{RESTAURANTE}}}), abra: {{{LINK}}}\nO link vale por {{{VALIDADE}}}. Se não foi você, ignore este e-mail.",
    },
    {
      alias: "bm-senha-alterada",
      name: "Better Menu · Senha alterada",
      subject: "Sua senha do Better Menu foi alterada",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "Better Menu"], ["CODIGO", "string", ""], ["USUARIO", "string", ""], ["LINK_LOGIN", "string", `${appUrl}/login`]],
      html: L({
        preheader: "A senha foi trocada agora há pouco.",
        kicker: "Segurança",
        title: "Senha alterada com sucesso",
        body:
          p("{{{NOME}}}, a senha do usuário <strong>{{{USUARIO}}}</strong> no <strong>{{{RESTAURANTE}}}</strong> acabou de ser trocada.") +
          card([["Código do restaurante", "{{{CODIGO}}}"], ["Usuário", "{{{USUARIO}}}"]], { mono: true }) +
          button("Entrar com a nova senha", "{{{LINK_LOGIN}}}") +
          small("Não foi você? Peça uma nova senha agora em " + `${appUrl}/recuperar-senha` + " e avise o dono do restaurante."),
      }),
      text: "{{{NOME}}}, a senha do usuário {{{USUARIO}}} ({{{RESTAURANTE}}}, código {{{CODIGO}}}) foi alterada. Entrar: {{{LINK_LOGIN}}}. Não foi você? " + `${appUrl}/recuperar-senha`,
    },

    // ------------------------------------------------------------ equipe
    {
      alias: "bm-convite-equipe",
      name: "Better Menu · Convite da equipe (acesso criado)",
      subject: "{{{CONVIDADO_POR}}} criou o seu acesso ao {{{RESTAURANTE}}}",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "o restaurante"], ["FUNCAO", "string", "Equipe"], ["CODIGO", "string", ""], ["USUARIO", "string", ""], ["CONVIDADO_POR", "string", "O dono"], ["LINK_DEFINIR", "string", `${appUrl}/login`], ["LINK_LOGIN", "string", `${appUrl}/login`]],
      html: L({
        preheader: "Seu código e usuário para entrar no Better Menu.",
        kicker: "Acesso criado",
        title: "{{{NOME}}}, você faz parte da equipe do {{{RESTAURANTE}}}",
        body:
          p("{{{CONVIDADO_POR}}} criou o seu acesso como <strong>{{{FUNCAO}}}</strong>. Crie a sua senha pelo botão abaixo e entre no Better Menu pelo celular.") +
          card([["Código do restaurante", "{{{CODIGO}}}"], ["Usuário", "{{{USUARIO}}}"]], { mono: true }) +
          button("Criar minha senha", "{{{LINK_DEFINIR}}}") +
          small("O link vale por 72 horas. Depois, entre sempre pelo <a href=\"{{{LINK_LOGIN}}}\" style=\"color:#b4441f\">login do Better Menu</a>. Dica: no celular, use “Adicionar à tela inicial” para abrir como um app, e toque em <strong>Iniciar turno</strong> para receber os alertas com som."),
      }),
      text: "{{{NOME}}}, {{{CONVIDADO_POR}}} criou o seu acesso ao {{{RESTAURANTE}}} como {{{FUNCAO}}}.\nCódigo: {{{CODIGO}}}\nUsuário: {{{USUARIO}}}\nCrie sua senha: {{{LINK_DEFINIR}}} (vale 72 horas)\nEntrar: {{{LINK_LOGIN}}}",
    },

    // ------------------------------------------------------------ cobrança
    {
      alias: "bm-pagamento-confirmado",
      name: "Better Menu · Renovação paga",
      subject: "Pagamento confirmado · {{{RESTAURANTE}}}",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "seu restaurante"], ["PLANO", "string", ""], ["VALOR", "string", ""], ["PROXIMA_COBRANCA", "string", ""]],
      html: L({
        preheader: "Recebemos o pagamento da sua assinatura.",
        kicker: "Assinatura renovada",
        title: "Pagamento confirmado, obrigado!",
        body:
          p("{{{NOME}}}, recebemos o pagamento da assinatura do <strong>{{{RESTAURANTE}}}</strong>. Está tudo em dia.") +
          card([["Plano", "{{{PLANO}}}"], ["Valor", "{{{VALOR}}}"], ["Próxima cobrança", "{{{PROXIMA_COBRANCA}}}"]]) +
          button("Ver o painel", `${appUrl}/admin`) +
          small("O comprovante da cobrança também fica no seu Mercado Pago."),
      }),
      text: "{{{NOME}}}, recebemos o pagamento da assinatura do {{{RESTAURANTE}}} (plano {{{PLANO}}}, {{{VALOR}}}). Próxima cobrança: {{{PROXIMA_COBRANCA}}}.",
    },
    {
      alias: "bm-pagamento-recusado",
      name: "Better Menu · Pagamento recusado",
      subject: "Não conseguimos cobrar a assinatura do {{{RESTAURANTE}}}",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "seu restaurante"], ["PLANO", "string", ""], ["VALOR", "string", ""]],
      html: L({
        preheader: "Atualize o cartão para não perder o acesso.",
        kicker: "Atenção",
        title: "O cartão da assinatura foi recusado",
        body:
          p("{{{NOME}}}, a cobrança de <strong>{{{VALOR}}}</strong> do plano {{{PLANO}}} do <strong>{{{RESTAURANTE}}}</strong> não foi aprovada pelo cartão. Isso costuma acontecer por limite, cartão vencido ou bloqueio do banco.") +
          p("O Mercado Pago tenta de novo nos próximos dias. Para resolver agora, assine com outro cartão: o seu restaurante, cardápio e equipe continuam iguais.") +
          button("Atualizar o cartão", `${appUrl}/assinar`) +
          small("Entre como dono antes de abrir o link, para a nova assinatura substituir a antiga."),
      }),
      text: "{{{NOME}}}, a cobrança de {{{VALOR}}} (plano {{{PLANO}}}, {{{RESTAURANTE}}}) foi recusada pelo cartão. Atualize em " + `${appUrl}/assinar` + " (entre como dono antes).",
    },
    {
      alias: "bm-assinatura-cancelada",
      name: "Better Menu · Assinatura cancelada",
      subject: "Sua assinatura do Better Menu foi cancelada",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "seu restaurante"], ["ACESSO_ATE", "string", "o fim do período pago"]],
      html: L({
        preheader: "Você continua com acesso até o fim do período pago.",
        kicker: "Assinatura",
        title: "Assinatura cancelada",
        body:
          p("{{{NOME}}}, a assinatura do <strong>{{{RESTAURANTE}}}</strong> foi cancelada e não haverá novas cobranças.") +
          p("O cardápio e o painel continuam funcionando até <strong>{{{ACESSO_ATE}}}</strong>. Seus dados ficam guardados: se voltar, está tudo como você deixou.") +
          button("Reativar a assinatura", `${appUrl}/assinar`) +
          small("Foi engano ou algo não funcionou como esperava? Responda este e-mail: queremos saber."),
      }),
      text: "{{{NOME}}}, a assinatura do {{{RESTAURANTE}}} foi cancelada. O acesso continua até {{{ACESSO_ATE}}}. Reativar: " + `${appUrl}/assinar`,
    },
    {
      alias: "bm-plano-alterado",
      name: "Better Menu · Plano alterado",
      subject: "Seu plano agora é {{{PLANO}}}",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "seu restaurante"], ["PLANO", "string", ""], ["CICLO", "string", ""], ["VALOR", "string", ""], ["PROXIMA_COBRANCA", "string", ""]],
      html: L({
        preheader: "As novas funções já estão liberadas no painel.",
        kicker: "Plano alterado",
        title: "Bem-vindo ao {{{PLANO}}}, {{{NOME}}}",
        body:
          p("O <strong>{{{RESTAURANTE}}}</strong> agora está no plano <strong>{{{PLANO}}}</strong>, e as funções novas já aparecem no painel de todas as suas unidades.") +
          card([["Plano", "{{{PLANO}}} ({{{CICLO}}})"], ["Valor", "{{{VALOR}}}"], ["Próxima cobrança", "{{{PROXIMA_COBRANCA}}}"]]) +
          button("Abrir o painel", `${appUrl}/admin`) +
          small("A assinatura anterior foi encerrada automaticamente; você não paga as duas."),
      }),
      text: "{{{NOME}}}, o {{{RESTAURANTE}}} agora está no plano {{{PLANO}}} ({{{CICLO}}}, {{{VALOR}}}). Próxima cobrança: {{{PROXIMA_COBRANCA}}}.",
    },

    // ------------------------------------------------------------ série de boas-vindas (automação)
    {
      alias: "bm-boas-vindas-1-cardapio",
      name: "Better Menu · Boas-vindas 1 (dia 1) · Cardápio",
      subject: "{{{NOME}}}, seu cardápio pronto em 15 minutos",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "seu restaurante"], ["LINK_LOGIN", "string", `${appUrl}/login`]],
      html: L({
        preheader: "Três atalhos para montar o cardápio sem digitar tudo.",
        kicker: "Primeiros passos · 1 de 3",
        title: "Seu cardápio pronto em 15 minutos",
        body:
          p("{{{NOME}}}, o cardápio é o coração do {{{RESTAURANTE}}} no Better Menu. Três atalhos para não digitar tudo do zero:") +
          steps([
            ["Importe pela foto", "Em Cardápio › Importar, fotografe o cardápio impresso: a inteligência artificial lê pratos e preços para você revisar."],
            ["Ou pela planilha", "Baixe o modelo, preencha no Excel e envie."],
            ["Capriche nas fotos", "Pratos com foto vendem mais. Luz natural, prato de cima ou a 45°."],
          ]) +
          button("Montar o cardápio", "{{{LINK_LOGIN}}}") +
          small("Dica: marque os alérgenos e escreva descrições completas. Clientes com deficiência visual ouvem exatamente o que você escrever."),
      }),
      text: "{{{NOME}}}, monte o cardápio do {{{RESTAURANTE}}}: importe pela foto ou planilha em Cardápio › Importar e capriche nas fotos. Entrar: {{{LINK_LOGIN}}}",
    },
    {
      alias: "bm-boas-vindas-2-qrcodes",
      name: "Better Menu · Boas-vindas 2 (dia 3) · QR Codes",
      subject: "Hora de colocar os QR Codes nas mesas",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "seu restaurante"], ["LINK_LOGIN", "string", `${appUrl}/login`]],
      html: L({
        preheader: "Imprima, plastifique e faça o pedido de teste.",
        kicker: "Primeiros passos · 2 de 3",
        title: "Do papel para a mesa",
        body:
          p("{{{NOME}}}, com o cardápio pronto, falta pouco para o {{{RESTAURANTE}}} receber o primeiro pedido pelo celular:") +
          steps([
            ["Imprima os cartões", "Mesas e QR Codes › Imprimir todos. Ative “Gráficos de fundo” para sair com as cores."],
            ["Crie os logins da equipe", "Em Equipe, um usuário para cada garçom e para a cozinha. Com e-mail, eles recebem o acesso na hora."],
            ["Faça o pedido de teste", "Escaneie um QR, peça, prepare na cozinha e libere a mesa no garçom."],
          ]) +
          button("Abrir Mesas e QR Codes", "{{{LINK_LOGIN}}}"),
      }),
      text: "{{{NOME}}}, imprima os QR Codes (Mesas e QR Codes › Imprimir todos), crie os logins da equipe e faça um pedido de teste. Entrar: {{{LINK_LOGIN}}}",
    },
    {
      alias: "bm-boas-vindas-3-numeros",
      name: "Better Menu · Boas-vindas 3 (dia 7) · Números",
      subject: "{{{NOME}}}, o que a sua primeira semana mostrou",
      vars: [["NOME", "string", "tudo bem"], ["RESTAURANTE", "string", "seu restaurante"], ["LINK_LOGIN", "string", `${appUrl}/login`]],
      html: L({
        preheader: "Faturamento, ticket médio, pratos campeões e horários de pico.",
        kicker: "Primeiros passos · 3 de 3",
        title: "Sua primeira semana em números",
        body:
          p("{{{NOME}}}, uma semana de Better Menu já conta muita coisa sobre o {{{RESTAURANTE}}}. Na Visão geral do painel você encontra:") +
          steps([
            ["Faturamento e ticket médio", "Quanto cada mesa e cada pessoa gastam, por dia e por período."],
            ["Lucro por prato", "Informe o custo de cada prato e veja a margem (planos Profissional e Premium)."],
            ["Horários de pico e avaliações", "Para montar a escala e saber o que os clientes estão dizendo."],
          ]) +
          button("Ver meus números", "{{{LINK_LOGIN}}}") +
          small("Precisa de ajuda com alguma tela? Os manuais e vídeos estão em Aprender, no painel, ou responda este e-mail."),
      }),
      text: "{{{NOME}}}, veja os números da primeira semana do {{{RESTAURANTE}}} na Visão geral: faturamento, ticket médio, lucro por prato e horários de pico. Entrar: {{{LINK_LOGIN}}}",
    },
  ];
}

/** Automação de boas-vindas: dispara no evento de assinatura aprovada (enviado pelo sistema). */
export function onboardingAutomation(ids) {
  const vars = { NOME: { var: "event.nome" }, RESTAURANTE: { var: "event.restaurante" }, LINK_LOGIN: { var: "event.link_login" } };
  return {
    name: "Better Menu · Boas-vindas (dias 1, 3 e 7)",
    status: "enabled",
    steps: [
      { key: "inicio", type: "trigger", config: { event_name: "bm.assinatura.aprovada" } },
      { key: "espera_1d", type: "delay", config: { duration: "1 day" } },
      { key: "email_cardapio", type: "send_email", config: { template: { id: ids["bm-boas-vindas-1-cardapio"], variables: vars } } },
      { key: "espera_2d", type: "delay", config: { duration: "2 days" } },
      { key: "email_qrcodes", type: "send_email", config: { template: { id: ids["bm-boas-vindas-2-qrcodes"], variables: vars } } },
      { key: "espera_4d", type: "delay", config: { duration: "4 days" } },
      { key: "email_numeros", type: "send_email", config: { template: { id: ids["bm-boas-vindas-3-numeros"], variables: vars } } },
    ],
    connections: [
      { from: "inicio", to: "espera_1d" },
      { from: "espera_1d", to: "email_cardapio" },
      { from: "email_cardapio", to: "espera_2d" },
      { from: "espera_2d", to: "email_qrcodes" },
      { from: "email_qrcodes", to: "espera_4d" },
      { from: "espera_4d", to: "email_numeros" },
    ],
  };
}
