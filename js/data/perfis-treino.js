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
    },
    // ====== D — Dominância (11) ======
    { id: 'tce-empresario-estagnado-d', nome: 'Empresário com vendas estagnadas', emoji: '📉', disc: 'D', descricao: '"Faturamento travado há 18 meses. Vai me ensinar a destravar em 1 dia?"', contexto: 'Empresário 42 anos, R$ 1.5mi/ano travado. Frustrado, cético com "evento de 1 dia". Quer prova rápida, vai pressionar com fatos.', objecaoPivot: 'Ceticismo com formato curto (1 dia parece pouco)' },
    { id: 'tce-dono-rede-loja-d', nome: 'Dono de rede varejista', emoji: '🛒', disc: 'D', descricao: '"Tenho 5 lojas. Performance varia entre elas. Quero padronizar e crescer."', contexto: 'Empresário 45 anos, varejo. Operador. Quer ferramentas pra padronizar gestão entre lojas. Tom direto, decide rápido.', objecaoPivot: 'Padronização de unidades múltiplas' },
    { id: 'tce-empresaria-marketing-fraco-d', nome: 'Empresária frustrada com marketing', emoji: '📱', disc: 'D', descricao: '"Investi 100 mil em mídia paga e vendi 30. Marketing digital funciona ou não?"', contexto: 'Empresária 40 anos, queimou caixa em ads. Cética com agências. Quer entender Método dos Dígitos. Direta, agressiva.', objecaoPivot: 'Ceticismo com marketing digital (já queimou caixa)' },
    { id: 'tce-bombeiro-operacional-d', nome: 'Empresário bombeiro operacional', emoji: '🚒', disc: 'D', descricao: '"Vivo apagando incêndio. Não tenho como sair 1 dia inteiro."', contexto: 'Founder 40+, operação centralizada nele. Impaciente, apressado. Vai resistir mesmo querendo. Cobra ROI imediato.', objecaoPivot: 'Refém da operação (vai resistir a sair 1 dia)' },
    { id: 'tce-presidente-conselho-d', nome: 'Presidente do conselho', emoji: '🏛️', disc: 'D', descricao: '"Vou indicar pros diretores. Tem nível pra perfil sênior?"', contexto: 'Presidente 60+, mandar a turma de diretores ao TCE. Quer validar se o nível atende a sênior. Direto, formal.', objecaoPivot: 'Adequação a perfil sênior (não vai parecer básico?)' },
    { id: 'tce-empresario-50mi-d', nome: 'Empresário de empresa média', emoji: '🏢', disc: 'D', descricao: '"Faturo 50mi. Tour parece pra empresário pequeno. Tem algo pra mim?"', contexto: 'CEO 48 anos, empresa R$ 50mi+. Acha que TCE é "básico". Soberbo. Cobra valor proporcional ao porte.', objecaoPivot: 'Sobre-qualificação por tamanho da empresa' },
    { id: 'tce-empresario-novo-mercado-d', nome: 'Empresário entrando em novo mercado', emoji: '🆕', disc: 'D', descricao: '"Vou abrir nova vertical. Quero acelerar — não tenho 12 meses pra aprender."', contexto: 'Founder 38 anos, expansão pra novo mercado. Pressa. Quer atalho metodológico. Decisor rápido, paga se vê valor.', objecaoPivot: 'Velocidade na curva de aprendizado' },
    { id: 'tce-diretor-multinacional-d', nome: 'Diretor de multinacional empreendedor', emoji: '✈️', disc: 'D', descricao: '"Vou abrir minha empresa. Tenho expertise técnica mas falta gestão. 1 dia ajuda?"', contexto: 'Executivo sênior 45+ saindo de multinacional. Vai empreender. Disciplinado, direto. Quer fundamentos rápidos.', objecaoPivot: 'Migração corporativa → empreendedorismo' },
    { id: 'tce-empresario-comercial-d', nome: 'Comerciante varejista', emoji: '💼', disc: 'D', descricao: '"Vendo bem, mas margem tá ruim. Como sair da briga de preço?"', contexto: 'Comerciante 50 anos, médio porte. Briga preço com concorrência. Direto, prático. Quer técnica de margem.', objecaoPivot: 'Diferenciação vs guerra de preço' },
    { id: 'tce-empresaria-franqueada-d', nome: 'Franqueada de rede grande', emoji: '🏪', disc: 'D', descricao: '"Sou franqueada. Posso aplicar TCE no meu modelo?"', contexto: 'Franqueada 42 anos. Tem manual da franquia, mas quer crescer além. Pragmática. Avalia se vale o investimento.', objecaoPivot: 'Aderência ao modelo franqueado (regras da franqueadora)' },
    { id: 'tce-dono-pme-acumulado-d', nome: 'Dono de PME sobrecarregado', emoji: '😤', disc: 'D', descricao: '"Já fiz 4 cursos. Mais um pra estante? Me convence."', contexto: 'Dono 45 anos, R$ 3mi/ano. Coleção de cursos não aplicados. Cínico, cobra prova. Tom impositivo.', objecaoPivot: 'Saturação de cursos sem aplicação' },
    // ====== I — Influência (11) ======
    { id: 'tce-influencer-empresaria-i', nome: 'Empresária digital influencer', emoji: '📸', disc: 'I', descricao: '"Tenho marca pessoal forte! Quero escalar pra empresa de verdade."', contexto: 'Empresária 32 anos, ~100k seguidores. Marca pessoal vendendo bem. Quer estruturar empresa. Animada, fala muito.', objecaoPivot: 'Profissionalização de operação além da pessoa física' },
    { id: 'tce-gestor-comercial-pop-i', nome: 'Gerente comercial popular', emoji: '🤝', disc: 'I', descricao: '"Adoro vender! Quero que meu time venda igual eu — com paixão!"', contexto: 'Gerente comercial 36 anos, vendedor nato. Popular, vê pessoas. Quer ferramentas pra ensinar — não só fazer.', objecaoPivot: 'Transferir habilidade tácita pro time' },
    { id: 'tce-empresaria-evento-i', nome: 'Empresária do setor de eventos', emoji: '🎉', disc: 'I', descricao: '"Trabalho com eventos! Adoraria ir, mas é minha época mais corrida."', contexto: 'Empresária 38 anos, agência de eventos. Carismática, vende relacionamento. Decide pelo sentimento.', objecaoPivot: 'Conflito de agenda (período de pico do setor)' },
    { id: 'tce-founder-jovem-i', nome: 'Founder jovem sonhador', emoji: '🌈', disc: 'I', descricao: '"Tenho 25 anos! Empresa pequena, mas sonho ser unicórnio brasileiro!"', contexto: 'Empreendedor 25 anos, startup. Ambição grande, base pequena. Decide pela emoção. Conversa muito.', objecaoPivot: 'Empolgação × estrutura (precisa de método pra realizar sonho)' },
    { id: 'tce-mae-empreendedora-i', nome: 'Mãe empreendedora carismática', emoji: '🌺', disc: 'I', descricao: '"Comecei do zero! Quero contar com vocês pra próximo nível."', contexto: 'Empreendedora 35 anos, e-commerce de moda. Carismática, super conectada. Decide pelo apoio percebido.', objecaoPivot: 'Confiança de pertencer à comunidade Febracis' },
    { id: 'tce-vendedora-promovida-i', nome: 'Vendedora promovida a sócia', emoji: '🌟', disc: 'I', descricao: '"Era a top vendedora! Virei sócia e tô perdida no estratégico."', contexto: 'Sócia comercial 34 anos, recém-promovida. Carismática mas sem visão estratégica. Aberta a aprender.', objecaoPivot: 'Transição de vendedora pra estratega' },
    { id: 'tce-coach-aspirante-i', nome: 'Aspirante a empresário-coach', emoji: '🎤', disc: 'I', descricao: '"Quero migrar pra área de desenvolvimento! TCE é por onde começar?"', contexto: 'Profissional 32 anos, quer migrar pra coach/mentor. Empolgado, conversa muito. Decide pela inspiração.', objecaoPivot: 'Avaliação de migração de carreira' },
    { id: 'tce-empresaria-beleza-i', nome: 'Dona de salão/clínica de estética', emoji: '💇‍♀️', disc: 'I', descricao: '"Adoro o que faço! Mas time vive em drama. Como melhorar?"', contexto: 'Empresária 40 anos, salão grande. Materna, querida. Time bagunçado. Quer harmonia + resultado.', objecaoPivot: 'Conflito de equipe sem perder o clima leve' },
    { id: 'tce-empresario-bairro-i', nome: 'Empresário bem relacionado da cidade', emoji: '🌆', disc: 'I', descricao: '"Tô curtindo a ideia de ter o Paulo Vieira aqui! Vou levar uns amigos!"', contexto: 'Empresário 45 anos, cidade pequena. Bem relacionado. Conversa muito. Decide pelo evento social.', objecaoPivot: 'Networking como driver principal' },
    { id: 'tce-marketing-digital-i', nome: 'Profissional de marketing digital', emoji: '📲', disc: 'I', descricao: '"Trabalho com tráfego há 3 anos. Quero conhecer Método dos Dígitos!"', contexto: 'Profissional 30 anos, agência de tráfego. Otimista, curioso. Decide pela novidade técnica + visibilidade.', objecaoPivot: 'Validar diferencial técnico do método' },
    { id: 'tce-empresaria-vovo-i', nome: 'Empresária 55+ engajada', emoji: '🌷', disc: 'I', descricao: '"Tô na empresa há 30 anos. Quero me atualizar e levar minha filha!"', contexto: 'Empresária 55+, querida, sociável. Quer transferir negócio à filha. Decide pela aprovação familiar.', objecaoPivot: 'Sucessão familiar com modernização' },
    // ====== S — Estabilidade (11) ======
    { id: 'tce-sucessor-prudente-s', nome: 'Sucessor familiar prudente', emoji: '👨‍👨‍👦', disc: 'S', descricao: '"Pai fundou. Vou assumir e tenho medo de mudar e estragar."', contexto: 'Sucessor 30 anos, herdeiro. Empresa 35 anos. Cauteloso, lento pra decidir. Respeita legado, teme mexer.', objecaoPivot: 'Mudar sem ferir legado paterno' },
    { id: 'tce-medico-clinica-s', nome: 'Médico dono de clínica', emoji: '🩺', disc: 'S', descricao: '"Sou bom médico, péssimo gestor. Será que dá pra aprender em 1 dia?"', contexto: 'Médico 45 anos, clínica 8 funcionários. Técnico excelente, gestor instintivo. Cauteloso. Quer estrutura.', objecaoPivot: 'Especialista virou gestor (sem formação em gestão)' },
    { id: 'tce-empresario-50anos-s', nome: 'Empresário 50+ acomodado', emoji: '🛋️', disc: 'S', descricao: '"Tô bem. Pra que mexer no que tá funcionando?"', contexto: 'Dono 55+, empresa estável mas estagnada. Avesso a risco. Família tranquila. Vai resistir a "mudança radical".', objecaoPivot: 'Aversão a mudança (zona de conforto)' },
    { id: 'tce-engenheiro-fabrica-s', nome: 'Engenheiro dono de pequena fábrica', emoji: '🏭', disc: 'S', descricao: '"Negócio tradicional. Tour parece muito "marketing digital". É pra mim?"', contexto: 'Engenheiro 50+, fábrica industrial. Tradicional, lento pra adotar digital. Cético com modernidade.', objecaoPivot: 'Aderência a negócio tradicional (não digital)' },
    { id: 'tce-comerciante-veterano-s', nome: 'Comerciante veterano da cidade', emoji: '🏪', disc: 'S', descricao: '"Tenho a loja há 25 anos. Filho quer modernizar. Faz sentido?"', contexto: 'Comerciante 55+. Loja tradicional. Filho jovem quer modernizar. Cauteloso, paciente. Decide com calma.', objecaoPivot: 'Conflito de gerações na empresa' },
    { id: 'tce-empresario-interior-s', nome: 'Empresário de cidade pequena', emoji: '🌾', disc: 'S', descricao: '"Cidade pequena. Estratégia do Tour funciona pra mercado de 80 mil habitantes?"', contexto: 'Empresário 48 anos, interior. Mercado limitado. Cauteloso com generalizações. Pergunta aderência.', objecaoPivot: 'Aderência a mercado regional pequeno' },
    { id: 'tce-empresaria-mae-s', nome: 'Empresária mãe de pequenos', emoji: '👶', disc: 'S', descricao: '"Tenho filho de 2 anos. Sair o dia inteiro pesa muito agora."', contexto: 'Mãe 33 anos, empresa pequena. Conciliação família/trabalho. Cauteloso com tempo fora.', objecaoPivot: 'Conciliação família × evento dia inteiro' },
    { id: 'tce-empresario-religioso-s', nome: 'Empresário religioso', emoji: '🙏', disc: 'S', descricao: '"Tenho princípios. Tour é "espiritualizado" demais ou é técnico?"', contexto: 'Empresário 50+, fé forte. Avalia coerência ética. Calmo, observador. Não decide rápido.', objecaoPivot: 'Alinhamento ético-religioso com conteúdo' },
    { id: 'tce-empresario-tradicional-s', nome: 'Empresário familiar tradicional', emoji: '👴', disc: 'S', descricao: '"Empresa familiar, 3ª geração. Mudança aqui é assunto delicado."', contexto: 'Empresário 50+, 3ª geração da família. Decisão por consenso familiar. Lento, cauteloso. Respeita histórico.', objecaoPivot: 'Decisão familiar coletiva (não decide sozinho)' },
    { id: 'tce-funcionario-promovido-s', nome: 'Funcionário promovido a líder', emoji: '🎖️', disc: 'S', descricao: '"Trabalho aqui há 15 anos. Promovido a gerente. Não me sinto preparado."', contexto: 'Promovido 42 anos, leal à empresa. Inseguro como líder. Quer aprender mas calado. Tem receio de errar.', objecaoPivot: 'Insegurança recém-promovido' },
    { id: 'tce-empresario-2filhos-s', nome: 'Empresário com 2 sócios filhos', emoji: '👨‍👩‍👦‍👦', disc: 'S', descricao: '"Tenho 2 filhos na empresa. Eles brigam. Como organizar?"', contexto: 'Pai 60+, dois filhos sócios em conflito. Empático, sofrendo. Quer paz e estrutura. Lento, pondera muito.', objecaoPivot: 'Conflito entre sócios filhos' },
    // ====== C — Conformidade (11) ======
    { id: 'tce-cfo-analitico-c', nome: 'CFO analítico', emoji: '🧮', disc: 'C', descricao: '"Quero ementa detalhada, perfil dos palestrantes e cases mensuráveis."', contexto: 'CFO 44 anos. Tudo por dado. Quer documentação. Cético com evento "motivacional". Cobra precisão.', objecaoPivot: 'Falta de prova metodológica concreta' },
    { id: 'tce-engenheiro-empresario-c', nome: 'Engenheiro empresário', emoji: '⚙️', disc: 'C', descricao: '"Mostra o processo: input, ferramentas, output. Quero ver o método em fluxo."', contexto: 'Engenheiro 42 anos, sócio. Mentalidade processual. Quer fluxograma do que vai aprender. Detalhista.', objecaoPivot: 'Visibilidade do "como" do método' },
    { id: 'tce-advogado-banca-c', nome: 'Advogado dono de banca', emoji: '⚖️', disc: 'C', descricao: '"Quero contrato, política de cancelamento, ementa antes. Não decido na hora."', contexto: 'Advogado 45 anos. Formal. Lê tudo antes. Decisão não impulsiva. Pergunta letras miúdas.', objecaoPivot: 'Documentação formal e garantias' },
    { id: 'tce-doutor-empresario-c', nome: 'Doutor empresário', emoji: '🎓', disc: 'C', descricao: '"Tenho PhD. TCE tem profundidade ou é palestra motivacional disfarçada?"', contexto: 'PhD 48 anos, virou empresário. Cético com cursos populares. Pergunta autoria, referências, bibliografia.', objecaoPivot: 'Profundidade vs superficialidade motivacional' },
    { id: 'tce-auditor-empresario-c', nome: 'Auditor empresário', emoji: '📑', disc: 'C', descricao: '"Quero ver currículo dos palestrantes, certificações da Febracis e CNAE."', contexto: 'Auditor 50+, sócio empresa de auditoria. Formalista. Detalhista. Pergunta credenciais formais.', objecaoPivot: 'Credibilidade formal e credenciais' },
    { id: 'tce-arquiteto-perfeccionista-c', nome: 'Arquiteto perfeccionista', emoji: '📐', disc: 'C', descricao: '"Qual o perfil dos outros empresários da turma? Não quero estar com gente inexperiente."', contexto: 'Arquiteto 42 anos, premium. Quer ambiente de pares. Perfeccionista. Detalhista.', objecaoPivot: 'Qualidade do público presente' },
    { id: 'tce-controller-rh-c', nome: 'Controller de RH', emoji: '🗃️', disc: 'C', descricao: '"Vou aprovar pra 15 líderes. Preciso justificar com KPI claro pro CEO."', contexto: 'Controller RH 38 anos. Vai mandar turma. Precisa ROI quantificado. Detalhista. Burocrático.', objecaoPivot: 'Justificativa formal corporativa' },
    { id: 'tce-cirurgiao-dono-c', nome: 'Cirurgião sócio de hospital', emoji: '🏥', disc: 'C', descricao: '"Tem rigor metodológico? Não tenho tempo pra coach genérico."', contexto: 'Cirurgião 50, exigente, busca rigor. Cético com "motivacional". Quer base teórica sólida.', objecaoPivot: 'Rigor metodológico vs auto-ajuda' },
    { id: 'tce-piloto-empresario-c', nome: 'Ex-piloto, atual empresário aéreo', emoji: '✈️', disc: 'C', descricao: '"Aviação exige checklist. Tem método replicável ou é improviso?"', contexto: 'Ex-piloto 48, dono de aerotáxi. Mentalidade procedimental. Conservador. Pergunta sistema.', objecaoPivot: 'Método como sistema replicável' },
    { id: 'tce-quimico-industrial-c', nome: 'Diretor industrial químico', emoji: '🧪', disc: 'C', descricao: '"Quero ver dados de outras empresas do meu setor que passaram."', contexto: 'Diretor químico 50+. Mentalidade técnica rigorosa. Quer cases específicos do setor.', objecaoPivot: 'Cases específicos do setor industrial' },
    { id: 'tce-contador-empresario-c', nome: 'Contador empresário', emoji: '📊', disc: 'C', descricao: '"Quero ver o ROI calculado: investimento vs retorno esperado em quanto tempo."', contexto: 'Contador 44 anos, sócio de escritório. Pensa em DRE, prazo de payback. Conservador.', objecaoPivot: 'Payback do investimento (DRE-mentalidade)' }
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
    },
    // ====== D — Dominância (11) ======
    { id: 'bhp-ceo-meta-estagnada-d', nome: 'CEO com meta estagnada', emoji: '📉', disc: 'D', descricao: '"Faturamento parou. 4 dias é muito tempo. Mostra como dobra meu lucro RÁPIDO."', contexto: 'CEO 45 anos, R$ 10mi/ano travado. Frustrado, exige ROI claro. Direto, pressiona. Quer prova rápida.', objecaoPivot: 'Ceticismo com volume de investimento de tempo' },
    { id: 'bhp-dono-negociacao-d', nome: 'Empresário em meio a negociação grande', emoji: '🤝', disc: 'D', descricao: '"Tenho uma negociação de 8 dígitos em curso. Posso usar as técnicas DIRETO?"', contexto: 'Empresário 48 anos, M&A em andamento. Quer ferramentas práticas de negociação JÁ. Decisor rápido.', objecaoPivot: 'Aplicabilidade imediata em negociação real' },
    { id: 'bhp-empreendedor-feedback-ruim-d', nome: 'Empreendedor com feedback ruim do time', emoji: '😤', disc: 'D', descricao: '"Equipe reclama do meu estilo. Mas tô batendo meta. Pra que mudar?"', contexto: 'Empreendedor 42 anos, estilo autoritário. Time sofre, ele defende o estilo. Direto, defensivo.', objecaoPivot: 'Apego ao estilo agressivo (resultado vs clima)' },
    { id: 'bhp-empresario-50mi-d', nome: 'Empresário de R$ 50mi+', emoji: '🏢', disc: 'D', descricao: '"Meu negócio é grande. BHP não vai parecer básico pra mim?"', contexto: 'CEO 48 anos, empresa R$ 50mi+. Acha BHP "pra empresário pequeno". Soberbo. Cobra valor proporcional.', objecaoPivot: 'Sobrequalificação por porte' },
    { id: 'bhp-controlador-gestor-d', nome: 'Controlador de tudo', emoji: '🔒', disc: 'D', descricao: '"Não confio em ninguém pra delegar. Por que ia mudar agora?"', contexto: 'Founder 48 anos, centralizador extremo. Sabe que é gargalo mas resiste. Direto, cortante.', objecaoPivot: 'Resistência a delegar (centralização disfarçada)' },
    { id: 'bhp-diretor-vendas-pressao-d', nome: 'Diretor de vendas pressionado', emoji: '🎯', disc: 'D', descricao: '"Time não bate meta. Demita-se ou bate. BHP me ajuda?"', contexto: 'Diretor comercial 40 anos. Pressão do board. Estilo militar. Direto, agressivo. Quer técnicas de cobrança.', objecaoPivot: 'Cobrança de meta sem matar o time' },
    { id: 'bhp-cmo-resultadista-d', nome: 'CMO orientado por dados', emoji: '📊', disc: 'D', descricao: '"Quero KPIs movidos pelo curso. Reduz turnover? Aumenta NPS?"', contexto: 'CMO 38 anos, mentalidade analítica. Cobra prova de ROI quantificada. Direto.', objecaoPivot: 'Métricas concretas de impacto' },
    { id: 'bhp-presidente-conselho-d', nome: 'Presidente do conselho', emoji: '🏛️', disc: 'D', descricao: '"Vou indicar pros meus diretores. Adequa-se a perfil sênior?"', contexto: 'Presidente 60+, decide enviar diretores. Direto, formal. Quer validar nível pra sênior.', objecaoPivot: 'Adequação a perfil sênior (não parecer básico)' },
    { id: 'bhp-comerciante-veterano-d', nome: 'Comerciante veterano agressivo', emoji: '💼', disc: 'D', descricao: '"Tenho 25 anos de mercado. Sei vender. Tem algo NOVO pra eu aprender?"', contexto: 'Comerciante 52 anos, top de mercado. Ego alto. Soberbo. Quer aprender só se vir valor.', objecaoPivot: 'Soberba do veterano (já sabe tudo)' },
    { id: 'bhp-empresario-novo-mercado-d', nome: 'Empresário expandindo mercado', emoji: '🆕', disc: 'D', descricao: '"Vou abrir nova vertical. Quero acelerar — sem 12 meses tateando."', contexto: 'Founder 38 anos, expansão. Pressa por estrutura. Decisor rápido. Avalia ferramentas práticas.', objecaoPivot: 'Velocidade vs curva de aprendizado' },
    { id: 'bhp-dono-pme-acumulado-d', nome: 'Dono de PME saturado de cursos', emoji: '🧯', disc: 'D', descricao: '"Já fiz 5 cursos sem aplicar. Por que esse vai ser diferente?"', contexto: 'Dono 45 anos, R$ 4mi/ano. Cinismo de quem já fez muito curso. Pragmático.', objecaoPivot: 'Saturação de cursos sem aplicação prática' },
    // ====== I — Influência (11) ======
    { id: 'bhp-empresaria-influencer-i', nome: 'Empresária digital', emoji: '📸', disc: 'I', descricao: '"Tenho marca pessoal forte! Quero estruturar empresa de verdade. BHP combina?"', contexto: 'Empresária 32 anos, 200k seguidores. Marca pessoal vendendo. Quer profissionalizar. Animada.', objecaoPivot: 'Profissionalização além da marca pessoal' },
    { id: 'bhp-rh-cultura-i', nome: 'Diretora de RH cultural', emoji: '✨', disc: 'I', descricao: '"Adoro o tema CLIMA ORGANIZACIONAL! Mas preciso convencer o CEO."', contexto: 'Diretora RH 36 anos, super engajada. Adora os tópicos comportamentais do BHP. Decide pela emoção.', objecaoPivot: 'Vender pro CEO internamente (não decide sozinha)' },
    { id: 'bhp-vendedor-promovido-i', nome: 'Top vendedor virou líder', emoji: '🏆', disc: 'I', descricao: '"Era #1 da equipe! Promovi e não consigo fazer ninguém vender igual eu."', contexto: 'Ex-vendedor 32 anos, recém-líder. Carismático mas sem método. Aberto, conversa muito.', objecaoPivot: 'Top performer ≠ top líder (transferir tácito)' },
    { id: 'bhp-mae-empreendedora-i', nome: 'Mãe empreendedora', emoji: '🌸', disc: 'I', descricao: '"Comecei minha empresa do zero! Quero estar com os melhores empresários!"', contexto: 'Empreendedora 34 anos. Carismática, conectada. Decide pela comunidade e energia.', objecaoPivot: 'Pertencimento à comunidade empresarial top' },
    { id: 'bhp-founder-sonhador-i', nome: 'Founder jovem ambicioso', emoji: '🌈', disc: 'I', descricao: '"Quero fazer minha empresa virar unicórnio! Time não tem a mesma energia."', contexto: 'Founder 28 anos. Sonha grande, base pequena. Empolgado, fala muito.', objecaoPivot: 'Sonho grande vs base de execução' },
    { id: 'bhp-comercial-popular-i', nome: 'Gerente comercial carismático', emoji: '🗣️', disc: 'I', descricao: '"Adoro vender! Quero aprender técnicas de NEGOCIAÇÃO EMPRESARIAL!"', contexto: 'Gerente comercial 36 anos, popular. Decide pela conexão. Animado com tópicos práticos.', objecaoPivot: 'Pegar técnica concreta de negociação' },
    { id: 'bhp-coach-aspirante-i', nome: 'Aspirante a empresário-coach', emoji: '🎤', disc: 'I', descricao: '"Quero migrar pra carreira de coach business. BHP me dá base?"', contexto: 'Profissional 32 anos, transição. Animado. Decide pela inspiração e oportunidade.', objecaoPivot: 'Validar migração de carreira' },
    { id: 'bhp-empresaria-eventos-i', nome: 'Empresária de eventos', emoji: '🎉', disc: 'I', descricao: '"Trabalho com eventos! Quero estruturar agenda comercial. BHP é pra mim?"', contexto: 'Empresária 35 anos, agência de eventos. Carismática, vende relacionamento.', objecaoPivot: 'Aderência ao setor de relacionamento' },
    { id: 'bhp-influencer-empresa-i', nome: 'Influencer com empresa', emoji: '📱', disc: 'I', descricao: '"Estouro nas redes! Mas atrás dos panos tô perdida. Time briga, processos zero."', contexto: 'Influencer-empresária 30 anos. Fachada forte, operação fraca. Carismática.', objecaoPivot: 'Bastidor estruturado vs fachada de redes' },
    { id: 'bhp-empresaria-bairro-i', nome: 'Empresária bem-relacionada local', emoji: '🌆', disc: 'I', descricao: '"Conheço todos os empresários da minha cidade. Vou levar uns amigos!"', contexto: 'Empresária 45 anos, cidade média. Bem-relacionada. Decide pelo networking.', objecaoPivot: 'Networking como driver principal' },
    { id: 'bhp-gestora-salao-i', nome: 'Dona de salão/clínica de estética', emoji: '💇‍♀️', disc: 'I', descricao: '"Tenho 12 funcionários. Drama em todo turno. Como liderar isso?"', contexto: 'Empresária 40 anos, salão grande. Materna. Time bagunçado. Quer harmonia + resultado.', objecaoPivot: 'Liderar sem perder o clima leve' },
    // ====== S — Estabilidade (11) ======
    { id: 'bhp-sucessor-prudente-s', nome: 'Sucessor familiar prudente', emoji: '👨‍👨‍👦', disc: 'S', descricao: '"Pai fundou. Vou assumir e medo de mexer no que tá funcionando."', contexto: 'Sucessor 32 anos. Empresa familiar 30 anos. Lento, cauteloso. Respeita legado paterno.', objecaoPivot: 'Mudar sem ferir legado paterno' },
    { id: 'bhp-medico-clinica-s', nome: 'Médico dono de clínica', emoji: '🩺', disc: 'S', descricao: '"Sou bom médico, péssimo gestor. 4 dias longe da clínica? Pesa."', contexto: 'Médico 45 anos, clínica 8 funcionários. Técnico excelente, gestor instintivo. Cauteloso.', objecaoPivot: 'Sair da clínica 4 dias inteiros' },
    { id: 'bhp-acomodado-50plus-s', nome: 'Empresário 50+ acomodado', emoji: '🛋️', disc: 'S', descricao: '"Tô bem do jeito que tô. Pra que balançar o barco agora?"', contexto: 'Dono 55+, empresa estável estagnada. Avesso a risco. Família tranquila. Vai resistir.', objecaoPivot: 'Aversão a mudança (zona de conforto)' },
    { id: 'bhp-engenheiro-fabrica-s', nome: 'Engenheiro dono de pequena fábrica', emoji: '🏭', disc: 'S', descricao: '"Indústria tradicional. BHP funciona pra mim ou é mais pra serviço?"', contexto: 'Engenheiro 50+, fábrica industrial. Tradicional. Cauteloso com generalizações.', objecaoPivot: 'Aderência a negócio industrial tradicional' },
    { id: 'bhp-comerciante-25anos-s', nome: 'Comerciante veterano cauteloso', emoji: '🏪', disc: 'S', descricao: '"Negócio de 25 anos. Filho quer modernizar. Vale o investimento?"', contexto: 'Comerciante 55+. Filho moderno quer mudar. Lento pra decidir. Decisão familiar.', objecaoPivot: 'Conflito de gerações na empresa' },
    { id: 'bhp-empresario-interior-s', nome: 'Empresário de cidade pequena', emoji: '🌾', disc: 'S', descricao: '"Cidade pequena, mercado limitado. BHP serve pra esse contexto?"', contexto: 'Empresário 48 anos, interior. Cauteloso. Pergunta aderência ao seu mercado.', objecaoPivot: 'Aderência a mercado regional limitado' },
    { id: 'bhp-empresaria-mae-pequenos-s', nome: 'Empresária mãe de filhos pequenos', emoji: '👶', disc: 'S', descricao: '"Tenho filho de 3 anos. 4 dias fora? Não sei se a família aguenta."', contexto: 'Mãe 33 anos, empresa pequena. Conciliação difícil. Cauteloso com tempo fora.', objecaoPivot: 'Conciliação família × evento de 4 dias' },
    { id: 'bhp-empresario-religioso-s', nome: 'Empresário com valores religiosos', emoji: '🙏', disc: 'S', descricao: '"Tenho princípios. BHP é coerente eticamente ou é tudo "performance"?"', contexto: 'Empresário 50+, fé forte. Avalia ética. Calmo, observador.', objecaoPivot: 'Alinhamento ético-religioso' },
    { id: 'bhp-3geracao-familiar-s', nome: 'Empresário 3ª geração', emoji: '👴', disc: 'S', descricao: '"Empresa familiar, 3ª geração. Decisões aqui são lentas e coletivas."', contexto: 'Empresário 50+, 3ª geração. Decisão por consenso familiar. Lento. Respeita histórico.', objecaoPivot: 'Decisão familiar coletiva (não decide sozinho)' },
    { id: 'bhp-funcionario-promovido-s', nome: 'Funcionário leal promovido', emoji: '🎖️', disc: 'S', descricao: '"Trabalho aqui há 15 anos. Promovido pra gerente. Inseguro pra liderar."', contexto: 'Promovido 42 anos, leal à empresa. Inseguro. Calado. Receio de errar.', objecaoPivot: 'Insegurança de recém-promovido' },
    { id: 'bhp-empresario-conjunturas-s', nome: 'Empresário cauteloso com conjuntura', emoji: '📰', disc: 'S', descricao: '"Mercado tá incerto. Vou investir em curso agora?"', contexto: 'Empresário 48 anos. Lê notícia, preocupa-se com cenário. Cauteloso. Adia decisões.', objecaoPivot: 'Cenário macro incerto (timing pra investir)' },
    // ====== C — Conformidade (11) ======
    { id: 'bhp-cfo-analitico-c', nome: 'CFO analítico', emoji: '🧮', disc: 'C', descricao: '"Quero ementa detalhada das 28 ferramentas. Quero ver cada uma."', contexto: 'CFO 44 anos. Tudo por dado. Quer documentação extensa. Cético com motivacional.', objecaoPivot: 'Detalhamento das 28 ferramentas (ementa)' },
    { id: 'bhp-engenheiro-empresario-c', nome: 'Engenheiro empresário', emoji: '⚙️', disc: 'C', descricao: '"Mostra o fluxograma da metodologia. Quero ver inputs e outputs."', contexto: 'Engenheiro 42 anos, sócio. Mentalidade processual. Quer ver método em fluxo.', objecaoPivot: 'Visibilidade do método como processo' },
    { id: 'bhp-advogado-banca-c', nome: 'Advogado dono de banca', emoji: '⚖️', disc: 'C', descricao: '"Quero contrato, política de cancelamento e ementa antes."', contexto: 'Advogado 45 anos. Formal. Lê tudo antes. Decisão não impulsiva.', objecaoPivot: 'Documentação formal e garantias' },
    { id: 'bhp-doutor-c', nome: 'Doutor empresário', emoji: '🎓', disc: 'C', descricao: '"Tem base teórica? Linha de Losada existe na literatura ou inventaram?"', contexto: 'PhD 48 anos. Cético com cursos populares. Pergunta autores, bibliografia.', objecaoPivot: 'Base teórica acadêmica' },
    { id: 'bhp-auditor-c', nome: 'Auditor sênior', emoji: '📑', disc: 'C', descricao: '"Quero credenciais dos palestrantes, certificações, CNAE da Febracis."', contexto: 'Auditor 50+. Formalista. Detalhista. Pergunta credenciais.', objecaoPivot: 'Credibilidade formal e credenciais' },
    { id: 'bhp-arquiteto-perfeccionista-c', nome: 'Arquiteto perfeccionista', emoji: '📐', disc: 'C', descricao: '"Tem nivelamento de turma? Não quero estar com gente sem experiência."', contexto: 'Arquiteto 42 anos, escritório premium. Perfeccionista. Detalhista.', objecaoPivot: 'Nivelamento da turma (pares à altura)' },
    { id: 'bhp-controller-rh-c', nome: 'Controller de RH corporativo', emoji: '🗃️', disc: 'C', descricao: '"Vou aprovar pra 15 líderes. Preciso ROI claro pro CFO."', contexto: 'Controller RH 38 anos. Vai mandar turma. ROI quantificado. Detalhista.', objecaoPivot: 'Justificativa formal corporativa' },
    { id: 'bhp-cirurgiao-c', nome: 'Cirurgião sócio de hospital', emoji: '🏥', disc: 'C', descricao: '"Liderança tem fundamentação científica ou é coaching genérico?"', contexto: 'Cirurgião 50, sócio hospital. Quer rigor. Cético com "motivacional".', objecaoPivot: 'Rigor metodológico vs auto-ajuda' },
    { id: 'bhp-piloto-c', nome: 'Ex-piloto, atual empresário aéreo', emoji: '✈️', disc: 'C', descricao: '"Gestão é checklist replicável? Ou cada vez é diferente?"', contexto: 'Ex-piloto 48 anos, dono de aerotáxi. Mentalidade procedimental. Conservador.', objecaoPivot: 'Gestão como sistema replicável' },
    { id: 'bhp-quimico-c', nome: 'Diretor industrial químico', emoji: '🧪', disc: 'C', descricao: '"Quero cases mensuráveis de indústrias químicas que aplicaram."', contexto: 'Diretor químico 50+. Mentalidade técnica rigorosa. Cases específicos.', objecaoPivot: 'Cases específicos do setor industrial' },
    { id: 'bhp-contador-c', nome: 'Contador empresário', emoji: '📊', disc: 'C', descricao: '"Quero ver investimento × retorno em quanto tempo. Payback?"', contexto: 'Contador 44 anos, sócio de escritório. Pensa DRE e payback. Conservador.', objecaoPivot: 'Payback do investimento (DRE-mentalidade)' }
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
    },
    // ====== D — Dominância (11) ======
    { id: 'ml5-ceo-impaciente-d', nome: 'CEO impaciente', emoji: '⚡', disc: 'D', descricao: '"Vai direto: 190h presenciais? Não tenho como parar tanto. Sou CEO."', contexto: 'CEO de empresa média (R$ 20mi+), 42 anos, agenda sufocante. Pergunta curto, decide rápido, quer ROI claro. Imperativo, intolerante com rodeio.', objecaoPivot: 'Tempo presencial (acredita que dá pra fazer remoto/condensado)' },
    { id: 'ml5-fundador-controlador-d', nome: 'Fundador controlador', emoji: '🔒', disc: 'D', descricao: '"Meu time não decide nada sem mim. Mas eu também não confio neles."', contexto: 'Fundador 48 anos, empresa 15 anos. Centraliza tudo, reclama mas mantém o controle. Tom direto, cortante. Sabe que é gargalo mas resiste a admitir.', objecaoPivot: 'Centralização disfarçada de "exigência por qualidade"' },
    { id: 'ml5-diretor-comercial-d', nome: 'Diretor comercial agressivo', emoji: '🎯', disc: 'D', descricao: '"Bate meta a qualquer custo. Time treme. Funciona ou não?"', contexto: 'Diretor comercial 38 anos, bate meta na pressão. Time roda muito. Sabe que precisa mudar estilo mas tem orgulho de resultado. Tom impositivo.', objecaoPivot: 'Performance individual vs sustentabilidade do time' },
    { id: 'ml5-empresaria-implacavel-d', nome: 'Empresária implacável', emoji: '👑', disc: 'D', descricao: '"Já sei liderar. Quero saber se vão me ensinar algo NOVO ou repetir o básico."', contexto: 'Empresária 45 anos, dona de holding com 3 empresas. Exigente, intolerante com superficialidade. Quer profundidade técnica e conceito que ela ainda não conhece.', objecaoPivot: 'Sobre-qualificação (acha que já sabe o básico)' },
    { id: 'ml5-coronel-corporativo-d', nome: 'Líder estilo "coronel"', emoji: '🪖', disc: 'D', descricao: '"Eu mando, eles obedecem. Funciona. Pra que mudar fórmula vencedora?"', contexto: 'Diretor 55+, estilo comando-controle. Resultados batendo mas turnover alto. Defende o método. Vai resistir e atacar metodologias "modernas".', objecaoPivot: 'Apego ao estilo autoritário ("se tá batendo meta, tá funcionando")' },
    { id: 'ml5-empreendedor-cansado-d', nome: 'Empreendedor sobrecarregado', emoji: '😤', disc: 'D', descricao: '"Já trabalhei 70h/semana. Time não dá conta. Vai mudar isso ou não?"', contexto: 'Founder 40 anos, escala travada em R$ 5mi. Frustrado, exaurido. Procura solução prática. Vai cobrar resultados objetivos do treino.', objecaoPivot: 'Cansaço acumulado e ceticismo com promessa de solução' },
    { id: 'ml5-presidente-conselho-d', nome: 'Presidente do conselho', emoji: '🏛️', disc: 'D', descricao: '"Quero indicar pros meus diretores. Vale a pena pra perfis sênior?"', contexto: 'Presidente do conselho 60+, decide mandar a turma de diretores. Quer entender se o treino chega no nível dele e dos liderados sênior.', objecaoPivot: 'Adequação a perfis sênior (não vai parecer básico?)' },
    { id: 'ml5-executivo-headhunting-d', nome: 'Executivo em transição de carreira', emoji: '🎩', disc: 'D', descricao: '"Saí da multinacional, vou montar minha empresa. Por onde começo a formar time?"', contexto: 'Executivo 45+ saindo de multinacional. Quer empreender. Tem capital, expertise técnica mas nunca formou time do zero. Decisor rápido.', objecaoPivot: 'Falta de experiência em formar time do zero (já liderou só estruturas prontas)' },
    { id: 'ml5-dono-franquia-d', nome: 'Dono de rede de franquias', emoji: '🏪', disc: 'D', descricao: '"Tenho 12 franquias. Gerentes não pensam, só executam. Como mudar?"', contexto: 'Franqueado dono de 12 unidades. Gestores apenas executam, não inovam nem lideram. Cobra resultado, quer solução pra escalar gestão.', objecaoPivot: 'Escalabilidade de gestão (como formar líderes em rede)' },
    { id: 'ml5-cmo-resultadista-d', nome: 'CMO orientado por dados', emoji: '📊', disc: 'D', descricao: '"Me mostra o ROI do treinamento em métrica concreta. Aumenta NPS? Reduz turnover?"', contexto: 'CMO 38 anos, mentalidade analítica de tráfego pago. Quer números: CAC do treino, payback, KPIs movidos. Vai cobrar prova.', objecaoPivot: 'ROI mensurável do treinamento de liderança' },
    { id: 'ml5-gerente-pressao-board-d', nome: 'Gerente pressionado pelo board', emoji: '🪤', disc: 'D', descricao: '"Board cobra metas absurdas. Time não acompanha. Tô no fogo cruzado."', contexto: 'Gerente sênior 40+ entre o board exigente e o time exausto. Decisor mas refém. Direto, ansioso. Procura ferramentas práticas.', objecaoPivot: 'Pressão dupla (resultado vs sustentabilidade do time)' },
    // ====== I — Influência (11) ======
    { id: 'ml5-rh-entusiasta-i', nome: 'Diretora de RH inovadora', emoji: '✨', disc: 'I', descricao: '"Adorei o conceito! Queria envolver minha empresa toda nessa cultura!"', contexto: 'Diretora RH 36 anos, super engajada, fala muito. Decide pela emoção. Quer transformar cultura, mas precisa convencer CEO. Otimista.', objecaoPivot: 'Vender internamente o programa pro CEO (não decide sozinha)' },
    { id: 'ml5-lider-carismatico-i', nome: 'Líder carismático sem método', emoji: '🎤', disc: 'I', descricao: '"Meu time me ama! Mas as metas não saem… será que falta método?"', contexto: 'Líder 34 anos, popular, querido, mas baixa entrega. Tom solar, ri muito. Reconhece que falta método sob o carisma. Vai abrir e contar histórias.', objecaoPivot: 'Carisma sem entrega (popularidade ≠ resultado)' },
    { id: 'ml5-comercial-extrovertido-i', nome: 'Gerente comercial expansivo', emoji: '💬', disc: 'I', descricao: '"Eu vendo super bem! Agora preciso ensinar meu time a fechar igual."', contexto: 'Gerente comercial 35 anos, vendedor nato. Não sabe ensinar — só faz. Aberto, comunicativo, dispersivo. Decide pela conexão.', objecaoPivot: 'Transferir habilidade tácita pro time' },
    { id: 'ml5-founder-sonhador-i', nome: 'Founder sonhador', emoji: '🌈', disc: 'I', descricao: '"Minha empresa vai ser unicórnio! Mas time não tem a mesma energia que eu."', contexto: 'Founder 30 anos, startup pequena. Visão grande, mas equipe não sustenta. Empolgado, fala muito. Decide pela emoção.', objecaoPivot: 'Energia do founder não vira energia do time' },
    { id: 'ml5-mentor-influencer-i', nome: 'Empresária influencer', emoji: '📱', disc: 'I', descricao: '"Tenho 200k seguidores. Quero formação de verdade pra parar de só dar dica solta."', contexto: 'Empresária 33 anos, marca pessoal forte no Instagram. Quer ganhar profundidade técnica pra escalar mentoria. Sociável, decide pelo brilho.', objecaoPivot: 'Profundidade técnica vs marketing pessoal' },
    { id: 'ml5-gestora-bairro-i', nome: 'Gestora de salão de beleza', emoji: '💇', disc: 'I', descricao: '"Tenho 8 cabeleireiros. Briga toda hora. Como liderar isso?"', contexto: 'Empresária 42 anos, salão bem-sucedido. Time emocional. Acolhedora, fala muito, vê drama. Decide pela empatia com pessoas.', objecaoPivot: 'Liderar com firmeza sem perder o vínculo' },
    { id: 'ml5-vendedor-promovido-i', nome: 'Top vendedor virou gerente', emoji: '🏆', disc: 'I', descricao: '"Era o melhor da equipe. Promovido e perdido. Onde meu time travou?"', contexto: 'Ex-vendedor TOP 32 anos, virou gerente comercial há 6 meses. Frustrado, popular, mas time não rende. Conversa muito, busca aceitação.', objecaoPivot: 'Top performer ≠ top líder' },
    { id: 'ml5-evangelista-cultura-i', nome: 'Líder evangelista de cultura', emoji: '📣', disc: 'I', descricao: '"A gente fala muito de propósito, mas o resultado financeiro tá fraco."', contexto: 'Diretor cultura 38, fala bonito de propósito e valores. Resultado fraco. Engajado, idealista. Vai querer envolvimento emocional na proposta.', objecaoPivot: 'Cultura sem resultado financeiro vira teoria' },
    { id: 'ml5-fundador-festeiro-i', nome: 'Fundador "amigo do time"', emoji: '🍻', disc: 'I', descricao: '"Sou amigo de todos! Mas agora preciso cobrar e não sei como."', contexto: 'Founder 33 anos, virou amigo do time. Empresa cresceu, precisa cobrar. Não sabe puxar régua sem se sentir traindo amizade. Tom leve.', objecaoPivot: 'Sair da zona "amigão" pra zona líder' },
    { id: 'ml5-coach-aspirante-i', nome: 'Aspirante a coach business', emoji: '🚀', disc: 'I', descricao: '"Quero virar coach de empresários! Esse é o caminho?"', contexto: 'Profissional 30 anos, quer migrar carreira pra coach business. Animado, comunicativo. Decide pela inspiração e oportunidade.', objecaoPivot: 'Migração de carreira (validar se vale o investimento)' },
    { id: 'ml5-ms-pme-i', nome: 'Dona de PME comercial', emoji: '🌻', disc: 'I', descricao: '"Meu time me ADORA, mas não cumpre prazo. Como cobrar sem virar chata?"', contexto: 'Empresária 40 anos, PME comercial 25 funcionários. Querida, materna. Time cumpre quando dá, não quando deve. Decide pela conexão.', objecaoPivot: 'Cobrança firme sem "virar chata"' },
    // ====== S — Estabilidade (11) ======
    { id: 'ml5-sucessor-familiar-s', nome: 'Sucessor familiar prudente', emoji: '👨‍👨‍👦', disc: 'S', descricao: '"Meu pai fundou a empresa. Vou assumir, mas tenho medo de mudar e estragar."', contexto: 'Sucessor 32 anos, filho do fundador. Empresa 30 anos. Cauteloso, respeita o pai. Decide devagar. Medo de mudar estrutura que funciona.', objecaoPivot: 'Mudar sem ofender legado do pai' },
    { id: 'ml5-veterana-quase-aposentadoria-s', nome: 'Veterana pré-aposentadoria', emoji: '🌅', disc: 'S', descricao: '"Faltam 5 anos pra eu sair. Vale começar treino agora?"', contexto: 'Diretora 58 anos, 5 anos pra aposentar. Calma, ponderada. Não quer projetos longos. Pensa em legado e sucessão.', objecaoPivot: 'Horizonte curto antes da aposentadoria' },
    { id: 'ml5-coo-discreto-s', nome: 'COO discreto', emoji: '🎩', disc: 'S', descricao: '"Sou o COO. O dono pediu pra eu ver. Tenho que apresentar pra ele."', contexto: 'COO 42 anos, executor leal do dono. Discreto, cauteloso. Quer entender bem antes de levar pro CEO. Não decide sozinho.', objecaoPivot: 'Filtrar pro dono (precisa convencer outro decisor)' },
    { id: 'ml5-lider-tech-introvertido-s', nome: 'Líder técnico introvertido', emoji: '💻', disc: 'S', descricao: '"Sou bom em código. Lidero 5 devs. Falar com pessoas me consome."', contexto: 'Tech lead 30 anos, ótimo técnico, virou líder a contragosto. Introvertido. Cansa em reuniões. Quer ferramentas pra reduzir desgaste.', objecaoPivot: 'Energia social vs energia técnica' },
    { id: 'ml5-medica-clinica-s', nome: 'Médica dona de clínica', emoji: '🩺', disc: 'S', descricao: '"Atendo bem, mas o time da clínica vive em conflito. Cansei."', contexto: 'Médica 45 anos, dona de clínica com 8 funcionários. Cansada de mediar conflitos. Empática, prudente. Quer paz e processo.', objecaoPivot: 'Resolver conflitos crônicos no time pequeno' },
    { id: 'ml5-engenheiro-fabrica-s', nome: 'Engenheiro chefe de fábrica', emoji: '🏭', disc: 'S', descricao: '"Comando 40 operários. Estrutura militar. Mas estão pedindo demais de mim."', contexto: 'Engenheiro 50+, gestor fabril clássico. Quer manter ordem mas time exige nova abordagem. Lento pra mudar, mas leal e curioso.', objecaoPivot: 'Mudar abordagem após 25 anos no mesmo estilo' },
    { id: 'ml5-pequeno-empresario-saude-s', nome: 'Pequeno empresário do setor saúde', emoji: '🏥', disc: 'S', descricao: '"Tenho 6 funcionários. Não sei se vale tanto curso pra empresa pequena."', contexto: 'Dono de clínica 38 anos, 6 funcionários. Cauteloso. Não decide rápido. Pesa custo-benefício longamente.', objecaoPivot: 'ROI pra empresa pequena (medo de exagerar investimento)' },
    { id: 'ml5-gerente-administrativa-s', nome: 'Gerente administrativa cuidadosa', emoji: '📋', disc: 'S', descricao: '"Preciso entender direito antes de pedir aprovação do diretor. Me explica tudo."', contexto: 'Gerente 40 anos, perfil cuidadoso. Quer ter todos os dados antes de levar pro chefe. Não corre risco com decisão impulsiva.', objecaoPivot: 'Risco de aprovação interna' },
    { id: 'ml5-cooperativa-presidente-s', nome: 'Presidente de cooperativa', emoji: '🌾', disc: 'S', descricao: '"Lidero cooperativa de 200 produtores. Mudar gestão exige consenso. É lento."', contexto: 'Presidente 55+, cooperativa. Decisão por consenso. Calmo, paciente. Quer entender o impacto coletivo antes de propor.', objecaoPivot: 'Mudança em ambiente que exige consenso' },
    { id: 'ml5-mae-empreendedora-s', nome: 'Mãe empreendedora cautelosa', emoji: '🌷', disc: 'S', descricao: '"Tenho filhos pequenos. 190h presenciais? Como faço?"', contexto: 'Empreendedora 36 anos, mãe de crianças. Família é prioridade. Cauteloso com tempo fora de casa. Quer crescer, mas sem culpa.', objecaoPivot: 'Família × dedicação ao programa intensivo' },
    { id: 'ml5-religioso-prudente-s', nome: 'Líder com valores religiosos fortes', emoji: '🙏', disc: 'S', descricao: '"Tenho princípios. Treino é "espiritualizado" demais ou é técnico mesmo?"', contexto: 'Empresário 50 anos, religioso, prudente. Quer crescer mas sem se sentir doutrinado. Calmo, observador. Avalia coerência ética.', objecaoPivot: 'Alinhamento com valores pessoais (ética/religião)' },
    // ====== C — Conformidade (11) ======
    { id: 'ml5-cfo-analitico-c', nome: 'CFO analítico', emoji: '🧮', disc: 'C', descricao: '"Quero ementa, cronograma detalhado, perfil dos professores e cases mensuráveis."', contexto: 'CFO 45 anos. Tudo por dado. Quer documentação extensa antes de aprovar. Cético com "filosofia". Cobra precisão.', objecaoPivot: 'Falta de prova metodológica e cases mensuráveis' },
    { id: 'ml5-cientista-empresario-c', nome: 'Cientista virou empresário', emoji: '🔬', disc: 'C', descricao: '"Tenho PhD. O treino tem base científica ou é "achismo motivacional"?"', contexto: 'PhD 40+ que virou empresário em biotech. Cético com cursos "motivacionais". Quer base científica clara. Lento pra confiar.', objecaoPivot: 'Validação científica vs auto-ajuda' },
    { id: 'ml5-engenheiro-precisao-c', nome: 'Engenheiro de processos', emoji: '⚙️', disc: 'C', descricao: '"Preciso ver: input, processo, output, KPIs medidos. Tudo claro."', contexto: 'Engenheiro 43, mentalidade lean. Quer fluxo do treino mapeado como processo. Detalhista. Faz muita pergunta técnica.', objecaoPivot: 'Visibilidade do "processo" do treinamento' },
    { id: 'ml5-auditor-c', nome: 'Auditor sênior', emoji: '📑', disc: 'C', descricao: '"Quero conhecer a estrutura curricular, currículo dos instrutores e certificação."', contexto: 'Auditor 48 anos, vai pra esse treino. Detalhista, formal. Quer credenciais, certificações, conformidade. Pergunta tudo nos mínimos detalhes.', objecaoPivot: 'Credibilidade formal do certificado' },
    { id: 'ml5-arquiteto-perfeccionista-c', nome: 'Arquiteto-empresário perfeccionista', emoji: '📐', disc: 'C', descricao: '"Tem nivelamento de turma? Não quero estar em turma com gente inexperiente."', contexto: 'Arquiteto 42 anos, dono de escritório premium. Perfeccionista. Quer ambiente de pares. Pergunta sobre perfil dos colegas de turma.', objecaoPivot: 'Nivelamento de turma (estar entre pares)' },
    { id: 'ml5-advogado-corporativo-c', nome: 'Advogado tributarista', emoji: '⚖️', disc: 'C', descricao: '"Quero ler a ementa e contrato antes. NF, condições, política de cancelamento."', contexto: 'Advogado 44 anos, dono de banca. Formal. Lê tudo antes. Quer contrato, garantia formal. Não decide na conversa.', objecaoPivot: 'Documentação formal (contrato, ementa, NF)' },
    { id: 'ml5-controler-rh-c', nome: 'Controller de RH', emoji: '🗃️', disc: 'C', descricao: '"Vou aprovar pra 12 líderes. Preciso justificar com KPI claro pro CFO."', contexto: 'Controller RH 39 anos. Vai aprovar turma corporativa. Quer ROI calculável (redução de turnover, NPS interno). Detalhista.', objecaoPivot: 'Justificativa formal pra aprovação corporativa' },
    { id: 'ml5-medico-cirurgiao-c', nome: 'Médico cirurgião sócio de hospital', emoji: '🏥', disc: 'C', descricao: '"Liderança é arte ou ciência? Quero saber a base teórica antes de investir."', contexto: 'Cirurgião 50, sócio de hospital. Quer base teórica sólida. Cético com "guru". Pergunta autores e referências.', objecaoPivot: 'Base teórica (academia × prática)' },
    { id: 'ml5-piloto-aviacao-c', nome: 'Piloto que virou empresário aéreo', emoji: '✈️', disc: 'C', descricao: '"Aviação exige checklist. Liderança tem checklist comprovado também?"', contexto: 'Ex-piloto 45+ virou dono de aerotáxi. Mentalidade de procedimento. Quer ver método como checklist. Conservador.', objecaoPivot: 'Liderança como sistema replicável vs improviso' },
    { id: 'ml5-quimico-industrial-c', nome: 'Diretor industrial químico', emoji: '🧪', disc: 'C', descricao: '"Em indústria química, erro mata. Liderança aqui exige rigor. Tem isso?"', contexto: 'Diretor industrial 50+, química. Mentalidade de segurança operacional. Quer rigor. Avesso a coach "fofo".', objecaoPivot: 'Rigor metodológico em ambiente crítico' },
    { id: 'ml5-cti-publico-c', nome: 'Gestor público sênior', emoji: '🏛️', disc: 'C', descricao: '"Sou de órgão público. Treino se adapta a setor público com restrições?"', contexto: 'Gestor público 50+, secretaria municipal. Burocrata. Quer alinhar com normas do funcionalismo. Detalhista, lento, formal.', objecaoPivot: 'Aderência ao setor público (regras, burocracia)' }
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
    },
    // ====== D — Dominância (11) ======
    { id: 'fcis-executivo-transicao-d', nome: 'Executivo em transição abrupta', emoji: '🎩', disc: 'D', descricao: '"Saí da multinacional. Quero virar coach e cobrar bem. FCIS faz isso?"', contexto: 'Ex-executivo 45+, saiu de cargo C-level. Quer monetizar expertise. Direto, exigente. Cobra ROI da formação.', objecaoPivot: 'ROI financeiro como coach (não fazer pro bono)' },
    { id: 'fcis-empresaria-mentora-d', nome: 'Empresária querendo virar mentora', emoji: '🚀', disc: 'D', descricao: '"Já fiz minha grana. Quero mentorar empresárias agora. Por que FCIS e não MBA?"', contexto: 'Empresária 50, vendeu empresa. Quer impactar. Direta, decide rápido. Compara opções.', objecaoPivot: 'FCIS vs MBA/outras formações' },
    { id: 'fcis-medico-frustrado-d', nome: 'Médico frustrado com a profissão', emoji: '🩺', disc: 'D', descricao: '"Tô cansado de medicina. Coaching parece dar dinheiro fácil. É verdade?"', contexto: 'Médico 42 anos, exaustão. Quer rota alternativa. Direto, pragmático. Cobra prova financeira.', objecaoPivot: 'Migração profissional médico → coach' },
    { id: 'fcis-empresario-busca-direcao-d', nome: 'Empresário em crise de propósito', emoji: '🧭', disc: 'D', descricao: '"Faturo bem mas tô vazio. Coaching de propósito vai resolver?"', contexto: 'Empresário 48, R$ 5mi/ano. Sucesso material, vazio interno. Direto mas vulnerável. Cético com "auto-ajuda".', objecaoPivot: 'Sucesso material × vazio interno' },
    { id: 'fcis-coach-corporativo-d', nome: 'Coach corporativo experiente', emoji: '🏢', disc: 'D', descricao: '"Atendo grandes empresas. Vale me certificar pelo FCU? Diferencia mesmo?"', contexto: 'Coach 45, já atende corporativo. Quer diferenciar via FCU. Direto, cobra peso da certificação.', objecaoPivot: 'Diferencial real da certificação FCU' },
    { id: 'fcis-rh-decisor-d', nome: 'Diretor RH com poder de decisão', emoji: '👔', disc: 'D', descricao: '"Vou indicar 5 do meu time. Atende formação corporativa de RH?"', contexto: 'Diretor RH 42, decide turma corporativa. Direto, ROI claro. Cobra ementa e cases corporativos.', objecaoPivot: 'Aplicação corporativa de RH em massa' },
    { id: 'fcis-pastor-lider-d', nome: 'Pastor/líder religioso', emoji: '✝️', disc: 'D', descricao: '"Aconselho fiéis. Coaching vai me dar técnica? Ou conflita com fé?"', contexto: 'Pastor 50, congregação grande. Aconselha pessoas. Direto, ético. Avalia compatibilidade espiritual.', objecaoPivot: 'Compatibilidade espiritual com técnicas seculares' },
    { id: 'fcis-empresario-saude-d', nome: 'Empresário do setor de saúde mental', emoji: '🧠', disc: 'D', descricao: '"Tenho clínica. Quero adicionar coaching ao mix. Faz sentido?"', contexto: 'Empresário 45, clínica saúde mental. Quer expandir oferta. Pragmático. Cobra integração.', objecaoPivot: 'Integração coaching × terapia tradicional' },
    { id: 'fcis-vendedor-elite-d', nome: 'Vendedor de alto ticket querendo escalar', emoji: '💎', disc: 'D', descricao: '"Vendo bem. Quero virar coach de vendedores. FCIS me prepara?"', contexto: 'Top vendedor 38, faturamento alto. Quer ensinar. Direto, conta. Avalia transição.', objecaoPivot: 'Top performer ≠ top professor' },
    { id: 'fcis-ex-militar-d', nome: 'Ex-militar virando coach', emoji: '🪖', disc: 'D', descricao: '"Saí das Forças. Quero usar disciplina como coach. FCIS é flexível pra isso?"', contexto: 'Ex-oficial 45, disciplina e estrutura. Direto, formal. Avalia se a metodologia respeita seu estilo.', objecaoPivot: 'Compatibilidade do estilo militar com coaching' },
    { id: 'fcis-investidor-d', nome: 'Investidor querendo desenvolver pessoas', emoji: '💰', disc: 'D', descricao: '"Tenho capital, quero impactar. Vale formar pessoa que toma decisão?"', contexto: 'Investidor 55+, family office. Quer impactar. Direto, valor por hora alto. Avalia ROI emocional.', objecaoPivot: 'ROI do investimento de tempo (alto custo de oportunidade)' },
    // ====== I — Influência (11) ======
    { id: 'fcis-influencer-i', nome: 'Influencer de desenvolvimento pessoal', emoji: '📱', disc: 'I', descricao: '"Falo de desenvolvimento nas redes! Quero ter base técnica de verdade."', contexto: 'Influencer 30, 100k+ seguidores. Carismática, comunicativa. Decide pela inspiração e brilho.', objecaoPivot: 'Profundidade técnica × marca pessoal' },
    { id: 'fcis-pedagoga-mae-i', nome: 'Pedagoga e mãe', emoji: '🌸', disc: 'I', descricao: '"Adoro pessoas! Quero ajudar mais. Coaching combina com pedagogia?"', contexto: 'Pedagoga 38, mãe. Carismática, materna. Decide pela conexão humana.', objecaoPivot: 'Coaching como extensão da pedagogia' },
    { id: 'fcis-vendedora-arrependida-i', nome: 'Vendedora cansada da pressão', emoji: '😮‍💨', disc: 'I', descricao: '"Tô cansada de vender. Quero ajudar pessoas. Coaching é caminho?"', contexto: 'Vendedora 35, cansada. Sociável. Quer rota mais humana. Decide pela esperança.', objecaoPivot: 'Migração de vendas pressão pra coaching' },
    { id: 'fcis-terapeuta-holistica-i', nome: 'Terapeuta holística', emoji: '🌿', disc: 'I', descricao: '"Faço Reiki, florais... Coaching FCIS é compatível com isso?"', contexto: 'Terapeuta 40, holística. Espiritualizada. Conversa muito. Decide pela energia percebida.', objecaoPivot: 'Compatibilidade com práticas holísticas' },
    { id: 'fcis-aspirante-jovem-i', nome: 'Jovem aspirante a guru', emoji: '🌟', disc: 'I', descricao: '"Quero ser o próximo Paulo Vieira! Por onde começo?"', contexto: 'Jovem 25, ambição grande. Carismático. Decide pelo sonho. Empolgado.', objecaoPivot: 'Ambição × experiência de vida (jovem demais?)' },
    { id: 'fcis-aposentado-ativo-i', nome: 'Aposentado ativo querendo recomeçar', emoji: '🎯', disc: 'I', descricao: '"Aposentei mas não parei! Coaching me dá nova carreira aos 60?"', contexto: 'Aposentado 62, ativo. Conta histórias. Decide pelo legado. Sociável.', objecaoPivot: 'Idade × nova carreira (vou conseguir?)' },
    { id: 'fcis-empreendedora-feminina-i', nome: 'Empreendedora feminina', emoji: '👩‍💼', disc: 'I', descricao: '"Quero empoderar mulheres! Coaching feminino é nicho forte?"', contexto: 'Empreendedora 35, foco em mulheres. Engajada, ativista. Decide pela causa.', objecaoPivot: 'Nicho de coaching feminino (validar mercado)' },
    { id: 'fcis-evento-i', nome: 'Empresária de eventos buscando virar coach', emoji: '🎉', disc: 'I', descricao: '"Eventos cansa! Quero coachear empresários. FCIS dá ferramentas?"', contexto: 'Empresária 38, eventos. Cansada. Carismática. Quer impacto humano.', objecaoPivot: 'Transição de operação cansativa pra coaching' },
    { id: 'fcis-cantora-frustrada-i', nome: 'Artista frustrada', emoji: '🎤', disc: 'I', descricao: '"Sou cantora, não dá pra viver disso. Coaching pode ser meu segundo ato?"', contexto: 'Cantora 35, talento mas mercado difícil. Carismática, expressiva. Decide pela paixão.', objecaoPivot: 'Segunda carreira em arte saturada' },
    { id: 'fcis-mae-empreendedora-coach-i', nome: 'Mãe empreendedora querendo coachear mães', emoji: '👶', disc: 'I', descricao: '"Tenho 3 filhos! Quero coachear mães. É nicho viável?"', contexto: 'Mãe 38, empreendedora. Sociável. Comunidade forte. Decide pela tribo.', objecaoPivot: 'Validar nicho "coaching pra mães"' },
    { id: 'fcis-coach-saude-i', nome: 'Coach de saúde/fitness', emoji: '🏃‍♀️', disc: 'I', descricao: '"Sou personal! Quero adicionar coaching emocional. Combina?"', contexto: 'Personal 30 anos, popular. Carismático. Quer expandir oferta. Decide pela energia.', objecaoPivot: 'Combinar coaching emocional + físico' },
    // ====== S — Estabilidade (11) ======
    { id: 'fcis-psicologa-cautelosa-s', nome: 'Psicóloga cautelosa', emoji: '🧠', disc: 'S', descricao: '"Sou psicóloga. Coaching e terapia conflitam ética e tecnicamente?"', contexto: 'Psicóloga 40+, registro CRP. Cautelosa. Quer entender boundaries. Pondera muito.', objecaoPivot: 'Conflito ético psicologia × coaching' },
    { id: 'fcis-funcionario-leal-s', nome: 'Funcionário leal pensando em coach', emoji: '🎖️', disc: 'S', descricao: '"Tô há 18 anos na empresa. Quero coachear sem largar tudo. Dá?"', contexto: 'Funcionário 45, leal. Quer dual career. Lento, cauteloso. Avalia segurança.', objecaoPivot: 'Coachear sem largar emprego seguro' },
    { id: 'fcis-aposentado-cauteloso-s', nome: 'Aposentado cauteloso', emoji: '🌅', disc: 'S', descricao: '"Aposentei. Quero ajudar mas tenho 65 anos. FCIS aceita?"', contexto: 'Aposentado 65, conservador. Pondera saúde, tempo. Lento pra decidir.', objecaoPivot: 'Idade avançada × intensidade do programa' },
    { id: 'fcis-medico-aposentando-s', nome: 'Médico se aposentando', emoji: '🏥', disc: 'S', descricao: '"Vou me aposentar da medicina. Coaching é boa transição leve?"', contexto: 'Médico 60, planejando aposentar. Cauteloso. Quer transição suave. Avalia esforço.', objecaoPivot: 'Esforço × ritmo desejado para esta fase' },
    { id: 'fcis-mae-pequenos-s', nome: 'Mãe com filhos pequenos', emoji: '👶', disc: 'S', descricao: '"Tenho filho de 4 anos. 268h é muito! Dá pra conciliar?"', contexto: 'Mãe 33. Família é prioridade. Cautelosa com tempo. Avalia logística.', objecaoPivot: 'Conciliação família × carga horária' },
    { id: 'fcis-cuidador-idosos-s', nome: 'Cuidador de idosos', emoji: '🤲', disc: 'S', descricao: '"Cuido dos meus pais idosos. Tenho energia pra mais uma jornada?"', contexto: 'Profissional 50, cuidando dos pais. Cauteloso. Pondera energia disponível.', objecaoPivot: 'Sobrecarga emocional já alta' },
    { id: 'fcis-religioso-tradicional-s', nome: 'Religioso tradicional', emoji: '🙏', disc: 'S', descricao: '"Sou cristão fervoroso. PPSs e MFC são compatíveis com minha fé?"', contexto: 'Religioso 50, conservador. Cauteloso com técnicas modernas. Lento pra decidir.', objecaoPivot: 'Compatibilidade da metodologia com a fé' },
    { id: 'fcis-empresario-tradicional-s', nome: 'Empresário tradicional', emoji: '👴', disc: 'S', descricao: '"Empresa familiar 3ª geração. Coaching parece moderno demais."', contexto: 'Empresário 55, tradicional. Cauteloso. Família conservadora.', objecaoPivot: 'Tradicionalismo × ferramenta moderna' },
    { id: 'fcis-pequena-cidade-s', nome: 'Profissional de cidade pequena', emoji: '🌾', disc: 'S', descricao: '"Cidade de 50 mil habitantes. Tem mercado pra coach aqui?"', contexto: 'Profissional 42 anos, interior. Cauteloso. Mercado limitado. Pondera demanda local.', objecaoPivot: 'Mercado local pequeno (vai ter cliente?)' },
    { id: 'fcis-recuperando-burnout-s', nome: 'Profissional recuperando de burnout', emoji: '🌱', disc: 'S', descricao: '"Tive burnout. Coaching me ajuda? Ou vai me pressionar mais?"', contexto: 'Profissional 38, em recuperação. Frágil, cauteloso. Avalia se é leve.', objecaoPivot: 'Intensidade do programa × saúde mental' },
    { id: 'fcis-introvertido-s', nome: 'Profissional introvertido', emoji: '🤫', disc: 'S', descricao: '"Sou super introvertido. Vou aguentar 8 dias de imersão com 40 pessoas?"', contexto: 'Profissional 35, introvertido. Cauteloso com exposição. Pondera energia social.', objecaoPivot: 'Imersão presencial × natureza introvertida' },
    // ====== C — Conformidade (11) ======
    { id: 'fcis-academico-cetico-c', nome: 'Acadêmico cético', emoji: '🎓', disc: 'C', descricao: '"Quero ver bibliografia, base científica. Coaching tem mesmo base sólida?"', contexto: 'Acadêmico 45, mestrado. Cético com modismos. Quer artigos, autores, fundamento.', objecaoPivot: 'Base científica vs auto-ajuda' },
    { id: 'fcis-engenheiro-c', nome: 'Engenheiro empresário', emoji: '⚙️', disc: 'C', descricao: '"Mostra o fluxo: input → método → output mensurável."', contexto: 'Engenheiro 40, mentalidade processual. Quer ver método em fluxo. Detalhista.', objecaoPivot: 'Visibilidade do método como processo' },
    { id: 'fcis-advogado-c', nome: 'Advogado dono de banca', emoji: '⚖️', disc: 'C', descricao: '"Quero ler ementa, contrato, política de cancelamento e nota fiscal."', contexto: 'Advogado 45. Formal. Lê tudo. Decide com calma.', objecaoPivot: 'Documentação formal completa' },
    { id: 'fcis-medico-cirurgiao-c', nome: 'Médico cirurgião', emoji: '👨‍⚕️', disc: 'C', descricao: '"Coaching tem evidência clínica? Estudos randomizados?"', contexto: 'Cirurgião 50, baseado em evidência. Cético sem RCT. Detalhista científico.', objecaoPivot: 'Evidência clínica/científica do método' },
    { id: 'fcis-cientista-c', nome: 'Cientista virando empresário', emoji: '🔬', disc: 'C', descricao: '"PhD aqui. PPSs e MFC têm base na literatura ou inventaram?"', contexto: 'PhD 42, virou empresário. Cético com termos novos. Quer referências.', objecaoPivot: 'Validação acadêmica dos conceitos próprios' },
    { id: 'fcis-rh-controller-c', nome: 'RH com controller financeiro do lado', emoji: '🗃️', disc: 'C', descricao: '"Vou aprovar pra time corporativo. Preciso ROI quantificado e cases."', contexto: 'RH 40, controlado por CFO. ROI obrigatório. Cases. Detalhista.', objecaoPivot: 'Justificativa formal pra aprovação' },
    { id: 'fcis-piloto-c', nome: 'Ex-piloto comercial', emoji: '✈️', disc: 'C', descricao: '"Aviação é checklist. Coaching tem manual replicável?"', contexto: 'Ex-piloto 50, virou consultor. Mentalidade procedimental. Conservador.', objecaoPivot: 'Coaching como sistema replicável' },
    { id: 'fcis-auditor-c', nome: 'Auditor sênior', emoji: '📑', disc: 'C', descricao: '"Quero ver credenciais do FCU, validação CFP, registros profissionais."', contexto: 'Auditor 48. Formalista. Detalhista. Pergunta credenciais.', objecaoPivot: 'Credibilidade institucional (FCU é real?)' },
    { id: 'fcis-tradutor-c', nome: 'Tradutor com perfeccionismo', emoji: '📖', disc: 'C', descricao: '"Material em português ou inglês? FCU exige TOEFL?"', contexto: 'Tradutor 38, bilíngue. Detalhista com idioma e materiais. Lento decidindo.', objecaoPivot: 'Idioma e exigências formais FCU' },
    { id: 'fcis-arquiteto-c', nome: 'Arquiteto perfeccionista', emoji: '📐', disc: 'C', descricao: '"Como é o nivelamento da turma? Quero pares de qualidade."', contexto: 'Arquiteto 42 anos. Perfeccionista. Quer ambiente de pares. Detalhista.', objecaoPivot: 'Qualidade dos colegas de turma' },
    { id: 'fcis-contador-c', nome: 'Contador empresário', emoji: '📊', disc: 'C', descricao: '"Investimento × quanto vou cobrar por sessão? Payback?"', contexto: 'Contador 44 anos, sócio de escritório. Pensa DRE, payback. Conservador.', objecaoPivot: 'Payback financeiro como coach iniciante' }
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
    },
    // ====== D — Dominância (11) ======
    { id: 'fgpc-ceo-perde-talentos-d', nome: 'CEO perdendo talentos', emoji: '💼', disc: 'D', descricao: '"Meus melhores estão saindo. Headhunters levaram 3 esse ano. Como reter?"', contexto: 'CEO 47 anos, empresa R$ 30mi. Vendo top talents partirem. Direto, urgente. Decisor.', objecaoPivot: 'Retenção dos top performers' },
    { id: 'fgpc-empresario-contrata-erra-d', nome: 'Empresário que contrata errado', emoji: '🚪', disc: 'D', descricao: '"Demiti 4 nos últimos 6 meses. Tô gastando rio de dinheiro em rescisão."', contexto: 'Empresário 45 anos. Padrão: contrata, frusta, demite. Direto, exausto. Cobra solução.', objecaoPivot: '9 em 10 demitidos pelo comportamental (Brasil)' },
    { id: 'fgpc-diretor-rh-pressionado-d', nome: 'Diretor de RH pressionado pelo board', emoji: '👔', disc: 'D', descricao: '"Board cobra redução de turnover. Tô precisando de método mensurável."', contexto: 'Diretor RH 42 anos, board exigente. Cobra ROI. Direto. Quer KPIs.', objecaoPivot: 'Mensuração do impacto na redução de turnover' },
    { id: 'fgpc-empresario-conflito-d', nome: 'Empresário cansado de conflitos', emoji: '⚔️', disc: 'D', descricao: '"Time vive brigando. Eu não tenho paciência pra mediar. Resolva."', contexto: 'Empresário 48, autoritário. Time conflituoso. Direto, cortante. Quer resolução rápida.', objecaoPivot: 'Conflitos crônicos no time' },
    { id: 'fgpc-recrutadora-d', nome: 'Headhunter buscando metodologia', emoji: '🎯', disc: 'D', descricao: '"Trabalho com recrutamento executivo. DISC do FGPC diferencia comercialmente?"', contexto: 'Headhunter 40 anos. Compara metodologias. Direto. Quer diferencial competitivo.', objecaoPivot: 'Diferencial comercial vs outras ferramentas DISC' },
    { id: 'fgpc-empresario-50mi-d', nome: 'Dono de empresa média', emoji: '🏢', disc: 'D', descricao: '"Faturo R$ 50mi+ com 200 funcionários. Vale ferramenta de DISC pra esse porte?"', contexto: 'CEO 48 anos. Porte médio. Direto. Avalia ROI por funcionário.', objecaoPivot: 'Escala de aplicação (200+ funcionários)' },
    { id: 'fgpc-presidente-conselho-d', nome: 'Presidente do conselho', emoji: '🏛️', disc: 'D', descricao: '"Vou indicar pra equipe de RH. Atende exigências corporativas?"', contexto: 'Presidente 60+, conselho consultivo. Quer enviar time RH. Direto, formal.', objecaoPivot: 'Aplicabilidade corporativa em estrutura formal' },
    { id: 'fgpc-empresario-familiar-conflito-d', nome: 'Sócios familiares em conflito', emoji: '👨‍👩‍👦', disc: 'D', descricao: '"Brigo com meu irmão sócio há 5 anos. DISC resolve diferença de perfil?"', contexto: 'Sócio 50, briga com irmão sócio. Diferenças comportamentais. Direto, cansado.', objecaoPivot: 'Conflito entre sócios com perfis opostos' },
    { id: 'fgpc-ex-multinacional-d', nome: 'Ex-executivo de multinacional', emoji: '🎩', disc: 'D', descricao: '"Conheço Hogan, MBTI. FGPC é diferente ou só rebranding de DISC?"', contexto: 'Executivo 50+, conhece ferramentas top. Cético. Direto, técnico.', objecaoPivot: 'Diferencial vs Hogan/MBTI consagradas' },
    { id: 'fgpc-cmo-resultadista-d', nome: 'CMO orientado por dados', emoji: '📊', disc: 'D', descricao: '"KPIs de impacto: redução de turnover, NPS interno, engajamento. Tem?"', contexto: 'CMO 38, analítico. Cobra prova de impacto quantificado. Direto.', objecaoPivot: 'Métricas concretas de impacto' },
    { id: 'fgpc-empresario-tech-d', nome: 'Empresário de tech', emoji: '💻', disc: 'D', descricao: '"Tech tem turnover de 25%! DISC é solução pra esse setor caótico?"', contexto: 'Founder tech 38 anos. Turnover alto do setor. Direto, frustrado.', objecaoPivot: 'Aplicabilidade no setor de tech (turnover alto)' },
    // ====== I — Influência (11) ======
    { id: 'fgpc-rh-entusiasta-i', nome: 'RH entusiasta de cultura', emoji: '✨', disc: 'I', descricao: '"ADORO o tema! Quero implementar DISC, valores, DNA Organizacional!"', contexto: 'Diretora RH 36, super engajada. Comunicativa. Decide pela emoção.', objecaoPivot: 'Vender pro CEO (não decide sozinha)' },
    { id: 'fgpc-coach-business-i', nome: 'Coach business querendo certificar', emoji: '🎤', disc: 'I', descricao: '"Atendo empresas! Quero adicionar DISC ao meu portfólio."', contexto: 'Coach 40 anos. Atende corporativo. Carismática. Decide pela expansão.', objecaoPivot: 'Adicionar DISC ao portfólio como coach' },
    { id: 'fgpc-empreendedora-feminina-i', nome: 'Empreendedora feminina', emoji: '👩‍💼', disc: 'I', descricao: '"Tenho time todo de mulheres. DISC tem viés feminino? Funciona?"', contexto: 'Empreendedora 38, time só de mulheres. Engajada. Decide pela causa.', objecaoPivot: 'DISC e viés de gênero' },
    { id: 'fgpc-empresaria-influencer-i', nome: 'Influencer empresária', emoji: '📱', disc: 'I', descricao: '"Quero conteúdo de DISC pras minhas redes. Sou aluna autorizada a falar disso?"', contexto: 'Empresária 32 anos, 80k seguidores. Quer conteúdo + autoridade. Carismática.', objecaoPivot: 'Uso de DISC como conteúdo de marca pessoal' },
    { id: 'fgpc-gestora-vendas-i', nome: 'Gerente comercial popular', emoji: '🗣️', disc: 'I', descricao: '"Lidero 15 vendedores! Quero entender perfil de cada um pra cobrar certo."', contexto: 'Gerente comercial 36, popular. Decide pela conexão.', objecaoPivot: 'Cobrar cada perfil de forma diferente' },
    { id: 'fgpc-mae-empreendedora-i', nome: 'Mãe empreendedora', emoji: '🌸', disc: 'I', descricao: '"Tenho 12 funcionários. Quero clima leve mas resultado! DISC ajuda?"', contexto: 'Empreendedora 38, comércio. Materna. Quer harmonia + entrega.', objecaoPivot: 'Clima leve × cobrança de resultado' },
    { id: 'fgpc-mentor-empresarial-i', nome: 'Mentor empresarial em ascensão', emoji: '🚀', disc: 'I', descricao: '"Mentoro 15 empresários! Quero ferramenta poderosa pra dar pra eles."', contexto: 'Mentor 42, marca pessoal forte. Carismático. Quer ferramentas validadas.', objecaoPivot: 'Ferramenta poderosa pra mentorar empresários' },
    { id: 'fgpc-evento-i', nome: 'Empresária de eventos', emoji: '🎉', disc: 'I', descricao: '"Time grande, conflitos no período de pico. DISC ajuda na pressão?"', contexto: 'Empresária 40, eventos. Carismática. Pressão sazonal.', objecaoPivot: 'Gestão em ambiente de alta pressão sazonal' },
    { id: 'fgpc-aspirante-rh-i', nome: 'Profissional buscando virar consultora RH', emoji: '🌟', disc: 'I', descricao: '"Quero migrar pra consultoria de RH! FGPC me prepara?"', contexto: 'Profissional 35 anos. Quer migrar. Otimista, comunicativa.', objecaoPivot: 'Migração de carreira pra consultoria RH' },
    { id: 'fgpc-coach-saude-fitness-i', nome: 'Personal trainer/coach saúde', emoji: '🏃‍♀️', disc: 'I', descricao: '"Tenho academia. Funcionários são bagunçados. DISC organiza?"', contexto: 'Dona academia 35. Popular. Time jovem desorganizado.', objecaoPivot: 'Aplicação a time jovem/operacional' },
    { id: 'fgpc-publicitaria-i', nome: 'Diretora de agência publicitária', emoji: '🎨', disc: 'I', descricao: '"Equipe criativa é caótica! DISC funciona com gente artística?"', contexto: 'Diretora 40, agência. Equipe criativa. Quer estrutura sem matar criatividade.', objecaoPivot: 'DISC × equipe criativa (não engessar)' },
    // ====== S — Estabilidade (11) ======
    { id: 'fgpc-sucessor-prudente-s', nome: 'Sucessor familiar prudente', emoji: '👨‍👨‍👦', disc: 'S', descricao: '"Vou assumir empresa do pai. Time dele velho. Como mexer sem trauma?"', contexto: 'Sucessor 32, herdeiro. Lento, cauteloso. Time leal ao pai. Receio de mudança.', objecaoPivot: 'Mudar gestão sem romper com legado paterno' },
    { id: 'fgpc-medico-clinica-s', nome: 'Médico dono de clínica', emoji: '🩺', disc: 'S', descricao: '"Clínica com 12 funcionários. Drama constante. Cansei. Mas mudar como?"', contexto: 'Médico 45, clínica. Cansado de drama. Cauteloso. Lento pra decidir.', objecaoPivot: 'Drama crônico vs resistência a estruturar' },
    { id: 'fgpc-empresario-50plus-s', nome: 'Empresário 50+ acomodado', emoji: '🛋️', disc: 'S', descricao: '"Time tá comigo há 15 anos. Mexer no perfil agora? Vai dar conflito?"', contexto: 'Dono 55+, time velho leal. Avesso a mudança. Família tranquila.', objecaoPivot: 'Aplicar DISC em time consolidado (vai dar conflito?)' },
    { id: 'fgpc-engenheiro-fabrica-s', nome: 'Engenheiro dono de fábrica', emoji: '🏭', disc: 'S', descricao: '"Operação industrial, 80 funcionários chão de fábrica. DISC funciona pra operação?"', contexto: 'Engenheiro 50, fábrica. Tradicional. Cauteloso com ferramentas modernas.', objecaoPivot: 'Aplicabilidade em chão de fábrica industrial' },
    { id: 'fgpc-comerciante-veterano-s', nome: 'Comerciante veterano', emoji: '🏪', disc: 'S', descricao: '"Loja de 30 anos. Funcionários velhos. Mexer pra quê agora?"', contexto: 'Comerciante 60+, loja antiga. Cauteloso, lento. Resistência a mudança.', objecaoPivot: 'Mudança em fim de carreira' },
    { id: 'fgpc-empresario-interior-s', nome: 'Empresário interior', emoji: '🌾', disc: 'S', descricao: '"Cidade pequena, mercado restrito. DISC tem aplicação local?"', contexto: 'Empresário 48 anos, interior. Cauteloso. Mercado limitado. Pondera aderência.', objecaoPivot: 'Aderência a mercado regional limitado' },
    { id: 'fgpc-mae-pequenos-s', nome: 'Empresária mãe de pequenos', emoji: '👶', disc: 'S', descricao: '"Tenho filho de 2 anos. 3 dias presenciais é muito. Tem online?"', contexto: 'Mãe 33, empresa pequena. Família primeiro. Cauteloso com tempo fora.', objecaoPivot: 'Tempo fora de casa (3 dias presencial)' },
    { id: 'fgpc-religioso-s', nome: 'Empresário com valores religiosos', emoji: '🙏', disc: 'S', descricao: '"Tenho princípios. DISC respeita visão integral do ser humano?"', contexto: 'Empresário 50+, religioso. Avalia ética. Calmo, observador.', objecaoPivot: 'DISC × visão integral do ser humano' },
    { id: 'fgpc-3geracao-s', nome: 'Empresário 3ª geração', emoji: '👴', disc: 'S', descricao: '"Empresa familiar 50 anos. Tio, primo, cunhado no time. DISC vai dar B.O."', contexto: 'Empresário 50+, empresa familiar grande. Cauteloso com mudanças que envolvem família.', objecaoPivot: 'Aplicar DISC em time familiar (vai causar atrito)' },
    { id: 'fgpc-gerente-recem-s', nome: 'Gerente recém-promovido', emoji: '🎖️', disc: 'S', descricao: '"Acabei de virar gerente. Tô inseguro pra liderar perfis diferentes do meu."', contexto: 'Gerente 38, promovido. Inseguro. Quer ferramenta pra entender o time.', objecaoPivot: 'Insegurança recém-promovido' },
    { id: 'fgpc-recuperando-burnout-s', nome: 'Profissional recuperando de burnout', emoji: '🌱', disc: 'S', descricao: '"Tive burnout. Quero voltar a liderar com sustentabilidade. DISC ajuda?"', contexto: 'Profissional 40, recuperando. Frágil, cauteloso. Quer abordagem leve.', objecaoPivot: 'Liderança sustentável pós-burnout' },
    // ====== C — Conformidade (11) ======
    { id: 'fgpc-psicologa-cetica-c', nome: 'Psicóloga cética sobre DISC', emoji: '🧠', disc: 'C', descricao: '"DISC tem reputação ruim na psicologia acadêmica. Tem validade científica?"', contexto: 'Psicóloga 42, CRP. Cética. Quer base científica. Detalhista.', objecaoPivot: 'Validade científica da ferramenta DISC' },
    { id: 'fgpc-controller-rh-c', nome: 'Controller de RH', emoji: '🗃️', disc: 'C', descricao: '"Vou aprovar pra 8 líderes. Quero ROI calculado em redução de turnover."', contexto: 'Controller RH 39. Vai aprovar turma. ROI quantificado. Detalhista.', objecaoPivot: 'Justificativa ROI corporativa' },
    { id: 'fgpc-auditor-c', nome: 'Auditor empresário', emoji: '📑', disc: 'C', descricao: '"Quero ementa, credenciais dos palestrantes, política de cancelamento."', contexto: 'Auditor 48. Formalista. Detalhista. Pergunta tudo.', objecaoPivot: 'Documentação formal completa' },
    { id: 'fgpc-doutor-c', nome: 'Doutor empresário', emoji: '🎓', disc: 'C', descricao: '"Tem base nas pesquisas de Marston e seguidores ou é interpretação livre?"', contexto: 'PhD 48. Cético com modismos. Quer referências acadêmicas.', objecaoPivot: 'Fidelidade à base teórica original (Marston)' },
    { id: 'fgpc-engenheiro-c', nome: 'Engenheiro analítico', emoji: '⚙️', disc: 'C', descricao: '"Mostra a metodologia: como mede, qual taxa de erro, qual confiabilidade."', contexto: 'Engenheiro 42, processual. Quer dados psicométricos. Detalhista.', objecaoPivot: 'Confiabilidade psicométrica do teste' },
    { id: 'fgpc-advogado-c', nome: 'Advogado RH', emoji: '⚖️', disc: 'C', descricao: '"DISC em processo seletivo tem risco trabalhista? LGPD permite?"', contexto: 'Advogado 45, trabalhista. Pensa em risco jurídico. Formal.', objecaoPivot: 'Riscos jurídicos (trabalhista + LGPD)' },
    { id: 'fgpc-cirurgiao-c', nome: 'Cirurgião dono de clínica', emoji: '🏥', disc: 'C', descricao: '"Quero rigor metodológico. Marston tem RCT? Replicabilidade comprovada?"', contexto: 'Cirurgião 50. Cético sem evidência. Quer replicabilidade.', objecaoPivot: 'Rigor científico do método (replicabilidade)' },
    { id: 'fgpc-arquiteto-c', nome: 'Arquiteto perfeccionista', emoji: '📐', disc: 'C', descricao: '"Como é a turma? Quero pares qualificados, não gente experimentando coaching."', contexto: 'Arquiteto 42, premium. Perfeccionista. Quer ambiente sério.', objecaoPivot: 'Qualidade da turma' },
    { id: 'fgpc-piloto-c', nome: 'Ex-piloto consultor', emoji: '✈️', disc: 'C', descricao: '"Aviação é checklist. DISC é replicável ou cada um interpreta diferente?"', contexto: 'Ex-piloto 50, virou consultor. Mentalidade procedimental.', objecaoPivot: 'Replicabilidade × interpretação subjetiva' },
    { id: 'fgpc-quimico-c', nome: 'Diretor industrial químico', emoji: '🧪', disc: 'C', descricao: '"Em indústria crítica, erro de pessoa custa vidas. DISC reduz risco humano?"', contexto: 'Diretor 50+ química. Mentalidade de segurança operacional. Detalhista.', objecaoPivot: 'Redução de risco humano em ambiente crítico' },
    { id: 'fgpc-contador-c', nome: 'Contador sócio', emoji: '📊', disc: 'C', descricao: '"Quanto vou economizar em redução de turnover? Calcula o payback."', contexto: 'Contador 44 anos. Payback-mindset. Conservador. Cálculos.', objecaoPivot: 'Payback do investimento via redução de turnover' }
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
    },
    // ====== D — Dominância (11) ======
    { id: 'if-empresario-faturamento-sem-lucro-d', nome: 'Empresário faturando muito sem lucro', emoji: '💸', disc: 'D', descricao: '"Faturo R$ 8mi/ano, mas no fim do mês tô zerado. Onde tá vazando?"', contexto: 'Empresário 45, alto faturamento, lucro líquido baixo. Frustrado. Direto, cobra resposta rápida.', objecaoPivot: 'Faturamento alto ≠ lucro (vazamento financeiro)' },
    { id: 'if-divida-empresarial-d', nome: 'Empresário com dívida pesada', emoji: '⛓️', disc: 'D', descricao: '"Tenho R$ 2mi em dívidas bancárias. Como sair disso antes de quebrar?"', contexto: 'Empresário 48, dívida grande. Pressionado, urgente. Direto, exausto. Cobra plano.', objecaoPivot: 'Plano concreto pra quitar dívida empresarial' },
    { id: 'if-executivo-alto-salario-zerado-d', nome: 'Executivo que ganha bem mas não sobra', emoji: '🎩', disc: 'D', descricao: '"Ganho R$ 40k/mês e tô zerado todo mês. Tô errando onde?"', contexto: 'Executivo 42, alto salário, baixa poupança. Direto, irritado consigo. Quer estrutura.', objecaoPivot: 'Renda alta × patrimônio zero (lifestyle inflation)' },
    { id: 'if-empresaria-divorcio-d', nome: 'Empresária pós-divórcio', emoji: '💔', disc: 'D', descricao: '"Acabei de me divorciar. Patrimônio dividido. Como reconstruir?"', contexto: 'Empresária 45, pós-divórcio. Patrimônio reduzido. Direta, decidida. Quer recomeçar com método.', objecaoPivot: 'Reconstrução financeira pós-divisão patrimonial' },
    { id: 'if-investidor-perdeu-d', nome: 'Investidor que perdeu na bolsa/cripto', emoji: '📉', disc: 'D', descricao: '"Perdi R$ 500k em cripto. Tô disposto a aprender pra não repetir."', contexto: 'Investidor 40, prejuízo grande. Decisor humilhado. Direto, quer evitar repetir erro.', objecaoPivot: 'Aprender após prejuízo grande (não repetir erro)' },
    { id: 'if-dono-pme-cresceu-d', nome: 'Dono de PME que cresceu rápido', emoji: '🚀', disc: 'D', descricao: '"Empresa explodiu, R$ 15mi/ano. Pessoalmente sou desorganizado. Bagunça."', contexto: 'Empresário 40, empresa crescendo. Pessoal desorganizado. Direto, autocrítico.', objecaoPivot: 'Crescimento da empresa × desorganização pessoal' },
    { id: 'if-medico-renda-alta-d', nome: 'Médico de alta renda gastador', emoji: '🩺', disc: 'D', descricao: '"Ganho R$ 80k/mês, mas vivo no limite. Tô fazendo errado."', contexto: 'Médico 42, alta renda, gastos altos. Direto, frustrado. Quer recolocar trilho.', objecaoPivot: 'Profissional liberal de alta renda sem patrimônio' },
    { id: 'if-aposentando-cedo-d', nome: 'Quer aposentadoria antecipada', emoji: '🏖️', disc: 'D', descricao: '"Quero aposentar aos 45. Como construir renda passiva de verdade?"', contexto: 'Profissional 38, planejando FIRE. Direto, exigente, prazo apertado. Decidido.', objecaoPivot: 'Aposentadoria antecipada (renda passiva real)' },
    { id: 'if-vendedora-alta-comissao-d', nome: 'Top vendedora alta comissão', emoji: '🏆', disc: 'D', descricao: '"Comissão de R$ 60k em mês bom, R$ 10k em mês ruim. Vivo gangorra."', contexto: 'Vendedora 35, renda variável alta. Sem regularidade. Direta, ansiosa, controladora.', objecaoPivot: 'Renda variável (gestão da gangorra)' },
    { id: 'if-empresario-50plus-patrimonio-d', nome: 'Empresário 50+ sem patrimônio', emoji: '⏳', disc: 'D', descricao: '"Tenho 55, faturei muito a vida toda e tô com pouco patrimônio. Dá tempo?"', contexto: 'Empresário 55, vida toda alta renda mas mal gerida. Direto, ansioso, autocrítico.', objecaoPivot: 'Idade × tempo pra construir patrimônio' },
    { id: 'if-dono-rede-d', nome: 'Dono de rede de lojas', emoji: '🏪', disc: 'D', descricao: '"Tenho 8 lojas. Não sei separar dinheiro pessoal de empresa. Cabeça do caixa."', contexto: 'Empresário 48, varejo. Mistura PJ/PF. Direto, prático, impaciente.', objecaoPivot: 'Separação PJ/PF (mistura clássica do dono de PME)' },
    // ====== I — Influência (11) ======
    { id: 'if-influencer-renda-alta-i', nome: 'Influencer ganhando muito', emoji: '📱', disc: 'I', descricao: '"Ganho bem nas redes! Mas não sei o que fazer com dinheiro. Gasto tudo!"', contexto: 'Influencer 28, alta renda nas redes. Sem método. Carismática, gastadora.', objecaoPivot: 'Alta renda jovem sem método (gasta tudo)' },
    { id: 'if-jovem-empolgado-i', nome: 'Jovem empolgado com investimentos', emoji: '🌟', disc: 'I', descricao: '"Tô começando a investir agora! Quero ficar rico em 5 anos!"', contexto: 'Jovem 25, animado, sem método. Carismático. Decide pela emoção.', objecaoPivot: 'Empolgação × paciência (expectativa irreal de prazo)' },
    { id: 'if-mae-empreendedora-i', nome: 'Mãe empreendedora com 2 filhos', emoji: '👶', disc: 'I', descricao: '"Tenho 2 filhos. Quero construir patrimônio pra dar segurança a eles."', contexto: 'Mãe 35, empreendedora. Materna, carismática. Decide pela família.', objecaoPivot: 'Construir patrimônio pra segurança dos filhos' },
    { id: 'if-vendedora-extrovertida-i', nome: 'Vendedora sociável que ganha bem', emoji: '💬', disc: 'I', descricao: '"Adoro vender! Adoro gastar também rs. Como conciliar?"', contexto: 'Vendedora 33, carismática. Gastadora. Decide pelo prazer imediato.', objecaoPivot: 'Conciliar prazer de consumir × construir patrimônio' },
    { id: 'if-casal-empreendedor-i', nome: 'Casal empreendedor em conflito financeiro', emoji: '💑', disc: 'I', descricao: '"Eu e meu marido brigamos por dinheiro. Empresa cresce, casamento aperta."', contexto: 'Empresária 36, sócia do marido. Conflito financeiro afeta casamento. Quer harmonia.', objecaoPivot: 'Conflito financeiro afetando casamento' },
    { id: 'if-aposentado-ativo-i', nome: 'Aposentado ativo querendo manter renda', emoji: '🌅', disc: 'I', descricao: '"Aposentei mas quero continuar prosperando! Tem que ser pesado?"', contexto: 'Aposentado 60+, ativo. Sociável. Quer aprender mas sem peso.', objecaoPivot: 'Manter renda na aposentadoria sem trabalho árduo' },
    { id: 'if-coach-financas-aspirante-i', nome: 'Aspirante a coach financeiro', emoji: '🚀', disc: 'I', descricao: '"Quero ser coach de finanças. IF me prepara?"', contexto: 'Profissional 35 anos. Animada com nicho. Decide pela inspiração. Comunicativa.', objecaoPivot: 'Migrar pra carreira de coach financeiro' },
    { id: 'if-personal-coach-vida-i', nome: 'Personal trainer/coach de vida', emoji: '🏃', disc: 'I', descricao: '"Cuido bem do corpo dos clientes, mal das minhas finanças. IF resolve?"', contexto: 'Coach 35, autônomo. Carismático. Renda variável. Conta histórias.', objecaoPivot: 'Cuidar bem do corpo dos outros × negligenciar próprias finanças' },
    { id: 'if-empresaria-bairro-i', nome: 'Empresária do bairro carismática', emoji: '🌆', disc: 'I', descricao: '"Tenho loja de 15 anos. Sempre vivi bem mas nunca pensei em patrimônio."', contexto: 'Empresária 50, loja de bairro. Sociável. Vive bem mas sem futuro.', objecaoPivot: 'Vive bem hoje × sem plano pro futuro' },
    { id: 'if-evento-empresaria-i', nome: 'Empresária de eventos com gangorra', emoji: '🎉', disc: 'I', descricao: '"Eventos sazonais! Pico, depois vale. Como controlar?"', contexto: 'Empresária 38, eventos. Carismática. Renda sazonal. Quer estabilidade.', objecaoPivot: 'Renda sazonal (gerir vale e pico)' },
    { id: 'if-empresaria-divorciada-2-i', nome: 'Empresária divorciada recomeçando socialmente', emoji: '🌺', disc: 'I', descricao: '"Divorciei, casa nova, vida nova. Quero reconstruir com leveza!"', contexto: 'Empresária 42, pós-divórcio. Otimista, carismática. Quer recomeço positivo.', objecaoPivot: 'Reconstruir após divórcio com tom positivo' },
    // ====== S — Estabilidade (11) ======
    { id: 'if-sucessor-herdeiro-s', nome: 'Sucessor herdeiro inseguro', emoji: '🌿', disc: 'S', descricao: '"Vou herdar o patrimônio. Tenho medo de torrar. Como preparar?"', contexto: 'Sucessor 30, vai herdar. Cauteloso, ansioso. Lento pra decidir. Receio.', objecaoPivot: 'Receber patrimônio sem dilapidar' },
    { id: 'if-funcionario-medo-perder-s', nome: 'Funcionário com medo de perder emprego', emoji: '😰', disc: 'S', descricao: '"Tô há 15 anos na empresa. E se demitirem? Reserva de quanto preciso?"', contexto: 'Funcionário 45, leal. Medo de demissão. Cauteloso, ansioso.', objecaoPivot: 'Reserva de emergência adequada (medo de demissão)' },
    { id: 'if-medico-50plus-cansado-s', nome: 'Médico 50+ querendo desacelerar', emoji: '🩺', disc: 'S', descricao: '"Quero diminuir o ritmo aos 55. Tenho patrimônio? Como avaliar?"', contexto: 'Médico 52, exaustão. Quer desacelerar. Cauteloso. Lento pra decidir.', objecaoPivot: 'Avaliar se patrimônio sustenta desaceleração' },
    { id: 'if-aposentado-pension-s', nome: 'Aposentado vivendo só de pensão', emoji: '👴', disc: 'S', descricao: '"Pensão tá apertada. Tenho 68 anos. Dá tempo de aprender?"', contexto: 'Aposentado 68, pensão limitada. Cauteloso, ansioso. Receio.', objecaoPivot: 'Idade avançada × aprender finanças novas' },
    { id: 'if-mae-financa-familia-s', nome: 'Mãe responsável pelas finanças familiares', emoji: '👨‍👩‍👧', disc: 'S', descricao: '"Eu cuido das contas de casa. Marido ganha mais mas é gastador. Ajuda?"', contexto: 'Mãe 40, controla finanças. Cautelosa, ansiosa. Marido gastador.', objecaoPivot: 'Equilibrar finanças com cônjuge gastador' },
    { id: 'if-engenheiro-prudente-s', nome: 'Engenheiro prudente investidor conservador', emoji: '⚙️', disc: 'S', descricao: '"Só Tesouro Direto e CDB. Tudo demais é arriscado pra mim."', contexto: 'Engenheiro 45, conservador extremo. Cauteloso. Não sai da renda fixa.', objecaoPivot: 'Conservadorismo extremo (limita retorno)' },
    { id: 'if-comerciante-tradicional-s', nome: 'Comerciante tradicional', emoji: '🏪', disc: 'S', descricao: '"Tenho minha loja, vivo bem. Mexer em investimento agora? Sei lá."', contexto: 'Comerciante 55, vida boa. Avesso a risco. Resistência a mudança.', objecaoPivot: 'Aversão a investir (conforto presente)' },
    { id: 'if-religiosa-conflito-s', nome: 'Pessoa religiosa em conflito com riqueza', emoji: '🙏', disc: 'S', descricao: '"A Bíblia fala que dinheiro é raiz do mal. Tem aplicação ética disso?"', contexto: 'Religiosa 45, conflito interno entre fé e prosperidade. Cautelosa, ética.', objecaoPivot: 'Conflito religioso com a riqueza' },
    { id: 'if-funcionario-publico-s', nome: 'Funcionário público estável', emoji: '🏛️', disc: 'S', descricao: '"Sou concursado. Salário tabelado. Como construir patrimônio com renda fixa?"', contexto: 'Servidor 40, salário estável mas limitado. Cauteloso. Quer progredir.', objecaoPivot: 'Patrimônio com renda fixa de servidor' },
    { id: 'if-empresario-3geracao-s', nome: 'Empresário 3ª geração tradicional', emoji: '👴', disc: 'S', descricao: '"Família sempre teve a empresa. Não conheço outros investimentos."', contexto: 'Empresário 50, 3ª geração. Tradicional. Lento, cauteloso.', objecaoPivot: 'Diversificar além da empresa familiar' },
    { id: 'if-recuperando-divida-s', nome: 'Profissional recuperando de dívida pessoal', emoji: '🌱', disc: 'S', descricao: '"Saí de R$ 80k em dívidas. Tô paranoico de não voltar. Como evitar?"', contexto: 'Profissional 38, saiu de dívida. Frágil, cauteloso. Medo de recaída.', objecaoPivot: 'Evitar recaída em dívida (paranoia financeira)' },
    // ====== C — Conformidade (11) ======
    { id: 'if-cfo-pessoal-c', nome: 'CFO da empresa, péssimo nas finanças pessoais', emoji: '🧮', disc: 'C', descricao: '"Sou CFO de empresa de R$ 100mi. Minhas finanças pessoais? Bagunça."', contexto: 'CFO 45, expert empresarial, amador pessoal. Analítico no trabalho, caótico em casa.', objecaoPivot: 'Expert profissional × amador pessoal' },
    { id: 'if-contador-c', nome: 'Contador empresário', emoji: '📊', disc: 'C', descricao: '"Sou contador. Tudo o que vai me ensinar eu já sei tecnicamente. Tem mais?"', contexto: 'Contador 44, sócio escritório. Técnico sólido. Cético com promessas.', objecaoPivot: 'Sobreposição com conhecimento técnico contábil' },
    { id: 'if-advogado-c', nome: 'Advogado dono de banca', emoji: '⚖️', disc: 'C', descricao: '"Quero ver ementa, política de cancelamento, depoimentos verificáveis."', contexto: 'Advogado 45. Formal. Lê tudo. Decide com calma.', objecaoPivot: 'Documentação formal completa' },
    { id: 'if-cientista-investidor-c', nome: 'Cientista que investe', emoji: '🔬', disc: 'C', descricao: '"PhD em estatística. Inteligência financeira tem rigor matemático ou é coaching?"', contexto: 'PhD 42. Cético com modismos. Quer fundamento numérico.', objecaoPivot: 'Rigor matemático vs auto-ajuda financeira' },
    { id: 'if-engenheiro-planilha-c', nome: 'Engenheiro com planilhas', emoji: '📈', disc: 'C', descricao: '"Tenho planilha de cada centavo. O que IF agrega à minha planilha?"', contexto: 'Engenheiro 40, super organizado. Quer ver diferencial. Detalhista.', objecaoPivot: 'Já tem controle (qual o diferencial)' },
    { id: 'if-arquiteto-c', nome: 'Arquiteto perfeccionista', emoji: '📐', disc: 'C', descricao: '"Quero ementa por hora. Material entregue. Bibliografia se houver."', contexto: 'Arquiteto 42, perfeccionista. Detalhista. Quer estrutura formal.', objecaoPivot: 'Material formal e estruturado' },
    { id: 'if-medico-pesquisador-c', nome: 'Médico pesquisador cético', emoji: '🩺', disc: 'C', descricao: '"Tem RCT pra reprogramação de crenças? Ou é placebo motivacional?"', contexto: 'Médico 50, pesquisador. Cético com método de mudança comportamental.', objecaoPivot: 'Evidência empírica de mudança de crenças' },
    { id: 'if-controlador-empresa-c', nome: 'Controller corporativo', emoji: '🗃️', disc: 'C', descricao: '"Avalio com base em payback. Quanto recupero do investimento em quanto tempo?"', contexto: 'Controller 42. Payback-mindset. Detalhista. Conservador.', objecaoPivot: 'Payback do treinamento (ROI claro)' },
    { id: 'if-auditor-fiscal-c', nome: 'Auditor fiscal sênior', emoji: '📑', disc: 'C', descricao: '"Métodos de avalanche e bola de neve são consagrados? Quem comprova?"', contexto: 'Auditor 50+. Formalista. Quer ver credenciais das metodologias citadas.', objecaoPivot: 'Validação acadêmica das metodologias (avalanche/bola de neve)' },
    { id: 'if-economista-c', nome: 'Economista cético', emoji: '📚', disc: 'C', descricao: '"Sou economista. Inteligência financeira é educação financeira com nome novo?"', contexto: 'Economista 38. Acadêmico. Cético com rebranding. Quer diferencial.', objecaoPivot: 'Diferencial vs educação financeira clássica' },
    { id: 'if-piloto-c', nome: 'Ex-piloto comercial', emoji: '✈️', disc: 'C', descricao: '"Aviação é checklist. Tem checklist financeiro replicável?"', contexto: 'Ex-piloto 48, virou consultor. Mentalidade procedimental.', objecaoPivot: 'Checklist financeiro replicável (sistema)' }
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
    },
    // ====== D — Dominância (11) ======
    { id: 'tav-empresario-meta-d', nome: 'Empresário que precisa bater meta', emoji: '🎯', disc: 'D', descricao: '"Meta do trimestre é absurda. 16 horas me dão munição pra fechar?"', contexto: 'Empresário 42, prazo curto. Cobra ROI imediato. Direto, urgente.', objecaoPivot: 'Aplicabilidade imediata no fechamento desta semana' },
    { id: 'tav-dono-pme-time-fraco-d', nome: 'Dono de PME com time comercial fraco', emoji: '📉', disc: 'D', descricao: '"Meu time vende mal. TAV serve pra eles ou só pra mim?"', contexto: 'Dono 45, R$ 5mi/ano, time comercial fraco. Direto. Avalia se manda turma.', objecaoPivot: 'Aplicação corporativa (time inteiro)' },
    { id: 'tav-vendedor-top-d', nome: 'Top vendedor querendo blindar liderança', emoji: '🏆', disc: 'D', descricao: '"Sou TOP 1 do time. Quero blindar minha liderança. TAV tem nível pra mim?"', contexto: 'Vendedor 36, faturamento alto. Quer continuar evoluindo. Direto, competitivo.', objecaoPivot: 'Nível avançado pra quem já é top performer' },
    { id: 'tav-ceo-vendas-em-queda-d', nome: 'CEO com vendas em queda', emoji: '🔻', disc: 'D', descricao: '"Vendas caíram 30% em 4 meses. Time não bate. Quero respostas."', contexto: 'CEO 48, empresa em queda. Frustrado, pressionado. Direto, busca culpado.', objecaoPivot: 'Reverter queda de vendas rapidamente' },
    { id: 'tav-empresario-vendas-complexas-d', nome: 'Empresário B2B vendas complexas', emoji: '🏢', disc: 'D', descricao: '"Vendo software de R$ 100k+. AIDA serve pra ciclo longo?"', contexto: 'CEO B2B 40, ticket alto. Pragmático. Avalia aderência ao ciclo dele.', objecaoPivot: 'Técnicas em vendas complexas de ciclo longo' },
    { id: 'tav-gerente-pressionado-board-d', nome: 'Gerente comercial pressionado', emoji: '🪤', disc: 'D', descricao: '"Board cobra crescimento de 40%. Time vende como sempre. Vou ser demitido."', contexto: 'Gerente 40, pressão extrema. Decisor mas refém. Direto, ansioso.', objecaoPivot: 'Pressão do board × time tradicional' },
    { id: 'tav-empresaria-marketing-comercial-d', nome: 'Empresária que vende digital', emoji: '💻', disc: 'D', descricao: '"Vendas online. Tráfego pago é só metade. Como fechar com lead frio?"', contexto: 'Empresária 38, e-commerce. Direto, técnica. Pergunta sobre lead frio.', objecaoPivot: 'Conversão de lead frio em venda' },
    { id: 'tav-coronel-vendas-d', nome: 'Vendedor "coronel" antigo', emoji: '🪖', disc: 'D', descricao: '"Vendo do meu jeito há 20 anos. Bate meta. Pra que aprender de novo?"', contexto: 'Vendedor 55, alta performance no estilo dele. Soberbo, direto.', objecaoPivot: 'Soberba do veterano (já sei vender)' },
    { id: 'tav-empresario-margem-baixa-d', nome: 'Empresário brigando preço', emoji: '⚔️', disc: 'D', descricao: '"Mercado virou commodity. Como vender valor em vez de preço?"', contexto: 'Empresário 45, mercado saturado. Frustrado com brigando preço. Direto.', objecaoPivot: 'Vender valor em vez de preço' },
    { id: 'tav-dono-imobiliaria-d', nome: 'Dono de imobiliária', emoji: '🏘️', disc: 'D', descricao: '"Tenho 12 corretores. VGV travado. Aplicar AIDA em imóvel funciona?"', contexto: 'Dono imobiliária 45. Comissão variável. Direto, pratico. Avalia setor.', objecaoPivot: 'AIDA aplicada a imóvel/ticket alto longo' },
    { id: 'tav-empresario-recolocacao-d', nome: 'Empresário que vende serviço técnico', emoji: '🛠️', disc: 'D', descricao: '"Vendo consultoria pra grandes. Ciclo longo. TAV cobre B2B enterprise?"', contexto: 'Empresário 50, consultoria B2B enterprise. Direto, técnico. Avalia profundidade.', objecaoPivot: 'B2B enterprise (ciclo longo, múltiplos decisores)' },
    // ====== I — Influência (11) ======
    { id: 'tav-vendedora-popular-i', nome: 'Vendedora popular e carismática', emoji: '💬', disc: 'I', descricao: '"Amo conversar! Mas fechamento eu ainda paralizo. Como destravar?"', contexto: 'Vendedora 32, popular. Carismática mas paralisa no fechamento.', objecaoPivot: 'Carisma alto × paralisia no fechamento' },
    { id: 'tav-influencer-vendendo-curso-i', nome: 'Influencer vendendo curso próprio', emoji: '📱', disc: 'I', descricao: '"Tenho audiência! Mas conversão de seguidor pra cliente é baixa."', contexto: 'Influencer 30, 80k seguidores. Audiência grande, conversão baixa.', objecaoPivot: 'Audiência grande × conversão baixa' },
    { id: 'tav-coach-vendendo-mentoria-i', nome: 'Coach vendendo mentoria', emoji: '🎤', disc: 'I', descricao: '"Atendo bem, mas tenho dificuldade de pedir o investimento. TAV ajuda?"', contexto: 'Coach 38, sociável. Bloqueio com dinheiro/cobrança. Carismático.', objecaoPivot: 'Bloqueio em pedir investimento (cobrança)' },
    { id: 'tav-mae-empreendedora-vendendo-i', nome: 'Mãe empreendedora vendendo online', emoji: '🌸', disc: 'I', descricao: '"Vendo produto de moda online. Como aplicar técnica em redes sociais?"', contexto: 'Empreendedora 35, e-commerce moda. Carismática. Decide pela conexão.', objecaoPivot: 'TAV aplicado a vendas em rede social' },
    { id: 'tav-vendedor-novato-i', nome: 'Vendedor novato animado', emoji: '🌟', disc: 'I', descricao: '"Comecei há 3 meses! Quero ser TOP rápido. TAV acelera isso?"', contexto: 'Vendedor 24, novato. Animado. Decide pela inspiração. Sem método ainda.', objecaoPivot: 'Acelerar curva de aprendizado' },
    { id: 'tav-aspirante-empreendedor-i', nome: 'Aspirante a empreendedor', emoji: '🚀', disc: 'I', descricao: '"Quero abrir minha empresa! Mas tenho medo de não saber vender."', contexto: 'Profissional 28, vai empreender. Otimista, comunicativo. Inseguro com vendas.', objecaoPivot: 'Insegurança de quem nunca vendeu' },
    { id: 'tav-gerente-eventos-i', nome: 'Gerente de eventos vendendo grandes contas', emoji: '🎉', disc: 'I', descricao: '"Vendo eventos corporativos. Cliente é diretor de RH. Como conectar?"', contexto: 'Gerente comercial 36, eventos. Carismática. Vende ticket alto a perfis sêniors.', objecaoPivot: 'Conectar com perfil sênior (diretor RH)' },
    { id: 'tav-personal-vendendo-pacote-i', nome: 'Personal trainer vendendo pacotes', emoji: '🏃', disc: 'I', descricao: '"Vendo pacote anual mas cliente quer mensal. Como vender o longo prazo?"', contexto: 'Personal 32, popular. Sociável. Quer aumentar ticket via pacote anual.', objecaoPivot: 'Convencer cliente do compromisso longo' },
    { id: 'tav-corretor-imoveis-i', nome: 'Corretor de imóveis carismático', emoji: '🏘️', disc: 'I', descricao: '"Adoro mostrar imóvel! Mas fechamento de proposta sempre me trava."', contexto: 'Corretor 38, popular. Bom de relacionamento, ruim de fechamento.', objecaoPivot: 'Relacionamento alto × fechamento fraco' },
    { id: 'tav-empresaria-eventos-i', nome: 'Empresária de eventos sociais', emoji: '🎊', disc: 'I', descricao: '"Sou conhecida na cidade! Mas dependo só do boca a boca. Quero estruturar."', contexto: 'Empresária 40, eventos. Bem relacionada. Quer estruturar processo.', objecaoPivot: 'Estruturar venda além do boca a boca' },
    { id: 'tav-vendedora-cosmeticos-i', nome: 'Revendedora de cosméticos', emoji: '💄', disc: 'I', descricao: '"Vendo Mary Kay! Quero crescer minha equipe e meu volume. TAV serve?"', contexto: 'Revendedora 40, MMN. Carismática. Decide pelo grupo. Quer escalar.', objecaoPivot: 'Aplicação a venda direta / multinível' },
    // ====== S — Estabilidade (11) ======
    { id: 'tav-tecnico-virou-vendedor-s', nome: 'Técnico que virou vendedor', emoji: '🛠️', disc: 'S', descricao: '"Era técnico, virei vendedor. Sou tímido. Vendas é meu pesadelo."', contexto: 'Profissional 38, perfil técnico forçado a vender. Tímido. Inseguro.', objecaoPivot: 'Vendedor introvertido (técnico forçado)' },
    { id: 'tav-medico-vendedor-s', nome: 'Médico vendendo procedimentos estéticos', emoji: '🩺', disc: 'S', descricao: '"Sou médico, péssimo vendedor. Mas preciso vender pacote estético. Drama."', contexto: 'Médico 45, dono de clínica. Cauteloso. Desconfortável vendendo.', objecaoPivot: 'Médico em conflito ético com vender' },
    { id: 'tav-aposentado-vendendo-s', nome: 'Aposentado vendendo segundo negócio', emoji: '🌅', disc: 'S', descricao: '"Aposentei, abri loja. Aprender a vender aos 65? Como?"', contexto: 'Aposentado 65, primeiro negócio próprio. Cauteloso, lento.', objecaoPivot: 'Idade avançada × aprender a vender' },
    { id: 'tav-empresario-50plus-tradicional-s', nome: 'Empresário tradicional 50+', emoji: '👴', disc: 'S', descricao: '"Empresa de 25 anos, vendo como sempre. Mudar gatilhos agora? Inseguro."', contexto: 'Empresário 55, tradicional. Time velho. Avesso a "técnicas modernas".', objecaoPivot: 'Quebrar padrão de 25 anos' },
    { id: 'tav-gerente-loja-tradicional-s', nome: 'Gerente de loja tradicional', emoji: '🏪', disc: 'S', descricao: '"Loja física tradicional. Cliente chega, vendedor atende. Pra que técnica?"', contexto: 'Gerente 48, loja tradicional. Cauteloso. Resiste a estruturar.', objecaoPivot: 'Estruturar venda em loja "que sempre funcionou"' },
    { id: 'tav-engenheiro-vendendo-s', nome: 'Engenheiro vendendo seu próprio projeto', emoji: '⚙️', disc: 'S', descricao: '"Sou engenheiro, não vendedor. Mas preciso vender minha consultoria. Trauma."', contexto: 'Engenheiro 42, técnico forçado a vender. Cauteloso, inseguro.', objecaoPivot: 'Técnico que precisa virar comercial' },
    { id: 'tav-mae-pequenos-vendendo-s', nome: 'Mãe vendendo do home office', emoji: '👶', disc: 'S', descricao: '"Vendo do home office com 2 filhos. 16h presencial pesa."', contexto: 'Mãe 33, vende digital. Família primeiro. Avaliar formato presencial.', objecaoPivot: 'Conciliação família × evento presencial' },
    { id: 'tav-religioso-vendedor-s', nome: 'Vendedor com valores religiosos', emoji: '🙏', disc: 'S', descricao: '"Gatilhos mentais não são manipulação? Vai contra minha ética."', contexto: 'Vendedor 45, religioso. Ético. Cauteloso com técnicas persuasivas.', objecaoPivot: 'Gatilhos vs ética (manipulação?)' },
    { id: 'tav-vendedor-interior-s', nome: 'Vendedor interior cauteloso', emoji: '🌾', disc: 'S', descricao: '"Cidade pequena, mercado limitado. AIDA funciona com cliente que me conhece?"', contexto: 'Vendedor 42, interior. Cauteloso. Mercado de relacionamento.', objecaoPivot: 'Aplicabilidade em mercado relacional/pequeno' },
    { id: 'tav-funcionario-promovido-comercial-s', nome: 'Funcionário promovido a comercial', emoji: '🎖️', disc: 'S', descricao: '"Era do administrativo. Me jogaram em vendas. Tô perdido."', contexto: 'Profissional 40, promovido sem preparo. Inseguro, leal. Quer ferramentas.', objecaoPivot: 'Insegurança da transição forçada' },
    { id: 'tav-cooperativa-s', nome: 'Vendedor de cooperativa agrícola', emoji: '🌾', disc: 'S', descricao: '"Vendo pra produtores que me conhecem. Técnica não vai parecer artificial?"', contexto: 'Vendedor 48, cooperativa. Relacionamento longo. Cauteloso.', objecaoPivot: 'Técnica × relacionamento de confiança longa' },
    // ====== C — Conformidade (11) ======
    { id: 'tav-cetico-gatilho-c', nome: 'Cético sobre gatilhos mentais', emoji: '🤨', disc: 'C', descricao: '"Gatilhos mentais têm fundamento neurocientífico ou é Cialdini reembalado?"', contexto: 'Empresário 45, lê bastante. Cético com modismos. Quer fonte.', objecaoPivot: 'Fundamento neurocientífico (Cialdini ou inovação?)' },
    { id: 'tav-engenheiro-comercial-c', nome: 'Engenheiro comercial técnico', emoji: '⚙️', disc: 'C', descricao: '"Quero fluxo: como cada técnica entra no funil. Mostra estrutura."', contexto: 'Engenheiro comercial 42. Quer ver processo. Detalhista, analítico.', objecaoPivot: 'Estrutura do funil + onde cada técnica entra' },
    { id: 'tav-advogado-vendedor-c', nome: 'Advogado vendendo escritório', emoji: '⚖️', disc: 'C', descricao: '"Captação de cliente em advocacia tem OAB. TAV respeita o código de ética?"', contexto: 'Advogado 45. Formal. Pensa em compliance OAB.', objecaoPivot: 'Compliance com ética da OAB' },
    { id: 'tav-cfo-comercial-c', nome: 'CFO que avalia ROI do curso', emoji: '🧮', disc: 'C', descricao: '"Custo do treinamento × ganho em conversão. Tem caso quantificado?"', contexto: 'CFO 44. ROI-obsessed. Quer dados concretos.', objecaoPivot: 'ROI quantificado do treinamento' },
    { id: 'tav-controller-rh-c', nome: 'Controller RH avaliando turma corporativa', emoji: '🗃️', disc: 'C', descricao: '"Vou aprovar pra 12 vendedores. Atende time corporativo?"', contexto: 'Controller RH 39. Aprovar turma corporativa. Detalhista.', objecaoPivot: 'Aplicação corporativa em massa' },
    { id: 'tav-auditor-c', nome: 'Auditor sênior', emoji: '📑', disc: 'C', descricao: '"Quero ementa, credenciais dos treinadores e cancellation policy."', contexto: 'Auditor 50+. Formalista. Detalhista. Pergunta tudo.', objecaoPivot: 'Documentação formal completa' },
    { id: 'tav-cientista-marketing-c', nome: 'Cientista de marketing', emoji: '🔬', disc: 'C', descricao: '"PhD em comportamento do consumidor. AIDA é dos anos 1900. Tem atualização?"', contexto: 'PhD 42. Acadêmico em marketing. Cético com framework antigo.', objecaoPivot: 'AIDA × frameworks modernos (PASTOR, etc)' },
    { id: 'tav-medico-cetico-c', nome: 'Médico cético sobre persuasão', emoji: '🩺', disc: 'C', descricao: '"Tem RCT comprovando aumento de vendas com gatilhos? Ou anedótico?"', contexto: 'Médico 50, baseado em evidência. Cético sem prova científica.', objecaoPivot: 'Evidência empírica de impacto (não anedótica)' },
    { id: 'tav-arquiteto-vendedor-c', nome: 'Arquiteto que precisa vender projetos', emoji: '📐', disc: 'C', descricao: '"Quero ver perfil dos colegas de turma. Não quero ficar com gente do varejo."', contexto: 'Arquiteto 42, projetos premium. Perfeccionista. Quer ambiente premium.', objecaoPivot: 'Perfil dos colegas de turma (homogeneidade)' },
    { id: 'tav-piloto-comercial-c', nome: 'Ex-piloto consultor comercial', emoji: '✈️', disc: 'C', descricao: '"Vendas tem checklist replicável ou cada um inventa?"', contexto: 'Ex-piloto 50, consultor. Mentalidade procedimental.', objecaoPivot: 'Vendas como sistema replicável (checklist)' },
    { id: 'tav-quimico-comercial-c', nome: 'Diretor comercial industrial', emoji: '🧪', disc: 'C', descricao: '"Indústria química B2B. Cliente é técnico, não emocional. TAV ainda serve?"', contexto: 'Diretor comercial 50, química. Cliente técnico. Cético com gatilho emocional.', objecaoPivot: 'B2B técnico × gatilhos emocionais' }
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
    },
    // ===== 44 perfis novos (calibrados ao PDF CEOP: 3d/30h, AIDA, gatilhos, storytelling, voz, linguagem corporal) =====
    // --- 10 D ---
    {
      id: 'ceop-ceo-perde-negociacao-d',
      nome: 'CEO que perde negociações',
      emoji: '💼',
      disc: 'D',
      descricao: '"Negocio com força e perco. Sai cliente, sai investidor. Comunicação minha trava no \'sim final\'."',
      contexto: 'CEO 45+, agressivo na argumentação. Fecha menos do que poderia. Sente que falta refinamento persuasivo, mas não admite fácil. Resultado é a moeda.',
      objecaoPivot: 'Resultado financeiro × estilo bruto na mesa'
    },
    {
      id: 'ceop-empresario-terceiriza-palco-d',
      nome: 'Empresário que terceiriza o palco',
      emoji: '🎙️',
      disc: 'D',
      descricao: '"Tenho marketing pra falar por mim. Por que eu vou subir no palco? Tempo é grana."',
      contexto: 'Dono 40+, faturando bem. Delega comunicação institucional. Equipe pede que ele apareça mais. Vê palestra como vaidade. ROI cético.',
      objecaoPivot: 'Custo de não ser a voz da própria marca'
    },
    {
      id: 'ceop-diretora-intimida-equipe-d',
      nome: 'Diretora que intimida equipe',
      emoji: '🛡️',
      disc: 'D',
      descricao: '"Falo, ninguém contesta. Falo, ninguém engaja. Equipe fica muda nas reuniões."',
      contexto: 'Diretora 38+, voz firme, postura imponente. Decide tudo. Time deixou de propor. RH apontou clima ruim. Não conecta nas one-on-one.',
      objecaoPivot: 'Autoridade × medo do time → desengajamento'
    },
    {
      id: 'ceop-vendedor-agressivo-trava-d',
      nome: 'Vendedor agressivo que trava cliente',
      emoji: '🔪',
      disc: 'D',
      descricao: '"Bato meta, mas o cliente some no follow-up. Acho que assusto."',
      contexto: 'Vendedor 32+, alta performance no abre, baixa retenção. Fala muito, escuta pouco. Cliente fecha e some. Pressão de cota.',
      objecaoPivot: 'Conversão imediata × LTV destruído'
    },
    {
      id: 'ceop-founder-pitch-investidor-d',
      nome: 'Founder que não vende ideia',
      emoji: '🚀',
      disc: 'D',
      descricao: '"Tenho a melhor tese do setor. Investidor não morde. O quê tô errando no pitch?"',
      contexto: 'Founder 35+, sabe o produto. Pitch frio, sem narrativa, foca em métrica e mercado. Investidor desconecta em 90s. Captação travada.',
      objecaoPivot: 'Dados sem história → cheque que não sai'
    },
    {
      id: 'ceop-medo-perder-controle-d',
      nome: 'Empresário com medo do palco',
      emoji: '😶‍🌫️',
      disc: 'D',
      descricao: '"Em sala fechada eu mando. Subi no palco uma vez, travei. Não volto."',
      contexto: 'Empresário 45+ que evita evento por orgulho ferido. Perdeu oportunidade de palestra paga + visibilidade. Não admite o medo, racionaliza.',
      objecaoPivot: 'Perdas de receita × evitação do medo público'
    },
    {
      id: 'ceop-monopoliza-reuniao-d',
      nome: 'Líder que monopoliza reunião',
      emoji: '🗣️',
      disc: 'D',
      descricao: '"Falo, fecho ponto, próximo tema. Reunião de 1h vira de 2h, todo mundo cala."',
      contexto: 'Líder 40+, decide rápido demais. Não dá espaço pra time falar. Reuniões viraram monólogo. Insight de baixo escala não chega.',
      objecaoPivot: 'Eficiência percebida × insumo do time perdido'
    },
    {
      id: 'ceop-negociadora-perde-grandes-d',
      nome: 'Negociadora que perde grandes contratos',
      emoji: '📉',
      disc: 'D',
      descricao: '"Fecho contratos médios bem, mas grande conta escapa. Querem \'feeling\', eu trago lógica seca."',
      contexto: 'Negociadora 38+ B2B. Domina técnica, perde no rapport. Cliente premium quer narrativa, ela entrega planilha. Sente injustiça.',
      objecaoPivot: 'Lógica blindada × inteligência emocional na mesa'
    },
    {
      id: 'ceop-arrogante-no-pitch-d',
      nome: 'Empresário arrogante no pitch',
      emoji: '👑',
      disc: 'D',
      descricao: '"\'Eu sou o melhor do mercado\' — falo isso e a sala gela. Devia funcionar."',
      contexto: 'Dono 42+ alto ego. Confunde autoconfiança com arrogância. Não usa storytelling, ataca direto. Clientes premium fogem.',
      objecaoPivot: 'Autoconfiança × arrogância na percepção do outro'
    },
    {
      id: 'ceop-impaciente-storytelling-d',
      nome: 'CEO impaciente com storytelling',
      emoji: '⏱️',
      disc: 'D',
      descricao: '"Storytelling? Não tenho tempo pra contar historinha. Quero o ponto."',
      contexto: 'CEO 50+ velha guarda. Acha storytelling perda de tempo. Discurso dele não emociona, não converte. Nova geração não engaja.',
      objecaoPivot: 'Direto-ao-ponto × engajamento da audiência'
    },
    // --- 9 I ---
    {
      id: 'ceop-influencer-sem-estrutura-i',
      nome: 'Influencer sem estrutura',
      emoji: '📱',
      disc: 'I',
      descricao: '"100k seguidores, mas quando converto pra live ou palestra paga, embolo tudo. Saio do tema."',
      contexto: 'Influencer 28-35. Espontâneo no Reels, perdido em palco. Confia no carisma. Convidada pra evento, gravou ruim. Quer profissionalizar.',
      objecaoPivot: 'Espontaneidade × estrutura para audiência paga'
    },
    {
      id: 'ceop-palestrante-fala-demais-i',
      nome: 'Palestrante que fala demais',
      emoji: '🎤',
      disc: 'I',
      descricao: '"1h vira 2h, audiência sai antes do final. Eu me empolgo."',
      contexto: 'Palestrante iniciante 32+. Carisma, mas sem objetivo claro. Sem AIDA, sem fechamento. Repete histórias. Nota baixa nas avaliações.',
      objecaoPivot: 'Empolgação × foco / objetivo da fala'
    },
    {
      id: 'ceop-vendedora-carisma-baixa-conv-i',
      nome: 'Vendedora carisma sem conversão',
      emoji: '☀️',
      disc: 'I',
      descricao: '"Cliente AMA conversar comigo. Mas não fecha. Sou \'a amiga\', não \'a vendedora\'."',
      contexto: 'Vendedora 30+, relacional, brilhante no rapport. Não pede o pedido. Foge do fechamento. Cota não bate.',
      objecaoPivot: 'Simpatia × call-to-action / fechamento'
    },
    {
      id: 'ceop-coach-improvisa-i',
      nome: 'Coach que improvisa toda aula',
      emoji: '🎲',
      disc: 'I',
      descricao: '"Subo no palco e flui. Mas o resultado é inconsistente — uns dias arraso, outros morro."',
      contexto: 'Coach 35+ palestrante ocasional. Confia no improviso. Sem retórica preparada. Sem estrutura. Aluno premium pediu reembolso.',
      objecaoPivot: 'Improviso brilhante × consistência profissional'
    },
    {
      id: 'ceop-diretora-marketing-dispersa-i',
      nome: 'Diretora de marketing que dispersa',
      emoji: '🌪️',
      disc: 'I',
      descricao: '"Tenho 10 ideias por reunião. Time sai confuso. CEO disse \'foca uma\'."',
      contexto: 'Diretora 38+ criativa, agitada. Apresentação vira tempestade. Sem priorização verbal. Stakeholders perdidos. Briga com clareza.',
      objecaoPivot: 'Criatividade × clareza estrutural na fala'
    },
    {
      id: 'ceop-networker-superficial-i',
      nome: 'Networker superficial',
      emoji: '🤝',
      disc: 'I',
      descricao: '"Conheço todo mundo, ninguém me lembra. Cartão de visita não gera negócio."',
      contexto: 'Profissional 33+ frequenta eventos, troca contato em massa. Discurso de elevador genérico. Sem posicionamento claro. ROI zero.',
      objecaoPivot: 'Quantidade de contato × marketing pessoal posicionado'
    },
    {
      id: 'ceop-empresaria-boa-ideia-confusa-i',
      nome: 'Empresária com ideia confusa',
      emoji: '🌈',
      disc: 'I',
      descricao: '"Meu produto é incrível, mas quando explico, todo mundo faz cara de \'hã?\'"',
      contexto: 'Founder 32+ produto inovador. Pitch confuso. Mistura 3 propostas de valor. Cliente desiste. Sócio pede pra simplificar.',
      objecaoPivot: 'Riqueza de conceito × simplicidade da mensagem'
    },
    {
      id: 'ceop-simpatico-inconvincente-i',
      nome: 'Simpático mas pouco convincente',
      emoji: '🌻',
      disc: 'I',
      descricao: '"Sou querido por todos. Persuadir é outro nível — \'que fofo o Pedro\', mas não compram."',
      contexto: 'Profissional 30+ campeão de simpatia, perdedor em persuasão. Sem gatilhos mentais. Sem autoridade percebida. Carreira estagnada.',
      objecaoPivot: 'Simpatia × autoridade técnica percebida'
    },
    {
      id: 'ceop-apresentadora-distrai-i',
      nome: 'Apresentadora que distrai com excessos',
      emoji: '🎪',
      disc: 'I',
      descricao: '"Slides cheios, gestos demais, piada toda hora. Saí do evento e ninguém lembra do meu ponto."',
      contexto: 'Apresentadora 30+ animadíssima. Excessos canibalizam mensagem. Audiência diverte, não converte. Patrocinador questiona ROI.',
      objecaoPivot: 'Energia × economia / foco no recado'
    },
    // --- 9 S (já tem 2: timido-cronico-s, lider-hierarquico-s) ---
    {
      id: 'ceop-promovido-com-vergonha-s',
      nome: 'Promovido com vergonha de liderar',
      emoji: '😳',
      disc: 'S',
      descricao: '"Virei gestor, agora preciso liderar reuniões. Não consigo abrir a boca primeiro."',
      contexto: 'Analista 30+ promovido. Excelente técnico, sem voz de líder. Equipe não respeita ainda. Time anterior dele agora é par.',
      objecaoPivot: 'Habilidade técnica reconhecida × autoridade nova'
    },
    {
      id: 'ceop-gerente-conciliador-sem-voz-s',
      nome: 'Gerente conciliador sem voz',
      emoji: '🕊️',
      disc: 'S',
      descricao: '"Sou o paz-e-amor do board. Concordo com todo mundo. Não defendo minha área."',
      contexto: 'Gerente 38+ harmonizador. Não confronta. Sua equipe perde budget. Diretor questionou. Cargo em risco.',
      objecaoPivot: 'Harmonia × defesa estratégica do território'
    },
    {
      id: 'ceop-professora-treme-publico-s',
      nome: 'Professora que treme em público',
      emoji: '📚',
      disc: 'S',
      descricao: '"Sala de 20 alunos, tranquilo. Auditório de 200? Tremo, esqueço, suo frio."',
      contexto: 'Professora 35+ dá aula bem em sala fechada. Convidada pra congresso, recusou 2x. Quer aceitar próximo, não sabe como.',
      objecaoPivot: 'Conforto em ambiente íntimo × medo de grande público'
    },
    {
      id: 'ceop-coach-inseguro-cobrar-s',
      nome: 'Coach inseguro de cobrar premium',
      emoji: '💸',
      disc: 'S',
      descricao: '"Cobro R$ 200 a sessão. Tô há 5 anos assim. Sei que vale mais. Não consigo posicionar."',
      contexto: 'Coach 40+ formado, bom em sessão. Marketing pessoal fraco. Não se vende como autoridade. Sem palestra, sem mídia.',
      objecaoPivot: 'Capacidade técnica × posicionamento de autoridade'
    },
    {
      id: 'ceop-vendedor-perde-atencao-s',
      nome: 'Vendedor que perde a atenção',
      emoji: '🔇',
      disc: 'S',
      descricao: '"Cliente abre o WhatsApp no meio da minha apresentação. Sei que perdi ali."',
      contexto: 'Vendedor 33+ B2B. Tom monótono. Sem ganchos, sem hook inicial. Apresentação previsível. Conversão abaixo da meta.',
      objecaoPivot: 'Conteúdo correto × entrega que prende'
    },
    {
      id: 'ceop-empresaria-delega-palestrar-s',
      nome: 'Empresária que delega palestrar',
      emoji: '🪑',
      disc: 'S',
      descricao: '"Sou dona, mas quem fala é o sócio. Ele brilha, eu me apago."',
      contexto: 'Sócia 40+. Co-fundadora. Por timidez, sócio virou rosto da marca. Sente que perdeu protagonismo. Quer voltar mas tem medo.',
      objecaoPivot: 'Conforto na sombra × resgate de protagonismo'
    },
    {
      id: 'ceop-evita-reunioes-s',
      nome: 'Tímida que evita reuniões grandes',
      emoji: '🚪',
      disc: 'S',
      descricao: '"Quando vejo reunião com 10+ pessoas, dou jeito de não ir. Mando relatório."',
      contexto: 'Profissional 32+ sênior. Evita exposição. Cargo trava: chefia exige presença. Perdeu promoção 2x por \'não aparecer\'.',
      objecaoPivot: 'Evitação como mecanismo × custo de carreira'
    },
    {
      id: 'ceop-pacificadora-foge-conflito-s',
      nome: 'Pacificadora que foge do conflito',
      emoji: '☮️',
      disc: 'S',
      descricao: '"Discussão acalorada me paralisa. Não sei rebater. Engulo, depois choro."',
      contexto: 'Profissional 36+. Inteligente, mas paralisa em embate. Negociações difíceis viram derrota. Saúde mental afetada.',
      objecaoPivot: 'Aversão ao conflito × ferramentas de resposta firme'
    },
    {
      id: 'ceop-treinadora-se-desculpa-s',
      nome: 'Treinadora que se desculpa demais',
      emoji: '🙏',
      disc: 'S',
      descricao: '"\'Desculpa, talvez eu esteja errada, mas...\' — começo toda fala assim. Sei que enfraqueço."',
      contexto: 'Treinadora interna 34+. Conhecimento sólido, comunicação humilde demais. Autoridade percebida baixa. Alunos questionam.',
      objecaoPivot: 'Humildade exagerada × autoridade percebida'
    },
    // --- 10 C (já tem 1: introvertido-tecnico-c) ---
    {
      id: 'ceop-engenheiro-ninguem-entende-c',
      nome: 'Engenheiro que ninguém entende',
      emoji: '⚙️',
      disc: 'C',
      descricao: '"Explico o projeto técnico, sala fica em silêncio. Diretor pede pra \'simplificar\'. Acho que tô simplificando!"',
      contexto: 'Engenheiro 40+. Domina conteúdo. Jargão excessivo. Comunicação só com pares técnicos. Cliente final desliga.',
      objecaoPivot: 'Densidade técnica × tradução para leigo'
    },
    {
      id: 'ceop-medica-conteudo-denso-c',
      nome: 'Médica conteúdo denso e seco',
      emoji: '🩺',
      disc: 'C',
      descricao: '"Em congresso, falo certo, dado correto, ninguém aplaude. Outro colega menos qualificado lota auditório."',
      contexto: 'Médica 45+ pesquisadora. Conteúdo de alto nível, entrega monótona. Sem storytelling. Sem hook. Inveja produtiva.',
      objecaoPivot: 'Qualidade do conteúdo × entrega que emociona'
    },
    {
      id: 'ceop-analista-hiperprecisa-c',
      nome: 'Analista hiperprecisa sem emoção',
      emoji: '📊',
      disc: 'C',
      descricao: '"Apresento dados, board fica de cara virada. \'Cadê o impacto?\' — eu mostrei o número, não tá lá?"',
      contexto: 'Analista 33+ excelente em planilha. Apresentação direta, sem narrativa de impacto. Board pede insights, recebe linhas.',
      objecaoPivot: 'Precisão fria × narrativa de impacto'
    },
    {
      id: 'ceop-advogada-juridiques-c',
      nome: 'Advogada com juridiquês excessivo',
      emoji: '⚖️',
      disc: 'C',
      descricao: '"Cliente sai da reunião e me liga dizendo \'eu não entendi nada\'. Sou clara, ele não."',
      contexto: 'Advogada 38+ tributária. Tecnicismo extremo. Cliente PJ pediu para outro sócio assumir. Perda iminente de carteira.',
      objecaoPivot: 'Rigor técnico × clareza para o cliente'
    },
    {
      id: 'ceop-cfo-numeros-sem-narrativa-c',
      nome: 'CFO números sem narrativa',
      emoji: '🧮',
      disc: 'C',
      descricao: '"Levo o balanço ao conselho. Aprovam, mas ninguém se engaja na estratégia que eu defendo."',
      contexto: 'CFO 50+. Dado intocável, voz seca. Conselho aprova por força do número, não compra a visão. Influência política baixa.',
      objecaoPivot: 'Autoridade financeira × influência estratégica'
    },
    {
      id: 'ceop-cientista-dados-sem-story-c',
      nome: 'Cientista de dados sem storytelling',
      emoji: '🤖',
      disc: 'C',
      descricao: '"Modelo top, mas não vendo o insight ao negócio. Marketing usa 10% do que entrego."',
      contexto: 'Data scientist 32+. Tecnicamente brilhante. Entrega dashboard que ninguém abre. Faltou camada de história.',
      objecaoPivot: 'Modelo técnico × narrativa de negócio acionável'
    },
    {
      id: 'ceop-programador-pitch-frio-c',
      nome: 'Programador com pitch frio',
      emoji: '💻',
      disc: 'C',
      descricao: '"Tenho um SaaS, faço demo, cliente diz \'legal\' e some. Não emociono."',
      contexto: 'Dev-founder 30+ SaaS B2B. Domina código. Demo técnica, sem dor do cliente. Sem AIDA. Sem urgência. CAC alto.',
      objecaoPivot: 'Demo técnica × pitch centrado em dor'
    },
    {
      id: 'ceop-auditor-desconfia-emocao-c',
      nome: 'Auditor que desconfia de emoção',
      emoji: '🕵️',
      disc: 'C',
      descricao: '"\'Apelo emocional\'? Pra mim é manipulação. Quero verdade nua, não show."',
      contexto: 'Auditor 45+. Acha técnicas de oratória manipulação. Resiste a aprender. Mas perdeu promoção a sócio: \'falta presença\'.',
      objecaoPivot: 'Ética de comunicação × técnica de persuasão legítima'
    },
    {
      id: 'ceop-despreza-emocao-c',
      nome: 'Especialista que despreza emoção',
      emoji: '🧊',
      disc: 'C',
      descricao: '"Fato + razão deveria bastar. Se a pessoa não entende, problema dela. Não vou virar showman."',
      contexto: 'Especialista 50+. Acha emoção \'inferior à lógica\'. Carreira parou, jovens menos qualificados ultrapassaram. Ego ferido.',
      objecaoPivot: 'Lógica pura × emoção como veículo da lógica'
    },
    {
      id: 'ceop-academico-monotono-c',
      nome: 'Acadêmico monótono',
      emoji: '🎓',
      disc: 'C',
      descricao: '"Aula minha é referência em conteúdo. Aluno dorme. Eu sei. Não sei o que fazer."',
      contexto: 'Professor universitário 48+. Conteúdo de PhD, entrega de manual. Avaliação ruim em \'didática\'. Quer mudar.',
      objecaoPivot: 'Excelência acadêmica × didática que prende'
    },
    // --- 6 mistos ---
    {
      id: 'ceop-misto-di-empresario-carismatico',
      nome: 'Empresário carismático mas desorganizado (DI)',
      emoji: '🎭',
      disc: 'DI',
      descricao: '"Tenho energia, fecho amizade rápido. Mas meu pitch é uma bagunça. Sócio reclama."',
      contexto: 'Founder 38+ extrovertido, decisor. Pitch é \'show\' sem estrutura. Investidor curte ele, não compra a tese.',
      objecaoPivot: 'Carisma × estrutura argumentativa'
    },
    {
      id: 'ceop-misto-cs-perfeccionista-paralisada',
      nome: 'Perfeccionista paralisada (CS)',
      emoji: '🪨',
      disc: 'CS',
      descricao: '"Preparo 3 semanas pra uma palestra de 30min. Cancelo na véspera. \'Não tô pronta\'."',
      contexto: 'Profissional 40+ obsessiva com detalhe. Medo + perfeccionismo = paralisia. Já cancelou 4 oportunidades. Carreira travada.',
      objecaoPivot: 'Excelência exigida × ação imperfeita'
    },
    {
      id: 'ceop-misto-dc-lider-duro-no-palco',
      nome: 'Líder duro e seco no palco (DC)',
      emoji: '🗿',
      disc: 'DC',
      descricao: '"Sou exigente, técnico, decisor. No palco, viro robô. Audiência respeita, não inspira."',
      contexto: 'C-level 48+. Mistura D+C. Entrega impecável de conteúdo, zero conexão emocional. Equipe segue por medo, não por causa.',
      objecaoPivot: 'Respeito imposto × inspiração que mobiliza'
    },
    {
      id: 'ceop-misto-is-simpatica-nao-defende',
      nome: 'Simpática que não defende ideia (IS)',
      emoji: '🌸',
      disc: 'IS',
      descricao: '"Todos me amam. Mas se questionam minha ideia, eu recuo. Não sustento argumento."',
      contexto: 'Profissional 33+ relacional. Bom rapport, baixo confronto. Em reunião difícil, capitula. Ideias dela acabam roubadas por colegas mais firmes.',
      objecaoPivot: 'Aceitação social × sustentação do próprio ponto'
    },
    {
      id: 'ceop-misto-sc-prepara-em-excesso',
      nome: 'Cauteloso que se prepara demais (SC)',
      emoji: '📖',
      disc: 'SC',
      descricao: '"Decoro slide a slide, palavra por palavra. Se sai da ordem, congelo."',
      contexto: 'Profissional 37+ metódico, tímido. Prepara excessivo como defesa contra ansiedade. Quebra ao primeiro imprevisto. Frágil.',
      objecaoPivot: 'Preparação rígida × resiliência improvisada'
    },
    {
      id: 'ceop-misto-id-influencer-quer-monetizar',
      nome: 'Influencer ambicioso quer monetizar (ID)',
      emoji: '💰',
      disc: 'ID',
      descricao: '"Tenho audiência, energia, sonho. Quero virar palestrante de R$ 50k/cachê. Como chego lá?"',
      contexto: 'Influencer 30+ extrovertido, ambicioso. Sabe vender no Reels, falha em palco corporativo. Quer faturar alto. Pressa.',
      objecaoPivot: 'Carisma social × profissionalismo de palco corporativo'
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
    },
    // ===== 44 perfis novos (calibrados ao PDF Master Coaching: 204h, 60h presencial em 5d, pré-req FCIS, FCU, crenças primais, ferramentas impacto emocional, contágio social, estratégias comerciais) =====
    // --- 9 D ---
    {
      id: 'master-dobrar-ticket-d',
      nome: 'Coach que quer dobrar ticket',
      emoji: '💰',
      disc: 'D',
      descricao: '"Cobro R$ 1.500/sessão. Quero cobrar R$ 5k. Master me posiciona pra isso ou não?"',
      contexto: 'Coach 40+ ambicioso, agressivo na cobrança. Quer salto direto, sem rodeio. Decisão de carteira pesada.',
      objecaoPivot: 'ROI direto: vai justificar R$ 5k/sessão?'
    },
    {
      id: 'master-escalar-empresa-d',
      nome: 'Empresária-coach que quer escalar',
      emoji: '🏗️',
      disc: 'D',
      descricao: '"Tenho 12 coaches sob minha marca. Quero virar uma escola. Master vira o pulo do gato?"',
      contexto: 'Empresária-coach 42+, dona de operação. Decisão pragmática: alinha estratégia de escala? Direta.',
      objecaoPivot: 'Posicionamento de marca x conteúdo individual'
    },
    {
      id: 'master-competidor-metodos-d',
      nome: 'Coach competidor de outros métodos',
      emoji: '⚔️',
      disc: 'D',
      descricao: '"Fiz NLP, Quântico, Ontológico. Por que Master Coaching e não outro?"',
      contexto: 'Coach 40+ multi-formado. Compara com mercado. Vai morder o argumento de Paulo Vieira como diferencial.',
      objecaoPivot: 'Diferencial vs outros métodos consolidados'
    },
    {
      id: 'master-pacotes-corporativos-d',
      nome: 'Quer fechar pacotes corporativos',
      emoji: '🏢',
      disc: 'D',
      descricao: '"Atendo 1:1 hoje. Quero fechar contratos B2B de R$ 100k+. Master abre essa porta?"',
      contexto: 'Coach 38+ visão B2B. Quer monetizar com empresa, não com indivíduo. Argumenta com case prático.',
      objecaoPivot: 'Credibilidade Master para venda corporativa'
    },
    {
      id: 'master-impaciente-teoria-d',
      nome: 'Coach impaciente com teoria',
      emoji: '⚡',
      disc: 'D',
      descricao: '"204 horas? Quero ferramenta que eu use semana que vem. Não conteúdo de PhD."',
      contexto: 'Coach 36+ prático. Resiste a carga horária. Quer ferramenta executável já. Sem floreio.',
      objecaoPivot: 'Praticidade imediata × profundidade da carga 204h'
    },
    {
      id: 'master-mentoria-pv-d',
      nome: 'Quer mentoria 1:1 com Paulo Vieira',
      emoji: '🎯',
      disc: 'D',
      descricao: '"Pago dobrado se for direto com o Paulo. Ele aparece, mentoreia ou é staff?"',
      contexto: 'Coach 42+ ego forte, quer acesso à fonte. Foca em mentoria personalizada. Cético com estrutura padrão.',
      objecaoPivot: 'Acesso personalizado ao Paulo Vieira'
    },
    {
      id: 'master-quer-franquia-d',
      nome: 'Coach que quer abrir franquia',
      emoji: '🏛️',
      disc: 'D',
      descricao: '"Pretendo abrir uma franquia Febracis. Master me coloca no radar deles ou não?"',
      contexto: 'Coach 45+ visão empresarial. Já estuda mercado de franquia. Decisão estratégica, não emocional.',
      objecaoPivot: 'Master como porta de entrada para franquia Febracis'
    },
    {
      id: 'master-roi-formacao-d',
      nome: 'Quer rapidez no ROI da formação',
      emoji: '📈',
      disc: 'D',
      descricao: '"Quanto tempo após o Master eu recupero o investimento? Em quantos coachees?"',
      contexto: 'Coach 39+ calculista. Quer projeção numérica. Decide com base em payback claro.',
      objecaoPivot: 'Payback financeiro projetado'
    },
    {
      id: 'master-decisor-pragmatico-d',
      nome: 'Decisor pragmático sem firula',
      emoji: '🪓',
      disc: 'D',
      descricao: '"Sem narrativa. Me dá grade, instrutor, valor e prazo. Decido em 24h."',
      contexto: 'Coach 47+ executivo. Não tolera pitch emocional. Quer ficha técnica. Direto ao ponto.',
      objecaoPivot: 'Decisão por dado, não por emoção'
    },
    // --- 10 I ---
    {
      id: 'master-influencer-low-ticket-i',
      nome: 'Coach influencer com low ticket',
      emoji: '📲',
      disc: 'I',
      descricao: '"Tenho 50k seguidores, mas cobro R$ 300/sessão. Master me posiciona como autoridade?"',
      contexto: 'Coach 32+ super sociável, comunica bem. Quer subir de patamar de autoridade. Emocional, decide rápido.',
      objecaoPivot: 'Posicionamento de autoridade × volume social'
    },
    {
      id: 'master-quer-palco-i',
      nome: 'Quer brilhar em palco',
      emoji: '🎤',
      disc: 'I',
      descricao: '"Sonho em palestrar pros 5 mil que se formam. Master me coloca no palco?"',
      contexto: 'Coach 34+ visibilidade. Sonhador, ambicioso de holofote. Decide pela emoção do espetáculo.',
      objecaoPivot: 'Trajetória de palco a partir do Master'
    },
    {
      id: 'master-social-media-driven-i',
      nome: 'Coach social-media-driven',
      emoji: '📸',
      disc: 'I',
      descricao: '"Master me dá conteúdo pra postar todo dia? Preciso alimentar o feed!"',
      contexto: 'Coach 30+ marketeira nata. Vê tudo como conteúdo. Decisão emocional com lógica de exposição.',
      objecaoPivot: 'Material de conteúdo gerado pela formação'
    },
    {
      id: 'master-atende-celebs-i',
      nome: 'Quer atender celebridades',
      emoji: '🌟',
      disc: 'I',
      descricao: '"Sonho em atender artista, influencer. Master me abre essa porta de high-end?"',
      contexto: 'Coach 33+ glamourosa, fascinada por status. Decisão pela imagem premium. Emocional.',
      objecaoPivot: 'Acesso a mercado high-end (celebridades)'
    },
    {
      id: 'master-lifestyle-coach-i',
      nome: 'Coach de lifestyle',
      emoji: '🌴',
      disc: 'I',
      descricao: '"Meu nicho é estilo de vida, viagens, abundância. Master combina com isso?"',
      contexto: 'Coach 30+ super expressiva. Trabalha com imagem leve, aspiracional. Decide se cabe no branding.',
      objecaoPivot: 'Encaixe do conteúdo Master no nicho lifestyle'
    },
    {
      id: 'master-entusiasmo-sem-metodo-i',
      nome: 'Pelo entusiasmo, sem método',
      emoji: '🎉',
      disc: 'I',
      descricao: '"Eu AMEI a FCIS! Master é o próximo passo, né? Quero tudo!"',
      contexto: 'Coach 31+ super animada. Decide pela paixão. Pouco analisa custo, prazo, carga.',
      objecaoPivot: 'Maturidade da decisão (não comprar só pela emoção)'
    },
    {
      id: 'master-networking-premium-i',
      nome: 'Quer networking premium',
      emoji: '🤝',
      disc: 'I',
      descricao: '"Que tipo de pessoa faz Master? Quero estar com gente do meu nível ou acima."',
      contexto: 'Coach 35+ relacional. Pesa muito quem estará na turma. Decisão pela rede que vai entrar.',
      objecaoPivot: 'Qualidade da rede da turma'
    },
    {
      id: 'master-internacional-sonho-i',
      nome: 'Sonha com mercado internacional',
      emoji: '✈️',
      disc: 'I',
      descricao: '"FCU me valida pra atender em Lisboa, Boston? Quero atender em inglês."',
      contexto: 'Coach 34+ romântica do mercado global. Crê na credencial. Decisão emocional + projeção de imagem.',
      objecaoPivot: 'Aplicabilidade real da FCU em mercados estrangeiros'
    },
    {
      id: 'master-turma-elite-i',
      nome: 'Quer fazer parte da turma de elite',
      emoji: '👑',
      disc: 'I',
      descricao: '"Master Coach soa premium! Quero o título. Onde assino?"',
      contexto: 'Coach 32+ status-driven. Pesa muito a percepção social do título. Decide rápido pela imagem.',
      objecaoPivot: 'Valor real × valor de imagem do título'
    },
    {
      id: 'master-curte-status-i',
      nome: 'Curte status de "Master"',
      emoji: '🏆',
      disc: 'I',
      descricao: '"Quero entregar cartão escrito \'Master Coach Certificado FCU\'. Soa autoridade."',
      contexto: 'Coach 36+ marketing-driven. Foco em branding pessoal. Decisão por reforço de autoridade percebida.',
      objecaoPivot: 'Branding pessoal pós-Master'
    },
    // --- 10 S (já tem 1: coach-estagnado-s) ---
    {
      id: 'master-inseguro-premium-s',
      nome: 'Inseguro de cobrar premium',
      emoji: '🪶',
      disc: 'S',
      descricao: '"Sei que vale mais, mas cobrar R$ 3k de uma sessão me deixa desconfortável."',
      contexto: 'Coach 38+ humilde. Conforto com R$ 500-800. Trava ao subir. Master vê como ferramenta de confiança interna.',
      objecaoPivot: 'Autoimagem × preço premium'
    },
    {
      id: 'master-ama-sessao-teme-escala-s',
      nome: 'Ama sessão, teme escala',
      emoji: '🤲',
      disc: 'S',
      descricao: '"Adoro atender 1:1. Não quero virar palestrante de massa. Master me empurra pra isso?"',
      contexto: 'Coach 40+ vocação relacional. Recusa megaformatos. Quer aprofundar 1:1, não escalar.',
      objecaoPivot: 'Aprofundamento individual × pressão para escalar'
    },
    {
      id: 'master-evita-confronto-s',
      nome: 'Pacificadora que evita confronto',
      emoji: '☮️',
      disc: 'S',
      descricao: '"Coachee chora, eu acompanho. Mas confrontar crença primal? Eu travo."',
      contexto: 'Coach 36+ acolhedora. Forte em escuta, fraca em confrontação. Master ensina "ferramentas de impacto emocional" que ela teme.',
      objecaoPivot: 'Acolhimento × confrontação técnica das crenças primais'
    },
    {
      id: 'master-recem-fcis-medo-s',
      nome: 'Recém-formada FCIS com medo',
      emoji: '🐣',
      disc: 'S',
      descricao: '"Acabei a FCIS faz 3 meses. Atendi 5 coachees. Já é hora do Master?"',
      contexto: 'Coach 32+ pouca rodagem. Insegurança com volume baixo de experiência. Cautelosa.',
      objecaoPivot: 'Momento certo (recém-formada × Master)'
    },
    {
      id: 'master-mae-coach-familia-s',
      nome: 'Mãe-coach equilibrando família',
      emoji: '👶',
      disc: 'S',
      descricao: '"Tenho 2 filhos pequenos. 5 dias presencial fora me preocupa. Tem flex?"',
      contexto: 'Coach 35+ mãe. Decisão envolve logística familiar. Sensível ao tempo fora. Decisão lenta.',
      objecaoPivot: 'Logística familiar × imersão presencial 5 dias'
    },
    {
      id: 'master-humilde-cobra-pouco-s',
      nome: 'Humilde demais, cobra pouco',
      emoji: '🌸',
      disc: 'S',
      descricao: '"Cobro R$ 200 a sessão. Sei que tá baixo, mas não quero parecer aproveitadora."',
      contexto: 'Coach 40+ formada há 4 anos. Sub-precifica. Crença de "não merecer cobrar muito". Inibida.',
      objecaoPivot: 'Crença limitante de preço × valor real entregue'
    },
    {
      id: 'master-cauteloso-investimento-s',
      nome: 'Cauteloso com investimento 204h',
      emoji: '🐢',
      disc: 'S',
      descricao: '"204 horas é muita coisa. Preciso pensar com calma se cabe na minha rotina."',
      contexto: 'Coach 42+ ponderado. Decisão demorada. Quer simular cronograma. Cauteloso com compromisso longo.',
      objecaoPivot: 'Encaixe da carga horária total na rotina atual'
    },
    {
      id: 'master-conforto-rotina-s',
      nome: 'Conforto na rotina atual',
      emoji: '🛋️',
      disc: 'S',
      descricao: '"Atendo 8 coachees por mês, vivo bem. Por que mexer no que tá funcionando?"',
      contexto: 'Coach 45+ estabilizado. Status quo confortável. Resistente a sair da zona de conforto.',
      objecaoPivot: 'Zona de conforto × potencial não realizado'
    },
    {
      id: 'master-medo-projeto-pratico-s',
      nome: 'Medo do projeto prático',
      emoji: '📋',
      disc: 'S',
      descricao: '"66 horas de projeto prático? Tenho medo de não conseguir entregar. E se falhar?"',
      contexto: 'Coach 37+ perfeccionista ansiosa. Medo de exposição do trabalho. Crença de "não ser boa o bastante".',
      objecaoPivot: 'Crença de incapacidade × estrutura de apoio do projeto'
    },
    {
      id: 'master-medo-emocoes-profundas-s',
      nome: 'Insegura pra tocar emoções profundas',
      emoji: '🌊',
      disc: 'S',
      descricao: '"Ferramentas de \'forte impacto emocional\' me assustam. E se eu travar o coachee?"',
      contexto: 'Coach 36+ acolhedora. Receia ativar dores profundas sem saber lidar. Quer mais base antes.',
      objecaoPivot: 'Segurança técnica para mergulhar em emoções profundas'
    },
    // --- 9 C (já tem 2: cetico-volume-c, internacional-c) ---
    {
      id: 'master-documenta-sessao-c',
      nome: 'Coach técnico que documenta tudo',
      emoji: '📝',
      disc: 'C',
      descricao: '"Tenho 200 sessões documentadas em planilha. O Master tem metodologia documentada formal?"',
      contexto: 'Coach 40+ metódico. Pede protocolo, manual, framework. Quer base científica/processual clara.',
      objecaoPivot: 'Rigor metodológico documentado da formação'
    },
    {
      id: 'master-entende-antes-comprar-c',
      nome: 'Quer entender o método antes',
      emoji: '🔍',
      disc: 'C',
      descricao: '"Antes de pagar, quero saber a base teórica. Crenças primais? De onde vem essa nomenclatura?"',
      contexto: 'Coach 38+ pesquisador. Cético com termos próprios. Pede referências bibliográficas. Lento.',
      objecaoPivot: 'Validação teórica da nomenclatura "crenças primais"'
    },
    {
      id: 'master-pesquisa-academica-c',
      nome: 'Pesquisador de validades acadêmicas',
      emoji: '🎓',
      disc: 'C',
      descricao: '"FCU é uma faculdade? Tem acreditação americana? Não quero diploma vazio."',
      contexto: 'Coach 42+ exigente em credencial. Investiga universidade. Cético com selos sem peer-review.',
      objecaoPivot: 'Validade acadêmica formal da FCU'
    },
    {
      id: 'master-cetico-ferramentas-c',
      nome: 'Cético de "ferramentas emocionais"',
      emoji: '🧪',
      disc: 'C',
      descricao: '"\'Forte impacto emocional\' soa subjetivo. Onde tá a evidência empírica de eficácia?"',
      contexto: 'Coach 45+ background psicólogo/cientista. Resiste a linguagem motivacional. Quer estudo de caso, dado.',
      objecaoPivot: 'Evidência empírica × marketing emocional'
    },
    {
      id: 'master-custo-beneficio-rigoroso-c',
      nome: 'Analisa custo-benefício rigoroso',
      emoji: '🧮',
      disc: 'C',
      descricao: '"R$ X por 204h dá R$ Y/hora. Comparado com pós-grad em Psicologia Positiva, custa mais."',
      contexto: 'Coach 41+ analítico. Compara com alternativas. Quer tabela comparativa. Decide com planilha.',
      objecaoPivot: 'Custo/hora × concorrência (pós-grad, MBA, etc)'
    },
    {
      id: 'master-curriculo-instrutores-c',
      nome: 'Quer saber currículo dos instrutores',
      emoji: '🏛️',
      disc: 'C',
      descricao: '"Quem dá aula nas 60h presenciais? CV de cada um? Paulo dá quantas horas mesmo?"',
      contexto: 'Coach 43+ rigoroso com origem do conteúdo. Pede ficha técnica de cada instrutor. Lento.',
      objecaoPivot: 'Qualificação técnica do corpo docente'
    },
    {
      id: 'master-engenheiro-coach-c',
      nome: 'Coach com background técnico',
      emoji: '🔧',
      disc: 'C',
      descricao: '"Sou engenheiro virou coach. Preciso de estrutura, processo, framework. Master tem isso?"',
      contexto: 'Coach 39+ exata de origem. Resiste a "intuição como ferramenta". Pede sistematização.',
      objecaoPivot: 'Estrutura sistemática × intuição/feeling'
    },
    {
      id: 'master-auditor-conteudo-c',
      nome: 'Auditor de cada conteúdo',
      emoji: '🕵️',
      disc: 'C',
      descricao: '"Ementa detalhada por hora? Bibliografia? Avaliações? Quero ver antes."',
      contexto: 'Coach 44+ exigente em transparência. Compara com programas universitários. Lento, minucioso.',
      objecaoPivot: 'Granularidade da ementa × marketing genérico'
    },
    {
      id: 'master-prova-metricas-c',
      nome: 'Quer prova de eficácia em métricas',
      emoji: '📊',
      disc: 'C',
      descricao: '"Master coaches que passaram: faturamento médio antes/depois? NPS? Retenção de coachees?"',
      contexto: 'Coach 38+ data-driven. Pede dados longitudinais. Resiste a depoimento isolado. Frio.',
      objecaoPivot: 'Dados quantitativos de impacto pós-formação'
    },
    // --- 6 mistos ---
    {
      id: 'master-misto-di-ambicioso-carismatico',
      nome: 'Ambicioso e carismático (DI)',
      emoji: '🎯',
      disc: 'DI',
      descricao: '"Tenho ambição, energia e visibilidade. Master me empurra pro próximo nível agora!"',
      contexto: 'Coach 35+ híbrido D+I. Decide rápido, vibrante. Quer crescer com palco e dinheiro juntos. Impaciente, vendável.',
      objecaoPivot: 'Velocidade da decisão × profundidade da escolha'
    },
    {
      id: 'master-misto-cs-perfeccionista-cauteloso',
      nome: 'Perfeccionista cauteloso (CS)',
      emoji: '🧊',
      disc: 'CS',
      descricao: '"Quero perfeição na entrega ao coachee. Preciso checar cada detalhe do Master antes de pisar lá."',
      contexto: 'Coach 40+ C+S. Lento, exigente, prudente. Vai pedir muita informação antes. Pondera com calma.',
      objecaoPivot: 'Decisão segura × tempo de avaliação prolongado'
    },
    {
      id: 'master-misto-dc-tecnico-decisor',
      nome: 'Decisor técnico (DC)',
      emoji: '⚙️',
      disc: 'DC',
      descricao: '"Mostra o método, mostra o ROI, mostra o currículo. Em 48h decido."',
      contexto: 'Coach 42+ híbrido D+C. Quer dado E velocidade. Sem rodeio emocional. Decisão por evidência rápida.',
      objecaoPivot: 'Combinação de rigor técnico × prazo curto de decisão'
    },
    {
      id: 'master-misto-is-simpatica-insegura',
      nome: 'Simpática mas insegura (IS)',
      emoji: '🌷',
      disc: 'IS',
      descricao: '"Adorei a ideia! Mas será que dou conta? Tô meio insegura, sabe?"',
      contexto: 'Coach 34+ I+S. Quer comprar pela emoção, freia pela insegurança. Indecisa. Precisa de acolhimento + segurança.',
      objecaoPivot: 'Empolgação inicial × medo de não conseguir'
    },
    {
      id: 'master-misto-sc-conservador-analitico',
      nome: 'Conservador analítico (SC)',
      emoji: '🏰',
      disc: 'SC',
      descricao: '"Não quero arriscar. Quero ver a estatística de quem terminou e tá bem antes de decidir."',
      contexto: 'Coach 45+ S+C. Lento, prudente, dado + segurança. Aversão a risco. Quer certeza antes de mover.',
      objecaoPivot: 'Tolerância ao risco × evidências de sucesso passado'
    },
    {
      id: 'master-misto-id-influencer-pragmatico',
      nome: 'Influencer pragmático (ID)',
      emoji: '🚀',
      disc: 'ID',
      descricao: '"Tenho audiência, ambição e quero retorno. Master converte minha visibilidade em receita?"',
      contexto: 'Coach 32+ I+D. Visibilidade + foco em resultado. Quer monetizar agora. Vibrante e impaciente.',
      objecaoPivot: 'Conversão de audiência em receita pós-Master'
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
    },
    // ===== 44 perfis novos (calibrados ao PDF CIS: 4 dias / 60h imersão, modalidades Presencial e Global, +1M treinadas, 5 pilares — Finanças, Business/Carreira, Performance Emocional, Saúde, Relacionamento — reprogramação crenças, EAI, autossabotagem, empoderamento da mulher, endossos Cury/Shinyashiki/Suzuki/Zé Roberto) =====
    // --- 9 D ---
    {
      id: 'cis-ceo-burnout-d',
      nome: 'CEO workaholic em burnout',
      emoji: '🔥',
      disc: 'D',
      descricao: '"Faturo R$ 2 mi/mês e tô com TOC, ansiedade e crise de pânico. Não sustento mais."',
      contexto: 'CEO 45+ alta performance, exausto. Recusa terapia ("perda de tempo"). Procura solução rápida e intensiva. Decisor.',
      objecaoPivot: 'Performance × custo emocional invisível'
    },
    {
      id: 'cis-faturar-10x-d',
      nome: 'Empresário que quer faturar 10x',
      emoji: '🚀',
      disc: 'D',
      descricao: '"Vocês falam em 2 a 10x. Quero o 10x. Em quanto tempo após o CIS?"',
      contexto: 'Empresário 38+ agressivo, foca no payback. Quer projeção de receita. Cético com "transformação" sem número.',
      objecaoPivot: 'Promessa numérica × prazo realista'
    },
    {
      id: 'cis-perde-familia-d',
      nome: 'Decisor que perde família',
      emoji: '⚖️',
      disc: 'D',
      descricao: '"Empresa cresceu, casamento desmoronou. Filhos me veem como caixa eletrônico. Cadê o reset?"',
      contexto: 'Empresário 42+. Sucesso financeiro, falência relacional. Esposa pediu separação. Está abalado mas guarda. Direto.',
      objecaoPivot: 'Vitória profissional × derrota familiar'
    },
    {
      id: 'cis-mulher-clima-casa-d',
      nome: 'Empresária com clima ruim em casa',
      emoji: '🏠',
      disc: 'D',
      descricao: '"Sou dona, comando 40 pessoas. Em casa, marido fugiu, filha não fala comigo. Algo tá errado."',
      contexto: 'Empresária 40+ assertiva. Replica modo gestão na família e quebra relação. Não se vê como problema. Cautelosa em admitir.',
      objecaoPivot: 'Liderança no trabalho × liderança em casa'
    },
    {
      id: 'cis-duro-autossabotagem-d',
      nome: 'Líder durão com autossabotagem',
      emoji: '💣',
      disc: 'D',
      descricao: '"Toda vez que chego perto do R$ 1M, eu sabato. Algo trava. Não entendo."',
      contexto: 'Líder 39+ ambicioso. Padrão repetitivo de autossabotagem invisível. Crença limitante de teto. Cético com "crenças primais".',
      objecaoPivot: 'Padrão de teto invisível × consciência da crença'
    },
    {
      id: 'cis-competitiva-nao-delega-d',
      nome: 'Empreendedora que não delega',
      emoji: '🎯',
      disc: 'D',
      descricao: '"Faço tudo. Equipe é incompetente. Trabalho 14h por dia. Não aguento mais, mas não confio em ninguém."',
      contexto: 'Empresária 36+ controle absoluto. Identifica "incompetência" como externa. EAI: cresceu sem confiança em ninguém. Decisão dura.',
      objecaoPivot: 'Controle como defesa × custo da exaustão'
    },
    {
      id: 'cis-vicio-alcool-d',
      nome: 'Diretor com vícios emocionais',
      emoji: '🥃',
      disc: 'D',
      descricao: '"Bebo todo dia. Sei que é demais. Em reunião, performance top. Em casa, desabamento."',
      contexto: 'Diretor 48+ vício invisível. Performance externa preserva, dentro está doendo. Admite com dificuldade. Cético.',
      objecaoPivot: 'Performance pública × dor privada via vício'
    },
    {
      id: 'cis-filhos-rebeldes-d',
      nome: 'Empresário com filhos rebeldes',
      emoji: '👨‍👧',
      disc: 'D',
      descricao: '"Banco da família com R$ 8 mil de mesada. Filhos não me respeitam. \'Falo grosso\' e perco mais ainda."',
      contexto: 'Empresário 50+. Provedor. Comunicação só por imposição. Filhos 18-25 com problemas. Família em conflito.',
      objecaoPivot: 'Provedor financeiro × autoridade relacional'
    },
    {
      id: 'cis-empoderamento-d',
      nome: 'Mulher empresária quer empoderamento',
      emoji: '👑',
      disc: 'D',
      descricao: '"Cresci sendo \'a forte\'. Mas pago caro: sou só, brava, sem rede. Quero recalibrar."',
      contexto: 'Empresária 42+ "mulher de couraça". Cresceu provando que aguenta. Está cansada do papel. Decisão de mudança.',
      objecaoPivot: 'Força performática × empoderamento real (sem couraça)'
    },
    // --- 10 I ---
    {
      id: 'cis-influencer-depressao-i',
      nome: 'Influencer com depressão velada',
      emoji: '😶',
      disc: 'I',
      descricao: '"Posto stories felizes todo dia. Desligo o celular e choro sozinha. Ninguém sabe."',
      contexto: 'Influencer 30+ vida pública alegre, vida privada deprimida. Vergonha de pedir ajuda. Decisão emocional, busca anonimato.',
      objecaoPivot: 'Imagem pública × verdade privada'
    },
    {
      id: 'cis-artista-sem-inspiracao-i',
      nome: 'Artista sem inspiração',
      emoji: '🎨',
      disc: 'I',
      descricao: '"Fui criativo, comunicativo, brilhante. Hoje, vazio. Não escrevo, não componho, não me reconheço."',
      contexto: 'Artista 38+ em bloqueio criativo. Crise de identidade. Crença de "perdi o dom". Decide pela emoção do reencontro.',
      objecaoPivot: 'Bloqueio criativo × reconexão com identidade'
    },
    {
      id: 'cis-vendedora-solitaria-i',
      nome: 'Vendedora carismática solitária',
      emoji: '🌙',
      disc: 'I',
      descricao: '"Falo com 50 clientes por dia. À noite, ninguém me chama. Carismática só na rua."',
      contexto: 'Vendedora 33+ extrovertida fora, vazia dentro. Solidão crônica. Decide emocionalmente, busca pertencimento.',
      objecaoPivot: 'Calor social profissional × solidão pessoal'
    },
    {
      id: 'cis-global-pacote-i',
      nome: 'Quer modalidade Global (acessibilidade)',
      emoji: '🌐',
      disc: 'I',
      descricao: '"Não tenho como viajar. Esse Global é a mesma coisa do presencial mesmo?"',
      contexto: 'Pessoa 32+ sociável, custo-consciente. Procura modalidade flexível. Decisão emocional ancorada em equivalência percebida.',
      objecaoPivot: 'Equivalência real entre Global e Presencial'
    },
    {
      id: 'cis-busca-proposito-i',
      nome: 'Mulher 30+ buscando propósito',
      emoji: '🦋',
      disc: 'I',
      descricao: '"Tô bem profissionalmente, mas é tipo \'pra quê?\'. Falta um sentido maior."',
      contexto: 'Profissional 32+ realizada externamente. Crise existencial silenciosa. Decisão emocional. Quer conexão profunda.',
      objecaoPivot: 'Sucesso material × propósito existencial'
    },
    {
      id: 'cis-ouviu-augusto-cury-i',
      nome: 'Ouviu Augusto Cury falar do CIS',
      emoji: '📣',
      disc: 'I',
      descricao: '"Vi Cury endossando o Paulo. Se ele aprova, vale. Onde compro?"',
      contexto: 'Pessoa 40+ influenciada por autoridades. Decisão por endosso, não análise. Sociável e rápida. Confia em referência.',
      objecaoPivot: 'Decisão por endosso × análise pessoal de fit'
    },
    {
      id: 'cis-extrovertida-exausta-i',
      nome: 'Empreendedora extrovertida exausta',
      emoji: '🔋',
      disc: 'I',
      descricao: '"Toda hora dou energia. Workshops, eventos, lives. Tô com a bateria a 5%. Preciso reabastecer."',
      contexto: 'Empreendedora 36+ figura pública. Doa-se demais. Não sabe receber. Decide pela emoção do alívio.',
      objecaoPivot: 'Dar sem receber × economia emocional'
    },
    {
      id: 'cis-buscadora-eventos-i',
      nome: 'Buscadora de eventos transformadores',
      emoji: '🎪',
      disc: 'I',
      descricao: '"Fiz Tony Robbins, Bert Hellinger, Anthony de Mello. Quero a próxima imersão. CIS é a vez?"',
      contexto: 'Pessoa 38+ viciada em workshops. Pula de método em método. Emocional. Pouco aprofunda. Risco de "mais um".',
      objecaoPivot: 'Coleção de imersões × aprofundamento real'
    },
    {
      id: 'cis-animadora-tristeza-i',
      nome: 'Animadora com tristeza disfarçada',
      emoji: '🎭',
      disc: 'I',
      descricao: '"Sou a alegria do grupo. Em casa, choro toda noite. Ninguém pode saber."',
      contexto: 'Profissional 31+ máscara social. Carrega dor invisível. Função social: ser alegre. Decisão emocional, busca cura.',
      objecaoPivot: 'Performance da alegria × dor real escondida'
    },
    {
      id: 'cis-energia-certa-i',
      nome: 'Influencer que quer "energia certa"',
      emoji: '✨',
      disc: 'I',
      descricao: '"Tenho audiência mas sinto que tô atraindo gente errada. Preciso reposicionar minha energia."',
      contexto: 'Influencer 30+ linguagem espiritualizada. Decisão emocional + branding. Quer rebrand interno antes do externo.',
      objecaoPivot: 'Rebrand interno × estratégia de imagem'
    },
    // --- 9 S (já tem 2: em-crise-emocional-s, religioso-cauteloso-s) ---
    {
      id: 'cis-dona-casa-depressao-s',
      nome: 'Dona de casa em depressão',
      emoji: '🏚️',
      disc: 'S',
      descricao: '"Acordei pra cuidar dos meus filhos. Eles cresceram, foram. Não sei mais quem sou."',
      contexto: 'Mulher 50+ vida dedicada à família. Filhos saíram de casa. Vazio existencial. Cautelosa, baixa autoestima.',
      objecaoPivot: 'Identidade-mãe × identidade-mulher (recuperação)'
    },
    {
      id: 'cis-30-anos-empresa-s',
      nome: 'Funcionário 30 anos na mesma empresa',
      emoji: '🪑',
      disc: 'S',
      descricao: '"Vou aposentar em 2 anos. Olho pra trás e me pergunto: foi isso?"',
      contexto: 'Funcionário 58+ lealdade extrema. Estável, sem brilho. Final de carreira sem realização. Conservador.',
      objecaoPivot: 'Estabilidade × realização pessoal não cumprida'
    },
    {
      id: 'cis-filho-adolescente-s',
      nome: 'Pai com filho adolescente difícil',
      emoji: '🧒',
      disc: 'S',
      descricao: '"Filho 16 anos não fala comigo, depressivo, sumiu. Tentei tudo. Não sei o que fazer."',
      contexto: 'Pai 45+ acolhedor. Filho fechado. Acha que falha como pai. Crença de "sou ruim". Decisão pela emoção do filho.',
      objecaoPivot: 'Culpa parental × ferramentas práticas de conexão'
    },
    {
      id: 'cis-casamento-infeliz-s',
      nome: 'Casado infeliz sem decidir',
      emoji: '💔',
      disc: 'S',
      descricao: '"Casamento esfriou há 5 anos. Não brigo, não amo. Não saio porque \'os filhos\'."',
      contexto: 'Pessoa 42+ casada por inércia. Aversão ao confronto. Sofre em silêncio. Cautelosa. Decisão lenta sobre vida.',
      objecaoPivot: 'Estabilidade aparente × verdade emocional'
    },
    {
      id: 'cis-mae-culpa-s',
      nome: 'Mãe culpada por terceirizar filhos',
      emoji: '👶',
      disc: 'S',
      descricao: '"Trabalho 10h, deixo as crianças com babá. Eles me chamam de \'tia\'. Tô falhando."',
      contexto: 'Profissional 35+ mãe. Culpa crônica. Quer reconciliação. Decisão emocional + prática.',
      objecaoPivot: 'Culpa materna × estratégia de presença qualitativa'
    },
    {
      id: 'cis-eai-infancia-s',
      nome: 'Carrega EAI (infância adversa)',
      emoji: '🕯️',
      disc: 'S',
      descricao: '"Tive infância pesada. Pai violento. Hoje, 40 anos depois, ainda repito padrões."',
      contexto: 'Pessoa 45+ EAI clara. Já fez terapia parcial. Quer reprogramação profunda. Sensível, lenta, prudente.',
      objecaoPivot: 'EAI persistente × ferramentas de rompimento'
    },
    {
      id: 'cis-cuidador-pais-s',
      nome: 'Cuidador de pais idosos exausto',
      emoji: '🛌',
      disc: 'S',
      descricao: '"Cuido da minha mãe com Alzheimer há 3 anos. Não tenho vida própria, nem energia."',
      contexto: 'Pessoa 48+ filha cuidadora. Anula-se pelos pais. Esgotamento físico e emocional. Cautelosa, devotada.',
      objecaoPivot: 'Devoção total × autocuidado essencial'
    },
    {
      id: 'cis-assedio-cala-s',
      nome: 'Funcionária assediada que cala',
      emoji: '🤐',
      disc: 'S',
      descricao: '"Chefe me assedia há meses. Não consigo falar. Tenho medo de perder emprego."',
      contexto: 'Funcionária 32+ em situação de assédio. Trava no confronto. Histórico de submissão. Decisão lenta.',
      objecaoPivot: 'Medo financeiro × dignidade emocional'
    },
    {
      id: 'cis-boazinha-triste-s',
      nome: 'Boazinha que vive triste',
      emoji: '🌧️',
      disc: 'S',
      descricao: '"Sou a queridinha de todos. Ajudo, escuto, sirvo. E ninguém me pergunta como eu tô."',
      contexto: 'Pessoa 40+ doadora compulsiva. Não pede, não recebe. Tristeza crônica. Quer recalibrar dinâmica.',
      objecaoPivot: 'Servir o outro × cuidar de si'
    },
    // --- 10 C (já tem 1: pacote-c) ---
    {
      id: 'cis-cetico-coaching-c',
      nome: 'Cético de tudo que cheira a coaching',
      emoji: '🙄',
      disc: 'C',
      descricao: '"Coaching pra mim é embuste. Mas a esposa insistiu. Convençam-me com dado."',
      contexto: 'Profissional 45+ exigente. Preconceito instalado. Vai contestar tudo. Decisão por evidência cientifica.',
      objecaoPivot: 'Preconceito × evidência empírica'
    },
    {
      id: 'cis-engenheiro-esposa-c',
      nome: 'Engenheiro que vai pela esposa',
      emoji: '🤵',
      disc: 'C',
      descricao: '"Minha esposa fez e amou. Diz que melhorei eu também. Vou só pra acompanhar."',
      contexto: 'Engenheiro 50+ resistente a "coisa de psicologia". Convive com a evidência (esposa mudou). Lento, cético leve.',
      objecaoPivot: 'Ceticismo herdado × evidência próxima (esposa)'
    },
    {
      id: 'cis-medica-questiona-c',
      nome: 'Médica racional que questiona',
      emoji: '🩺',
      disc: 'C',
      descricao: '"Como vocês medem efetividade? RCT? Tem peer-review? Ou só depoimento?"',
      contexto: 'Médica 38+ ciência-first. Resiste a marketing emocional. Pede estudo, dado, n=. Lenta, rigorosa.',
      objecaoPivot: 'Evidência científica formal × depoimento subjetivo'
    },
    {
      id: 'cis-estudo-eficacia-c',
      nome: 'Quer estudo de eficácia mensurável',
      emoji: '📊',
      disc: 'C',
      descricao: '"Vocês acompanham aluno pós-CIS? Métrica de redução de ansiedade? Faturamento médio?"',
      contexto: 'Profissional 40+ data-driven. Quer follow-up de coorte. Resiste a "transformação genérica". Frio, analítico.',
      objecaoPivot: 'Dados longitudinais × marketing pontual'
    },
    {
      id: 'cis-pesquisa-autores-c',
      nome: 'Pesquisa autores da bibliografia',
      emoji: '📖',
      disc: 'C',
      descricao: '"Goleman, Achor, Capra — bibliografia do CIS é robusta. Mas como vocês traduzem isso pra prática?"',
      contexto: 'Pesquisador 42+ familiar com a bibliografia. Quer ver método aplicado. Lento, exigente, valoriza rigor.',
      objecaoPivot: 'Rigor teórico × aplicação prática efetiva'
    },
    {
      id: 'cis-ementa-hora-c',
      nome: 'Quer ementa hora a hora',
      emoji: '🗓️',
      disc: 'C',
      descricao: '"4 dias × 15h = 60h. Quero a grade hora a hora antes de comprar."',
      contexto: 'Profissional 38+ planejador. Pede grade detalhada. Não decide sem cronograma. Lento, minucioso.',
      objecaoPivot: 'Detalhamento horário × pitch genérico'
    },
    {
      id: 'cis-cetico-depoimentos-c',
      nome: 'Cético com depoimentos emocionais',
      emoji: '🎬',
      disc: 'C',
      descricao: '"Vídeo de gente chorando agradecendo? Quero metodologia, não show emocional."',
      contexto: 'Profissional 45+ desconfia de marketing afetivo. Quer ficha técnica, não testimonial. Frio, analítico.',
      objecaoPivot: 'Marketing emocional × substância metodológica'
    },
    {
      id: 'cis-fisica-quantica-c',
      nome: 'Questiona "Física Quântica" como base',
      emoji: '🌌',
      disc: 'C',
      descricao: '"Vocês citam Física Quântica como fundamentação. Qual conceito específico? Capra é divulgador, não físico atual."',
      contexto: 'Físico/engenheiro 43+ rigoroso com termo. Vê como pseudociência popular. Vai testar a profundidade. Hostil.',
      objecaoPivot: 'Uso do termo "Física Quântica" × rigor científico'
    },
    {
      id: 'cis-roi-financas-c',
      nome: 'Quer ROI projetado em finanças',
      emoji: '💵',
      disc: 'C',
      descricao: '"Promessa de 2-10x faturamento. Em que base? Coorte? Mediana? Quero o número, não a faixa."',
      contexto: 'Empresário 41+ analítico. Quer projeção estatística. Resiste a "promessa" genérica. Decide com planilha.',
      objecaoPivot: 'Promessa de receita × evidência estatística'
    },
    {
      id: 'cis-testimonial-medido-c',
      nome: 'Analista que quer testimonial medido',
      emoji: '🔬',
      disc: 'C',
      descricao: '"Quero testimonial verificável: nome real, empresa real, métrica antes/depois com data."',
      contexto: 'Profissional 40+ exigente. Resiste a "depoimentos anônimos". Pede caso documentado. Lento, frio.',
      objecaoPivot: 'Caso documentado × depoimento genérico'
    },
    // --- 6 mistos ---
    {
      id: 'cis-misto-di-empresaria-ambiciosa',
      nome: 'Empresária ambiciosa carismática (DI)',
      emoji: '🌟',
      disc: 'DI',
      descricao: '"Tenho energia e ambição, quero faturar 5x e melhorar minha vida emocional. CIS faz os dois?"',
      contexto: 'Empresária 38+ híbrida D+I. Decisão rápida, busca tudo ao mesmo tempo. Vibrante. Pega o pacote completo.',
      objecaoPivot: 'Dupla promessa (negócio + emocional) × foco da imersão'
    },
    {
      id: 'cis-misto-cs-perfeccionista-paralisada',
      nome: 'Perfeccionista paralisada (CS)',
      emoji: '🪨',
      disc: 'CS',
      descricao: '"Quero ter certeza absoluta antes de mexer no que tá funcionando. E se piorar?"',
      contexto: 'Profissional 40+ C+S. Decisão lenta. Aversão a risco emocional. Pesa tudo. Quer testar antes.',
      objecaoPivot: 'Aversão ao risco × custo da inércia atual'
    },
    {
      id: 'cis-misto-dc-executivo-numeros',
      nome: 'Executivo de números (DC)',
      emoji: '📈',
      disc: 'DC',
      descricao: '"Mostra: público-alvo, % de retenção pós-curso, ROI, NPS. Decido em 24h."',
      contexto: 'C-level 44+ híbrido D+C. Velocidade + rigor. Sem floreio. Quer ficha técnica antes de bater martelo.',
      objecaoPivot: 'Velocidade da decisão × profundidade da análise'
    },
    {
      id: 'cis-misto-is-simpatica-insegura',
      nome: 'Simpática mas insegura (IS)',
      emoji: '🌷',
      disc: 'IS',
      descricao: '"Amei a proposta! Mas será que vou aguentar 4 dias de imersão emocional intensa?"',
      contexto: 'Pessoa 34+ I+S. Quer comprar pela emoção, freia pela ansiedade. Indecisa. Precisa acolhimento + segurança.',
      objecaoPivot: 'Empolgação inicial × medo da intensidade'
    },
    {
      id: 'cis-misto-sc-conservador-analitico',
      nome: 'Conservador analítico (SC)',
      emoji: '🏰',
      disc: 'SC',
      descricao: '"Quero ver curva de mudança de coortes anteriores antes de me comprometer."',
      contexto: 'Profissional 47+ S+C. Lento, prudente, dado + segurança. Aversão a risco. Quer certeza antes de mover.',
      objecaoPivot: 'Necessidade de garantia × dado disponível realista'
    },
    {
      id: 'cis-misto-id-influencer-pragmatica',
      nome: 'Influencer pragmática (ID)',
      emoji: '⚡',
      disc: 'ID',
      descricao: '"Tenho energia, audiência e quero retorno. CIS me dá conteúdo pra 6 meses de posts?"',
      contexto: 'Influencer 31+ I+D. Visibilidade + foco em resultado. Quer monetizar e brilhar. Vibrante, impaciente.',
      objecaoPivot: 'Transformação pessoal × monetização de conteúdo'
    }
  ]
};
