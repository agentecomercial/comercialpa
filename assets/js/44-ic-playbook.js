/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Playbook (Fase 7)
   Vive APENAS dentro de #mapeamentoScreen (pane "playbook").
   Não toca Gerenciar Turmas nem Pipeline Comercial.

   Modelo:
     - Biblioteca de scripts/abordagens por situação (8 categorias)
     - Todos os usuários CONSULTAM (filtro, busca, copiar)
     - Só ADM/EXTRACLASSE EDITAM (criar, editar, excluir)

   Firebase paths:
     icPlaybook/{id} → {categoria, titulo, situacao, script, produtos[], tags[], criadoEm, criadoPor, atualizadoEm}
══════════════════════════════════════════════════════════════ */
(function(){

  /* ── Estado ────────────────────────────────────────── */
  var _pbDados = {};            /* {id: {...}} */
  var _pbCatAtiva = 'todas';
  var _pbBuscaTxt = '';
  var _pbProdSel = '';
  var _pbEditId = null;         /* null = novo */

  var CATEGORIAS = {
    abertura:     {emoji:'🎬', label:'Abertura'},
    qualificacao: {emoji:'🎯', label:'Qualificação'},
    apresentacao: {emoji:'📊', label:'Apresentação'},
    objecoes:     {emoji:'🛡', label:'Objeções'},
    fechamento:   {emoji:'🤝', label:'Fechamento'},
    followup:     {emoji:'📞', label:'Follow-up'},
    recuperacao:  {emoji:'♻', label:'Recuperação'},
    cobranca:     {emoji:'💰', label:'Cobrança'}
  };

  /* ── Permissões ────────────────────────────────────── */
  function _pbAdmin(){
    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    if(!sess) return false;
    if(sess.perfil === 'adm') return true;
    var n = String(sess.nome||sess.login||'').toUpperCase().trim();
    return n === 'EXTRACLASSE';
  }

  /* ── Toast helper (usa o global se existir) ────────── */
  function _toast(msg, color){
    if(typeof window._showToast === 'function'){ window._showToast(msg, color); return; }
    alert(msg);
  }

  /* ── Carga dos dados ───────────────────────────────── */
  function _pbCarregar(cb){
    if(typeof window._fbGet !== 'function'){ if(cb) cb(); return; }
    window._fbGet('icPlaybook').then(function(d){
      _pbDados = d || {};
      if(cb) cb();
    }).catch(function(){ _pbDados = {}; if(cb) cb(); });
  }

  /* ── Render do grid ────────────────────────────────── */
  function _pbRender(){
    var grid = document.getElementById('pbGrid');
    var vazio = document.getElementById('pbVazio');
    if(!grid) return;

    var lista = Object.keys(_pbDados).map(function(id){
      var s = _pbDados[id] || {};
      return Object.assign({id:id}, s);
    });

    /* Filtros */
    if(_pbCatAtiva !== 'todas'){
      lista = lista.filter(function(s){ return s.categoria === _pbCatAtiva; });
    }
    if(_pbProdSel){
      lista = lista.filter(function(s){
        var p = s.produtos || [];
        if(!Array.isArray(p)) p = String(p).split(',').map(function(x){return x.trim().toUpperCase();});
        return p.indexOf(_pbProdSel.toUpperCase()) >= 0;
      });
    }
    if(_pbBuscaTxt){
      var q = _pbBuscaTxt.toLowerCase();
      lista = lista.filter(function(s){
        return (s.titulo||'').toLowerCase().indexOf(q) >= 0
            || (s.situacao||'').toLowerCase().indexOf(q) >= 0
            || (s.script||'').toLowerCase().indexOf(q) >= 0
            || (s.tags||[]).join(' ').toLowerCase().indexOf(q) >= 0;
      });
    }

    /* Ordena: categoria → título */
    lista.sort(function(a,b){
      var ca = a.categoria||'', cb = b.categoria||'';
      if(ca !== cb) return ca.localeCompare(cb);
      return (a.titulo||'').localeCompare(b.titulo||'');
    });

    if(!lista.length){
      grid.innerHTML = '';
      if(vazio) vazio.style.display = 'flex';
      return;
    }
    if(vazio) vazio.style.display = 'none';

    var adm = _pbAdmin();
    grid.innerHTML = lista.map(function(s){
      var cat = CATEGORIAS[s.categoria] || {emoji:'📌', label:s.categoria||'—'};
      var prods = (s.produtos||[]).filter(Boolean);
      if(!Array.isArray(prods)) prods = String(prods).split(',').map(function(x){return x.trim().toUpperCase();}).filter(Boolean);
      var tags = (s.tags||[]).filter(Boolean);
      if(!Array.isArray(tags)) tags = String(tags).split(',').map(function(x){return x.trim();}).filter(Boolean);

      return '<div class="pb-card" data-cat="'+(s.categoria||'')+'">'
        + '<div class="pb-card-h">'
        +   '<div class="pb-card-cat"><span>'+cat.emoji+'</span> '+cat.label+'</div>'
        +   (adm ? '<button class="pb-card-edit" title="Editar" onclick="_pbAbrirEdit(\''+s.id+'\')">✎</button>' : '')
        + '</div>'
        + '<div class="pb-card-titulo">'+(s.titulo||'—')+'</div>'
        + (s.situacao ? '<div class="pb-card-situacao"><b>Quando usar:</b> '+s.situacao+'</div>' : '')
        + '<div class="pb-card-script">'+(s.script||'').replace(/</g,'&lt;').replace(/\n/g,'<br>')+'</div>'
        + (prods.length || tags.length ? '<div class="pb-card-tags">'
            + prods.map(function(p){return '<span class="pb-chip prod">'+p+'</span>';}).join('')
            + tags.map(function(t){return '<span class="pb-chip">#'+t+'</span>';}).join('')
          + '</div>' : '')
        + '<div class="pb-card-acoes">'
        +   '<button class="pb-btn ghost" onclick="_pbCopiar(\''+s.id+'\')">📋 Copiar script</button>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  /* ── Atualiza select de produtos com lista observada ── */
  function _pbAtualizarSelectProds(){
    var sel = document.getElementById('pbProdFiltro');
    if(!sel) return;
    var set = {};
    Object.values(_pbDados).forEach(function(s){
      var p = s.produtos || [];
      if(!Array.isArray(p)) p = String(p).split(',').map(function(x){return x.trim().toUpperCase();});
      p.forEach(function(x){ if(x) set[x] = true; });
    });
    var atual = sel.value;
    sel.innerHTML = '<option value="">Todos os produtos</option>' +
      Object.keys(set).sort().map(function(p){return '<option value="'+p+'">'+p+'</option>';}).join('');
    if(set[atual]) sel.value = atual;
  }

  /* ── Filtro / busca ───────────────────────────────── */
  window._pbSetCat = function(cat){
    _pbCatAtiva = cat;
    document.querySelectorAll('.pb-cat-chip').forEach(function(b){
      b.classList.toggle('active', b.dataset.cat === cat);
    });
    _pbRender();
  };

  window._pbBuscar = function(){
    var inp = document.getElementById('pbBusca');
    var sel = document.getElementById('pbProdFiltro');
    _pbBuscaTxt = inp ? inp.value.trim() : '';
    _pbProdSel = sel ? sel.value : '';
    _pbRender();
  };

  /* ── Copiar script ────────────────────────────────── */
  window._pbCopiar = function(id){
    var s = _pbDados[id];
    if(!s){ _toast('Script não encontrado', 'var(--red)'); return; }
    var texto = s.script || '';
    try{
      navigator.clipboard.writeText(texto).then(function(){
        _toast('📋 Script copiado!', 'success');
      }, function(){
        _pbFallbackCopiar(texto);
      });
    }catch(e){ _pbFallbackCopiar(texto); }
  };
  function _pbFallbackCopiar(texto){
    var ta = document.createElement('textarea');
    ta.value = texto; ta.style.position='fixed'; ta.style.left='-9999px';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); _toast('📋 Script copiado!', 'success'); }
    catch(e){ _toast('Erro ao copiar — copie manualmente', 'var(--red)'); }
    document.body.removeChild(ta);
  }

  /* ── Edição (só ADM/EXTRACLASSE) ──────────────────── */
  window._pbNovo = function(){
    if(!_pbAdmin()){ _toast('Somente ADM/EXTRACLASSE podem criar scripts', 'var(--amber)'); return; }
    _pbEditId = null;
    document.getElementById('pbEditTitulo').textContent = 'Novo script';
    document.getElementById('pbFormCat').value = 'objecoes';
    document.getElementById('pbFormTitulo').value = '';
    document.getElementById('pbFormSituacao').value = '';
    document.getElementById('pbFormScript').value = '';
    document.getElementById('pbFormProd').value = '';
    document.getElementById('pbFormTags').value = '';
    document.getElementById('pbBtnExcluir').style.display = 'none';
    document.getElementById('pbEditModal').classList.add('show');
  };

  window._pbAbrirEdit = function(id){
    if(!_pbAdmin()){ return; }
    var s = _pbDados[id]; if(!s) return;
    _pbEditId = id;
    document.getElementById('pbEditTitulo').textContent = 'Editar script';
    document.getElementById('pbFormCat').value = s.categoria || 'objecoes';
    document.getElementById('pbFormTitulo').value = s.titulo || '';
    document.getElementById('pbFormSituacao').value = s.situacao || '';
    document.getElementById('pbFormScript').value = s.script || '';
    var prods = s.produtos||[]; if(!Array.isArray(prods)) prods = String(prods).split(',');
    var tags = s.tags||[]; if(!Array.isArray(tags)) tags = String(tags).split(',');
    document.getElementById('pbFormProd').value = prods.join(', ');
    document.getElementById('pbFormTags').value = tags.join(', ');
    document.getElementById('pbBtnExcluir').style.display = '';
    document.getElementById('pbEditModal').classList.add('show');
  };

  window._pbEditFechar = function(){
    document.getElementById('pbEditModal').classList.remove('show');
    _pbEditId = null;
  };

  window._pbSalvar = function(){
    if(!_pbAdmin()) return;
    var cat = document.getElementById('pbFormCat').value;
    var titulo = document.getElementById('pbFormTitulo').value.trim();
    var situacao = document.getElementById('pbFormSituacao').value.trim();
    var script = document.getElementById('pbFormScript').value.trim();
    var prods = document.getElementById('pbFormProd').value.split(',').map(function(x){return x.trim().toUpperCase();}).filter(Boolean);
    var tags = document.getElementById('pbFormTags').value.split(',').map(function(x){return x.trim();}).filter(Boolean);

    if(!titulo){ _toast('Título é obrigatório', 'var(--red)'); return; }
    if(!script){ _toast('Script é obrigatório', 'var(--red)'); return; }

    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    var quem = sess ? (sess.nome||sess.login||'—') : '—';
    var now = Date.now();

    var id = _pbEditId || ('pb_'+now+'_'+Math.random().toString(36).slice(2,7));
    var payload = {
      categoria: cat,
      titulo: titulo,
      situacao: situacao,
      script: script,
      produtos: prods,
      tags: tags,
      atualizadoEm: now,
      atualizadoPor: quem
    };
    if(!_pbEditId){
      payload.criadoEm = now;
      payload.criadoPor = quem;
    } else {
      var ant = _pbDados[id] || {};
      payload.criadoEm = ant.criadoEm || now;
      payload.criadoPor = ant.criadoPor || quem;
    }

    if(typeof window._fbSave !== 'function'){ _toast('Firebase indisponível', 'var(--red)'); return; }
    window._fbSave('icPlaybook/'+id, payload).then(function(){
      _pbDados[id] = payload;
      _pbEditFechar();
      _pbAtualizarSelectProds();
      _pbRender();
      _toast(_pbEditId ? '✏ Script atualizado' : '💾 Script criado', 'success');
    }).catch(function(e){
      _toast('Erro ao salvar: ' + (e&&e.message?e.message:e), 'var(--red)');
    });
  };

  window._pbExcluir = function(){
    if(!_pbAdmin() || !_pbEditId) return;
    if(!confirm('Excluir este script da biblioteca?')) return;
    if(typeof window._fbSave !== 'function'){ _toast('Firebase indisponível', 'var(--red)'); return; }
    window._fbSave('icPlaybook/'+_pbEditId, null).then(function(){
      delete _pbDados[_pbEditId];
      _pbEditFechar();
      _pbAtualizarSelectProds();
      _pbRender();
      _toast('🗑 Script excluído', 'success');
    }).catch(function(e){
      _toast('Erro ao excluir: ' + (e&&e.message?e.message:e), 'var(--red)');
    });
  };

  /* ── Bootstrap inicial — só ADM/EXTRACLASSE ──────── */
  var BOOTSTRAP = [
    {categoria:'abertura', titulo:'Abertura · Quebra-gelo com cliente novo',
     situacao:'Primeiro contato — cliente ainda não engajado',
     script:'Oi [Nome], aqui é o [Vendedor] da Febracis. Tudo bem? Vi que você acompanha o trabalho do Paulo Vieira — quero te contar rapidamente uma frente que pode encaixar exatamente onde você está hoje. Posso te tomar 2 minutos?',
     produtos:[], tags:['novo','rapport']},

    {categoria:'abertura', titulo:'Abertura · Indicação de aluno',
     situacao:'Cliente veio por indicação de um aluno Febracis',
     script:'Oi [Nome], tudo bem? O [Indicador] me passou seu contato dizendo que você tem o mesmo perfil de quem mais avançou no [Programa]. Já te adianto que ele pediu pra eu te ligar antes de abrir vagas pra outro grupo. Posso te contar em 3 minutos por que ele lembrou de você?',
     produtos:[], tags:['indicacao','urgencia']},

    {categoria:'qualificacao', titulo:'Qualificação · Descoberta de dor',
     situacao:'Cliente respondeu mas ainda não falou do problema dele',
     script:'Antes de te apresentar qualquer coisa, queria entender: hoje, qual é o ponto que mais te incomoda no seu [resultado financeiro / time / pessoal]? Pergunto porque o que mostro pra você daqui em diante depende do que você responder agora.',
     produtos:[], tags:['descoberta','dor']},

    {categoria:'qualificacao', titulo:'Qualificação · Verificar autoridade',
     situacao:'Cliente parece interessado mas você precisa saber se ele decide sozinho',
     script:'[Nome], pra eu te apresentar a melhor proposta possível: você decide isso sozinho ou tem alguém que você consulta antes? Pergunto porque dependendo da resposta eu te mando um material pra você compartilhar — quero te dar argumento, não obstáculo.',
     produtos:[], tags:['autoridade','decisor']},

    {categoria:'apresentacao', titulo:'Apresentação · Ancoragem de valor',
     situacao:'Antes de mostrar o preço — preciso ancorar valor',
     script:'Antes de eu falar de investimento, deixa eu te mostrar o que está em jogo: o aluno médio do [Produto] reporta um ganho de [resultado] em [tempo]. Isso significa que em [X meses] o programa já se pagou várias vezes. O que vou te falar agora é só o ponto de entrada — o valor de verdade está no resultado.',
     produtos:['IF','MASTER','CEOP'], tags:['ancoragem','valor']},

    {categoria:'objecoes', titulo:'Objeção · "Tá caro"',
     situacao:'Cliente sinaliza preço alto após ouvir o investimento',
     script:'Entendo. Posso te perguntar uma coisa? Caro em relação a quê? Pergunto porque normalmente quando alguém diz isso é uma de duas coisas: ou (1) está caro pro orçamento agora — e aí eu te mostro como cabe, ou (2) você ainda não enxergou o retorno claro — e aí o problema não é o preço, é o valor. Qual das duas é a sua?',
     produtos:[], tags:['preço','objeção']},

    {categoria:'objecoes', titulo:'Objeção · "Preciso pensar"',
     situacao:'Cliente recua sem dar motivo concreto',
     script:'Claro, [Nome], pensar é importante. Só uma coisa: na minha experiência, "preciso pensar" quase sempre esconde uma dúvida específica que o cliente não quis falar na hora. Topa me dizer o que te ficou na cabeça? Eu prefiro responder agora do que te deixar pensando sozinho com a dúvida errada.',
     produtos:[], tags:['adiamento','dúvida']},

    {categoria:'objecoes', titulo:'Objeção · "Vou conversar com minha esposa/marido"',
     situacao:'Cliente quer alinhar com o cônjuge antes de fechar',
     script:'Excelente, decisão a dois é o jeito certo. Posso te ajudar com isso? Vou te mandar um resumo de 3 pontos que normalmente é o que o cônjuge pergunta: (1) quanto custa, (2) quanto tempo dura, (3) o que muda na rotina da casa. Se vocês decidirem juntos hoje à noite, marca uma confirmação rápida amanhã às [horário]. Combinado?',
     produtos:[], tags:['conjuge','co-decisao']},

    {categoria:'objecoes', titulo:'Objeção · "Já fiz outro curso parecido"',
     situacao:'Cliente menciona experiência negativa anterior com concorrente',
     script:'Que bom que você me contou. Posso ser direto? Curso "parecido" não existe — existe método, e existe quem entrega ou não. O que te frustrou no anterior foi: (a) o conteúdo, (b) o método, ou (c) a falta de aplicação? Pergunto porque o nosso pega exatamente o ponto que costuma faltar nesses programas. Qual dos três foi seu caso?',
     produtos:[], tags:['concorrencia','frustração']},

    {categoria:'fechamento', titulo:'Fechamento · Alternativa pressuposta',
     situacao:'Cliente está pronto — você precisa fechar sem dar saída de "não"',
     script:'Perfeito. Então me confirma só duas coisas: você prefere começar pela turma do [Data 1] ou [Data 2]? E o investimento, prefere fazer à vista com desconto ou no parcelado em [X] vezes?',
     produtos:[], tags:['fechamento','alternativa']},

    {categoria:'fechamento', titulo:'Fechamento · Urgência real (não fake)',
     situacao:'Cliente já entendeu valor mas está procrastinando',
     script:'[Nome], te falo na real: a turma fecha [data] e hoje restam [X vagas]. Não te ofereço "última chance" porque sempre tem próxima — mas a próxima turma só sai em [meses], então o que você decidir hoje muda em quanto tempo você começa a ver resultado. Vamos garantir sua vaga agora?',
     produtos:[], tags:['urgencia','vagas']},

    {categoria:'followup', titulo:'Follow-up · Cliente sumiu há 3 dias',
     situacao:'Conversou, demonstrou interesse, parou de responder',
     script:'Oi [Nome], pensei em você hoje. Sem cobrança — só te lembrando que aquela conversa sobre [Produto] ficou em aberto. Se mudou de ideia ou apareceu algo no caminho, me conta com sinceridade. Se ainda faz sentido, marca 5 minutos comigo — [link de agenda / horário].',
     produtos:[], tags:['retomada','soft']},

    {categoria:'followup', titulo:'Follow-up · Reativação após 30 dias',
     situacao:'Cliente sumiu há mais de 1 mês — última tentativa',
     script:'Oi [Nome], não vou te bombardear. Só queria fechar nosso ciclo: você ainda tem interesse em resolver [a dor que ele citou], ou esse momento já passou? Qualquer resposta é ok. Se não for agora, eu paro aqui e te aviso quando abrir condição diferente. Beleza?',
     produtos:[], tags:['reativação','encerramento']},

    {categoria:'recuperacao', titulo:'Recuperação · Cliente que disse não',
     situacao:'Recusou no ato — quer abrir nova oportunidade',
     script:'[Nome], tudo bem? Sem segundas intenções: queria entender o que pesou na sua decisão de não seguir. Não pra tentar reverter — pra eu entender o que poderia ter feito diferente. Sua resposta me ajuda muito, e talvez abra uma porta diferente pra gente conversar mais à frente.',
     produtos:[], tags:['pós-não','feedback']},

    {categoria:'recuperacao', titulo:'Recuperação · Cliente que comprou e desistiu',
     situacao:'Pagou e cancelou antes de começar ou no início',
     script:'Oi [Nome], aqui é o [Vendedor]. Soube que você optou por cancelar. Antes de qualquer coisa: tudo bem com você? Pergunto humano. Se for algo pontual que dá pra resolver (data, formato, pagamento), me fala. Se for a decisão mesmo, respeito 100%. Só queria garantir que você saísse no melhor terreno possível.',
     produtos:[], tags:['cancelamento','retenção']},

    {categoria:'cobranca', titulo:'Cobrança · Lembrete saudável',
     situacao:'Parcela vencendo em 2-3 dias',
     script:'Oi [Nome], passando pra te lembrar que sua parcela do [Produto] vence em [data]. Sei que você é organizado, então provavelmente já agendou — só estou na pré-jogada pra evitar surpresa. Qualquer ajuste, me chama. Abraço!',
     produtos:[], tags:['lembrete','pré-vencimento']},

    {categoria:'cobranca', titulo:'Cobrança · Atraso de 7 dias',
     situacao:'Parcela em atraso há uma semana — primeira tentativa séria',
     script:'[Nome], tudo bem? Notei que a parcela do [Produto] venceu na semana passada e ainda não compensou. Quero te ajudar: você prefere (1) renegociar a data, (2) parcelar o valor em aberto, ou (3) só me dizer quando vai resolver? Me chama em particular pra a gente alinhar — sem julgamento.',
     produtos:[], tags:['atraso','renegociação']},

    {categoria:'cobranca', titulo:'Cobrança · Promessa de pagamento',
     situacao:'Cliente disse que ia pagar em X dia — confirmação preventiva',
     script:'Oi [Nome], só confirmando o combinado: você havia me dito que faria o pagamento da parcela [N] hoje, dia [data]. Tá tudo ok pro fechamento ainda hoje, ou precisa que eu te ajude em algo? Conta comigo.',
     produtos:[], tags:['promessa','confirmação']},

    {categoria:'apresentacao', titulo:'Apresentação · Storytelling de aluno',
     situacao:'Cliente em dúvida — você quer trazer um caso real',
     script:'Deixa eu te contar uma história rápida. [Nome do aluno], que entrou no [Produto] há [tempo], chegou exatamente onde você está: [dor parecida]. Ele não tinha certeza, igual você. Resolveu apostar. Em [X meses] ele [resultado concreto]. A diferença entre ele e quem ficou olhando não foi capacidade — foi decisão.',
     produtos:[], tags:['storytelling','caso-de-aluno']}
  ];

  /* ── Catálogo dos 16 produtos · pitch curto + frase de fechamento ── */
  var PRODUTOS = [
    {cod:'IF',         nome:'Inteligência Financeira',
     publico:'quem quer dominar a relação com o dinheiro e parar de viver no aperto',
     pilar:'organização, mentalidade de prosperidade e crescimento financeiro real',
     transformacao:'sair do ciclo de escassez e construir patrimônio com clareza',
     gatilho:'a maior parte das pessoas trabalha pra dinheiro a vida inteira sem nunca aprender a fazer o dinheiro trabalhar pra elas'},
    {cod:'MASTER',     nome:'Master Coaching',
     publico:'profissionais que querem virar referência em coaching e desenvolvimento humano',
     pilar:'método CIS aplicado em alto nível, ferramentas avançadas de transformação',
     transformacao:'se posicionar como coach de elite e atender clientes de alto valor',
     gatilho:'o mercado tá lotado de coach básico — quem se diferencia é quem domina o método mais completo'},
    {cod:'CEOP',       nome:'Comunicação e Oratória Persuasiva',
     publico:'quem precisa influenciar, vender e liderar com a palavra',
     pilar:'persuasão, presença de palco, estrutura de fala que convence',
     transformacao:'ser ouvido com autoridade em qualquer contexto — reunião, palco, câmera',
     gatilho:'a diferença entre quem é promovido e quem fica é, na maioria das vezes, como ela fala'},
    {cod:'FGPC',       nome:'Formação em Gestão de Pessoas',
     publico:'líderes, gestores e empreendedores com time abaixo',
     pilar:'gestão por valores, feedback estruturado, performance e cultura',
     transformacao:'parar de apagar incêndio e ter um time que entrega resultado sozinho',
     gatilho:'90% dos gestores foram promovidos pelo resultado técnico — nunca aprenderam a liderar gente'},
    {cod:'BHP',        nome:'Gestão de Negócios (BHP)',
     publico:'empresários e sócios que querem escalar com previsibilidade',
     pilar:'estratégia, finanças, time e operação integrados em um único método',
     transformacao:'sair de empresário-bombeiro e virar empresário-estrategista',
     gatilho:'sua empresa cresce se o dono trabalha — isso não é empresa, é autoemprego caro'},
    {cod:'FCIS',       nome:'Formação em Coaching Integral Sistêmico',
     publico:'quem quer se tornar coach profissional certificado pela maior escola do Brasil',
     pilar:'formação técnica completa em coaching sistêmico, com supervisão e aplicação prática',
     transformacao:'mudar de profissão (ou somar uma nova fonte de renda) com método validado',
     gatilho:'o mercado de coaching cresce 16% ao ano — mas só sobrevive quem se forma de verdade'},
    {cod:'ML5',        nome:'Formação de Líderes (ML5)',
     publico:'gestores que querem desenvolver líderes dentro do próprio time',
     pilar:'5 níveis de liderança, com aplicação prática e ferramentas de desenvolvimento',
     transformacao:'criar uma máquina de gerar líderes em qualquer área da empresa',
     gatilho:'empresas que escalam não dependem de um gênio — dependem de um sistema de gente'},
    {cod:'TAV',        nome:'Técnicas Avançadas de Vendas',
     publico:'vendedores, consultores e founders que precisam fechar mais',
     pilar:'PNL aplicada à venda, gatilhos mentais, fechamento ético, gestão de objeção',
     transformacao:'parar de depender da "boa vontade" do cliente e fechar com método',
     gatilho:'a diferença entre o top performer e o vendedor médio raramente é talento — é técnica'},
    {cod:'JE',         nome:'Jornada do Enriquecimento',
     publico:'quem está começando a jornada da prosperidade financeira',
     pilar:'mentalidade de abundância + hábitos práticos de dinheiro do zero',
     transformacao:'sair do ciclo "ganhei → gastei → faltou" e construir reserva real',
     gatilho:'enriquecer não é sobre quanto você ganha, é sobre o que você FAZ com o que ganha'},
    {cod:'GE',         nome:'Gestão Eficaz',
     publico:'gestores que querem entregar mais com menos esforço',
     pilar:'priorização, delegação inteligente, indicadores que importam',
     transformacao:'ganhar de volta horas da semana e enxergar a empresa de cima',
     gatilho:'ocupado não é o mesmo que produtivo — e a maior parte dos gestores confunde os dois'},
    {cod:'MAESTRIA',   nome:'Maestria em Negócios',
     publico:'empresários estabelecidos que querem dar o próximo salto de maturidade',
     pilar:'estratégia avançada, expansão, M&A, governança',
     transformacao:'estruturar a empresa pra crescer sem você ser o gargalo',
     gatilho:'depois de certo ponto, o que trava o crescimento não é o mercado — é o dono'},
    {cod:'PDA',        nome:'O Poder da Ação',
     publico:'quem sabe o que precisa fazer mas não consegue executar',
     pilar:'gatilho de ação imediata, gestão de procrastinação, disciplina',
     transformacao:'transformar conhecimento parado em resultado em movimento',
     gatilho:'90% da diferença entre quem chega lá e quem fica falando é uma coisa só: execução'},
    {cod:'DP',         nome:'Decifre e Influencie Pessoas',
     publico:'líderes, vendedores e profissionais de relacionamento',
     pilar:'leitura de perfil (DISC), comunicação adaptativa, influência ética',
     transformacao:'parar de ler pessoas no escuro — e influenciar com precisão',
     gatilho:'você não vende, lidera ou negocia com "o cliente" — você faz isso com um perfil específico, e cada um precisa ser tratado de um jeito'},
    {cod:'CIS_GLOBAL', nome:'Método CIS Global',
     publico:'quem quer levar o método CIS pra outros países ou contextos internacionais',
     pilar:'expansão global, certificação internacional, comunidade mundial',
     transformacao:'atuar globalmente como referência em coaching integral sistêmico',
     gatilho:'o mundo precisa do método — e os primeiros a se posicionarem globalmente vão liderar a categoria'},
    {cod:'CIS',        nome:'Método CIS Presencial',
     publico:'qualquer pessoa que queira transformar TODAS as 11 áreas da vida',
     pilar:'3 dias de imersão com Paulo Vieira — emocional, performance, financeiro, profissional, relacionamentos',
     transformacao:'sair com mapa claro do que mudar e por onde começar nas 11 áreas',
     gatilho:'248 edições, 1,8 milhão de pessoas, 83 países — não é um curso, é uma decisão de virada de vida'},
    {cod:'TEAM',       nome:'Team Coaching Febracis',
     publico:'empresas que querem aplicar o método CIS no time todo',
     pilar:'transformação coletiva, alinhamento de valores, cultura de alta performance',
     transformacao:'um time que joga junto, com clareza de propósito e processo',
     gatilho:'individualmente seu time pode ser bom — coletivamente, quase nunca está alinhado'}
  ];

  /* ── Gera 8 scripts por produto (1 por categoria) ── */
  function _pbScriptsPorProduto(){
    var out = [];
    PRODUTOS.forEach(function(p){

      /* 1. ABERTURA — primeiro contato com pitch curto do produto */
      out.push({
        categoria:'abertura',
        titulo:'Abertura · '+p.nome,
        situacao:'Primeiro contato com cliente que se encaixa no perfil do '+p.cod,
        script:
'Oi [Nome], aqui é o [Vendedor] da Febracis. Tudo bem?\n\n'+
'Te procurei especificamente por causa do '+p.nome+'. Esse programa é pra '+p.publico+' — e olhando seu perfil, faz total sentido a gente conversar.\n\n'+
'Não vou te tomar muito tempo. Me dá 3 minutos pra eu te contar por que ele se encaixa exatamente onde você está hoje?',
        produtos:[p.cod],
        tags:['primeiro-contato','abertura-produto']
      });

      /* 2. QUALIFICAÇÃO — descobre se ele encaixa no produto */
      out.push({
        categoria:'qualificacao',
        titulo:'Qualificação · '+p.nome,
        situacao:'Cliente demonstrou interesse — preciso checar se o '+p.cod+' é mesmo o caminho dele',
        script:
'Antes de eu te falar do '+p.cod+', preciso entender uma coisa pra não te oferecer algo que não te serve.\n\n'+
'O '+p.nome+' foi feito pra quem hoje quer atacar '+p.pilar+', com objetivo de '+p.transformacao+'.\n\n'+
'Me responde com sinceridade: isso é o que tá te mexendo hoje, ou seu ponto é outro?\n\n'+
'Pergunto porque dependendo da resposta talvez eu te recomende outro programa — quero te entregar o certo pra você, não o que eu tenho pra vender.',
        produtos:[p.cod],
        tags:['descoberta','fit-produto']
      });

      /* 3. APRESENTAÇÃO — pitch completo */
      out.push({
        categoria:'apresentacao',
        titulo:'Apresentação · '+p.nome,
        situacao:'Cliente pediu pra entender o que é o '+p.cod+' antes de qualquer coisa',
        script:
'O '+p.nome+' é pra '+p.publico+'.\n\n'+
'O foco do programa é: '+p.pilar+'.\n\n'+
'A transformação que ele entrega: '+p.transformacao+'.\n\n'+
'Pensa o seguinte: '+p.gatilho+'. É exatamente isso que o '+p.cod+' resolve.\n\n'+
'Faz sentido a gente continuar conversando sobre como ele se aplica especificamente ao seu momento?',
        produtos:[p.cod],
        tags:['pitch','apresentacao-produto']
      });

      /* 4. OBJEÇÕES — objeção típica do produto */
      out.push({
        categoria:'objecoes',
        titulo:'Objeção · "Não é minha prioridade agora" — '+p.nome,
        situacao:'Cliente diz que '+p.cod+' não é o foco dele neste momento',
        script:
'Entendo. Só me responde uma coisa: quanto tempo você acha que vai esperar pra atacar '+p.pilar+'?\n\n'+
'Pergunto porque '+p.gatilho+'. E adiar isso não é neutro — cada mês sem o '+p.cod+' é mais um mês longe de '+p.transformacao+'.\n\n'+
'Posso te perguntar: o que precisaria acontecer pra esse virar uma prioridade pra você? Talvez já tenha acontecido e você ainda não percebeu.',
        produtos:[p.cod],
        tags:['prioridade','procrastinacao']
      });

      /* 5. FECHAMENTO */
      out.push({
        categoria:'fechamento',
        titulo:'Fechamento · '+p.nome,
        situacao:'Cliente já entendeu o valor do '+p.cod+' — falta dar o passo final',
        script:
'[Nome], a essa altura você já entendeu o que o '+p.nome+' entrega.\n\n'+
'A pergunta agora não é mais "vale a pena" — você já sabe que sim.\n\n'+
'A pergunta é: você quer começar a viver isso ('+p.transformacao+') agora, ou daqui a 6 meses?\n\n'+
'Posso te confirmar a vaga? Você prefere começar na turma de [Data 1] ou [Data 2]?',
        produtos:[p.cod],
        tags:['fechamento','produto-especifico']
      });

      /* 6. FOLLOW-UP — retomada após silêncio */
      out.push({
        categoria:'followup',
        titulo:'Follow-up · '+p.nome,
        situacao:'Cliente conversou sobre o '+p.cod+', demonstrou interesse, mas sumiu',
        script:
'Oi [Nome], pensei em você hoje.\n\n'+
'Sem pressão, só te lembrando que nossa conversa sobre o '+p.nome+' ficou em aberto. Você havia falado que queria atacar '+p.pilar+' — e o programa começa na turma de [Data].\n\n'+
'Se algo mudou no seu caminho, me conta com sinceridade. Se ainda faz sentido, marca 5 minutos comigo hoje pra a gente fechar — [link / horário].',
        produtos:[p.cod],
        tags:['retomada','soft-followup']
      });

      /* 7. RECUPERAÇÃO — após "não" */
      out.push({
        categoria:'recuperacao',
        titulo:'Recuperação · '+p.nome,
        situacao:'Cliente recusou o '+p.cod+' — quer reabrir a porta no futuro',
        script:
'[Nome], tudo bem? Sem nenhuma intenção de te convencer agora.\n\n'+
'Sobre o '+p.nome+' — entendi que esse não era seu momento. Só queria te perguntar uma coisa pra eu aprender: o que pesou mais na sua decisão?\n\n'+
'Pergunto porque quero respeitar seu critério. Se em [3-6 meses] o cenário mudar, posso te procurar de novo com uma condição alinhada ao que você precisa?',
        produtos:[p.cod],
        tags:['pos-nao','reabertura']
      });

      /* 8. COBRANÇA — lembrete saudável para cliente do produto */
      out.push({
        categoria:'cobranca',
        titulo:'Cobrança · '+p.nome,
        situacao:'Lembrete de parcela do '+p.cod+' próximo do vencimento',
        script:
'Oi [Nome], tudo bem?\n\n'+
'Passando rápido só pra te lembrar: sua parcela do '+p.nome+' vence em [data]. Sei que você é organizado, então certamente já agendou — estou só na pré-jogada pra evitar surpresa.\n\n'+
'Qualquer ajuste de data ou dúvida, me chama aqui. Abraço, e bom programa!',
        produtos:[p.cod],
        tags:['lembrete','parcela']
      });
    });
    return out;
  }

  /* ── Slug determinístico pra ID de seed (evita duplicatas) ── */
  function _pbSlug(s){
    return String(s||'').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60);
  }

  window._pbBootstrap = function(){
    if(!_pbAdmin()){ _toast('Somente ADM/EXTRACLASSE', 'var(--amber)'); return; }
    if(typeof window._fbSave !== 'function'){ _toast('Firebase indisponível', 'var(--red)'); return; }

    var todosScripts = BOOTSTRAP.concat(_pbScriptsPorProduto());
    var existentes = Object.keys(_pbDados).length;
    if(existentes > 0){
      var msg = 'A biblioteca tem '+existentes+' scripts.\n\n'
              + 'O bootstrap vai criar/atualizar '+todosScripts.length+' scripts seed (com IDs determinísticos).\n'
              + 'Scripts seed que já existem serão sobrescritos com o conteúdo atualizado.\n'
              + 'Scripts NÃO-seed (criados manualmente) ficam intactos.\n\n'
              + 'Continuar?';
      if(!confirm(msg)) return;
    }

    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    var quem = sess ? (sess.nome||sess.login||'—') : 'BOOTSTRAP';
    var now = Date.now();
    var ops = todosScripts.map(function(s){
      var slug = _pbSlug(s.categoria + '_' + (s.produtos&&s.produtos[0] ? s.produtos[0] + '_' : '') + s.titulo);
      var id = 'pb_seed_' + slug;
      var ant = _pbDados[id] || {};
      var payload = Object.assign({}, s, {
        criadoEm:   ant.criadoEm || now,
        criadoPor:  ant.criadoPor || quem,
        atualizadoEm: now,
        atualizadoPor: quem
      });
      _pbDados[id] = payload;
      return window._fbSave('icPlaybook/'+id, payload);
    });
    Promise.all(ops).then(function(){
      _pbAtualizarSelectProds();
      _pbRender();
      _toast('⚡ '+todosScripts.length+' scripts seed sincronizados ('+BOOTSTRAP.length+' genéricos + '+(PRODUTOS.length*2)+' por produto)', 'success');
    }).catch(function(e){
      _toast('Erro no bootstrap: ' + (e&&e.message?e.message:e), 'var(--red)');
    });
  };

  /* ── Limpar TODOS os seeds (scripts com prefixo pb_seed_) ─── */
  window._pbLimparSeeds = function(){
    if(!_pbAdmin()){ _toast('Somente ADM/EXTRACLASSE', 'var(--amber)'); return; }
    if(typeof window._fbSave !== 'function'){ _toast('Firebase indisponível', 'var(--red)'); return; }
    var seeds = Object.keys(_pbDados).filter(function(id){ return id.indexOf('pb_seed_') === 0; });
    if(!seeds.length){ _toast('Nenhum seed pra limpar', 'var(--blue)'); return; }
    if(!confirm('Remover '+seeds.length+' scripts seed da biblioteca?\n\n(Scripts criados manualmente NÃO são afetados.)')) return;
    var ops = seeds.map(function(id){
      return window._fbSave('icPlaybook/'+id, null).then(function(){
        delete _pbDados[id];
      });
    });
    Promise.all(ops).then(function(){
      _pbAtualizarSelectProds();
      _pbRender();
      _toast('🧹 '+seeds.length+' seeds removidos', 'success');
    }).catch(function(e){
      _toast('Erro ao limpar: ' + (e&&e.message?e.message:e), 'var(--red)');
    });
  };

  /* ── Inicialização ao abrir a aba ─────────────────── */
  function _pbInit(){
    /* Mostra/esconde barra de admin */
    var bar = document.getElementById('pbAdminBar');
    if(bar) bar.style.display = _pbAdmin() ? 'flex' : 'none';

    _pbCarregar(function(){
      _pbAtualizarSelectProds();
      _pbRender();
    });
  }

  /* Hook no _icShowPane: quando ele alterna pra "playbook", inicializa */
  var _origIcShow = window._icShowPane;
  window._icShowPane = function(name){
    if(typeof _origIcShow === 'function') _origIcShow(name);
    if(name === 'playbook') _pbInit();
  };

  /* Caso o módulo seja aberto direto na aba playbook (storage/restauração) */
  document.addEventListener('DOMContentLoaded', function(){
    var ativo = document.querySelector('.ic-pane.show');
    if(ativo && ativo.getAttribute('data-icpane') === 'playbook') _pbInit();
  });

})();
