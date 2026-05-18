// =========================================================================
// PERFIS FICTÍCIOS DE TREINAMENTO — específicos por produto
// 10 produtos × 6 perfis = 60 perfis cobrindo D, I, S, C distribuídos
// =========================================================================
window.FebracisData = window.FebracisData || {};
window.FebracisData.PERFIS_TREINO_POR_PRODUTO = {

  // ========================================================================
  // TCE — Tour Crescimento Empresarial
  // ========================================================================
  tce: [
    {
      id: 'tce-empresario-saturado-d',
      nome: 'Empresário saturado',
      emoji: '🔥',
      disc: 'D',
      descricao: '"Mal tenho tempo de almoçar, vou parar 1 dia? Tá doido?"',
      contexto: 'Empresário 40+ anos, faturando 1-3mi, refém da operação. Tom curto, impaciente, decide rápido. Quer resultado em número.',
      objecaoPivot: 'Tempo (operação engole tudo)'
    },
    {
      id: 'tce-socio-cetico-c',
      nome: 'Sócio analítico cético',
      emoji: '📊',
      disc: 'C',
      descricao: '"Quero saber a metodologia, ementa, palestrantes, casos do meu setor."',
      contexto: 'Sócio 35+ anos, responsável financeiro da empresa. Quer dados antes de decidir. Pergunta detalhes técnicos. Desconfia de "guru".',
      objecaoPivot: 'Falta de prova metodológica concreta'
    },
    {
      id: 'tce-aspirante-i',
      nome: 'Aspirante entusiasmado',
      emoji: '🌱',
      disc: 'I',
      descricao: '"Cara, ouvi muito falar do Paulo, queria muito ir, mas é meu primeiro evento!"',
      contexto: 'Empreendedor jovem 25-30, empresa pequena ou em fase inicial. Sociável, fala muito, decide pela emoção. Quer fazer parte do grupo.',
      objecaoPivot: 'Insegurança de pertencimento (será que é pra mim?)'
    },
    {
      id: 'tce-resignado-s',
      nome: 'Empresário acomodado',
      emoji: '🛋️',
      disc: 'S',
      descricao: '"Já tô bem do jeito que tô. Não quero balançar o barco agora."',
      contexto: 'Empresário 45+ anos, empresa estável mas estagnada. Avesso a risco. Fala devagar. Tem família, prioriza segurança. Resiste a mudança.',
      objecaoPivot: 'Aversão a mudança ("se não tá quebrado...")'
    },
    {
      id: 'tce-gestor-decisor-dc',
      nome: 'Gestor decisor',
      emoji: '🎯',
      disc: 'DC',
      descricao: '"Vai direto ao ponto: investimento, formato, ROI esperado."',
      contexto: 'Diretor/gestor 35+ que decide rápido mas exige precisão. Curto, técnico. Não quer história, quer dado.',
      objecaoPivot: 'ROI mensurável (preciso justificar pro board)'
    },
    {
      id: 'tce-profissional-liberal-s',
      nome: 'Profissional liberal cauteloso',
      emoji: '🧑‍⚕️',
      disc: 'S',
      descricao: '"Sou advogada/dentista. Esse curso serve pra clínica/escritório também?"',
      contexto: 'Profissional liberal 35+, escritório pequeno (2-5 funcionários). Cauteloso, pergunta se serve pro contexto dele. Decide devagar.',
      objecaoPivot: 'Aderência ao contexto pessoal (será que serve pra mim?)'
    }
  ],

  // ========================================================================
  // BHP — Gestão de Negócios (4 dias)
  // ========================================================================
  bhp: [
    {
      id: 'bhp-bombeiro-d',
      nome: 'Empresário bombeiro',
      emoji: '🚒',
      disc: 'D',
      descricao: '"Não consigo sair 4 dias. Tudo trava sem mim."',
      contexto: 'Empresário 40+, tudo passa por ele. Apaga incêndio o dia inteiro. Impaciente, fala curto, decisor rápido. Vai resistir.',
      objecaoPivot: 'Centralização operacional (empresa não roda sem ele)'
    },
    {
      id: 'bhp-cetico-cursos-c',
      nome: 'Já fez vários cursos',
      emoji: '🎓',
      disc: 'C',
      descricao: '"Já fiz consultoria, MBA, mentoria. Nenhum trouxe ROI claro."',
      contexto: 'Empresário 45+, faturando 5mi+. Investiu em formação antes e ficou frustrado. Quer ementa, instrutores, cases comprovados.',
      objecaoPivot: 'Cetismo metodológico (já me prometeram isso antes)'
    },
    {
      id: 'bhp-familiar-sucessao-s',
      nome: 'Patriarca preocupado',
      emoji: '👨‍👦',
      disc: 'S',
      descricao: '"Empresa familiar 25 anos. Filhos não querem assumir. E agora?"',
      contexto: 'Empresário 55+, fundador, empresa familiar consolidada. Cauteloso, fala devagar. Preocupação real com sucessão. Não tolera urgência artificial.',
      objecaoPivot: 'Continuidade da empresa (medo de errar a transição)'
    },
    {
      id: 'bhp-pequena-i',
      nome: 'Empresário em expansão',
      emoji: '📈',
      disc: 'I',
      descricao: '"Tenho 4 funcionários só, vai servir pra mim ou é pra empresa grande?"',
      contexto: 'Empreendedor 30-35, empresa em fase de expansão (2-10 funcionários). Sociável, otimista, decide rápido pela emoção.',
      objecaoPivot: 'Tamanho da empresa (será que sou público-alvo?)'
    },
    {
      id: 'bhp-socia-financeira-dc',
      nome: 'Sócia financeira',
      emoji: '💼',
      disc: 'DC',
      descricao: '"Decisão depende do meu sócio. E preciso de números, não de papo."',
      contexto: 'Sócia 38+, responsável financeira. Direta + analítica. Quer dado, ROI, cases similares ao setor dela. Pode ser CFO contratada.',
      objecaoPivot: 'Decisão compartilhada + ROI mensurável'
    },
    {
      id: 'bhp-gestor-promovido-s',
      nome: 'Gestor recém-promovido',
      emoji: '🎩',
      disc: 'S',
      descricao: '"Acabei de virar diretor. Não sei se já posso dar conta de algo desse nível."',
      contexto: 'Gestor 35-40 promovido recentemente. Inseguro tecnicamente. Quer crescer mas tem medo de não acompanhar.',
      objecaoPivot: 'Autoconfiança (será que tô pronto?)'
    }
  ],

  // ========================================================================
  // ML5 — Formação de Líderes (190h)
  // ========================================================================
  ml5: [
    {
      id: 'ml5-tecnico-promovido-d',
      nome: 'Técnico promovido a líder',
      emoji: '⚙️',
      disc: 'D',
      descricao: '"Eu era o melhor técnico. Viraram líder e meu time não me ouve."',
      contexto: 'Profissional 32-40, ótimo técnico, virou líder por mérito mas sem treino. Frustrado, impaciente. Decisor rápido.',
      objecaoPivot: 'Frustração (resultado individual ≠ resultado de time)'
    },
    {
      id: 'ml5-mba-cetico-c',
      nome: 'MBA já formado',
      emoji: '🎓',
      disc: 'C',
      descricao: '"Já fiz MBA em gestão. Quero a diferença real disso pro que estudei."',
      contexto: 'Líder 38+, formação acadêmica forte. Cético sobre cursos práticos. Pergunta diferenciais, metodologia, base científica.',
      objecaoPivot: 'Sobreposição com formação anterior'
    },
    {
      id: 'ml5-empresario-gargalo-s',
      nome: 'Sócio-fundador gargalo',
      emoji: '🚧',
      disc: 'S',
      descricao: '"Tudo passa por mim. Mas como confiar em alguém pra tomar decisão crítica?"',
      contexto: 'Sócio-fundador 45+, empresa cresceu mas ele virou gargalo. Cauteloso. Resistência emocional a delegar.',
      objecaoPivot: 'Confiança no time (medo de delegar errado)'
    },
    {
      id: 'ml5-rh-i',
      nome: 'Gestora de RH expansiva',
      emoji: '🤝',
      disc: 'I',
      descricao: '"Quero formar líderes na minha empresa! Como começar essa jornada?"',
      contexto: 'Gestora de RH 30-40, sociável, entusiasmada. Quer transformar a cultura. Decide pela emoção e energia.',
      objecaoPivot: 'Validar pertencimento (a empresa vai me apoiar?)'
    },
    {
      id: 'ml5-veterano-arrogante-d',
      nome: 'Líder veterano',
      emoji: '👴',
      disc: 'D',
      descricao: '"Lidero há 20 anos. Pra que ML5? Já tô formado pela vida."',
      contexto: 'Líder 50+, muito experiente, ego alto. Resiste a "voltar pra escola". Cortante, irônico.',
      objecaoPivot: 'Soberba (já sei tudo o que precisa)'
    },
    {
      id: 'ml5-socio-novo-prudente-s',
      nome: 'Sócio recém-promovido',
      emoji: '🌿',
      disc: 'S',
      descricao: '"Time pequeno, 4 pessoas. 190h é muito investimento pra esse momento."',
      contexto: 'Sócio 28-35, recém-promovido, prudente. Fala devagar, pesa decisão. Quer crescer mas com cautela.',
      objecaoPivot: 'Volume de horas vs estágio da empresa'
    }
  ],

  // ========================================================================
  // FCIS — Coaching Integral Sistêmico
  // ========================================================================
  fcis: [
    {
      id: 'fcis-perdido-s',
      nome: 'Pessoa em transição',
      emoji: '🧭',
      disc: 'S',
      descricao: '"Não sei o que quero ser quando crescer e já tenho 38 anos."',
      contexto: 'Profissional 35-45 em crise existencial. Saturado da carreira. Cauteloso, pergunta muito. Medo de mudar errado.',
      objecaoPivot: 'Falta de direção clara (não sei se é coaching que quero)'
    },
    {
      id: 'fcis-cetico-mercado-c',
      nome: 'Cético sobre mercado',
      emoji: '🔍',
      disc: 'C',
      descricao: '"Coach tá saturado no Brasil. Que diferencial real tenho fazendo essa formação?"',
      contexto: 'Profissional 30-40, pesquisa antes de comprar. Pede números, casos, taxa de empregabilidade. Não tolera "venda emocional".',
      objecaoPivot: 'Saturação do mercado de coaching'
    },
    {
      id: 'fcis-saturado-i',
      nome: 'Profissional saturado',
      emoji: '🌅',
      disc: 'I',
      descricao: '"Cansei do meu trabalho. Quero virar coach! Mas não sei monetizar."',
      contexto: 'Profissional 35-45, sociável, decide pela emoção. Tem dinheiro, mas falta método. Otimista demais sobre virar coach.',
      objecaoPivot: 'Monetização (vai dar pra viver disso?)'
    },
    {
      id: 'fcis-psicologa-tecnica-c',
      nome: 'Psicóloga técnica',
      emoji: '🧠',
      disc: 'C',
      descricao: '"Sou CRP. Qual diferença vs psicologia clínica? Conselho aceita?"',
      contexto: 'Psicóloga/terapeuta 35+, tecnicamente sólida. Quer expandir repertório mas com rigor científico. Pergunta detalhes ético-técnicos.',
      objecaoPivot: 'Rigor técnico vs psicologia clínica'
    },
    {
      id: 'fcis-empresario-time-d',
      nome: 'Empresário pragmático',
      emoji: '🏢',
      disc: 'D',
      descricao: '"Quero usar com meu time, não vou virar coach profissional. Vale a pena?"',
      contexto: 'Empresário 40+, decisor rápido. Não quer profissão nova, quer ferramenta. Cético sobre 268h pra uso interno.',
      objecaoPivot: 'Carga horária vs uso prático limitado'
    },
    {
      id: 'fcis-coach-outra-escola-d',
      nome: 'Coach de outra escola',
      emoji: '🎖️',
      disc: 'D',
      descricao: '"Já sou coach formado. Por que refazer formação?"',
      contexto: 'Coach 35+ formado por escola menor. Ego alto. Sente competição. Resiste a "começar do zero".',
      objecaoPivot: 'Ego profissional (já sou coach)'
    }
  ],

  // ========================================================================
  // FGPC — Gestão de Pessoas com Perfil Comportamental (DISC)
  // ========================================================================
  fgpc: [
    {
      id: 'fgpc-rh-analitico-c',
      nome: 'Gestor de RH técnico',
      emoji: '📋',
      disc: 'C',
      descricao: '"Já uso DISC no meu RH. Qual a base científica e diferencial vs outros?"',
      contexto: 'Gestor de RH 35+ técnico. Já testou ferramentas comportamentais. Quer rigor metodológico.',
      objecaoPivot: 'Diferencial científico vs outras ferramentas DISC'
    },
    {
      id: 'fgpc-empresario-turnover-d',
      nome: 'Empresário com turnover',
      emoji: '🚪',
      disc: 'D',
      descricao: '"Demito 2 a cada 3 meses. Tô gastando rios em recontratação."',
      contexto: 'Empresário 40+ pragmático, atacado por turnover. Quer parar a sangria. Direto, decide rápido.',
      objecaoPivot: 'ROI rápido (preciso parar de demitir errado)'
    },
    {
      id: 'fgpc-lider-conflitos-s',
      nome: 'Líder evitando conflitos',
      emoji: '🕊️',
      disc: 'S',
      descricao: '"Meu time briga. Eu evito feedback porque não sei dar sem ofender."',
      contexto: 'Líder 35-45, perfil S, evita conflito por natureza. Reconhece a fragilidade. Cauteloso, pesa cada palavra.',
      objecaoPivot: 'Inseguro pra dar feedback duro'
    },
    {
      id: 'fgpc-vendedora-i',
      nome: 'Vendedora sociável',
      emoji: '💬',
      disc: 'I',
      descricao: '"Quero entender perfil dos clientes pra vender mais! Adoraria fazer."',
      contexto: 'Vendedora 28-35, sociável, energética. Vê DISC como ferramenta de venda, não gestão. Decide rápido.',
      objecaoPivot: 'Aplicação prática em vendas (foco diferente)'
    },
    {
      id: 'fgpc-jurista-medico-c',
      nome: 'Profissional liberal técnico',
      emoji: '⚖️',
      disc: 'C',
      descricao: '"Sou advogado/médico. Posso aplicar com meus clientes? Ético?"',
      contexto: 'Advogado/médico 38+, técnico. Quer expandir prática profissional. Pergunta aspectos éticos e técnicos.',
      objecaoPivot: 'Aderência ética/profissional ao código de classe'
    },
    {
      id: 'fgpc-cetico-disc-d',
      nome: 'Cético sobre DISC',
      emoji: '🤨',
      disc: 'D',
      descricao: '"DISC é coisa de motivacional/coachingueiro. Cadê a ciência?"',
      contexto: 'Empresário 45+ cínico. Já viu DISC ser mal usado. Direto, irônico. Vai testar metodologia.',
      objecaoPivot: 'Credibilidade científica do DISC'
    }
  ],

  // ========================================================================
  // IF — Inteligência Financeira
  // ========================================================================
  if: [
    {
      id: 'if-endividado-vergonha-s',
      nome: 'Endividado crônico',
      emoji: '😔',
      disc: 'S',
      descricao: '"Tenho dívida que arrasto há 4 anos. Vergonha de admitir."',
      contexto: 'Pessoa 35-50, endividada cronicamente. Vergonha social. Cauteloso, fala baixo. Quer ajuda mas teme julgamento.',
      objecaoPivot: 'Vergonha + ceticismo de "já tentei"'
    },
    {
      id: 'if-empresario-rico-pobre-d',
      nome: 'Fatura bem, sem patrimônio',
      emoji: '🌪️',
      disc: 'D',
      descricao: '"Faturo 50k/mês mas não sobra nada. Aonde tá o problema?"',
      contexto: 'Empresário 35-45, fatura alto, gasta alto. Decisor rápido, impaciente. Quer fórmula, não terapia.',
      objecaoPivot: 'Quer técnica financeira, resiste a "trabalho de crença"'
    },
    {
      id: 'if-financista-tecnico-c',
      nome: 'Já estudou finanças',
      emoji: '📊',
      disc: 'C',
      descricao: '"Sei tudo sobre Tesouro, ações, FII. Pra que esse curso?"',
      contexto: 'Profissional 30-40 com letramento financeiro. Cético sobre lado emocional. Quer prova técnica.',
      objecaoPivot: 'Já entende a parte técnica (resiste à emocional)'
    },
    {
      id: 'if-jovem-aspirante-i',
      nome: 'Jovem profissional',
      emoji: '🚀',
      disc: 'I',
      descricao: '"Quero ficar rico! Mas começo do zero, nem sei como abrir poupança."',
      contexto: 'Jovem 25-32, otimista, começando carreira. Sociável. Pode ter dívida de cartão crescendo. Decide pela emoção.',
      objecaoPivot: 'Imediatismo (quero resultado rápido)'
    },
    {
      id: 'if-classe-media-resignado-s',
      nome: 'Classe média acomodada',
      emoji: '🛏️',
      disc: 'S',
      descricao: '"Minha família sempre foi simples. Acho que o problema é estrutural."',
      contexto: 'Pessoa 40-55, classe média, herdou crenças de escassez. Cauteloso, evita risco. Resigna-se ao destino.',
      objecaoPivot: 'Crenças geracionais sobre dinheiro'
    },
    {
      id: 'if-investidor-novato-c',
      nome: 'Investidor iniciante',
      emoji: '📈',
      disc: 'C',
      descricao: '"Já invisto há 1 ano. Pra que reprogramação se já estou no caminho?"',
      contexto: 'Profissional 30-40 que começou a investir. Acha que basta. Pergunta tecnicalidades. Não vê a parte emocional.',
      objecaoPivot: 'Subestima fator emocional/comportamental'
    }
  ],

  // ========================================================================
  // TAV — Técnicas Avançadas em Vendas
  // ========================================================================
  tav: [
    {
      id: 'tav-vendedor-veterano-d',
      nome: 'Vendedor veterano',
      emoji: '🏅',
      disc: 'D',
      descricao: '"Vendo há 15 anos. Bato meta todo mês. Pra que curso?"',
      contexto: 'Vendedor 40+, alta performance pessoal. Ego alto. Direto, irônico. Pode estar batendo no teto sem perceber.',
      objecaoPivot: 'Já vendo bem (resistência a humildade)'
    },
    {
      id: 'tav-gerente-comercial-c',
      nome: 'Gerente comercial técnico',
      emoji: '🎯',
      disc: 'C',
      descricao: '"Quero metodologia que padronize meu time todo. Tem framework?"',
      contexto: 'Gestor comercial 35+, técnico. Quer ferramenta replicável. Pede ementa, ferramentas, KPIs medíveis.',
      objecaoPivot: 'Replicabilidade do método no time'
    },
    {
      id: 'tav-empresario-vende-sozinho-i',
      nome: 'Empresário que vende sozinho',
      emoji: '👤',
      disc: 'I',
      descricao: '"Eu vendo bem. Mas meu time não. Como replico?"',
      contexto: 'Empresário 35-45, sociável, naturalmente vendedor. Time não acompanha. Quer multiplicar resultado.',
      objecaoPivot: 'Replicação de talento natural'
    },
    {
      id: 'tav-profissional-liberal-vende-s',
      nome: 'Profissional liberal',
      emoji: '🤝',
      disc: 'S',
      descricao: '"Sou advogado, não vendedor. Não quero parecer empurrando."',
      contexto: 'Profissional liberal 35+, cauteloso, valoriza imagem profissional. Resiste a "técnica de venda" por medo de soar invasivo.',
      objecaoPivot: 'Identidade profissional (não sou vendedor)'
    },
    {
      id: 'tav-novato-energetico-i',
      nome: 'Vendedor novato',
      emoji: '⚡',
      disc: 'I',
      descricao: '"Comecei agora! Quero acelerar! Vou conseguir absorver 16h?"',
      contexto: 'Vendedor 25-30, novato, sociável, energético. Otimista demais. Pode ter ansiedade.',
      objecaoPivot: 'Ansiedade de absorção (novato cru)'
    },
    {
      id: 'tav-cetico-tecnica-d',
      nome: 'Cético sobre técnica',
      emoji: '🎭',
      disc: 'D',
      descricao: '"Vendas é dom. Ou você nasce ou esquece. Curso não muda isso."',
      contexto: 'Empresário 45+, vende empiricamente. Cínico sobre "técnicas". Direto, vai confrontar.',
      objecaoPivot: 'Crença "vendas é dom"'
    }
  ],

  // ========================================================================
  // CEOP — Comunicação e Oratória Persuasiva
  // ========================================================================
  ceop: [
    {
      id: 'ceop-timido-cronico-s',
      nome: 'Tímido crônico',
      emoji: '🙈',
      disc: 'S',
      descricao: '"Sempre fui assim. Família toda é assim. Acho que não muda."',
      contexto: 'Profissional 30-45, tímido por natureza/criação. Cauteloso, fala baixo, evita exposição. Resignado.',
      objecaoPivot: 'Crença "timidez é personalidade"'
    },
    {
      id: 'ceop-empresario-evita-d',
      nome: 'Empresário que evita',
      emoji: '🚪',
      disc: 'D',
      descricao: '"Meu sócio fala em reuniões. Eu evito. E tô perdendo cliente importante."',
      contexto: 'Empresário 40+, eficiente nos bastidores, paralisa em público. Frustrado consigo mesmo. Direto, quer solução prática.',
      objecaoPivot: 'Frustração (saber que está perdendo oportunidade)'
    },
    {
      id: 'ceop-introvertido-tecnico-c',
      nome: 'Técnico introvertido',
      emoji: '🔬',
      disc: 'C',
      descricao: '"Sou tecnicamente bom mas não me vendo. CEOP serve pra introvertido?"',
      contexto: 'Profissional 30-40 técnico (TI, engenharia, médico). Introvertido. Detalhista. Quer comprovação científica do método.',
      objecaoPivot: 'Identidade introvertida (CEOP é pra extrovertido?)'
    },
    {
      id: 'ceop-vendedora-conexao-i',
      nome: 'Vendedora com conexão',
      emoji: '💛',
      disc: 'I',
      descricao: '"Adoro conversar! Mas perco fechamento. Falta convicção."',
      contexto: 'Vendedora 28-38, sociável, ótima em rapport. Falha no fechamento por falta de pitch estruturado. Decide pela emoção.',
      objecaoPivot: 'Conexão sem conversão'
    },
    {
      id: 'ceop-lider-hierarquico-s',
      nome: 'Líder pela hierarquia',
      emoji: '🪑',
      disc: 'S',
      descricao: '"Meu time me ouve porque sou chefe. Não porque me admira."',
      contexto: 'Líder 40+, autoridade vem do cargo. Discurso burocrático. Sente que falta inspiração. Cauteloso.',
      objecaoPivot: 'Autoridade hierárquica vs comunicação inspiradora'
    },
    {
      id: 'ceop-aspirante-palestrante-i',
      nome: 'Aspirante a palestrante',
      emoji: '🎤',
      disc: 'I',
      descricao: '"Quero virar palestrante! Mas nunca subi num palco. Como começar?"',
      contexto: 'Profissional 30-40, sociável, sonhador. Decide pela emoção. Quer monetizar discurso. Otimista.',
      objecaoPivot: 'Realismo sobre carreira de palestrante'
    }
  ],

  // ========================================================================
  // Master Coaching (exclusivo FCIS)
  // ========================================================================
  master: [
    {
      id: 'master-coach-estagnado-s',
      nome: 'Coach FCIS estagnado',
      emoji: '🌫️',
      disc: 'S',
      descricao: '"Atendo bem mas faturo R$ 8k/mês há 2 anos. Não consigo cobrar mais."',
      contexto: 'Coach 35-45 formado FCIS, atendendo regularmente, mas estagnado em ticket baixo. Inseguro de cobrar premium. Cauteloso.',
      objecaoPivot: 'Autoconfiança pra elevar ticket'
    },
    {
      id: 'master-c-level-d',
      nome: 'Quer atender executivos',
      emoji: '🥇',
      disc: 'D',
      descricao: '"Quero atender CEO, board, executivo C-level. Master me leva lá?"',
      contexto: 'Coach 38+ ambicioso, decisor rápido. Quer ticket premium e reconhecimento. Direto.',
      objecaoPivot: 'Validar acesso a mercado premium'
    },
    {
      id: 'master-marketing-i',
      nome: 'Coach com pouco marketing',
      emoji: '📣',
      disc: 'I',
      descricao: '"Tenho técnica! Mas não sei me vender, Instagram parado."',
      contexto: 'Coach 30-40, sociável, técnica forte mas marketing fraco. Decide pela emoção. Quer escalar.',
      objecaoPivot: 'Lacuna de marketing pessoal'
    },
    {
      id: 'master-cetico-volume-c',
      nome: 'Cético sobre 204h',
      emoji: '⏳',
      disc: 'C',
      descricao: '"204h é demais. Qual ROI específico em horas pra cada hora investida?"',
      contexto: 'Coach 40+ analítico, cauteloso. Pergunta retorno claro. Já investiu tempo em formação.',
      objecaoPivot: 'Volume de horas vs ROI mensurável'
    },
    {
      id: 'master-internacional-c',
      nome: 'Quer atender em dólar',
      emoji: '🌎',
      disc: 'C',
      descricao: '"FCU é universidade reconhecida lá fora? Validade real internacional?"',
      contexto: 'Coach 35+, técnico, quer mercado internacional. Pergunta sobre credibilidade da FCU, validade dos créditos.',
      objecaoPivot: 'Validade real da credencial internacional'
    },
    {
      id: 'master-autodidata-d',
      nome: 'Autodidata pós-FCIS',
      emoji: '📚',
      disc: 'D',
      descricao: '"Já leio, faço workshops, mentorias. Tô me virando bem sozinho."',
      contexto: 'Coach 35-45 confiante. Investe em educação avulsa. Resiste a formação estruturada. Direto.',
      objecaoPivot: 'Autossuficiência (já me viro sozinho)'
    }
  ],

  // ========================================================================
  // CIS — Método CIS (produto-mãe)
  // ========================================================================
  cis: [
    {
      id: 'cis-cetico-motivacional-d',
      nome: 'Cético "motivacional"',
      emoji: '🤨',
      disc: 'D',
      descricao: '"Já vi vídeo do Paulo no YouTube. Acho motivacional barato."',
      contexto: 'Pessoa 35-50, cínica, viu cortes mal contextualizados. Decisor rápido, irônico. Quer prova de método, não de fé.',
      objecaoPivot: 'Confunde método com motivacional'
    },
    {
      id: 'cis-em-crise-emocional-s',
      nome: 'Pessoa em crise',
      emoji: '🌧️',
      disc: 'S',
      descricao: '"Tô passando por uma fase muito difícil. Não sei se aguento 3 dias."',
      contexto: 'Pessoa 30-50 em crise pessoal/familiar/financeira. Cauteloso, fala baixo. Vergonha de exposição.',
      objecaoPivot: 'Vulnerabilidade (não tô em momento de me expor)'
    },
    {
      id: 'cis-empresario-equilibrio-d',
      nome: 'Empresário desequilibrado',
      emoji: '⚖️',
      disc: 'D',
      descricao: '"Faturo bem mas tô divorciando, não vejo filho, não durmo."',
      contexto: 'Empresário 40+ que tem dinheiro mas vida pessoal em ruínas. Direto, frustrado. Quer solução pragmática.',
      objecaoPivot: 'Não acredita que evento "emocional" muda vida concreta'
    },
    {
      id: 'cis-jovem-coach-i',
      nome: 'Aspirante a coach',
      emoji: '🌟',
      disc: 'I',
      descricao: '"Quero virar coach! O Paulo Vieira me inspira muito! Por onde começo?"',
      contexto: 'Jovem 22-30, sociável, sonhador, fã do Paulo. Decisor emocional rápido. Otimista demais.',
      objecaoPivot: 'Realismo sobre carreira de coach'
    },
    {
      id: 'cis-pacote-c',
      nome: 'Quer comparar pacotes',
      emoji: '🛒',
      disc: 'C',
      descricao: '"Bronze, Black, Diamond, VIP — qual o ROI de cada um? Vale o Diamond?"',
      contexto: 'Pessoa 35-45 analítica, comparando opções. Quer sentir que escolheu certo. Detalhista.',
      objecaoPivot: 'Escolha racional entre pacotes'
    },
    {
      id: 'cis-religioso-cauteloso-s',
      nome: 'Pessoa religiosa cautelosa',
      emoji: '✝️',
      disc: 'S',
      descricao: '"Florida Christian — é cristão? Tem prática espiritual? Tô em dúvida."',
      contexto: 'Pessoa 40-55 religiosa (cristã ou outra fé). Cauteloso, valores tradicionais. Quer confirmar que CIS não fere crença.',
      objecaoPivot: 'Aderência aos valores religiosos'
    }
  ]
};
