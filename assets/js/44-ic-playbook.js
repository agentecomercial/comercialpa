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

  window._pbBootstrap = function(){
    if(!_pbAdmin()){ _toast('Somente ADM/EXTRACLASSE', 'var(--amber)'); return; }
    if(Object.keys(_pbDados).length > 0){
      if(!confirm('A biblioteca já tem '+Object.keys(_pbDados).length+' scripts. Adicionar os '+BOOTSTRAP.length+' iniciais mesmo assim?')) return;
    }
    if(typeof window._fbSave !== 'function'){ _toast('Firebase indisponível', 'var(--red)'); return; }
    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    var quem = sess ? (sess.nome||sess.login||'—') : 'BOOTSTRAP';
    var now = Date.now();
    var ops = BOOTSTRAP.map(function(s, i){
      var id = 'pb_seed_'+(now+i)+'_'+Math.random().toString(36).slice(2,5);
      var payload = Object.assign({}, s, {
        criadoEm: now, criadoPor: quem,
        atualizadoEm: now, atualizadoPor: quem
      });
      _pbDados[id] = payload;
      return window._fbSave('icPlaybook/'+id, payload);
    });
    Promise.all(ops).then(function(){
      _pbAtualizarSelectProds();
      _pbRender();
      _toast('⚡ '+BOOTSTRAP.length+' scripts iniciais carregados', 'success');
    }).catch(function(e){
      _toast('Erro no bootstrap: ' + (e&&e.message?e.message:e), 'var(--red)');
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
