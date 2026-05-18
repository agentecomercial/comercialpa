// =========================================================================
// PLAYBOOK SPIN-TOUR — aplicação cirúrgica do SPIN Selling ao Tour Crescimento Empresarial
// Fonte: PDF "Tour Crescimento Empresarial - Febracis.pdf" (slides 17–25)
// USO: opt-in via checkbox em "Opções avançadas" (Express). EXCLUSIVO para o treinamento TCE.
// =========================================================================
window.FebracisData = window.FebracisData || {};

window.FebracisData.PLAYBOOK_SPIN_TOUR = {

  // -----------------------------------------------------------------------
  // SLIDE 18 — MAPA DE MUNIÇÃO (qual peça usar em qual fase do SPIN)
  // -----------------------------------------------------------------------
  munisaoPorFase: {
    S: {
      municao: 'Métricas Febracis (70M+ vidas, 16K empresários/mês, 26 anos, R$3 BI gerados) + selos RA1000 e GPTW 2024',
      funcao: 'Estabelecer autoridade ANTES de perguntar — vira consultor, não vendedor',
      erroFatal: 'Pular a credibilidade e perguntar números frios — soa interrogatório'
    },
    P: {
      municao: 'Lista das 8 dores do empresário (faturamento estagnado, time desengajado, vendas inconsistentes, margem apertando, sem tempo pra estratégia, marketing sem retorno, concorrência crescendo, família cobrando)',
      funcao: 'Roteiro mental de diagnóstico — usar como BÚSSOLA para perguntar, NUNCA mostrar a lista',
      erroFatal: 'Mostrar a lista de dores ao prospect antes dele admitir uma — equivale a médico mostrar lista de doenças e perguntar "qual é a sua?"'
    },
    I: {
      municao: 'Os 3 níveis (Estratégico/Tático/Operacional) + os 4 pilares do Tour (Estratégia, Vendas, Times, Marketing) + benefícios como contraste',
      funcao: 'Empilhar consequências em 3 níveis até o prospect SENTIR o custo de não resolver',
      erroFatal: 'Implicar pouco — o prospect precisa SENTIR antes de comprar; se não sente, não fecha'
    },
    N: {
      municao: 'Benefícios por categoria (Times, Vendas, Estratégias, Marketing) + 3 diferenciais (conteúdo prático aplicável, Paulo Vieira ao vivo, networking com líderes) + case Febracis (R$300k → R$400 milhões)',
      funcao: 'Fazer o prospect VERBALIZAR a solução com as próprias palavras — ele vende para si mesmo',
      erroFatal: 'Apresentar o produto antes do prospect pedir — vira empurrão'
    }
  },

  // -----------------------------------------------------------------------
  // SLIDE 19 — ABERTURA: ANCORANDO AUTORIDADE
  // -----------------------------------------------------------------------
  abertura: {
    duracaoSegundos: 90,
    movimentos: [
      'Mov. 1: "Antes de entrar no que te trouxe aqui, deixa eu te situar em 30 segundos sobre quem é a Febracis."',
      'Mov. 2 (autoridade): "26 anos, 70 milhões de pessoas impactadas, 16 mil empresários por mês, R$3 BILHÕES gerados aos clientes. GPTW 2024 e RA1000 no Reclame Aqui."',
      'Mov. 3 (permissão): "Falo isso porque o que vou te perguntar agora só faz sentido se você entender a estrutura por trás. Posso te fazer algumas perguntas?"'
    ],
    fundamento: 'A credibilidade Febracis transforma você de vendedor em consultor. Sem ela, suas perguntas viram interrogatório.',
    perguntasSituacao: [
      'Há quanto tempo você tem a empresa, qual o segmento e quantos colaboradores você tem hoje?',
      'Em qual faixa de faturamento mensal vocês operam? Só ordem de grandeza.',
      'Quem cuida da operação no dia a dia? Você está dentro de tudo ou já tem alguém?',
      'Você ou seu time já participaram de alguma imersão empresarial nesse porte?'
    ],
    fraseEnte: 'Beleza, [NOME]. Já tenho um retrato do seu cenário. Agora preciso entender não o que está bom — mas o que está te incomodando. Pode ser brutalmente honesto comigo aqui?'
  },

  // -----------------------------------------------------------------------
  // SLIDE 20 — PERGUNTA-ÂNCORA UNIVERSAL + 8 DORES COMO BÚSSOLA
  // -----------------------------------------------------------------------
  perguntaAncora: {
    texto: 'Se eu pudesse resolver UMA coisa pra você dormir melhor essa noite — qual seria?',
    silencioRecomendadoSegundos: 8,
    instrucao: 'Cale-se após a pergunta. O silêncio tira a verdade.',
    sinaisDorPrincipal: [
      'Cliente responde sem pausa (vive aquilo todo dia)',
      'A voz muda de tom — fica mais grave, mais lenta',
      'Dá um exemplo concreto sem você pedir'
    ],
    regraPriorizacao: 'Dor clara nos primeiros 30s → vá fundo nela. Resposta genérica ("tá tudo difícil") → mapeie 3 das 8 dores rapidamente e aprofunde a mais quente.'
  },
  doresMapeadas: {
    receita: [
      'Seu faturamento nos últimos 6 meses está subindo, estável ou caindo?',
      'Suas vendas têm previsibilidade ou é roleta-russa todo mês?',
      'Você sabe a margem real por produto/serviço ou opera no achômetro?'
    ],
    gente: [
      'Se você sumir 30 dias, sua empresa fatura igual, mais ou menos?',
      'Quanto do seu dia é apagar incêndio versus pensar o futuro?',
      'Quantos do seu time estão REALMENTE comprometidos com o resultado?'
    ],
    mercado: [
      'Quanto investe em marketing e quantos leads qualificados isso gera por mês?',
      'Seus concorrentes diretos crescem mais rápido, igual ou mais devagar que você?',
      'Pesquisando seu nome no Google, o cliente encontra autoridade ou silêncio?'
    ]
  },

  // -----------------------------------------------------------------------
  // SLIDE 21 — ESCADA DE DOR EM 3 DIMENSÕES (Operacional → Tático → Estratégico)
  // -----------------------------------------------------------------------
  escadaImplicacao: {
    fundamento: 'O empresário só compra quando a dor presente fica MAIOR que o preço. Implicação é a engenharia de tornar a dor maior.',
    exemploTrabalhado: {
      contexto: 'Cliente diz: "meu time não entrega o que combina"',
      operacional: '"Retrabalho, atrasos, clientes reclamando" — dor visível no dia a dia',
      tatico: '"Eu virei o gargalo de tudo — processos não escalam, decisões travam em mim, sem delegação"',
      estrategico: '"Minha empresa não tem dono — tem refém. Não vale nada sem mim, sem sucessão, sem futuro de venda, sem liberdade"'
    },
    perguntasOperacional: [
      'Quantas horas por semana você resolve coisa que seu time deveria resolver sozinho?',
      'Quando alguém pede demissão, quanto tempo você leva pra se recuperar?',
      'Quantos clientes você perdeu nos últimos 12 meses por falha de execução do time?'
    ],
    perguntasTatico: [
      'Quanto do seu faturamento depende EXCLUSIVAMENTE de você operando?',
      'Se tirar 30 dias de férias agora, o que para? O que continua?',
      'Você tem indicadores semanais chegando sem precisar perguntar?'
    ],
    perguntasEstrategico: [
      'Se em 5 anos a empresa estiver exatamente igual, isso é vitória ou derrota?',
      'Sua empresa hoje é um ATIVO vendável ou um EMPREGO que te aprisiona?',
      'Seus filhos te veem como pai/mãe presente ou como alguém sempre cansado?'
    ],
    fraseEmpilhamento: 'E SE ISSO continuar mais 12 meses, o que vira? — repetir 2 a 3 vezes subindo o nível, do operacional ao estratégico.'
  },

  // -----------------------------------------------------------------------
  // SLIDE 22 — 4 PILARES DO TOUR COMO MAPA DE CONSEQUÊNCIAS + PUNCH LINES
  // -----------------------------------------------------------------------
  pilaresMapa: {
    estrategia: {
      perguntas: [
        'Quantas decisões grandes você tomou sem dados nos últimos 12 meses?',
        'Quanto custou cada decisão tomada no escuro que deu errado?',
        'Sem clareza estratégica, você está construindo uma empresa ou improvisando uma rotina?'
      ],
      punchLine: 'Empresa sem estratégia não cresce — ela apenas envelhece.'
    },
    vendas: {
      perguntas: [
        'Se eu perguntar quanto vai faturar em 90 dias, você responde com confiança ou com torcida?',
        'Quantos meses do ano você passa em modo "desespero de bater meta"?',
        'Quanto crescimento você deixou na mesa por não ter processo comercial replicável?'
      ],
      punchLine: 'Empresa sem funil previsível é loteria — e loteria não constrói patrimônio.'
    },
    times: {
      perguntas: [
        'Se você ficasse 60 dias internado, sua empresa cresceria, ficaria igual ou afundaria?',
        'Quem é seu segundo em comando? Você confiaria a vida da empresa nele por 30 dias?',
        'Quanto vale uma empresa que não funciona sem o dono presente?'
      ],
      punchLine: 'Empresa que depende do dono é prisão com CNPJ.'
    },
    marketing: {
      perguntas: [
        'Quando alguém pesquisa seu segmento na sua cidade, seu nome aparece ou o do concorrente?',
        'Quantos leads qualificados sua máquina de marketing gera por semana hoje?',
        'Enquanto você não constrói autoridade digital, quem está construindo a percepção no seu lugar?'
      ],
      punchLine: 'No digital, ou você é referência ou você é fundo de prateleira.'
    }
  },

  // -----------------------------------------------------------------------
  // SLIDE 23 — 4 BENEFÍCIOS COMO PORTAS DE NECESSIDADE + TÉCNICA DA DEVOLUÇÃO
  // -----------------------------------------------------------------------
  portasDeNecessidade: {
    times: [
      'Se você tivesse método pra recrutar e formar líderes, quantas horas da semana você liberaria?',
      'Se sua empresa rodasse 30 dias sem você, o que você faria com esse tempo?',
      'Vale sair daqui sabendo EXATAMENTE como construir um time que entrega sem te buscar?'
    ],
    vendasELucro: [
      'Se tivesse funil previsível e scripts validados, como seria sua noite de domingo antes da semana começar?',
      'Quanto vale poder olhar uma planilha e SABER quanto vai entrar nos próximos 90 dias?',
      'Se dominasse gestão de margem, qual seria o impacto no lucro nos próximos 6 meses?'
    ],
    estrategia: [
      'Se tivesse modelo escalável documentado, como mudaria sua forma de tomar decisão?',
      'Vale acordar segunda sabendo onde a empresa está, onde vai chegar e o caminho exato?',
      'Quanto valeria nunca mais tomar uma decisão grande sem dado pra sustentar?'
    ],
    marketing: [
      'Se sua empresa virasse referência digital, quanto muda a fila de clientes querendo trabalhar com você?',
      'Quanto vale sair de caçar cliente para cliente vir atrás de você?',
      'Se tivesse motor de captação 24/7, qual seria seu próximo passo de expansão?'
    ]
  },
  tecnicaDevolucao: {
    fundamento: 'Necessidade não é VOCÊ dizer o que ele precisa — é ELE dizer o que quer, usando palavras que VOCÊ plantou. A Devolução amarra a dor verbalizada ao benefício específico do Tour.',
    protocolo: 'Você me disse [DOR EXATA QUE O CLIENTE FALOU]. O Tour entrega exatamente isso através de [BENEFÍCIO ESPECÍFICO DO TOUR]. Faz sentido?',
    exemploCompleto: 'Você me disse que é o gargalo de tudo. O Tour dedica um pilar inteiro a Times de Alta Performance — liderança, recrutamento e cultura. É exatamente o caminho pra sair do operacional. Isso é o que você busca?',
    obrigatoriedade: 'A Devolução é OBRIGATÓRIA antes de qualquer pedido de fechamento. Sem ela, a oferta soa empurrão.'
  },

  // -----------------------------------------------------------------------
  // SLIDE 24 — APRESENTAR O TOUR SEM VENDER
  // -----------------------------------------------------------------------
  apresentacao: {
    fundamento: 'Quem vende empurra. Quem ancora apenas confirma o que o prospect já decidiu na cabeça.',
    quatroMovimentos: [
      'Mov. 1 (síntese das dores): "[NOME], deixa eu te resumir o que ouvi nos últimos 20 minutos. Você me disse 1) [dor], 2) [dor] e 3) [dor]. Tô certo?"',
      'Mov. 2 (espelho da necessidade): "E você me disse que sairia satisfeito se conseguisse [A], [B] e [C]. Confere?"',
      'Mov. 3 (case): "O Paulo Vieira não ensina o que leu num livro. Ele ensina o método que pegou a Febracis de R$300 mil pra R$400 milhões."',
      'Mov. 4 (diferenciais): "O Tour tem 3 coisas únicas: 1) conteúdo aplicável na segunda-feira; 2) Paulo Vieira ao vivo; 3) networking com empresários do seu nível."'
    ],
    fraseMestre: {
      texto: 'O Paulo Vieira não ensina o que leu num livro. Ele ensina o que VIVEU. Tudo que você vai aprender no Tour foi aplicado em pelo menos uma das 20 empresas do grupo Febracis na semana passada.',
      funcao: 'Neutralizador de "será que funciona?" — o método já funcionou em escala visível, não é teoria.'
    },
    loteAtual: {
      jeitoErrado: '"É o último lote, depois vai aumentar!" (soa fabricado)',
      jeitoCerto: '"Hoje estamos no [Lote X]. O próximo sobe [R$] no dia [DATA]. Não é estratégia de venda, é como funciona. Empresários que decidem rápido entram no menor. A escolha é sua."'
    },
    conviteFinalBinario: '[NOME], duas opções: continuar no mesmo cenário mais 12 meses OU sentar com o Paulo Vieira e levar pra casa o método. "Empresários que decidem rápido constroem empresas grandes." Qual das duas faz mais sentido pra você?'
  },

  // -----------------------------------------------------------------------
  // SLIDE 17 — FECHAMENTO + QUEBRA DE OBJEÇÕES
  // -----------------------------------------------------------------------
  fechamentoConsultivo: {
    fundamento: 'Empresário respeita consultor que pede o sim. Quem termina sem oferecer pagamento deixou dinheiro na mesa — e o cliente sem solução.',
    frasesUrgenciaReal: 'A Tour resolve exatamente o que está te travando. Garante a vaga agora pelo lote atual ou prefere pagar mais caro daqui a duas semanas?',
    fraseFormaPagamento: 'Prefere garantir no Pix com 10% de desconto ou parcelar no cartão em até 12x sem juros?',
    quebrasObjecao: [
      { tag: 'Está caro', resposta: 'Caro comparado a quê? Você perde X por mês com esse problema. A Tour custa menos do que 30 dias dessa perda.' },
      { tag: 'Preciso pensar', resposta: 'Claro. Me ajuda a entender: é o investimento ou a dúvida sobre o resultado? Vamos resolver agora qual dos dois é.' },
      { tag: 'Já fiz outros cursos', resposta: 'Ótimo — você é alguém que investe em si. O que faltou nos anteriores? A Tour foi criada exatamente pra preencher essa lacuna.' },
      { tag: 'Vou falar com sócio/esposa', resposta: 'Que tal ligar pra ele(a) agora? Em 5 minutos eu apresento e vocês decidem juntos. Evita você perder a vaga e ter que ouvir "por que não decidiu na hora?".' }
    ]
  },

  // -----------------------------------------------------------------------
  // SLIDE 25 — ROTEIRO DE 30 MINUTOS (timing por fase)
  // -----------------------------------------------------------------------
  roteiro30min: [
    { janela: 'Min 0-3', fase: 'Abertura', acao: 'Credibilidade Febracis (26 anos, 70M+, R$3 bi). Finalizar com "Posso te fazer algumas perguntas?"', sinalAvanco: 'Cliente diz "não sabia que era tão grande"', sinalFreio: 'Passar de 3 min — monólogo mata conexão' },
    { janela: 'Min 3-8', fase: 'Situação', acao: '4 perguntas: tamanho, faturamento, gestão, histórico', sinalAvanco: 'Cliente dá detalhes sem você pedir', sinalFreio: 'Respostas curtas e secas → pular pra Problema em 5 min' },
    { janela: 'Min 8-16', fase: 'Problema', acao: 'Pergunta-âncora + silêncio 8s. Mapear até 3 das 8 dores. Aprofundar a mais quente.', sinalAvanco: 'Tom de voz muda, suspiro, exemplo concreto', sinalFreio: '"tá tudo bem" → voltar à Situação por outro ângulo' },
    { janela: 'Min 16-22', fase: 'Implicação', acao: 'Escada 3 níveis (Op → Tat → Estrat). Frase-âncora "E SE ISSO continuar 12 meses, o que vira?" Repetir 2-3x subindo o nível.', sinalAvanco: 'Silêncio prolongado, "nunca tinha pensado assim" → CRÍTICO, PARE e segure', sinalFreio: 'Cliente racionaliza demais — implicar por outro ângulo' },
    { janela: 'Min 22-27', fase: 'Necessidade', acao: 'Transição "E se isso ESTIVESSE resolvido?" + portas de necessidade ligadas à dor principal. Aplicar Técnica da Devolução.', sinalAvanco: '"faz total sentido", "é exatamente isso", "como entro?"', sinalFreio: 'Resposta morna → voltar à Implicação' },
    { janela: 'Min 27-30', fase: 'Fechamento', acao: 'Frase-mestre + 3 diferenciais + convite binário (slide 10)', sinalAvanco: 'Cliente pergunta sobre pagamento → operacionalize imediatamente', sinalFreio: 'Se 45 min ainda na fase Problema, você está conduzindo errado' }
  ]
};
