/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Módulo PDI (Fase 4)
   Plano de Desenvolvimento Individual trimestral.
   Vive APENAS dentro de #mapeamentoScreen (pane "pdi").
   Não toca Gerenciar Turmas nem Pipeline Comercial.

   Firebase paths (isolados / novos):
     icPDIs/{consultorNome}/{trimestreId} → {
       trimestre, comecou, atualizadoEm, status,
       alvos: [
         { key, atual(1-5), alvo(1-5), treinos:[], acoes:[{feito,texto}],
           prazo, evidencia, status }
       ]
     }
     trimestreId = "YYYY-Q1"|"YYYY-Q2"|"YYYY-Q3"|"YYYY-Q4"

   Leitura (somente):
     icFeedbacks/{consultor}/* → médias das competências (últimos 3 ciclos)
     users (via _npUsuarios)   → lista de consultores
══════════════════════════════════════════════════════════════ */
(function(){

  /* Mesmas 9 competências do Feedback */
  var COMPS_DEF = [
    { key:'prosp', label:'Prospecção',            ico:'🎯', treins:['DP','MAESTRIA'] },
    { key:'qual',  label:'Qualificação',          ico:'🔍', treins:['DP','CIS'] },
    { key:'apres', label:'Apresentação',          ico:'🎤', treins:['CIS','MAESTRIA','TEAM'] },
    { key:'neg',   label:'Negociação',            ico:'🤝', treins:['CIS','PDA','ML5'] },
    { key:'fup',   label:'Follow-up',             ico:'📨', treins:['MAESTRIA','PDA','TEAM'] },
    { key:'const', label:'Constância',            ico:'📅', treins:['MAESTRIA','PDA'] },
    { key:'mix',   label:'Mix de produto',        ico:'🎒', treins:['MAESTRIA'] },
    { key:'apr',   label:'Aproveitamento',        ico:'⚡', treins:['MAESTRIA','DP'] },
    { key:'vis',   label:'Visão (Oportunidades)', ico:'🔭', treins:['MAESTRIA','PDA','CIS','DP'] }
  ];
  var TREINOS = ['IF','MASTER','CEOP','BHP','CIS','ML5','TAV','JE','GE','MAESTRIA','PDA','DP','FCIS','TEAM','FGPC','CIS_GLOBAL'];
  var NIVEIS_DESC = {
    prosp: ['Quase nunca prospecta','Reage a lead','Cadência básica','Acima da média do time','Referência: gera carteira ativa'],
    qual:  ['Não qualifica','Qualifica raso','Aplica framework','Descarta com critério','Mestre da qualificação'],
    apres: ['Lê script','Pitch padrão','Adapta ao cliente','Storytelling consistente','Conexão emocional sempre'],
    neg:   ['Perde por preço','Fecha o fácil','Lida com objeção','Mantém ticket alto','Vira não em sim sem desconto'],
    fup:   ['Esquece clientes','1–2 perdas/mês','Cadência básica','Cadência estruturada','Ressuscita cliente frio'],
    const: ['Bate raramente','Oscila muito','Bate maioria dos meses','Quase sempre na meta','100% de constância'],
    mix:   ['1 produto só','2 produtos','3 produtos','4 produtos','Portfólio completo'],
    apr:   ['Carteira inflada','Conversão fraca','Aproveita médio','Carteira enxuta e eficiente','80%+ de conversão'],
    vis:   ['Perde oportunidade','Pipeline raso','Cultiva o suficiente','Cobertura > meta','Visão estratégica · cultiva, preserva e recupera']
  };

  /* 5 frameworks de PDI suportados (Fase D) */
  var FRAMEWORKS = {
    GROW: {
      label: 'GROW',
      sub: 'Coaching estruturado · 4 perguntas',
      campos: [
        { k:'G', l:'G · Goal',    p:'Onde você quer chegar?' },
        { k:'R', l:'R · Reality', p:'Onde você está hoje?' },
        { k:'O', l:'O · Options', p:'Quais 3 caminhos pra fechar o gap?' },
        { k:'W', l:'W · Will',    p:'Qual você escolhe e quando começa?' }
      ]
    },
    OKRs: {
      label: 'OKRs',
      sub: '1 Objetivo + 3-5 Key Results numéricos',
      campos: [
        { k:'O',   l:'Objetivo (qualitativo)',     p:'Ex: "Tornar-me referência em fechamento"' },
        { k:'KR1', l:'KR1 (numérico, mensurável)', p:'Ex: "Conversão Negociação→Pago ≥ 40%"' },
        { k:'KR2', l:'KR2',                        p:'Ex: "Ticket médio ≥ R$ 5.000"' },
        { k:'KR3', l:'KR3',                        p:'Ex: "Follow-up D+1 em 100% dos casos"' }
      ]
    },
    'Performance Gap': {
      label: 'Performance Gap',
      sub: 'KPI fraco → causa raiz → ação corretiva',
      campos: [
        { k:'sintoma', l:'Sintoma (KPI fraco)',     p:'Ex: "Conversão 18%, abaixo da meta de 35%"' },
        { k:'causa',   l:'Causa raiz (top hipótese)',p:'Ex: "Não cria urgência · deixa preço pra reunião 2"' },
        { k:'acao',    l:'Ação corretiva',          p:'Ex: "Treinar SPIN 30min/dia por 2 semanas"' },
        { k:'medir',   l:'Re-medição',              p:'Ex: "Conversão em 30 dias"' }
      ]
    },
    STAR: {
      label: 'STAR',
      sub: 'Caso real → lição → ação futura',
      campos: [
        { k:'S',     l:'S · Situation', p:'Ex: "Cliente X, MASTER, lead frio"' },
        { k:'T',     l:'T · Task',      p:'Ex: "Converter em 2 reuniões"' },
        { k:'A',     l:'A · Action',    p:'Ex: "Mandei proposta no 1º contato"' },
        { k:'R',     l:'R · Result',    p:'Ex: "Cliente sumiu"' },
        { k:'licao', l:'Lição + ação futura', p:'Ex: "Nunca propor antes de mapear dor com SPIN"' }
      ]
    },
    'Balanced Scorecard': {
      label: 'Balanced Scorecard',
      sub: '4 perspectivas equilibradas',
      campos: [
        { k:'fin',  l:'💰 Resultado financeiro', p:'Ex: "Meta de faturamento/comissão do trimestre"' },
        { k:'cli',  l:'👥 Cliente',              p:'Ex: "NPS, retenção, indicações geradas"' },
        { k:'proc', l:'⚙ Processo',             p:'Ex: "Tempo de ciclo, taxa de follow-up D+1"' },
        { k:'aprd', l:'🌱 Aprendizado',          p:'Ex: "1 skill nova / livro / curso por ciclo"' }
      ]
    }
  };
  var FRAMEWORKS_ORDEM = ['GROW','OKRs','Performance Gap','STAR','Balanced Scorecard'];

  /* Helper de dias úteis (V1: pula só sábado/domingo) — exposto global p/ reuso */
  if(typeof window._icAddDiasUteis !== 'function'){
    window._icAddDiasUteis = function(dataBase, nDiasUteis){
      var d = dataBase instanceof Date ? new Date(dataBase) : new Date(dataBase || Date.now());
      var add = 0;
      while(add < nDiasUteis){
        d.setDate(d.getDate() + 1);
        var dow = d.getDay();
        if(dow !== 0 && dow !== 6) add++;
      }
      return d;
    };
  }
  if(typeof window._icFmtDataBR !== 'function'){
    window._icFmtDataBR = function(d){
      if(!d) return '—';
      var dd = (d instanceof Date) ? d : new Date(d);
      if(isNaN(dd.getTime())) return '—';
      return String(dd.getDate()).padStart(2,'0')+'/'+String(dd.getMonth()+1).padStart(2,'0')+'/'+dd.getFullYear();
    };
  }

  /* Estado */
  var _doc = null;            /* { periodo, status, alvos[], ... } */
  var _consultorAtivo = '';
  var _perStart = '';         /* "YYYY-MM" */
  var _perEnd   = '';         /* "YYYY-MM" */
  var _historico = [];
  var _medFeedback = null;    /* {key: media1-10} — vem de icFeedbacks */
  var MESES_BR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  /* ── Helpers de período flexível ── */
  function _ym(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  function _hojeYM(){ return _ym(new Date()); }
  function _addMes(ym, delta){
    var p = (ym||_hojeYM()).split('-');
    var d = new Date(+p[0], +p[1]-1+delta, 1);
    return _ym(d);
  }
  function _diffMeses(a, b){
    var pa = a.split('-'), pb = b.split('-');
    return (+pb[0] - +pa[0])*12 + (+pb[1] - +pa[1]);
  }
  function _periodoId(){
    if(!_perStart || !_perEnd) return '';
    return _perStart+'_'+_perEnd;
  }
  function _periodoLabel(id){
    if(!id) return '—';
    /* aceita "YYYY-MM_YYYY-MM" e o legado "YYYY-Q1..Q4" */
    if(id.indexOf('_') < 0){
      /* legado trimestre */
      var p = id.split('-Q');
      var nomes = {1:'Jan–Mar',2:'Abr–Jun',3:'Jul–Set',4:'Out–Dez'};
      return 'Q'+p[1]+'/'+p[0]+' ('+nomes[+p[1]]+')';
    }
    var pp = id.split('_');
    var a = pp[0].split('-'), b = pp[1].split('-');
    var labA = MESES_BR[+a[1]-1]+'/'+a[0];
    var labB = MESES_BR[+b[1]-1]+'/'+b[0];
    var dur = _diffMeses(pp[0], pp[1]) + 1;
    return labA+' → '+labB+' · '+dur+' mês'+(dur>1?'es':'');
  }
  function _periodoMeses(idStart, idEnd){
    /* retorna array de YYYY-MM entre start e end (inclusivo) */
    var meses = [];
    var cur = idStart;
    var safe = 0;
    while(cur <= idEnd && safe < 48){
      meses.push(cur);
      cur = _addMes(cur, 1);
      safe++;
    }
    return meses;
  }

  /* ── Hook no _icShowPane (já definido em 40-ic-feedback.js) ── */
  var _origShowPane = window._icShowPane;
  window._icShowPane = function(pane){
    if(typeof _origShowPane === 'function') _origShowPane(pane);
    /* Garantir que panes não-conhecidos pelo original (como 'pdi') sejam tratados */
    document.querySelectorAll('#icTabs .ic-tab').forEach(function(t){
      t.classList.toggle('active', t.getAttribute('data-icpane') === pane);
    });
    document.querySelectorAll('#mapeamentoScreen .ic-pane').forEach(function(p){
      p.classList.toggle('show', p.getAttribute('data-icpane') === pane);
    });
    if(pane === 'pdi') _pdiInit();
  };

  /* ── Init ── */
  var _initDone = false;
  function _pdiInit(){
    _pdiPopularConsultores();
    _pdiInitPeriodo();
    if(_initDone) return;
    _initDone = true;
    document.getElementById('pdiConsultor').addEventListener('change', function(){
      _consultorAtivo = this.value || '';
      _pdiCarregar();
      _pdiCarregarHistorico();
      _pdiCarregarFeedbackMedias();
    });
    document.getElementById('pdiPerStart').addEventListener('change', function(){
      _perStart = this.value || _hojeYM();
      if(_perEnd && _perStart > _perEnd) _perEnd = _addMes(_perStart, 2);
      document.getElementById('pdiPerEnd').value = _perEnd;
      _pdiCarregar();
    });
    document.getElementById('pdiPerEnd').addEventListener('change', function(){
      _perEnd = this.value || _addMes(_perStart, 2);
      if(_perEnd < _perStart){ _perEnd = _perStart; this.value = _perStart; }
      _pdiCarregar();
    });
    /* Chips de atalho do período (linha separada, fora dos controles) */
    document.querySelectorAll('.pdi-atalho').forEach(function(btn){
      btn.addEventListener('click', function(){
        var v = btn.getAttribute('data-atalho');
        var hoje = _hojeYM();
        if(v === 'prox3'){ _perStart = hoje; _perEnd = _addMes(hoje, 2); }
        else if(v === 'atual3'){
          var d = new Date();
          var qStart = new Date(d.getFullYear(), Math.floor(d.getMonth()/3)*3, 1);
          _perStart = _ym(qStart);
          _perEnd = _addMes(_perStart, 2);
        }
        else if(v === 'prox6'){ _perStart = hoje; _perEnd = _addMes(hoje, 5); }
        else if(v === 'ant3'){ _perStart = _addMes(hoje, -3); _perEnd = _addMes(hoje, -1); }
        document.getElementById('pdiPerStart').value = _perStart;
        document.getElementById('pdiPerEnd').value = _perEnd;
        document.querySelectorAll('.pdi-atalho').forEach(function(b){b.classList.remove('active');});
        btn.classList.add('active');
        _pdiCarregar();
      });
    });
    /* Status Box (V3+C) — troca manual via <select> */
    var statusSel = document.getElementById('pdiStatusSel');
    if(statusSel){
      statusSel.addEventListener('change', function(){
        if(!_consultorAtivo){ _pdiRenderStatusBox(); return; /* sem consultor não persiste */ }
        if(!_doc) _doc = {};
        var v = this.value;
        if(v === 'nao')           _doc.status = 'rascunho';
        else if(v === 'andamento')_doc.status = 'iniciado';
        else if(v === 'concluido')_doc.status = 'concluido';
        else if(v === 'pausado')  _doc.status = 'pausado';
        else if(v === 'cancelado')_doc.status = 'cancelado';
        _pdiRenderStatus();
        if(typeof _pdiSalvarRascunho === 'function') _pdiSalvarRascunho();
      });
    }
    /* Render inicial do status box (mesmo sem consultor) */
    _pdiRenderStatusBox();
  }

  /* Define o período padrão = trimestre atual (3 meses) */
  function _pdiInitPeriodo(){
    var d = new Date();
    if(!_perStart){
      var qStart = new Date(d.getFullYear(), Math.floor(d.getMonth()/3)*3, 1);
      _perStart = _ym(qStart);
      _perEnd = _addMes(_perStart, 2);
    }
    var i1 = document.getElementById('pdiPerStart');
    var i2 = document.getElementById('pdiPerEnd');
    if(i1) i1.value = _perStart;
    if(i2) i2.value = _perEnd;
  }

  function _pdiPopularConsultores(){
    var sel = document.getElementById('pdiConsultor');
    if(!sel) return;
    function _build(usuarios){
      var nomes = [];
      Object.values(usuarios||{}).forEach(function(u){
        if(u && u.perfil === 'consultor' && u.nome) nomes.push(u.nome);
      });
      nomes.sort(function(a,b){return String(a).localeCompare(String(b),'pt-BR');});
      var atualVal = sel.value;
      sel.innerHTML = '<option value="">— selecione um consultor —</option>'
        + nomes.map(function(n){return '<option value="'+n+'">'+n+'</option>';}).join('');
      if(atualVal && nomes.indexOf(atualVal) >= 0) sel.value = atualVal;
      else if(_consultorAtivo && nomes.indexOf(_consultorAtivo) >= 0) sel.value = _consultorAtivo;
    }
    if(window._npUsuarios && Object.keys(window._npUsuarios).length > 0){
      _build(window._npUsuarios); return;
    }
    if(typeof window._fbGet === 'function'){
      window._fbGet('usuarios').then(function(us){
        window._npUsuarios = us || {};
        _build(window._npUsuarios);
      }).catch(function(){ _build({}); });
    } else {
      _build({});
    }
  }
  /* (função antiga _pdiPopularTrimestres substituída por _pdiInitPeriodo + inputs type=month) */

  /* ── Carrega feedbacks médios dos últimos 3 ciclos do consultor ── */
  function _pdiCarregarFeedbackMedias(){
    _medFeedback = null;
    if(!_consultorAtivo || typeof window._fbGet !== 'function'){ _pdiRenderDiag(); return; }
    window._fbGet('icFeedbacks/'+_consultorAtivo).then(function(d){
      if(!d){ _pdiRenderDiag(); return; }
      var feedbacks = [];
      Object.values(d).forEach(function(f){ if(f && f.comps) feedbacks.push(f); });
      feedbacks.sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); });
      var ult3 = feedbacks.slice(0,3);
      if(!ult3.length){ _pdiRenderDiag(); return; }
      var medias = {};
      COMPS_DEF.forEach(function(c){
        var soma = 0, n = 0;
        ult3.forEach(function(f){
          var v = +(f.comps && f.comps[c.key]);
          if(v >= 1){ soma += v; n++; }
        });
        medias[c.key] = n > 0 ? soma/n : null;
      });
      _medFeedback = medias;
      _pdiRenderDiag();
    }).catch(function(){ _pdiRenderDiag(); });
  }

  /* ── Carrega doc do PDI do trimestre ── */
  function _pdiCarregar(){
    if(!_consultorAtivo){ _pdiResetDoc(); return; }
    if(typeof window._fbGet !== 'function'){ _pdiResetDoc(); return; }
    window._fbGet('icPDIs/'+_consultorAtivo+'/'+_periodoId()).then(function(d){
      if(d){ _doc = d; _pdiAplicarDocNaUI(); }
      else { _pdiResetDoc(); }
    }).catch(_pdiResetDoc);
  }
  function _pdiResetDoc(){
    var sug = _pdiSugerirFramework();
    _doc = {
      periodo: _periodoId(),
      perStart: _perStart,
      perEnd: _perEnd,
      status: 'rascunho',
      framework: sug.nome,         /* default = sugestão automática */
      compromissoGestor: '',       /* o que o gestor se compromete a fornecer */
      alvos: []
    };
    _pdiAplicarDocNaUI();
  }
  function _pdiAplicarDocNaUI(){
    /* compat: documentos antigos sem framework recebem GROW como default */
    if(_doc && !_doc.framework) _doc.framework = 'GROW';
    if(_doc && _doc.compromissoGestor == null) _doc.compromissoGestor = '';
    _pdiRenderFrameworkBox();
    _pdiRenderAlvos();
    _pdiRenderStatus();
    _pdiRenderCheckins();
    _pdiRenderCompromisso();
    _pdiAtualizarFooter();
  }

  /* ── Sugestão automática de framework por % meta do consultor ──
     ≤ 70% → Performance Gap (precisa corrigir o gap urgente)
     70-100% → OKRs (foco em manter e bater)
     > 100% → GROW (foco em crescimento / próximo nível)
     Sem dados → GROW (default neutro)
  */
  function _pdiSugerirFramework(){
    var nome = (_consultorAtivo || '').toUpperCase();
    if(!nome) return { nome: 'GROW', razao: 'default · sem consultor selecionado' };
    var pctMeta = null;
    try {
      if(typeof window._npTodasVendas === 'function' && typeof window._npPorConsultor === 'function'){
        var todas = window._npTodasVendas();
        var rank = window._npPorConsultor(todas, '', 'pago');
        var r = rank.find(function(x){ return String(x.nome).toUpperCase() === nome; });
        if(r){
          var g = window._npGoals && window._npGoals[r.nome];
          var mb = g ? (+(g.metaBasica || g.metaValor || 0)) : 0;
          if(mb > 0) pctMeta = r.pago / mb * 100;
        }
      }
    } catch(e){ /* silencioso */ }
    if(pctMeta == null)  return { nome: 'GROW', razao: 'sem KPIs · default neutro' };
    if(pctMeta <= 70)    return { nome: 'Performance Gap', razao: Math.round(pctMeta)+'% da meta · foco em corrigir gap' };
    if(pctMeta <= 100)   return { nome: 'OKRs', razao: Math.round(pctMeta)+'% da meta · foco em manter e bater' };
    return { nome: 'GROW', razao: Math.round(pctMeta)+'% da meta · foco em crescimento' };
  }
  window._pdiSugerirFramework = _pdiSugerirFramework;

  window._pdiSetFramework = function(nome){
    if(!FRAMEWORKS[nome]) return;
    _doc.framework = nome;
    _pdiRenderFrameworkBox();
    _pdiRenderAlvos();  /* re-render: campos por framework mudam */
  };

  function _pdiRenderFrameworkBox(){
    var box = document.getElementById('pdiFrameworkBox');
    if(!box || !_doc) return;
    var atual = _doc.framework || 'GROW';
    var sug = _pdiSugerirFramework();
    var ehSug = sug.nome === atual;
    var def = FRAMEWORKS[atual] || FRAMEWORKS.GROW;
    var html = '<div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">📐 Framework do PDI</div>'
      +'<select id="pdiFrameworkSel" onchange="window._pdiSetFramework(this.value)" class="modal-select" style="width:100%;padding:7px 11px;font-size:12px;font-weight:700;">'
      +FRAMEWORKS_ORDEM.map(function(f){
        return '<option value="'+f+'"'+(f===atual?' selected':'')+'>'+FRAMEWORKS[f].label+'</option>';
      }).join('')
      +'</select>'
      +'<div style="font-size:10px;color:var(--muted);margin-top:5px;line-height:1.4;">'+def.sub+'</div>';
    if(!ehSug){
      html += '<div style="margin-top:8px;padding:6px 10px;background:rgba(96,165,250,.08);border-left:3px solid var(--blue);border-radius:4px;font-size:10px;color:var(--blue);">'
        +'💡 Sugerido: <b>'+sug.nome+'</b><br>'
        +'<span style="color:var(--muted);">'+sug.razao+'</span><br>'
        +'<button class="pdi-btn ghost" style="margin-top:4px;padding:4px 10px;font-size:10px;" onclick="window._pdiSetFramework(\''+sug.nome+'\')">Aplicar sugestão</button>'
        +'</div>';
    } else {
      html += '<div style="margin-top:8px;padding:6px 10px;background:rgba(200,240,90,.06);border-left:3px solid var(--accent);border-radius:4px;font-size:10px;color:var(--accent);">'
        +'✓ Usando sugestão automática<br>'
        +'<span style="color:var(--muted);">'+sug.razao+'</span>'
        +'</div>';
    }
    box.innerHTML = html;
  }
  function _pdiRenderCheckins(){
    var el = document.getElementById('pdiCheckinsBox');
    if(!el || !_doc) return;
    var base = _doc.comecou ? new Date(_doc.comecou) : new Date();
    var d30 = window._icAddDiasUteis(base, 30);
    var d60 = window._icAddDiasUteis(base, 60);
    var d90 = window._icAddDiasUteis(base, 90);
    var hoje = new Date(); hoje.setHours(0,0,0,0);
    function _pill(d, label){
      var hojeMs = hoje.getTime();
      var dMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      var diff = Math.round((dMs - hojeMs) / 86400000);
      var cor = diff < 0 ? '#ef4444' : (diff <= 3 ? '#f59e0b' : '#34d399');
      var sub = diff < 0 ? 'atrasado '+(-diff)+'d' : (diff === 0 ? 'hoje' : 'em '+diff+'d');
      return '<div style="flex:1;text-align:center;padding:8px 6px;background:var(--surface2);border-radius:6px;border-top:3px solid '+cor+';">'
        +'<div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700;">'+label+'</div>'
        +'<div style="font-size:12px;color:var(--text);font-weight:700;margin:2px 0;">'+window._icFmtDataBR(d)+'</div>'
        +'<div style="font-size:9px;color:'+cor+';">'+sub+'</div>'
        +'</div>';
    }
    el.innerHTML = '<div style="display:flex;gap:6px;">'+_pill(d30,'30 du')+_pill(d60,'60 du')+_pill(d90,'90 du')+'</div>'
      +'<div style="font-size:10px;color:var(--muted);margin-top:6px;text-align:center;">'
      +(_doc.comecou ? 'base: '+window._icFmtDataBR(_doc.comecou)+' (data de início do PDI)' : 'base: hoje (PDI ainda não iniciado)')
      +'</div>';
  }
  function _pdiRenderCompromisso(){
    var ta = document.getElementById('pdiCompromissoGestor');
    if(ta) ta.value = _doc.compromissoGestor || '';
  }
  window._pdiSetCompromisso = function(v){
    _doc.compromissoGestor = v;
  };

  function _pdiRenderStatus(){
    var bar = document.getElementById('pdiStatusBar');
    if(!bar || !_doc) return;
    bar.classList.remove('iniciado','concluido');
    var s = _doc.status || 'rascunho';
    if(s === 'iniciado'){ bar.textContent = '⚙ Em andamento'; bar.classList.add('iniciado'); }
    else if(s === 'concluido'){ bar.textContent = '✅ Concluído'; bar.classList.add('concluido'); }
    else { bar.textContent = '○ Rascunho'; }
    /* Atualiza também o novo Status Box (V3+C) */
    _pdiRenderStatusBox();
  }

  /* Mapeia status legado → status novo box */
  function _pdiStatusKey(){
    if(!_consultorAtivo) return 'nao';
    if(!_doc) return 'nao';
    var s = _doc.status || 'rascunho';
    if(s === 'iniciado') return 'andamento';
    if(s === 'concluido') return 'concluido';
    if(s === 'pausado') return 'pausado';
    if(s === 'cancelado') return 'cancelado';
    return 'nao'; /* rascunho/vazio = não iniciado */
  }
  var _pdiStatusLabels = {
    nao:       {tit:'NÃO INICIADO',  sub:'Aguardando definição'},
    andamento: {tit:'EM ANDAMENTO',  sub:'Acompanhe a evolução'},
    concluido: {tit:'CONCLUÍDO',     sub:'Objetivos atingidos'},
    pausado:   {tit:'PAUSADO',       sub:'Retomada pendente'},
    cancelado: {tit:'CANCELADO',     sub:'PDI encerrado'}
  };
  function _pdiCalcProgresso(){
    if(!_doc || !Array.isArray(_doc.alvos) || !_doc.alvos.length) return 0;
    var totalAcoes = 0, feitas = 0;
    _doc.alvos.forEach(function(a){
      var ax = Array.isArray(a.acoes) ? a.acoes : [];
      totalAcoes += ax.length;
      feitas += ax.filter(function(x){return x && x.feito;}).length;
    });
    if(totalAcoes === 0){
      /* fallback: % de alvos cujo atual >= alvo */
      var atingidos = _doc.alvos.filter(function(a){ return a && a.atual != null && a.alvo != null && a.atual >= a.alvo; }).length;
      return Math.round((atingidos / _doc.alvos.length) * 100);
    }
    return Math.round((feitas / totalAcoes) * 100);
  }
  function _pdiRenderStatusBox(){
    var box  = document.getElementById('pdiStatusBig');
    var tit  = document.getElementById('pdiStatusTit');
    var sub  = document.getElementById('pdiStatusSub');
    var fill = document.getElementById('pdiProgFill');
    var pct  = document.getElementById('pdiProgPct');
    var sel  = document.getElementById('pdiStatusSel');
    if(!box) return;
    var key = _pdiStatusKey();
    var lbl = _pdiStatusLabels[key] || _pdiStatusLabels.nao;
    box.classList.remove('nao','andamento','concluido','pausado','cancelado');
    box.classList.add(key);
    if(tit) tit.textContent = lbl.tit;
    if(sub) sub.textContent = lbl.sub;
    var prog = _pdiCalcProgresso();
    if(fill) fill.style.width = prog + '%';
    if(pct)  pct.textContent  = prog + '%';
    if(sel)  sel.value = key;
  }

  /* ── Diagnóstico (sugestões baseadas no feedback) ── */
  /* Retorna as 4 competências com menor média (= sugeridas pela competência) */
  function _pdiSugeridas(){
    if(!_medFeedback) return [];
    var ord = COMPS_DEF.slice().sort(function(a,b){
      var ma = _medFeedback[a.key], mb = _medFeedback[b.key];
      if(ma == null) return 1; if(mb == null) return -1;
      return ma - mb;
    });
    return ord.slice(0,4).map(function(c){return c.key;});
  }
  function _pdiRenderDiag(){
    var el = document.getElementById('pdiDiagList');
    if(!el) return;
    if(!_consultorAtivo){
      el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;grid-column:1/-1;">Selecione um consultor para ver as sugestões.</div>';
      _pdiRenderChipStrip();
      return;
    }
    if(!_medFeedback){
      el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;grid-column:1/-1;">Sem feedbacks anteriores para este consultor — escolha competências manualmente nos chips abaixo.</div>';
      _pdiRenderChipStrip();
      return;
    }
    var sugeridas = _pdiSugeridas();
    el.innerHTML = sugeridas.map(function(key){
      var c = COMPS_DEF.find(function(x){return x.key===key;});
      var m = _medFeedback[c.key];
      var jaAdded = (_doc.alvos||[]).some(function(a){return a.key === c.key;});
      var sc = m == null ? '—' : m.toFixed(1);
      var cls = m == null ? '' : (m < 6 ? 'bad' : m < 7.5 ? 'warn' : 'ok');
      var info = m == null ? 'Sem dados nos últimos ciclos' : (m < 6 ? '⚠ candidata prioritária' : 'oportunidade de evolução');
      return '<div class="pdi-diag-card">'
        + '<div class="pdi-diag-top">'
        +   '<div class="pdi-diag-lbl"><span>'+c.ico+'</span>'+c.label+' <span style="color:#f59e0b;font-size:11px;">⭐</span></div>'
        +   '<div class="pdi-diag-score '+cls+'">'+sc+'</div>'
        + '</div>'
        + '<div class="pdi-diag-info">Média dos últimos 3 ciclos · '+info+'</div>'
        + '<button class="pdi-diag-btn '+(jaAdded?'added':'')+'" '+(jaAdded?'disabled':'onclick="_pdiAddAlvo(\''+c.key+'\')"')+'>'
        +   (jaAdded ? '✓ Adicionada' : '+ Adicionar ao PDI')
        + '</button>'
        + '</div>';
    }).join('');
    _pdiRenderChipStrip();
  }

  /* Chip strip: todas as 8 competências; ⭐ nas 4 sugeridas; ✓ nas adicionadas.
     Clique alterna add/remove. Permite escolha 100% manual ou retirar sugestão. */
  function _pdiRenderChipStrip(){
    var wrap = document.getElementById('pdiChipStripWrap');
    var box  = document.getElementById('pdiChipStrip');
    if(!wrap || !box) return;
    if(!_consultorAtivo){ wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    var sugeridas = _pdiSugeridas();
    var alvos = (_doc && _doc.alvos) || [];
    box.innerHTML = COMPS_DEF.map(function(c){
      var added = alvos.some(function(a){return a.key === c.key;});
      var sug = sugeridas.indexOf(c.key) >= 0;
      var cls = 'pdi-chip-comp' + (added?' added':'') + (sug?' sugerida':'');
      return '<button class="'+cls+'" onclick="_pdiToggleAlvo(\''+c.key+'\')">'+c.ico+' '+c.label+'</button>';
    }).join('');
  }
  window._pdiToggleAlvo = function(key){
    var idx = (_doc.alvos||[]).findIndex(function(a){return a.key === key;});
    if(idx >= 0){
      window._pdiRmAlvo(idx);
    } else {
      window._pdiAddAlvo(key);
    }
  };

  /* ── Adicionar / remover competência alvo ── */
  window._pdiAddAlvo = function(key){
    if(!_doc) _pdiResetDoc();
    if((_doc.alvos||[]).length >= 3){ if(typeof _showToast==='function') _showToast('⚠️ Máximo 3 competências por PDI.','var(--amber)'); return; }
    if((_doc.alvos||[]).some(function(a){return a.key===key;})) return;
    var c = COMPS_DEF.find(function(x){return x.key===key;});
    var mediaFb = _medFeedback ? _medFeedback[key] : null;
    var atual = mediaFb != null ? Math.max(1, Math.min(5, Math.round(mediaFb/2))) : 3;
    _doc.alvos = _doc.alvos || [];
    _doc.alvos.push({
      key: key, atual: atual, alvo: Math.min(5, atual+1),
      treinos: c.treins.slice(0,2),
      acoes: [],
      prazo: '',
      evidencia: '',
      status: 'iniciar',
      framework_dados: {}   /* preenchido conforme o framework do _doc */
    });
    _pdiRenderAlvos();
    _pdiRenderDiag();
    _pdiAtualizarFooter();
  };
  window._pdiRmAlvo = function(i){
    if(!_doc || !_doc.alvos) return;
    _doc.alvos.splice(i,1);
    _pdiRenderAlvos();
    _pdiRenderDiag();
    _pdiAtualizarFooter();
  };

  function _escAttr(s){return String(s||'').replace(/"/g,'&quot;');}

  function _pdiRenderAlvos(){
    var box = document.getElementById('pdiAlvosList');
    if(!box) return;
    var alvos = (_doc && _doc.alvos) || [];
    if(!alvos.length){
      var opts = COMPS_DEF.map(function(c){return c.ico+' '+c.label;});
      box.innerHTML = '<div class="pdi-alvo-vazio"><b>Nenhuma competência selecionada ainda.</b><br>Adicione até 3 do diagnóstico acima — ou escolha manualmente.</div>'
        + '<button class="pdi-btn" style="width:100%;padding:12px;" onclick="_pdiAddManual()">+ Adicionar competência manualmente</button>';
      document.getElementById('pdiAlvoCount').textContent = '0';
      return;
    }
    box.innerHTML = alvos.map(function(a,i){
      var c = COMPS_DEF.find(function(x){return x.key===a.key;});
      var statusKey = a.status==='iniciar'?'iniciar':a.status==='andamento'?'andamento':a.status==='atingido'?'atingido':a.status==='parcial'?'parcial':'naoatingido';
      var statusClass = {iniciar:'',andamento:'in-andamento',atingido:'atingido',parcial:'parcial',naoatingido:'nao-atingido'}[statusKey];
      var ndesc = NIVEIS_DESC[a.key] || [];
      return '<div class="pdi-alvo '+statusClass+'">'
        + '<div class="pdi-alvo-h">'
        +   '<div class="pdi-alvo-titulo">'+c.ico+' '+c.label+'</div>'
        +   '<div class="pdi-alvo-acoes">'
        +     '<select onchange="_pdiSetStatus('+i+',this.value)" class="pdi-alvo-status '+statusKey+'" style="cursor:pointer;">'
        +       '<option value="iniciar"'+(a.status==='iniciar'?' selected':'')+'>Não iniciado</option>'
        +       '<option value="andamento"'+(a.status==='andamento'?' selected':'')+'>Em andamento</option>'
        +       '<option value="atingido"'+(a.status==='atingido'?' selected':'')+'>Atingido</option>'
        +       '<option value="parcial"'+(a.status==='parcial'?' selected':'')+'>Parcial</option>'
        +       '<option value="naoatingido"'+(a.status==='naoatingido'?' selected':'')+'>Não atingido</option>'
        +     '</select>'
        +     '<button class="pdi-alvo-rm" onclick="_pdiRmAlvo('+i+')" title="Remover">×</button>'
        +   '</div>'
        + '</div>'
        + '<div class="pdi-nivel-row">'
        +   '<div class="pdi-nivel-card">'
        +     '<div class="pdi-nivel-lbl">Nível atual <small>(sistema sugeriu '+a.atual+')</small></div>'
        +     '<div class="pdi-niveis">'+[1,2,3,4,5].map(function(n){
                return '<button class="pdi-nivel-dot '+(n<=a.atual?'fill':'')+'" onclick="_pdiSetAtual('+i+','+n+')">'+n+'</button>';
              }).join('')+'</div>'
        +     '<div class="pdi-nivel-desc">'+(ndesc[a.atual-1]||'')+'</div>'
        +   '</div>'
        +   '<div class="pdi-nivel-card">'
        +     '<div class="pdi-nivel-lbl">Nível alvo <small>(meta do trimestre)</small></div>'
        +     '<div class="pdi-niveis">'+[1,2,3,4,5].map(function(n){
                return '<button class="pdi-nivel-dot '+(n<=a.alvo?'target':'')+'" onclick="_pdiSetAlvo('+i+','+n+')">'+n+'</button>';
              }).join('')+'</div>'
        +     '<div class="pdi-nivel-desc">'+(ndesc[a.alvo-1]||'')+'</div>'
        +   '</div>'
        + '</div>'
        + _pdiRenderFrameworkAlvo(a, i)
        + '<div style="margin-bottom:12px;">'
        +   '<div class="pdi-nivel-lbl" style="margin-bottom:6px;">Treinamentos vinculados <small>(⭐ sugeridos pela competência)</small></div>'
        +   '<div class="pdi-trein-list">'
        +     TREINOS.map(function(t){
                var sel = a.treinos.indexOf(t) >= 0;
                var sug = c.treins.indexOf(t) >= 0;
                return '<button class="pdi-trein-chip '+(sel?'selected ':'')+(sug?'sugerido':'')+'" onclick="_pdiToggleTrein('+i+',\''+t+'\')">'+t+'</button>';
              }).join('')
        +   '</div>'
        + '</div>'
        + '<div style="margin-bottom:12px;">'
        +   '<div class="pdi-nivel-lbl" style="margin-bottom:6px;">Ações concretas para o trimestre</div>'
        +   '<div class="pdi-acoes">'
        +     a.acoes.map(function(ac,ai){
                return '<div class="pdi-acao">'
                +   '<input type="checkbox" '+(ac.feito?'checked':'')+' onchange="_pdiToggleAcao('+i+','+ai+')">'
                +   '<input type="text" value="'+_escAttr(ac.texto)+'" oninput="_pdiSetAcaoTxt('+i+','+ai+',this.value)" placeholder="Descrição da ação...">'
                +   '<button class="rm" onclick="_pdiRmAcao('+i+','+ai+')">×</button>'
                + '</div>';
              }).join('')
        +     '<button class="pdi-acao-add" onclick="_pdiAddAcao('+i+')">+ Adicionar ação</button>'
        +   '</div>'
        + '</div>'
        + '<div class="pdi-alvo-foot">'
        +   '<div class="pdi-foot-col">'
        +     '<label>Prazo</label>'
        +     '<input type="text" value="'+_escAttr(a.prazo)+'" oninput="_pdiSetPrazo('+i+',this.value)" placeholder="ex: 30/06/2026">'
        +   '</div>'
        +   '<div class="pdi-foot-col">'
        +     '<label>Evidências / observações do progresso</label>'
        +     '<textarea oninput="_pdiSetEvid('+i+',this.value)" placeholder="O que demonstra que está progredindo...">'+_escAttr(a.evidencia)+'</textarea>'
        +   '</div>'
        + '</div>'
        + '</div>';
    }).join('');
    document.getElementById('pdiAlvoCount').textContent = alvos.length;
    /* Mantém o chip strip sincronizado (✓ nas adicionadas) */
    _pdiRenderChipStrip();
  }

  /* Renderiza os campos do framework atual dentro do card de cada alvo.
     Cada framework tem N campos (textareas livres). O conteúdo é salvo
     em alvo.framework_dados[<framework>][<chave_campo>]. */
  function _pdiRenderFrameworkAlvo(alvo, i){
    var fw = _doc.framework || 'GROW';
    var def = FRAMEWORKS[fw]; if(!def) return '';
    alvo.framework_dados = alvo.framework_dados || {};
    alvo.framework_dados[fw] = alvo.framework_dados[fw] || {};
    var dados = alvo.framework_dados[fw];
    var rows = def.campos.map(function(campo){
      var v = dados[campo.k] || '';
      return '<div style="margin-bottom:8px;">'
        +'<label style="display:block;font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">'+campo.l+'</label>'
        +'<textarea oninput="window._pdiSetFwCampo('+i+',\''+campo.k+'\',this.value)" placeholder="'+_escAttr(campo.p)+'" style="width:100%;min-height:50px;padding:7px 10px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:5px;font-size:11px;font-family:inherit;line-height:1.5;resize:vertical;">'+_escAttr(v)+'</textarea>'
        +'</div>';
    }).join('');
    return '<div style="margin-bottom:14px;padding:12px;background:rgba(167,139,250,.04);border:1px solid rgba(167,139,250,.2);border-radius:8px;">'
      +'<div style="font-size:10px;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">📐 Plano · '+def.label+' <small style="color:var(--muted);font-weight:500;">· '+def.sub+'</small></div>'
      +rows
      +'</div>';
  }
  window._pdiSetFwCampo = function(i, k, v){
    var fw = _doc.framework || 'GROW';
    _doc.alvos[i].framework_dados = _doc.alvos[i].framework_dados || {};
    _doc.alvos[i].framework_dados[fw] = _doc.alvos[i].framework_dados[fw] || {};
    _doc.alvos[i].framework_dados[fw][k] = v;
  };

  /* Setters */
  window._pdiSetAtual = function(i,n){_doc.alvos[i].atual=n; _pdiRenderAlvos();};
  window._pdiSetAlvo  = function(i,n){_doc.alvos[i].alvo=n; _pdiRenderAlvos();};
  window._pdiSetStatus = function(i,s){_doc.alvos[i].status=s; _pdiRenderAlvos();};
  window._pdiSetPrazo = function(i,v){_doc.alvos[i].prazo=v;};
  window._pdiSetEvid  = function(i,v){_doc.alvos[i].evidencia=v;};
  window._pdiToggleTrein = function(i,t){
    var arr = _doc.alvos[i].treinos;
    var idx = arr.indexOf(t);
    if(idx>=0) arr.splice(idx,1); else arr.push(t);
    _pdiRenderAlvos();
  };
  window._pdiAddAcao = function(i){
    _doc.alvos[i].acoes.push({feito:false,texto:''});
    _pdiRenderAlvos();
    _pdiAtualizarFooter();
  };
  window._pdiRmAcao = function(i,ai){_doc.alvos[i].acoes.splice(ai,1); _pdiRenderAlvos(); _pdiAtualizarFooter();};
  window._pdiToggleAcao = function(i,ai){_doc.alvos[i].acoes[ai].feito = !_doc.alvos[i].acoes[ai].feito; _pdiAtualizarFooter();};
  window._pdiSetAcaoTxt = function(i,ai,v){_doc.alvos[i].acoes[ai].texto = v;};

  window._pdiAddManual = function(){
    var opts = COMPS_DEF.filter(function(c){return !(_doc.alvos||[]).some(function(a){return a.key===c.key;});});
    if(!opts.length){ if(typeof _showToast==='function') _showToast('Todas as competências já foram adicionadas','var(--muted)'); return; }
    var lista = opts.map(function(c,i){return (i+1)+'. '+c.ico+' '+c.label;}).join('\n');
    var n = prompt('Escolha o número da competência:\n\n'+lista);
    var idx = parseInt(n)-1;
    if(opts[idx]) window._pdiAddAlvo(opts[idx].key);
  };

  function _pdiAtualizarFooter(){
    var alvos = (_doc && _doc.alvos) || [];
    var totAcoes = alvos.reduce(function(s,a){return s+a.acoes.length;},0);
    var feitas = alvos.reduce(function(s,a){return s+a.acoes.filter(function(x){return x.feito;}).length;},0);
    var el = document.getElementById('pdiFootStats');
    if(el) el.innerHTML = '<b>'+alvos.length+'/3</b> competências definidas · <b>'+totAcoes+'</b> ações ('+feitas+' concluídas)';
  }

  /* ── Salvar / Iniciar ── */
  window._pdiSalvarRascunho = function(){
    if(!_consultorAtivo){ if(typeof _showToast==='function') _showToast('⚠️ Selecione um consultor.','var(--amber)'); return; }
    _doc.atualizadoEm = new Date().toISOString().slice(0,10);
    _pdiPersistir(true);
  };
  window._pdiIniciar = function(){
    if(!_consultorAtivo){ if(typeof _showToast==='function') _showToast('⚠️ Selecione um consultor.','var(--amber)'); return; }
    if(!(_doc.alvos||[]).length){ if(typeof _showToast==='function') _showToast('⚠️ Adicione ao menos 1 competência.','var(--amber)'); return; }
    _doc.status = 'iniciado';
    _doc.comecou = new Date().toISOString().slice(0,10);
    _doc.atualizadoEm = _doc.comecou;
    _pdiPersistir(true);
  };
  function _pdiPersistir(showToast){
    if(typeof window._fbSave !== 'function'){
      if(typeof _showToast==='function') _showToast('❌ Firebase indisponível.','var(--red)');
      return;
    }
    window._fbSave('icPDIs/'+_consultorAtivo+'/'+_periodoId(), _doc).then(function(){
      if(showToast && typeof _showToast==='function'){
        _showToast('✅ '+(_doc.status==='iniciado'?'PDI enviado ao consultor.':'Rascunho salvo.'),'var(--accent)');
      }
      _pdiRenderStatus();
      _pdiCarregarHistorico();
    }).catch(function(err){
      console.error('[ic-pdi] save falhou', err);
      if(typeof _showToast==='function') _showToast('❌ Erro ao salvar.','var(--red)');
    });
  }

  /* ── Histórico ── */
  function _pdiCarregarHistorico(){
    var el = document.getElementById('pdiHist');
    if(!el) return;
    if(!_consultorAtivo){ el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;">Selecione um consultor.</div>'; return; }
    if(typeof window._fbGet !== 'function'){ el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;">Firebase indisponível.</div>'; return; }
    window._fbGet('icPDIs/'+_consultorAtivo).then(function(d){
      _historico = [];
      if(d){
        Object.keys(d).forEach(function(k){
          var v = d[k]||{};
          v._id = k;
          _historico.push(v);
        });
        _historico.sort(function(a,b){return (b._id||'').localeCompare(a._id||'');});
      }
      _pdiRenderHistorico();
    }).catch(function(){
      _historico = [];
      _pdiRenderHistorico();
    });
  }
  /* Converte ID do histórico → {start,end} no formato YYYY-MM. Aceita formato novo "YYYY-MM_YYYY-MM" e legado "YYYY-Q1..Q4" */
  function _idParaPeriodo(id){
    if(!id) return null;
    if(id.indexOf('_') > 0){
      var pp = id.split('_');
      return {start:pp[0], end:pp[1]};
    }
    /* Legado YYYY-Q1..Q4 → mapeia pro trimestre correspondente */
    var m = /^(\d{4})-Q([1-4])$/.exec(id);
    if(m){
      var ano = m[1], q = +m[2];
      var startM = ((q-1)*3) + 1;
      var endM   = startM + 2;
      var ms = String(startM).padStart(2,'0');
      var me = String(endM).padStart(2,'0');
      return {start: ano+'-'+ms, end: ano+'-'+me};
    }
    return null;
  }

  function _pdiRenderHistorico(){
    var el = document.getElementById('pdiHist');
    if(!el) return;
    if(!_historico.length){
      el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;">Sem PDIs anteriores.</div>';
      return;
    }
    el.innerHTML = _historico.map(function(h){
      var alvos = h.alvos || [];
      var ating = alvos.filter(function(a){return a.status === 'atingido';}).length;
      var pct = alvos.length ? Math.round(ating/alvos.length*100) : 0;
      var pctCls = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'bad';
      var barCol = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
      var compsTxt = alvos.length ? ating+'/'+alvos.length+' atingidas' : 'sem competências';
      var legado = (h._id||'').indexOf('_') < 0;
      var tagLegado = legado ? '<span title="Formato legado (trimestre fixo)" style="background:rgba(168,85,247,0.15);color:#a855f7;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;margin-left:4px;">legado</span>' : '';
      return '<div class="pdi-hist-item" data-id="'+h._id+'" style="position:relative;">'
        + '<div class="pdi-hist-row" data-act="abrir"><span class="pdi-hist-trim">'+_periodoLabel(h._id)+tagLegado+'</span><span class="pdi-hist-pct '+pctCls+'">'+pct+'%</span></div>'
        + '<div class="pdi-hist-bar" data-act="abrir"><div class="pdi-hist-bar-fill" style="width:'+pct+'%;background:'+barCol+';"></div></div>'
        + '<div class="pdi-hist-comps" data-act="abrir">'+compsTxt+'</div>'
        + '<button class="pdi-hist-del" data-act="excluir" title="Excluir este PDI">🗑</button>'
        + '</div>';
    }).join('');
    el.querySelectorAll('.pdi-hist-item').forEach(function(it){
      var id = it.getAttribute('data-id');
      /* Click no item (corpo) → abre */
      it.querySelectorAll('[data-act="abrir"]').forEach(function(z){
        z.addEventListener('click', function(){
          var per = _idParaPeriodo(id);
          if(!per){
            (window._showToast||alert)('PDI com ID inválido: '+id);
            return;
          }
          _perStart = per.start; _perEnd = per.end;
          var i1 = document.getElementById('pdiPerStart'); if(i1) i1.value = _perStart;
          var i2 = document.getElementById('pdiPerEnd');   if(i2) i2.value = _perEnd;
          _pdiCarregar();
        });
      });
      /* Botão excluir */
      var btnDel = it.querySelector('[data-act="excluir"]');
      if(btnDel) btnDel.addEventListener('click', function(e){
        e.stopPropagation();
        if(!_consultorAtivo){ (window._showToast||alert)('Sem consultor selecionado.'); return; }
        if(!confirm('Excluir o PDI "'+_periodoLabel(id)+'" de '+_consultorAtivo+'?\n\nIsso remove o registro do Firebase e NÃO pode ser desfeito.')) return;
        var path = 'icPDIs/'+_consultorAtivo+'/'+id;
        var saveFn = window._fbSave || function(p,v){ return Promise.reject(new Error('Firebase indisponível')); };
        /* _fbSave com null deleta o nó em RTDB */
        saveFn(path, null).then(function(){
          (window._showToast||alert)('PDI excluído.');
          /* Se o atual estava aberto, limpa */
          if(_doc && (_doc.periodo === id || _periodoId() === id)) _doc = null;
          _pdiCarregarHistorico();
          _pdiCarregar();
        }).catch(function(err){
          alert('Erro ao excluir: '+(err && err.message || err));
        });
      });
    });
  }

  /* Hook quando IC abre */
  var _origAbrirMap = window.abrirMapeamento;
  if(typeof _origAbrirMap === 'function'){
    window.abrirMapeamento = function(btn){
      _origAbrirMap(btn);
      setTimeout(_pdiPopularConsultores, 600);
    };
  }

  /* ── EXPORTAR PDF DO PDI (1 página, pra entregar no 1:1) ──── */
  window._pdiExportarPdf = function(){
    if(!_consultorAtivo){
      if(typeof _showToast==='function') _showToast('⚠️ Selecione um consultor.','var(--amber)');
      return;
    }
    if(typeof window._ensureJsPDF !== 'function'){
      if(typeof _showToast==='function') _showToast('❌ jsPDF não disponível.','var(--red)');
      return;
    }
    if(typeof _showToast==='function') _showToast('⏳ Gerando PDF…','var(--muted)');
    window._ensureJsPDF().then(function(){
      try {
        var jsPDF = window.jspdf && window.jspdf.jsPDF;
        if(!jsPDF){ throw new Error('jsPDF não carregou'); }
        var doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
        var W = 210, H = 297, M = 14;
        var y = M;

        function _txt(t, x, yy, opts){
          opts = opts || {};
          if(opts.size) doc.setFontSize(opts.size);
          if(opts.style) doc.setFont(undefined, opts.style);
          if(opts.color) doc.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
          else doc.setTextColor(20, 20, 20);
          doc.text(String(t||''), x, yy);
        }
        function _line(yy){
          doc.setDrawColor(180,180,180);
          doc.setLineWidth(0.2);
          doc.line(M, yy, W-M, yy);
        }
        function _wrap(t, maxW){
          return doc.splitTextToSize(String(t||''), maxW);
        }

        /* ── Cabeçalho ── */
        _txt('PLANO DE DESENVOLVIMENTO INDIVIDUAL', M, y, {size:14, style:'bold', color:[40,40,40]});
        y += 6;
        _txt(_consultorAtivo, M, y, {size:11, style:'bold'});
        var hoje = new Date();
        var perTxt = (_doc.perStart||'?')+' → '+(_doc.perEnd||'?');
        _txt('Período: '+perTxt+'   |   Gerado em: '+window._icFmtDataBR(hoje), W-M, y, {size:8, color:[120,120,120]});
        doc.setTextColor(120,120,120);
        doc.text('Período: '+perTxt+'   |   Gerado em: '+window._icFmtDataBR(hoje), W-M, y, { align:'right' });
        y += 4;
        _line(y); y += 5;

        /* ── Framework + Status ── */
        var fwDef = FRAMEWORKS[_doc.framework||'GROW'] || FRAMEWORKS.GROW;
        _txt('Framework: '+fwDef.label+' — '+fwDef.sub, M, y, {size:9, style:'bold', color:[100,100,180]});
        var statusTxt = (_doc.status||'rascunho').toUpperCase();
        doc.setTextColor(120,120,120);
        doc.text('Status: '+statusTxt, W-M, y, { align:'right' });
        y += 6;

        /* ── Compromisso do gestor ── */
        if(_doc.compromissoGestor && _doc.compromissoGestor.trim()){
          _txt('COMPROMISSO DO GESTOR', M, y, {size:9, style:'bold', color:[200,140,30]});
          y += 4;
          var lns = _wrap(_doc.compromissoGestor.trim(), W-M*2);
          doc.setFontSize(9); doc.setFont(undefined,'normal'); doc.setTextColor(40,40,40);
          doc.text(lns, M, y);
          y += lns.length * 4 + 3;
        }

        /* ── Competências-alvo ── */
        var alvos = _doc.alvos || [];
        if(!alvos.length){
          _txt('(sem competências-alvo definidas)', M, y, {size:9, color:[150,150,150]});
        } else {
          alvos.forEach(function(a, idx){
            var c = COMPS_DEF.find(function(x){return x.key===a.key;}) || {ico:'•', label:a.key};
            if(y > H - 50){ doc.addPage(); y = M; }
            _line(y); y += 4;
            _txt((idx+1)+'. '+c.ico+'  '+c.label, M, y, {size:11, style:'bold', color:[40,40,40]});
            doc.setTextColor(120,120,120); doc.setFontSize(9); doc.setFont(undefined,'normal');
            doc.text('Nível: '+a.atual+' → '+a.alvo+'   |   Status: '+(a.status||'iniciar'), W-M, y, { align:'right' });
            y += 5;

            /* Campos do framework */
            var fwDados = (a.framework_dados && a.framework_dados[_doc.framework||'GROW']) || {};
            (fwDef.campos || []).forEach(function(campo){
              var v = (fwDados[campo.k] || '').trim();
              if(!v) return;  /* pula campos vazios */
              _txt(campo.l+':', M, y, {size:9, style:'bold', color:[100,100,180]});
              y += 3.5;
              var lns = _wrap(v, W-M*2-3);
              doc.setFontSize(9); doc.setFont(undefined,'normal'); doc.setTextColor(40,40,40);
              doc.text(lns, M+3, y);
              y += lns.length * 4 + 2;
              if(y > H - 20){ doc.addPage(); y = M; }
            });

            /* Treinos vinculados */
            if(a.treinos && a.treinos.length){
              _txt('Treinamentos: '+a.treinos.join(' · '), M, y, {size:8, color:[120,120,120]});
              y += 4;
            }

            /* Ações */
            var acoesValidas = (a.acoes||[]).filter(function(x){ return x && x.texto && x.texto.trim(); });
            if(acoesValidas.length){
              _txt('Ações:', M, y, {size:9, style:'bold', color:[40,40,40]});
              y += 4;
              acoesValidas.forEach(function(ac){
                var prefix = ac.feito ? '[x] ' : '[ ] ';
                var lns = _wrap(prefix+ac.texto, W-M*2-3);
                doc.setFontSize(8); doc.setFont(undefined,'normal'); doc.setTextColor(40,40,40);
                doc.text(lns, M+3, y);
                y += lns.length * 3.5;
              });
              y += 2;
            }

            if(a.evidencia && a.evidencia.trim()){
              _txt('Evidências: ', M, y, {size:8, style:'bold', color:[100,100,100]});
              y += 3.5;
              var lns = _wrap(a.evidencia.trim(), W-M*2-3);
              doc.setFontSize(8); doc.setFont(undefined,'italic'); doc.setTextColor(80,80,80);
              doc.text(lns, M+3, y);
              y += lns.length * 3.5 + 2;
              doc.setFont(undefined,'normal');
            }
            y += 3;
          });
        }

        /* ── Check-ins ── */
        if(y > H - 30){ doc.addPage(); y = M; }
        _line(y); y += 5;
        _txt('CHECK-INS PROGRAMADOS (dias úteis)', M, y, {size:9, style:'bold', color:[100,100,180]});
        y += 4;
        var base = _doc.comecou ? new Date(_doc.comecou) : new Date();
        var d30 = window._icAddDiasUteis(base, 30);
        var d60 = window._icAddDiasUteis(base, 60);
        var d90 = window._icAddDiasUteis(base, 90);
        doc.setFontSize(9); doc.setFont(undefined,'normal'); doc.setTextColor(40,40,40);
        doc.text('30 du: '+window._icFmtDataBR(d30)+'   |   60 du: '+window._icFmtDataBR(d60)+'   |   90 du: '+window._icFmtDataBR(d90), M, y);
        y += 5;

        /* ── Assinaturas ── */
        if(y > H - 25){ doc.addPage(); y = M; }
        y = Math.max(y, H - 25);
        _line(y); y += 6;
        doc.setFontSize(8); doc.setFont(undefined,'normal'); doc.setTextColor(100,100,100);
        var col1 = M, col2 = W/2 + 5;
        doc.text('______________________________', col1, y);
        doc.text('______________________________', col2, y);
        y += 3.5;
        doc.text('Consultor: '+_consultorAtivo, col1, y);
        var sess = typeof _getSessao==='function'?_getSessao():null;
        doc.text('Gestor: '+((sess&&sess.nome)||'—'), col2, y);

        var slug = String(_consultorAtivo).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
        var fname = 'pdi-'+slug+'-'+(_doc.periodo||'periodo')+'.pdf';
        doc.save(fname);
        if(typeof _showToast==='function') _showToast('✅ PDF gerado: '+fname,'var(--accent)');
      } catch(e){
        console.error('[pdi] export PDF falhou:', e);
        if(typeof _showToast==='function') _showToast('❌ Erro ao gerar PDF: '+(e.message||e),'var(--red)');
      }
    }).catch(function(){
      if(typeof _showToast==='function') _showToast('❌ jsPDF não carregou.','var(--red)');
    });
  };

})();
