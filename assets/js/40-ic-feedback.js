/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Módulo Feedback (Fase 0 + 3)
   Vive APENAS dentro de #mapeamentoScreen (pane "Desenvolvimento").
   Não toca Gerenciar Turmas nem Pipeline Comercial.

   Firebase paths (isolados / novos):
     icFeedbacks/{consultorKey}/{cicloId}  → { ciclo, data, comps, notaGestor,
                                               notaAuto, acoes[], status,
                                               criadoEm, enviadoEm, lidoEm }
     cicloId = "<ciclo>_<data>" (ex.: "quinzenal_2026-05-26")
     consultorKey = NOME do consultor em UPPER (sem espaços normalizados — mesmo
                    formato usado em pipelineGoals/{mes}/{NOME}).

   Leitura (somente):
     users/                → lista de consultores (perfil='consultor')
     pipelineSales / turmas → contexto (não modificado)
══════════════════════════════════════════════════════════════ */
(function(){

  /* ── Estado ─────────────────────────────────────────── */
  /* 8 competências = 5 clássicas + 3 hard-skill auto-mensuráveis.
     Flag auto=true → sistema calcula sugestão a partir dos dados do mês. */
  var COMPS_DEF = [
    { key:'prosp', label:'Prospecção',                ico:'🎯', auto:true,  desc:'Clientes novos no mês vs média do time.' },
    { key:'qual',  label:'Qualificação',              ico:'🔍', auto:true,  desc:'% de clientes que avançaram (não-aberto).' },
    { key:'apres', label:'Apresentação',              ico:'🎤', auto:false, desc:'Qualidade da apresentação (manual).' },
    { key:'neg',   label:'Negociação',                ico:'🤝', auto:true,  desc:'Conversão final + ticket relativo.' },
    { key:'fup',   label:'Follow-up',                 ico:'📨', auto:true,  desc:'Reflete a saúde da carteira em negociação.' },
    { key:'const', label:'Constância',                ico:'📅', auto:true,  desc:'% meses na meta nos últimos 6 (estimado).' },
    { key:'mix',   label:'Mix de produto',            ico:'🎒', auto:true,  desc:'Diversidade de treinamentos vendidos no mês.' },
    { key:'apr',   label:'Aproveitamento',            ico:'⚡', auto:true,  desc:'% da carteira do consultor convertida em pago.' },
    { key:'vis',   label:'Visão (Oportunidades)',     ico:'🔭', auto:true,  desc:'Combinação: Preservação (não perde) + Potencial (cultiva pipeline > meta) + Recuperação (mantém vivo de turmas antigas).' }
  ];
  var MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  /* doc atual carregado / em edição */
  var _doc = null;             /* { ciclo, data, comps, notaGestor, notaAuto, acoes, status, metricas } */
  var _consultorAtivo = '';    /* string UPPER */
  var _ciclo = 'quinzenal';
  var _historico = [];         /* todos os docs do consultor, mais recente primeiro */
  var _medTime = [6,6,6,6,6,6,6,6,6]; /* fallback (9 comps) */
  var _metricasCache = null;   /* { metricas: {comp: {auto, ...detalhes}}, contexto: {...} } */

  /* ── Helpers de cicloId ───────────────────────────────── */
  function _hoje(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function _cicloId(ciclo, dataYmd){
    return ciclo + '_' + dataYmd;
  }
  function _fmtDataBR(ymd){
    if(!ymd) return '';
    var p = ymd.split('-'); return p[2]+'/'+p[1]+'/'+p[0];
  }
  function _lvClass(v){
    if(v<=2) return 'lv-1';
    if(v<=4) return 'lv-2';
    if(v<=6) return 'lv-3';
    if(v<=8) return 'lv-4';
    return 'lv-5';
  }

  /* ── Tabs do IC: alterna Dashboard ↔ Desenvolvimento ── */
  window._icShowPane = function(pane){
    document.querySelectorAll('#icTabs .ic-tab').forEach(function(t){
      t.classList.toggle('active', t.getAttribute('data-icpane') === pane);
    });
    document.querySelectorAll('#mapeamentoScreen .ic-pane').forEach(function(p){
      p.classList.toggle('show', p.getAttribute('data-icpane') === pane);
    });
    if(pane === 'desenvolvimento') _icFbInit();
  };

  /* ── Init do módulo Feedback ──────────────────────────── */
  var _initDone = false;
  function _icFbInit(){
    _icFbPopularConsultores();
    if(_initDone) return;
    _initDone = true;
    /* Seta data de hoje por default */
    var inp = document.getElementById('fbData');
    if(inp && !inp.value) inp.value = _hoje();
    inp && inp.addEventListener('change', _icFbCarregar);
    var sel = document.getElementById('fbConsultor');
    sel && sel.addEventListener('change', function(){
      _consultorAtivo = sel.value || '';
      _icFbCarregar();
      _icFbCarregarHistorico();
    });
    /* Auto-save leve (rascunho) ao mexer em campos */
    document.getElementById('fbNotaGestor').addEventListener('input', _icFbColetaDoc);
    document.getElementById('fbNotaAuto').addEventListener('input', _icFbColetaDoc);
    _icFbRenderComps();
    _icFbRenderRadar();
  }

  /* Popular o select de consultores. Carrega de window._npUsuarios se já
     existe (Pipeline já abriu); senão lê 'usuarios' direto do Firebase. */
  function _icFbPopularConsultores(){
    var sel = document.getElementById('fbConsultor');
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
      else if(nomes.length === 1){ sel.value = nomes[0]; _consultorAtivo = nomes[0]; _icFbCarregar(); _icFbCarregarHistorico(); }
      else if(_consultorAtivo && nomes.indexOf(_consultorAtivo) >= 0) sel.value = _consultorAtivo;
    }
    /* Cache já populado pelo Pipeline */
    if(window._npUsuarios && Object.keys(window._npUsuarios).length > 0){
      _build(window._npUsuarios); return;
    }
    /* Fallback: lê direto do Firebase */
    if(typeof window._fbGet === 'function'){
      window._fbGet('usuarios').then(function(us){
        window._npUsuarios = us || {};
        _build(window._npUsuarios);
      }).catch(function(){ _build({}); });
    } else {
      _build({});
    }
  }

  /* Troca de ciclo (Semanal/Quinzenal/Mensal) */
  window._fbCiclo = function(c){
    _ciclo = c;
    document.querySelectorAll('.fb-ciclo-tab').forEach(function(t){
      t.classList.toggle('active', t.getAttribute('data-ciclo') === c);
    });
    _atualizarInfoCiclo();
    _icFbCarregar();
  };

  function _atualizarInfoCiclo(){
    var el = document.getElementById('fbCicloInfo');
    if(!el) return;
    var dataYmd = (document.getElementById('fbData')||{}).value || _hoje();
    el.innerHTML = 'Ciclo: <b style="color:var(--accent);">'+_ciclo.charAt(0).toUpperCase()+_ciclo.slice(1)+' — '+_fmtDataBR(dataYmd)+'</b>';
  }

  /* ── Carregar doc do Firebase (ou criar vazio) ──────────── */
  function _icFbCarregar(){
    _atualizarInfoCiclo();
    if(!_consultorAtivo){ _icFbResetDoc(); return; }
    var dataYmd = (document.getElementById('fbData')||{}).value || _hoje();
    var id = _cicloId(_ciclo, dataYmd);
    if(typeof window._fbGet !== 'function'){ _icFbResetDoc(); return; }
    window._fbGet('icFeedbacks/'+_consultorAtivo+'/'+id).then(function(d){
      if(d){
        _doc = d;
        _icFbAplicarDocNaUI();
      } else {
        _icFbResetDoc();
      }
    }).catch(function(){
      _icFbResetDoc();
    });
  }

  function _icFbResetDoc(){
    var dataYmd = (document.getElementById('fbData')||{}).value || _hoje();
    _doc = {
      ciclo: _ciclo,
      data: dataYmd,
      comps: COMPS_DEF.reduce(function(o,c){o[c.key]=6;return o;},{}),
      notaGestor: '',
      notaAuto: '',
      acoes: [],
      status: 'rascunho'
    };
    _icFbAplicarDocNaUI();
  }

  function _icFbAplicarDocNaUI(){
    /* Re-render lista pra refletir mudança no número de competências */
    _icFbRenderComps();
    /* Textareas */
    document.getElementById('fbNotaGestor').value = _doc.notaGestor || '';
    document.getElementById('fbNotaAuto').value   = _doc.notaAuto   || '';
    /* Ações */
    _icFbRenderAcoes(_doc.acoes || []);
    /* Status */
    _icFbAplicarStatusNaUI();
    /* Radar / comparativo */
    _icFbRenderRadar();
    _icFbRenderComparativo();
    /* Disparar cálculo de sugestões com base nos dados reais do mês */
    _icFbAtualizarSugestoes();
  }

  /* ══════════════════════════════════════════════════════════
     CÁLCULO DE MÉTRICAS DO MÊS — base para sugestões automáticas
     Lê (somente) turmas + pipelineSales + pipelineGoals do Firebase
     ════════════════════════════════════════════════════════ */
  function _icFbMesKey(ymd){
    var p = (ymd||_hoje()).split('-'); return p[0]+'-'+p[1];
  }
  function _icFbAddMeses(ymd, delta){
    var p = (ymd||_hoje()).split('-');
    var d = new Date(+p[0], +p[1]-1+delta, 1);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  function _icFbDiasEntre(ymd1, ymd2){
    return Math.round((new Date(ymd2) - new Date(ymd1)) / 86400000);
  }

  /* Achata um conjunto de turmas + vendas avulsas num array uniforme:
     [{consultor, cliente, treinamento, valor, status, entrada, data, src}] */
  /* Decide se o mês alvo está "dentro" de uma turma.
     Inclui: turma cujo periodStart é o mês, OU turma em andamento
     (mês alvo entre periodStart e periodEnd), OU mesMeta = mês alvo.
     Antes só pegava turmas cujo periodStart batia exatamente — vendas
     de turmas longas (ex: BHP Abr→Jun) sumiam no mês de Maio. */
  function _icFbMesNaTurma(mesAlvo, t){
    if(!mesAlvo) return true;
    var ps = (t.periodStart||'').slice(0,7);
    var pe = (t.periodEnd||'').slice(0,7);
    var mm = String(t.mesMeta||'').slice(0,7);
    if(mm && mm === mesAlvo) return true;          /* mesMeta explícito casa */
    if(ps && pe) return mesAlvo >= ps && mesAlvo <= pe;  /* mês dentro do range */
    if(ps && !pe) return ps === mesAlvo;            /* só início → exato */
    if(!ps && pe) return pe === mesAlvo;            /* só fim → exato */
    return true;                                    /* sem info → inclui */
  }
  function _icFbAchatar(turmas, vendasAvulso, mesAlvo){
    var itens = [];
    if(turmas && typeof turmas === 'object'){
      Object.keys(turmas).forEach(function(tid){
        var t = turmas[tid]; if(!t) return;
        if(!_icFbMesNaTurma(mesAlvo, t)) return;
        var nomeTurma = String(t.nome||t.titulo||tid).toUpperCase();
        var cls = t.clientes;
        if(cls && !Array.isArray(cls) && typeof cls === 'object') cls = Object.values(cls).filter(Boolean);
        cls = cls || [];
        cls.forEach(function(c){
          if(!c || !c.cliente) return;
          var consultor = String(c.consultor||'').toUpperCase().trim();
          if(Array.isArray(c.treinamentos) && c.treinamentos.length){
            c.treinamentos.forEach(function(sub){
              if(!sub) return;
              itens.push({
                consultor: consultor,
                cliente: String(c.cliente).toUpperCase(),
                treinamento: String(sub.cod||c.treinamento||'').toUpperCase(),
                valor: +sub.valor||0,
                status: sub.status||c.status||'aberto',
                entrada: +sub.entrada||0,
                data: c.data||t.periodStart||'',
                src: 'turma',
                srcNome: nomeTurma
              });
            });
          } else {
            itens.push({
              consultor: consultor,
              cliente: String(c.cliente).toUpperCase(),
              treinamento: String(c.treinamento||'').toUpperCase(),
              valor: +c.valor||0,
              status: c.status||'aberto',
              entrada: +c.entrada||0,
              data: c.data||t.periodStart||'',
              src: 'turma',
              srcNome: nomeTurma
            });
          }
        });
      });
    }
    if(vendasAvulso && typeof vendasAvulso === 'object'){
      Object.values(vendasAvulso).forEach(function(v){
        if(!v) return;
        itens.push({
          consultor: String(v.consultor||'').toUpperCase().trim(),
          cliente: String(v.cliente||'').toUpperCase(),
          treinamento: String(v.produto||v.treinamento||'').toUpperCase(),
          valor: +v.valor||0,
          status: v.status||'aberto',
          entrada: +v.entrada||0,
          data: v.data||'',
          src: 'avulso',
          srcNome: 'Venda avulsa'
        });
      });
    }
    return itens;
  }

  /* Carrega tudo que é necessário pra calcular: vendas do mês alvo + 6 meses
     anteriores (para Constância) + goals do mês. Retorna Promise. */
  function _icFbLoadDados(dataYmd){
    if(typeof window._fbGet !== 'function') return Promise.resolve(null);
    var mesAlvo = _icFbMesKey(dataYmd);
    /* Em vez de fazer N requests, lê turmas inteira (geralmente cabe) +
       pipelineSales do mês + N pipelineGoals (1 por mês últimos 6). */
    var meses6 = [];
    for(var i=0;i<6;i++) meses6.push(_icFbAddMeses(dataYmd, -i));
    return Promise.all([
      window._fbGet('turmas').catch(function(){return {};}),
      window._fbGet('pipelineSales/'+mesAlvo).catch(function(){return {};}),
      Promise.all(meses6.map(function(mk){
        return window._fbGet('pipelineGoals/'+mk).then(function(g){return {mes:mk,goals:g||{}};}).catch(function(){return {mes:mk,goals:{}};});
      }))
    ]).then(function(res){
      return {
        mesAlvo: mesAlvo,
        turmas: res[0]||{},
        vendasAvulso: res[1]||{},
        goalsHist: res[2]||[]
      };
    });
  }

  /* Calcula métricas do consultor no mês (e da equipe pra comparação) */
  function _icFbCalcular(dados, consultor){
    var nome = String(consultor||'').toUpperCase().trim();
    var itensMes = _icFbAchatar(dados.turmas, dados.vendasAvulso, dados.mesAlvo);
    var meus = itensMes.filter(function(it){return it.consultor === nome;});
    var time = itensMes;
    /* listas de consultores únicos para média */
    var consultoresSet = {};
    time.forEach(function(it){ if(it.consultor) consultoresSet[it.consultor]=true; });
    var nConsultores = Math.max(1, Object.keys(consultoresSet).length);
    /* ── Métricas individuais ── */
    function clientesUnicos(arr){ var s={}; arr.forEach(function(it){s[it.cliente]=true;}); return Object.keys(s).length; }
    var prospMeus = clientesUnicos(meus);
    var prospTime = clientesUnicos(time);
    var prospMedia = prospTime / nConsultores;

    var statusCount = function(arr, st){ return arr.filter(function(it){return (it.status||'')===st;}).length; };
    /* "Não avançou" = aberto + desistiu + status vazio/'-'. Esses clientes
       não saíram do início — pra Qualificação, contam como negativo. */
    var naoAvancouSt = function(s){
      var v = String(s||'').trim().toLowerCase();
      return v === '' || v === '-' || v === 'aberto' || v === 'desistiu';
    };
    var totalMeus = meus.length;
    var pagosMeus = statusCount(meus, 'pago');
    var negocMeus = statusCount(meus, 'negociacao');
    var abertosMeus = meus.filter(function(it){return naoAvancouSt(it.status);}).length;
    var entradaMeus = statusCount(meus, 'entrada');
    var desistiuMeus = statusCount(meus, 'desistiu');
    var semStatusMeus = meus.filter(function(it){var v=String(it.status||'').trim();return v==='' || v==='-';}).length;

    var pagosTime = statusCount(time, 'pago');
    var negocTime = statusCount(time, 'negociacao');
    var entradaTime = statusCount(time, 'entrada');

    /* Qualificação: % avançado / total */
    var qualPct = totalMeus ? (totalMeus - abertosMeus)/totalMeus : null;
    /* Negociação: conversão + ticket */
    var convDenom = pagosMeus + negocMeus + entradaMeus;
    var convMeu = convDenom ? (pagosMeus/convDenom) : null;
    var ticketMeu = pagosMeus ? meus.filter(function(it){return it.status==='pago';}).reduce(function(s,it){return s+(+it.valor||0);},0) / pagosMeus : 0;
    var convDenomTime = pagosTime+negocTime+entradaTime;
    var convTime = convDenomTime ? pagosTime/convDenomTime : null;
    var ticketTime = pagosTime ? time.filter(function(it){return it.status==='pago';}).reduce(function(s,it){return s+(+it.valor||0);},0) / pagosTime : 0;
    /* Follow-up: # negociações sem evolução (proxy: data > 14 dias atrás) */
    var hoje = new Date();
    var negParados = meus.filter(function(it){
      if(it.status !== 'negociacao' || !it.data) return false;
      try { return _icFbDiasEntre(it.data, hoje.toISOString().slice(0,10)) > 14; } catch(e){ return false; }
    }).length;
    /* Constância: % meses na meta (mínima) nos últimos 6 */
    var mesesNaMeta = 0, mesesComMeta = 0;
    dados.goalsHist.forEach(function(gh){
      var g = (gh.goals||{})[nome];
      if(!g) return;
      var meta = +(g.metaMinima||g.metaBasica||g.metaValor||0);
      if(meta <= 0) return;
      mesesComMeta++;
      /* Pago no mês: lê turmas + avulso do mês — aproximação usando só o mês alvo se for o atual.
         Para os outros 5 meses não fazemos request extra (custo); usa goals.realizado se existir. */
      var realizado = +(g.realizado||0);
      if(gh.mes === dados.mesAlvo){
        realizado = meus.filter(function(it){return it.status==='pago';}).reduce(function(s,it){return s+(+it.valor||0);},0);
      }
      if(realizado >= meta) mesesNaMeta++;
    });
    /* Mix: treinamentos distintos vendidos no mês (em pago) */
    var trDistintos = {};
    meus.filter(function(it){return it.status==='pago';}).forEach(function(it){
      if(it.treinamento) trDistintos[it.treinamento]=true;
    });
    var nTrDistintos = Object.keys(trDistintos).length;
    /* Aproveitamento: pagos / total clientes do consultor */
    var apvPct = totalMeus ? pagosMeus/totalMeus : null;

    /* ── Conversão das métricas em score 1-10 ── */
    function clamp(n){ return Math.max(1, Math.min(10, n)); }
    function pctScore(p){ if(p==null) return null; return clamp(Math.round(p*10)); }
    /* Prospecção: meu/média * 6, cap 10 */
    var prospScore = prospMedia > 0 ? clamp(Math.round(prospMeus / prospMedia * 6)) : (prospMeus > 0 ? 6 : 1);
    var qualScore = pctScore(qualPct);
    /* Negociação: 70% conversão + 30% ticket relativo */
    var negScore = null;
    if(convMeu != null){
      var conv01 = convMeu;
      var ticketRel = ticketTime > 0 ? ticketMeu/ticketTime : 1;
      var blend = 0.7*conv01 + 0.3*Math.min(1.5, ticketRel)/1.5;
      negScore = clamp(Math.round(blend*10));
    }
    /* Follow-up: 10 se 0 parados; -2 por parado; mínimo 1 */
    var fupScore = clamp(10 - negParados*2);
    /* Constância: pct meses na meta */
    var constScore = mesesComMeta > 0 ? clamp(Math.round((mesesNaMeta/mesesComMeta)*10)) : null;
    /* Mix: 0=1, 1=4, 2=6, 3=7, 4=8, 5+=9, 7+=10 */
    var mixScore = null;
    if(meus.filter(function(it){return it.status==='pago';}).length > 0){
      if(nTrDistintos >= 7) mixScore = 10;
      else if(nTrDistintos >= 5) mixScore = 9;
      else if(nTrDistintos >= 4) mixScore = 8;
      else if(nTrDistintos >= 3) mixScore = 7;
      else if(nTrDistintos >= 2) mixScore = 6;
      else if(nTrDistintos >= 1) mixScore = 4;
      else mixScore = 1;
    }
    /* Aproveitamento */
    var aprScore = pctScore(apvPct);

    /* ── Visão (Gestão de Oportunidades) — combinada A+B+C ─────────────
       Preservação (B) → 40%: 1 - (desistiu+semStatus)/total
       Potencial    (C) → 40%: min(1, (R$_negoc + R$_entrada) / meta_basica)
       Recuperação  (A) → 20%: clientes vivos vindos de turmas anteriores
                                ÷ total clientes de turmas anteriores
       Score final = média ponderada × 10 */
    /* B · Preservação */
    var perdidos = desistiuMeus + semStatusMeus;
    var preserv = totalMeus > 0 ? (1 - perdidos/totalMeus) : null;
    /* C · Potencial — meta básica do consultor no mês */
    var metaBas = 0;
    if(dados.goalsHist && dados.goalsHist.length){
      var mesAtual = dados.goalsHist.filter(function(g){return g.mes===dados.mesAlvo;})[0];
      if(mesAtual && mesAtual.goals && mesAtual.goals[nome]){
        var gn = mesAtual.goals[nome];
        metaBas = +(gn.metaBasica||gn.metaValor||0);
      }
    }
    var rNeg = meus.filter(function(it){return it.status==='negociacao';}).reduce(function(s,it){return s+(+it.valor||0);},0);
    var rEnt = meus.filter(function(it){return it.status==='entrada';}).reduce(function(s,it){return s+(+it.valor||0);},0);
    var rPag = meus.filter(function(it){return it.status==='pago';}).reduce(function(s,it){return s+(+it.valor||0);},0);
    /* Cobertura = (pago + negociação + entrada) ÷ meta básica */
    var cobertura = metaBas > 0 ? (rPag + rNeg + rEnt) / metaBas : null;
    var potencial = cobertura != null ? Math.min(1.5, cobertura) / 1.5 : null;
    /* A · Recuperação — proxy: clientes "vivos" (negoc/entrada/pago) vindos
       de turmas cujo periodStart é ANTERIOR ao mês alvo.
       O usuário pode ajustar até quantos meses retroceder via _icFbVisRetroMeses
       (default 0 = todas as turmas anteriores). Coletamos a LISTA detalhada
       para o drill-down explicar de onde veio cada um. */
    var retroMeses = +(window._icFbVisRetroMeses || 0); /* 0 = ilimitado */
    var cutoff = null;
    if(retroMeses > 0) cutoff = _icFbAddMeses(dados.mesAlvo, -retroMeses);
    var clienAntigos = 0, clienAntigosVivos = 0;
    var recuperacaoList = []; /* {cliente, status, srcNome, turmaPeriodStart, ...} */
    if(dados.turmas){
      Object.keys(dados.turmas).forEach(function(tid){
        var t = dados.turmas[tid];
        if(!t) return;
        var ps = (t.periodStart||'').slice(0,7);
        if(!ps || ps >= dados.mesAlvo) return; /* só turmas anteriores */
        if(cutoff && ps < cutoff) return;       /* respeita cutoff retroativo */
        var nomeTurma = String(t.nome||t.titulo||tid).toUpperCase();
        var cls = t.clientes;
        if(cls && !Array.isArray(cls) && typeof cls === 'object') cls = Object.values(cls).filter(Boolean);
        cls = cls || [];
        cls.forEach(function(c){
          if(!c || !c.cliente) return;
          var consultC = String(c.consultor||'').toUpperCase().trim();
          if(consultC !== nome) return;
          /* status efetivo: se tem subs, pega o mais avançado */
          var status = c.status || 'aberto';
          var trein = c.treinamento || '';
          var valor = +c.valor || 0;
          if(Array.isArray(c.treinamentos) && c.treinamentos.length){
            var ord = {aberto:0, negociacao:1, entrada:2, pago:3, desistiu:-1};
            c.treinamentos.forEach(function(s){
              var sst = (s && s.status) || c.status || 'aberto';
              if((ord[sst]||0) > (ord[status]||0)){ status = sst; if(s && s.cod) trein = s.cod; if(s && s.valor) valor = +s.valor; }
            });
          }
          clienAntigos++;
          var vivo = status === 'negociacao' || status === 'entrada' || status === 'pago';
          if(vivo) clienAntigosVivos++;
          recuperacaoList.push({
            cliente: String(c.cliente).toUpperCase(),
            treinamento: String(trein||'').toUpperCase(),
            status: status,
            valor: valor,
            srcNome: nomeTurma,
            turmaInicio: ps,
            vivo: vivo
          });
        });
      });
    }
    var recup = clienAntigos > 0 ? clienAntigosVivos/clienAntigos : null;

    /* Score combinado: média ponderada dos 3 componentes (nulls ignorados) */
    var visScore = null;
    var soma = 0, pesoTot = 0;
    if(preserv != null){ soma += preserv * 0.4; pesoTot += 0.4; }
    if(potencial != null){ soma += potencial * 0.4; pesoTot += 0.4; }
    if(recup != null){ soma += recup * 0.2; pesoTot += 0.2; }
    if(pesoTot > 0) visScore = clamp(Math.round((soma/pesoTot) * 10));

    /* Para drill-down: lista de negociações paradas com info de data */
    var paradasItens = meus.filter(function(it){
      if(it.status !== 'negociacao' || !it.data) return false;
      try { return _icFbDiasEntre(it.data, hoje.toISOString().slice(0,10)) > 14; } catch(e){ return false; }
    });
    /* Para Constância: mês a mês */
    var constHist = dados.goalsHist.map(function(gh){
      var g = (gh.goals||{})[nome] || null;
      var meta = g ? +(g.metaMinima||g.metaBasica||g.metaValor||0) : 0;
      var realizado = +((g||{}).realizado||0);
      if(gh.mes === dados.mesAlvo){
        realizado = meus.filter(function(it){return it.status==='pago';}).reduce(function(s,it){return s+(+it.valor||0);},0);
      }
      return { mes: gh.mes, meta: meta, realizado: realizado, batido: meta > 0 && realizado >= meta };
    });

    return {
      mes: dados.mesAlvo,
      metricas: {
        prosp: { auto: prospScore, meu: prospMeus, media: +(prospMedia.toFixed(1)) },
        qual:  { auto: qualScore,  pago: pagosMeus, negoc: negocMeus, aberto: abertosMeus, total: totalMeus, pct: qualPct, desistiu: desistiuMeus, semStatus: semStatusMeus },
        apres: { auto: null }, /* manual */
        neg:   { auto: negScore,   convMeu: convMeu, convTime: convTime, ticketMeu: ticketMeu, ticketTime: ticketTime, pagos: pagosMeus, negoc: negocMeus, entrada: entradaMeus },
        fup:   { auto: fupScore,   parados: negParados, totalNeg: negocMeus },
        const: { auto: constScore, batidos: mesesNaMeta, totalComMeta: mesesComMeta },
        mix:   { auto: mixScore,   distintos: nTrDistintos, pagos: pagosMeus, treinList: Object.keys(trDistintos) },
        apr:   { auto: aprScore,   pagos: pagosMeus, total: totalMeus, pct: apvPct },
        vis:   { auto: visScore,
                 preserv: preserv, perdidos: perdidos,
                 potencial: potencial, cobertura: cobertura, metaBas: metaBas,
                 rPag: rPag, rNeg: rNeg, rEnt: rEnt,
                 recup: recup, clienAntigos: clienAntigos, clienAntigosVivos: clienAntigosVivos,
                 retroMeses: retroMeses, cutoff: cutoff,
                 recuperacaoList: recuperacaoList }
      },
      contexto: {
        consultor: nome,
        totalConsultoresAtivos: nConsultores,
        prospTime: prospTime,
        pagosTime: pagosTime,
        clientesParados: negParados
      },
      itens: meus,             /* todos os itens do consultor no mês alvo */
      paradasItens: paradasItens,
      constHist: constHist
    };
  }

  /* Atalho público: calcular e popular sugestões */
  function _icFbAtualizarSugestoes(){
    if(!_consultorAtivo){ return; }
    var dataYmd = (document.getElementById('fbData')||{}).value || _hoje();
    _icFbLoadDados(dataYmd).then(function(dados){
      if(!dados) return;
      _metricasCache = _icFbCalcular(dados, _consultorAtivo);
      _icFbRenderSugestoes();
      _icFbGerarPlanoSugestoes();
    });
  }
  function _icFbRenderSugestoes(){
    if(!_metricasCache) return;
    var m = _metricasCache.metricas;
    COMPS_DEF.forEach(function(c, i){
      var slot = document.getElementById('fbSug'+i);
      if(!slot) return;
      var dado = m[c.key];
      var detBtn = '<button class="fb-comp-info" onclick="_fbDetAbrir(\''+c.key+'\')" title="Ver os dados que originaram este score">🔍 Detalhes</button>';
      if(!c.auto || !dado || dado.auto == null){
        slot.innerHTML = (c.auto
          ? '<span style="font-size:9px;color:var(--muted);">sem dado</span>'
          : '<span style="font-size:9px;color:var(--muted);">qualitativa</span>') + detBtn;
        return;
      }
      var exp = (_icFbDetalheExplicacao(c.key, dado)||'').replace(/"/g,'&quot;');
      slot.innerHTML = '<button class="fb-sug" data-tip="'+exp+'" onclick="_fbAceitarSug(\''+c.key+'\','+dado.auto+')">💡 '+dado.auto+'</button>' + detBtn;
    });
    /* Botão "Aplicar todas" no header da seção */
    var btn = document.getElementById('fbSugAll');
    if(btn){
      btn.style.display = '';
      btn.onclick = function(){
        COMPS_DEF.forEach(function(c){
          var dado = m[c.key];
          if(c.auto && dado && dado.auto != null){
            window._fbAceitarSug(c.key, dado.auto);
          }
        });
      };
    }
    /* Sincroniza as tags auto/manual após calcular as sugestões */
    _icFbSyncTagsAutoManual();
  }
  function _icFbDetalheCurto(key, d){
    if(key==='prosp') return d.meu+' clientes novos · média do time '+d.media;
    if(key==='qual'){ var p = d.pct!=null?Math.round(d.pct*100)+'%':'—'; return p+' avançaram ('+(d.total-d.aberto)+'/'+d.total+')'; }
    if(key==='neg'){ var c = d.convMeu!=null?Math.round(d.convMeu*100)+'%':'—'; var t = d.ticketMeu?Math.round(d.ticketMeu).toLocaleString('pt-BR'):'—'; return 'conversão '+c+' · ticket R$ '+t; }
    if(key==='fup') return d.parados+' negociações paradas > 14 dias';
    if(key==='const') return d.batidos+'/'+d.totalComMeta+' meses na meta';
    if(key==='mix') return d.distintos+' treinamentos distintos vendidos';
    if(key==='apr'){ var p2 = d.pct!=null?Math.round(d.pct*100)+'%':'—'; return p2+' da carteira convertida'; }
    return '';
  }
  /* Explicação detalhada da sugestão — usada no tooltip ao passar mouse */
  function _icFbDetalheExplicacao(key, d){
    if(!d || d.auto == null) return 'Sem dado suficiente para sugerir um score.';
    var cab = '💡 Como o '+d.auto+'/10 foi calculado:\n\n';
    if(key==='prosp'){
      var ratio = d.media > 0 ? (d.meu / d.media).toFixed(2) : '—';
      return cab
        + '• Clientes novos no mês: '+d.meu+'\n'
        + '• Média do time: '+d.media+'\n'
        + '• Razão (meu/time): '+ratio+'\n'
        + '• Score = round(razão × 6), capado em 1–10\n\n'
        + 'Interpretação: '+(d.auto>=8?'acima da média do time':d.auto>=6?'na média':'abaixo da média — atenção');
    }
    if(key==='qual'){
      var pct = d.pct!=null ? (d.pct*100).toFixed(0)+'%' : '—';
      var det = '';
      if(d.desistiu) det += '   — destes, '+d.desistiu+' "desistiu"\n';
      if(d.semStatus) det += '   — destes, '+d.semStatus+' sem status definido ("-")\n';
      return cab
        + '• Total clientes do consultor: '+d.total+'\n'
        + '• Não avançaram (aberto + desistiu + "-"): '+d.aberto+'\n'
        + det
        + '• Avançaram (negoc/entrada/pago): '+(d.total-d.aberto)+' ('+pct+')\n'
        + '• Score = round(% avançado × 10)\n\n'
        + 'Sinal: '+(d.auto>=8?'qualifica bem, carteira viva':d.auto>=6?'qualifica médio':'carteira está parada — risco de leads esquecidos');
    }
    if(key==='neg'){
      var conv = d.convMeu!=null ? (d.convMeu*100).toFixed(0)+'%' : '—';
      var convT = d.convTime!=null ? (d.convTime*100).toFixed(0)+'%' : '—';
      var tk = d.ticketMeu ? 'R$ '+Math.round(d.ticketMeu).toLocaleString('pt-BR') : '—';
      var tkT = d.ticketTime ? 'R$ '+Math.round(d.ticketTime).toLocaleString('pt-BR') : '—';
      var ratio = d.ticketTime > 0 ? (d.ticketMeu/d.ticketTime).toFixed(2) : '—';
      return cab
        + '• Conversão final: '+conv+' (time: '+convT+')\n'
        + '  fórmula: pagos ÷ (pagos+negoc+entrada)\n'
        + '• Ticket médio: '+tk+' (time: '+tkT+')\n'
        + '• Ticket relativo: '+ratio+'×\n'
        + '• Score = 70% conversão + 30% ticket relativo\n\n'
        + 'Sinal: '+(d.auto>=8?'fecha bem e mantém ticket':d.auto>=6?'fecha médio':'gargalo no fechamento ou descontos demais');
    }
    if(key==='fup'){
      return cab
        + '• Negociações ativas: '+d.totalNeg+'\n'
        + '• Paradas há > 14 dias: '+d.parados+'\n'
        + '• Score = 10 − (2 × paradas), mínimo 1\n\n'
        + 'Sinal: '+(d.auto>=8?'cadência saudável':d.auto>=6?'algumas perdas':'cliente esfriando — risco real');
    }
    if(key==='const'){
      var p = d.totalComMeta>0 ? Math.round(d.batidos/d.totalComMeta*100)+'%' : '—';
      return cab
        + '• Meses com meta configurada: '+d.totalComMeta+'\n'
        + '• Meses na meta (≥ Mínima): '+d.batidos+'\n'
        + '• Constância: '+p+'\n'
        + '• Score = ('+d.batidos+'/'+d.totalComMeta+') × 10\n\n'
        + 'Sinal: '+(d.auto>=8?'rocha — previsível':d.auto>=6?'consistente':'oscila — depende de fatores externos');
    }
    if(key==='mix'){
      return cab
        + '• Pagos no mês: '+d.pagos+'\n'
        + '• Treinamentos distintos: '+d.distintos+'\n'
        + '• Curva: 1=4 · 2=6 · 3=7 · 4=8 · 5=9 · 7+=10\n\n'
        + 'Sinal: '+(d.auto>=8?'vende portfólio amplo':d.auto>=6?'mix médio':'concentrado em poucos produtos — risco e perda de upsell');
    }
    if(key==='apr'){
      var pp = d.pct!=null ? (d.pct*100).toFixed(0)+'%' : '—';
      return cab
        + '• Pagos: '+d.pagos+'\n'
        + '• Total da carteira: '+d.total+'\n'
        + '• Aproveitamento: '+pp+'\n'
        + '• Score = round(% × 10)\n\n'
        + 'Sinal: '+(d.auto>=8?'extrai bem do que tem':d.auto>=6?'aproveita médio':'lead desperdiçado — CAC sobe');
    }
    if(key==='vis'){
      var pres = d.preserv!=null ? (d.preserv*100).toFixed(0)+'%' : '—';
      var pot  = d.cobertura!=null ? (d.cobertura*100).toFixed(0)+'%' : '—';
      var rec  = d.recup!=null ? (d.recup*100).toFixed(0)+'%' : '—';
      return cab
        + 'Combinação ponderada de 3 sinais:\n\n'
        + '🛡 Preservação (40%): '+pres+'\n'
        + '   1 − (desistiu + sem-status) ÷ total\n'
        + '   = quanto NÃO perde\n\n'
        + '🔭 Potencial / Cobertura (40%): '+pot+'\n'
        + '   (R$ pago + negoc + entrada) ÷ meta básica\n'
        + '   = quanto pipeline cultivado vs meta\n\n'
        + '♻ Recuperação (20%): '+rec+'\n'
        + '   clientes vivos vindos de turmas anteriores\n'
        + '   ÷ total clientes dessas turmas\n'
        + '   = capacidade de manter oportunidade fria\n\n'
        + 'Sinal: '+(d.auto>=8?'visão estratégica — cultiva, preserva e recupera':d.auto>=6?'visão média':'oportunidades evaporando');
    }
    return '';
  }
  window._fbAceitarSug = function(compKey, valor){
    if(!_doc) return;
    _doc.comps = _doc.comps || {};
    _doc.comps[compKey] = valor;
    /* Atualizar slider + display */
    var idx = COMPS_DEF.findIndex(function(c){return c.key===compKey;});
    var inp = document.querySelector('input[data-comp="'+compKey+'"]');
    if(inp) inp.value = valor;
    var el = document.getElementById('fbCv'+idx);
    if(el){ el.textContent = valor; el.className = 'fb-comp-val '+_lvClass(valor); }
    /* Aplicou sugestão → tag volta para "auto" */
    var tag = document.getElementById('fbTag'+idx);
    if(tag){ tag.className = 'fb-comp-tag'; tag.textContent = 'auto'; }
    _icFbRenderRadar();
    _icFbRenderComparativo();
  };

  /* Gera 3-5 sugestões de plano de ação com base nas métricas */
  function _icFbGerarPlanoSugestoes(){
    if(!_metricasCache) return;
    var m = _metricasCache.metricas;
    var ctx = _metricasCache.contexto;
    var sugs = [];
    /* Pior competência auto */
    var pior = null, piorScore = 99;
    COMPS_DEF.forEach(function(c){
      var d = m[c.key];
      if(c.auto && d && d.auto != null && d.auto < piorScore){
        piorScore = d.auto; pior = c;
      }
    });
    if(pior && piorScore <= 6){
      sugs.push({
        chave: 'foco-'+pior.key,
        texto: 'Foco em '+pior.label+': '+_icFbDetalheCurto(pior.key, m[pior.key])+' — abaixo da expectativa.',
        motivo: '🎯 Por que esta sugestão?\n\n'
              + 'Esta foi a competência com o MENOR score do ciclo ('+piorScore+'/10).\n\n'
              + 'É aqui que o desenvolvimento individual tem maior potencial — atacar o ponto mais fraco rende mais que afinar o que já está bom. '
              + 'O playbook orienta priorizar 1 frente de cada vez no PDI.'
      });
    }
    /* Mix de produto baixo */
    if(m.mix && m.mix.auto != null && m.mix.distintos <= 2 && m.mix.pagos > 0){
      sugs.push({
        chave: 'mix',
        texto: 'Diversificar carteira: vendeu só '+m.mix.distintos+' produto'+(m.mix.distintos!==1?'s':'')+'. Meta: 1 fechamento de outro treinamento no próximo ciclo.',
        motivo: '🎒 Por que esta sugestão?\n\n'
              + 'No mês corrente o consultor vendeu apenas '+m.mix.distintos+' treinamento'+(m.mix.distintos!==1?'s':'')+' distinto'+(m.mix.distintos!==1?'s':'')+' (de 15 disponíveis no portfólio).\n\n'
              + 'Concentração em poucos produtos gera 2 riscos: '
              + '(1) se o produto principal sai do mercado/promoção, o faturamento despenca; '
              + '(2) perde oportunidade de upsell em cada cliente já fechado. '
              + 'Closer multi-produto vale 2× no longo prazo.'
      });
    }
    /* Negociações paradas */
    if(m.fup && m.fup.parados >= 2){
      sugs.push({
        chave: 'parados',
        texto: 'Resgatar '+m.fup.parados+' negociações paradas há mais de 14 dias — agendar follow-up estruturado esta semana.',
        motivo: '📨 Por que esta sugestão?\n\n'
              + 'Detectamos '+m.fup.parados+' negociações sem update há mais de 14 dias.\n\n'
              + 'Estudos comerciais clássicos mostram que a chance de fechar uma negociação cai ~5% a cada dia parado a partir do D+7. '
              + 'No D+14 a temperatura já está em ~50% do ideal. '
              + 'Recuperar agora é mais barato que prospectar um novo lead pra repor.'
      });
    }
    /* Aproveitamento baixo */
    if(m.apr && m.apr.auto != null && m.apr.pct != null && m.apr.pct < 0.30 && m.apr.total >= 3){
      sugs.push({
        chave: 'aprov',
        texto: 'Aproveitamento da carteira em '+Math.round(m.apr.pct*100)+'% — revisar qualificação inicial e tempo de resposta a lead.',
        motivo: '⚡ Por que esta sugestão?\n\n'
              + 'O consultor pagou '+m.apr.pagos+' de '+m.apr.total+' clientes na carteira ('+Math.round(m.apr.pct*100)+'%).\n\n'
              + 'Aproveitamento abaixo de 30% costuma indicar 2 causas:\n'
              + '(1) qualificação rasa — leads errados entram e travam o funil;\n'
              + '(2) tempo de resposta longo — lead esfria antes do 1º contato real.\n\n'
              + 'Corrigir aqui aumenta o ROI sobre a base já paga de prospecção.'
      });
    }
    /* Conversão baixa em negociação */
    if(m.neg && m.neg.convMeu != null && m.neg.convTime != null && m.neg.convMeu < m.neg.convTime * 0.7){
      sugs.push({
        chave: 'conv',
        texto: 'Conversão final ('+Math.round(m.neg.convMeu*100)+'%) bem abaixo do time ('+Math.round(m.neg.convTime*100)+'%) — role-play de fechamento + revisar quebra de objeções.',
        motivo: '🤝 Por que esta sugestão?\n\n'
              + 'A conversão deste consultor ('+Math.round(m.neg.convMeu*100)+'%) está abaixo de 70% da média do time ('+Math.round(m.neg.convTime*100)+'%).\n\n'
              + 'Gap dessa magnitude raramente é "azar do mês" — geralmente revela gargalo específico em fechamento: '
              + 'medo de pedir o sim, dificuldade em quebrar objeção de preço/tempo, ou pitch que apresenta bem mas não conclui. '
              + 'Role-play estruturado das top 5 objeções costuma resolver em 2–3 sessões.'
      });
    }
    /* Constância */
    if(m.const && m.const.auto != null && m.const.auto <= 5){
      sugs.push({
        chave: 'const',
        texto: 'Constância: '+m.const.batidos+'/'+m.const.totalComMeta+' meses na meta — sustentar ritmo, não só explosões. Desdobrar meta semanal.',
        motivo: '📅 Por que esta sugestão?\n\n'
              + 'Bateu meta em '+m.const.batidos+' dos '+m.const.totalComMeta+' meses analisados — performance irregular.\n\n'
              + 'Consultor que oscila tem 3 problemas ocultos: '
              + '(1) dificulta planejamento da operação (forecast vira chute); '
              + '(2) costuma depender de fatores externos (turma boa, lead farto); '
              + '(3) sofre mais emocionalmente nos meses ruins.\n\n'
              + 'Desdobrar meta mensal em semanal cria visibilidade contínua e reduz o "explode-vai" → "explode-vai".'
      });
    }
    /* Render no container */
    var box = document.getElementById('fbSugPlano');
    if(!box) return;
    if(!sugs.length){
      box.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:8px;text-align:center;">✅ Nenhum gargalo crítico identificado no mês corrente.</div>';
      return;
    }
    box.innerHTML = sugs.map(function(s){
      var motivoEsc = (s.motivo||'').replace(/"/g,'&quot;');
      var textoEsc  = s.texto.replace(/'/g,"\\'");
      return '<div class="fb-sug-acao" data-chave="'+s.chave+'">'
        + '<div class="fb-sug-acao-txt"><span class="fb-sug-acao-lamp" data-tip="'+motivoEsc+'">💡</span>'+s.texto+'</div>'
        + '<div class="fb-sug-acao-btns">'
        +   '<button class="fb-sug-btn aceitar" onclick="_fbAceitarSugAcao(\''+s.chave+'\',\''+textoEsc+'\')">✓ Aceitar</button>'
        +   '<button class="fb-sug-btn ignorar" onclick="this.closest(\'.fb-sug-acao\').remove()">× Ignorar</button>'
        + '</div>'
        + '</div>';
    }).join('');
  }
  window._fbAceitarSugAcao = function(chave, texto){
    if(!_doc) _icFbResetDoc();
    _doc.acoes = _doc.acoes || [];
    _doc.acoes.push({ feito:false, texto:texto, origem:chave });
    _icFbRenderAcoes(_doc.acoes);
    /* remove o card da sugestão */
    var card = document.querySelector('.fb-sug-acao[data-chave="'+chave+'"]');
    if(card) card.remove();
  };

  /* ── Render do bloco de competências (sliders + slot de sugestão) ──── */
  function _icFbRenderComps(){
    var html = COMPS_DEF.map(function(c,i){
      var v = (_doc && _doc.comps && _doc.comps[c.key]) || 6;
      /* Tag inicial: para comps auto, será "auto" se valor == sugestão (ou ainda
         não houver sugestão); fica "manual" quando user edita o slider OU quando
         valor diverge da sugestão calculada. Para comps não-auto: sempre manual. */
      return '<div class="fb-comp">'
        + '<div class="fb-comp-label">'
        +   '<span class="ico">'+c.ico+'</span>'+c.label
        +   '<span class="fb-comp-tag '+(c.auto?'':'manual')+'" id="fbTag'+i+'" title="'+(c.desc||'')+'">'+(c.auto?'auto':'manual')+'</span>'
        + '</div>'
        + '<div class="fb-comp-slider">'
        +   '<input type="range" min="1" max="10" step="1" value="'+v+'" data-idx="'+i+'" data-comp="'+c.key+'">'
        +   '<div class="fb-comp-scale"><span>1</span><span>3</span><span>5</span><span>7</span><span>10</span></div>'
        + '</div>'
        + '<div class="fb-comp-val '+_lvClass(v)+'" id="fbCv'+i+'">'+v+'</div>'
        + '<div class="fb-sug-slot" id="fbSug'+i+'">'
        +   '<button class="fb-comp-info" onclick="_fbDetAbrir(\''+c.key+'\')" title="Ver os dados que originaram este score">🔍 Detalhes</button>'
        + '</div>'
        + '</div>';
    }).join('');
    var list = document.getElementById('fbCompList');
    if(!list) return;
    list.innerHTML = html;
    document.querySelectorAll('#fbCompList input[type=range]').forEach(function(inp){
      inp.addEventListener('input', function(){
        var i = +inp.getAttribute('data-idx');
        var k = inp.getAttribute('data-comp');
        var v = +inp.value;
        if(_doc && _doc.comps) _doc.comps[k] = v;
        var el = document.getElementById('fbCv'+i);
        if(el){ el.textContent = v; el.className = 'fb-comp-val '+_lvClass(v); }
        /* Marca como "manual" — o gestor mexeu */
        var tag = document.getElementById('fbTag'+i);
        if(tag){ tag.className = 'fb-comp-tag manual'; tag.textContent = 'manual'; }
        _icFbRenderRadar();
        _icFbRenderComparativo();
      });
    });
    /* Se temos métricas em cache, re-renderiza os slots */
    if(_metricasCache) _icFbRenderSugestoes();
  }

  /* Sincroniza a tag "auto/manual" com base no valor atual vs sugestão.
     Chamado depois de aplicar sugestão (clique em 💡 ou "Aplicar todas") e
     também após carregar documento existente. */
  function _icFbSyncTagsAutoManual(){
    if(!_doc || !_doc.comps) return;
    var m = _metricasCache && _metricasCache.metricas;
    COMPS_DEF.forEach(function(c, i){
      var tag = document.getElementById('fbTag'+i);
      if(!tag) return;
      if(!c.auto){ tag.className = 'fb-comp-tag manual'; tag.textContent = 'manual'; return; }
      var atual = _doc.comps[c.key];
      var sug   = m && m[c.key] && m[c.key].auto;
      /* Se valor atual = sugestão automática, tag = auto. Caso contrário, manual. */
      var isAuto = (sug != null && atual === sug);
      tag.className = 'fb-comp-tag '+(isAuto?'':'manual');
      tag.textContent = isAuto ? 'auto' : 'manual';
    });
  }

  /* ── Ações (plano para o próximo ciclo) ─────────────────── */
  function _icFbRenderAcoes(acoes){
    var box = document.getElementById('fbAcoesList');
    if(!box) return;
    /* Remove rows existentes (mantém o botão Add) */
    box.querySelectorAll('.fb-acao').forEach(function(r){r.remove();});
    var add = box.querySelector('.fb-acao-add');
    acoes.forEach(function(a, idx){
      var row = document.createElement('div');
      row.className = 'fb-acao';
      row.innerHTML = '<input type="checkbox" '+(a.feito?'checked':'')+' data-acao-idx="'+idx+'">'
        + '<input type="text" value="'+_escAttr(a.texto||'')+'" data-acao-idx="'+idx+'" placeholder="Descrição da ação...">'
        + '<button class="rm" data-acao-rm="'+idx+'" title="Remover">×</button>';
      box.insertBefore(row, add);
    });
    box.querySelectorAll('[data-acao-idx]').forEach(function(inp){
      inp.addEventListener('input', _icFbColetaDoc);
      inp.addEventListener('change', _icFbColetaDoc);
    });
    box.querySelectorAll('[data-acao-rm]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var i = +btn.getAttribute('data-acao-rm');
        _doc.acoes.splice(i,1);
        _icFbRenderAcoes(_doc.acoes);
      });
    });
  }
  window._fbAddAcao = function(){
    if(!_doc) _icFbResetDoc();
    _doc.acoes = _doc.acoes || [];
    _doc.acoes.push({ feito:false, texto:'' });
    _icFbRenderAcoes(_doc.acoes);
    /* focus no novo input */
    var inputs = document.querySelectorAll('#fbAcoesList input[type=text]');
    var last = inputs[inputs.length-1];
    if(last) last.focus();
  };
  function _escAttr(s){ return String(s||'').replace(/"/g,'&quot;'); }

  /* Coleta valores da UI → _doc (chamado em input changes) */
  function _icFbColetaDoc(){
    if(!_doc) return;
    _doc.notaGestor = (document.getElementById('fbNotaGestor')||{}).value || '';
    _doc.notaAuto   = (document.getElementById('fbNotaAuto')||{}).value   || '';
    _doc.acoes = [];
    document.querySelectorAll('#fbAcoesList .fb-acao').forEach(function(row){
      var chk = row.querySelector('input[type=checkbox]');
      var txt = row.querySelector('input[type=text]');
      _doc.acoes.push({ feito: !!(chk && chk.checked), texto: txt ? txt.value : '' });
    });
  }

  /* ── Status na UI ──────────────────────────────────────── */
  function _icFbAplicarStatusNaUI(){
    var dot = document.getElementById('fbStatusDot');
    var txt = document.getElementById('fbStatusTxt');
    var meta = document.getElementById('fbStatusMeta');
    if(!dot||!txt) return;
    dot.className = 'fb-status-dot';
    var s = (_doc && _doc.status) || 'rascunho';
    txt.textContent = s.charAt(0).toUpperCase()+s.slice(1);
    if(s === 'enviado'){ dot.classList.add('enviado'); }
    else if(s === 'respondido'){ dot.classList.add('respondido'); }
    if(meta){
      if(_doc && _doc.enviadoEm) meta.textContent = '· enviado em '+_fmtDataBR(_doc.enviadoEm);
      else meta.textContent = '';
    }
  }

  /* ── Salvar / Enviar ────────────────────────────────────── */
  window._fbSalvarRascunho = function(){
    if(!_consultorAtivo){ if(typeof _showToast==='function') _showToast('⚠️ Selecione um consultor.','var(--amber)'); return; }
    _icFbColetaDoc();
    _doc.status = 'rascunho';
    _doc.atualizadoEm = _hoje();
    _icFbPersistir(true);
  };
  window._fbEnviarConsultor = function(){
    if(!_consultorAtivo){ if(typeof _showToast==='function') _showToast('⚠️ Selecione um consultor.','var(--amber)'); return; }
    _icFbColetaDoc();
    _doc.status = 'enviado';
    _doc.enviadoEm = _hoje();
    _doc.atualizadoEm = _hoje();
    _icFbPersistir(true);
  };
  function _icFbPersistir(showToast){
    var id = _cicloId(_ciclo, _doc.data);
    if(typeof window._fbSave !== 'function'){
      if(typeof _showToast==='function') _showToast('❌ Firebase indisponível.','var(--red)');
      return;
    }
    /* Snapshot das métricas que originaram o ciclo (audit trail) */
    if(_metricasCache){
      _doc.metricas = _metricasCache.metricas;
      _doc.contexto = _metricasCache.contexto;
    }
    window._fbSave('icFeedbacks/'+_consultorAtivo+'/'+id, _doc).then(function(){
      if(showToast && typeof _showToast==='function'){
        _showToast('✅ '+(_doc.status==='enviado'?'Enviado ao consultor.':'Rascunho salvo.'), 'var(--accent)');
      }
      _icFbAplicarStatusNaUI();
      _icFbCarregarHistorico();
    }).catch(function(err){
      console.error('[ic-feedback] save falhou', err);
      if(typeof _showToast==='function') _showToast('❌ Erro ao salvar.','var(--red)');
    });
  }

  /* ── Histórico ──────────────────────────────────────────── */
  function _icFbCarregarHistorico(){
    var el = document.getElementById('fbHist');
    if(!el) return;
    if(!_consultorAtivo){ el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;">Selecione um consultor.</div>'; return; }
    if(typeof window._fbGet !== 'function'){ el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;">Firebase indisponível.</div>'; return; }
    window._fbGet('icFeedbacks/'+_consultorAtivo).then(function(d){
      _historico = [];
      if(d){
        Object.keys(d).forEach(function(k){
          var v = d[k]||{};
          v._id = k;
          _historico.push(v);
        });
        _historico.sort(function(a,b){
          var da = (a.data||'')+(a.ciclo||''); var db = (b.data||'')+(b.ciclo||'');
          return db.localeCompare(da);
        });
      }
      _icFbRenderHistorico();
      _icFbRenderRadar();
      _icFbRenderComparativo();
    }).catch(function(){
      _historico = [];
      _icFbRenderHistorico();
    });
  }
  function _icFbRenderHistorico(){
    var el = document.getElementById('fbHist');
    if(!el) return;
    if(!_historico.length){
      el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;">Sem ciclos anteriores.</div>';
      return;
    }
    var prevMedia = null;
    el.innerHTML = _historico.map(function(h){
      var compsVals = COMPS_DEF.map(function(c){return +(h.comps && h.comps[c.key]) || 0;});
      var media = compsVals.reduce(function(a,b){return a+b;},0) / compsVals.length;
      var delta = (prevMedia != null) ? media - prevMedia : null;
      prevMedia = media;
      var arrow = '';
      if(delta != null){
        if(delta > 0.05) arrow = '<span class="arrow up">▲ +'+delta.toFixed(1)+'</span>';
        else if(delta < -0.05) arrow = '<span class="arrow down">▼ '+delta.toFixed(1)+'</span>';
      }
      var cicloLbl = (h.ciclo||'').charAt(0).toUpperCase()+(h.ciclo||'').slice(1);
      var statusLbl = (h.status === 'enviado') ? '✓ Enviado' :
                       (h.status === 'respondido') ? '✓ Respondido' :
                       'Rascunho';
      return '<div class="fb-hist-item" data-id="'+h._id+'">'
        + '<div class="fb-hist-row">'
        +   '<span class="fb-hist-data">'+_fmtDataBR(h.data||'')+'</span>'
        +   '<span class="fb-hist-ciclo '+(h.ciclo||'quinzenal')+'">'+cicloLbl+'</span>'
        + '</div>'
        + '<div class="fb-hist-media">Média '+media.toFixed(1)+' '+arrow+'</div>'
        + '<div class="fb-hist-status">'+statusLbl+'</div>'
        + '</div>';
    }).join('');
    /* Click no histórico → carregar aquele doc */
    el.querySelectorAll('.fb-hist-item').forEach(function(item){
      item.addEventListener('click', function(){
        var id = item.getAttribute('data-id');
        var found = _historico.filter(function(h){return h._id===id;})[0];
        if(!found) return;
        _doc = found;
        _ciclo = found.ciclo || 'quinzenal';
        document.querySelectorAll('.fb-ciclo-tab').forEach(function(t){
          t.classList.toggle('active', t.getAttribute('data-ciclo') === _ciclo);
        });
        var inpData = document.getElementById('fbData');
        if(inpData) inpData.value = found.data || _hoje();
        _atualizarInfoCiclo();
        _icFbAplicarDocNaUI();
      });
    });
  }

  /* ── Radar SVG ─────────────────────────────────────────── */
  function _icFbRenderRadar(){
    var svg = document.getElementById('fbRadar');
    if(!svg) return;
    var R = 90;
    svg.innerHTML = '';
    var labels = COMPS_DEF.map(function(c){return c.label;});
    var atual = COMPS_DEF.map(function(c){return (_doc && _doc.comps && _doc.comps[c.key]) || 0;});
    var anterior = _icFbAnteriorVals();
    /* Grid */
    for(var g=2; g<=10; g+=2){
      var pts = '';
      for(var i=0;i<5;i++){
        var ang = -Math.PI/2 + i*(2*Math.PI/5);
        var r = (g/10)*R;
        pts += (r*Math.cos(ang))+','+(r*Math.sin(ang))+' ';
      }
      svg.innerHTML += '<polygon points="'+pts.trim()+'" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>';
    }
    /* Eixos + labels */
    for(var i=0;i<5;i++){
      var ang = -Math.PI/2 + i*(2*Math.PI/5);
      var x = R*Math.cos(ang), y = R*Math.sin(ang);
      svg.innerHTML += '<line x1="0" y1="0" x2="'+x+'" y2="'+y+'" stroke="rgba(255,255,255,.06)" stroke-width="1"/>';
      var lx = (R+18)*Math.cos(ang), ly = (R+18)*Math.sin(ang) + 4;
      var anchor = Math.abs(Math.cos(ang)) < 0.2 ? 'middle' : (Math.cos(ang) > 0 ? 'start' : 'end');
      svg.innerHTML += '<text x="'+lx+'" y="'+ly+'" fill="#bbb" font-size="10" font-weight="700" text-anchor="'+anchor+'">'+labels[i]+'</text>';
    }
    function poly(vals, color, opacity){
      if(!vals || !vals.length) return;
      var pts = '';
      for(var i=0;i<5;i++){
        var ang = -Math.PI/2 + i*(2*Math.PI/5);
        var r = (vals[i]/10)*R;
        pts += (r*Math.cos(ang))+','+(r*Math.sin(ang))+' ';
      }
      svg.innerHTML += '<polygon points="'+pts.trim()+'" fill="'+color+'" fill-opacity="'+opacity+'" stroke="'+color+'" stroke-width="2"/>';
      for(var i=0;i<5;i++){
        var ang = -Math.PI/2 + i*(2*Math.PI/5);
        var r = (vals[i]/10)*R;
        svg.innerHTML += '<circle cx="'+(r*Math.cos(ang))+'" cy="'+(r*Math.sin(ang))+'" r="3" fill="'+color+'"/>';
      }
    }
    poly(_medTime,  '#888',     0.10);
    poly(anterior, '#60a5fa',  0.12);
    poly(atual,    '#c8f05a',  0.22);
  }
  function _icFbAnteriorVals(){
    /* Pega o último ciclo do mesmo tipo (semanal/quinzenal/mensal) que não seja o atual */
    if(!_historico || !_historico.length) return null;
    var atualId = _doc ? _cicloId(_doc.ciclo, _doc.data) : '';
    for(var i=0;i<_historico.length;i++){
      var h = _historico[i];
      if(h.ciclo !== _ciclo) continue;
      if(h._id === atualId) continue;
      return COMPS_DEF.map(function(c){return +(h.comps && h.comps[c.key]) || 0;});
    }
    return null;
  }

  /* ── Comparativo com o time ────────────────────────────── */
  function _icFbRenderComparativo(){
    var el = document.getElementById('fbComparativo');
    if(!el) return;
    var rows = COMPS_DEF.map(function(c,i){
      var meu = (_doc && _doc.comps && _doc.comps[c.key]) || 0;
      var med = _medTime[i] || 6;
      var diff = meu - med;
      var cor = diff >= 1 ? 'var(--accent)' : diff >= 0 ? 'var(--blue)' : 'var(--amber)';
      var rotulo = diff >= 1 ? 'acima' : diff >= 0 ? 'na média' : 'gap';
      return '<div style="display:flex;justify-content:space-between;">'
        + '<span>'+c.label+'</span>'
        + '<b style="color:'+cor+';">'+meu+' · '+rotulo+'</b>'
        + '</div>';
    });
    el.innerHTML = rows.join('');
  }

  /* ══════════════════════════════════════════════════════════
     MODAL DE DRILL-DOWN — mostra os dados que originaram cada score
     ════════════════════════════════════════════════════════ */
  window._fbDetFechar = function(){
    var m = document.getElementById('fbDetModal');
    if(m) m.classList.remove('show');
  };
  /* Troca o filtro retroativo de Recuperação (Visão) e re-renderiza o modal */
  window._fbVisSetRetro = function(meses){
    window._icFbVisRetroMeses = +meses || 0;
    /* recalcula métricas pra refletir o novo cutoff */
    _icFbAtualizarSugestoes();
    /* re-abre o detalhe da Visão depois que recalcular (defer 1 tick) */
    setTimeout(function(){
      if(typeof window._fbDetAbrir === 'function') window._fbDetAbrir('vis');
    }, 400);
  };

  function _srcTag(src, srcNome){
    var t = (src==='turma'?'TURMA':'AVULSO');
    var titulo = srcNome ? srcNome.replace(/"/g,'&quot;') : t;
    return '<span class="fb-det-src-tag '+(src==='turma'?'turma':'avulso')+'" title="'+titulo+'">'+t+'</span>';
  }
  function _srcDescr(it){
    /* descrição textual completa da origem (pra coluna larga) */
    if(it.src === 'avulso') return 'Venda avulsa';
    return it.srcNome || 'Turma';
  }
  function _stTag(st){
    return '<span class="fb-det-st-tag '+st+'">'+st+'</span>';
  }
  function _fmtData(d){
    if(!d) return '—';
    var p = String(d).split('-');
    return p.length===3 ? (p[2]+'/'+p[1]+'/'+p[0]) : d;
  }
  function _fmtR(v){
    return 'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  window._fbDetAbrir = function(compKey){
    if(!_metricasCache){
      if(typeof _showToast==='function') _showToast('⚠️ Selecione um consultor e aguarde o cálculo.','var(--amber)');
      return;
    }
    var c = COMPS_DEF.find(function(x){return x.key===compKey;});
    if(!c) return;
    var dado = _metricasCache.metricas[compKey];
    var score = (_doc && _doc.comps && _doc.comps[compKey]) || (dado && dado.auto) || '—';
    var titulo = c.ico+' '+c.label;
    document.getElementById('fbDetTitulo').innerHTML = titulo
      + '  <span class="fb-det-h-score '+_lvClass(+score||0)+'">'+score+'</span>';
    document.getElementById('fbDetBody').innerHTML = _icFbRenderDetalhe(compKey);
    document.getElementById('fbDetModal').classList.add('show');
  };

  function _icFbRenderDetalhe(key){
    var m = _metricasCache.metricas[key] || {};
    var itens = _metricasCache.itens || [];
    var ctx = _metricasCache.contexto || {};
    var formulaHtml = '<div class="fb-det-formula">'+_icFbDetalheExplicacao(key, m)+'</div>';

    /* ── Apresentação (qualitativa) ── */
    if(key === 'apres'){
      return '<div class="fb-det-formula">⚠ Esta competência é <b>qualitativa</b> — depende de observação direta do gestor (call gravada, role-play, presença em apresentação).\n\nO sistema não tem proxy automático limpo para ela hoje. Possíveis sinais indiretos para considerar manualmente:\n• Cliente faz mais perguntas que objeções na apresentação\n• Engajamento durante a demo\n• Storytelling: usa case real ou só slide?\n• Adapta o pitch para cada cliente?</div>';
    }

    /* ── Prospecção ── */
    if(key === 'prosp'){
      /* clientes únicos do consultor neste mês */
      var unq = {};
      itens.forEach(function(it){ if(it.cliente) unq[it.cliente] = it; });
      var lista = Object.values(unq);
      return formulaHtml
        + '<div class="fb-det-stats">'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Clientes novos · meus</div><div class="fb-det-stat-val green">'+m.meu+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Média do time</div><div class="fb-det-stat-val">'+m.media+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Time total</div><div class="fb-det-stat-val">'+(ctx.prospTime||0)+'</div></div>'
        + '</div>'
        + '<div class="fb-det-secao-h">📋 Clientes únicos do consultor no mês ('+lista.length+')</div>'
        + (lista.length ? '<table class="fb-det-tbl"><thead><tr><th>Cliente</th><th>Origem</th><th>1ª data</th><th>Status atual</th></tr></thead><tbody>'
            + lista.map(function(it){
                return '<tr>'
                  + '<td class="nome">'+it.cliente+'</td>'
                  + '<td>'+_srcTag(it.src, it.srcNome)+'</td>'
                  + '<td>'+_fmtData(it.data)+'</td>'
                  + '<td>'+_stTag(it.status)+'</td>'
                  + '</tr>';
              }).join('')
            + '</tbody></table>'
          : '<div class="fb-det-vazio">Nenhum cliente prospectado neste mês.</div>');
    }

    /* ── Qualificação ── */
    if(key === 'qual'){
      /* "Não avançou" engloba aberto + desistiu + sem status */
      function isNaoAvancou(st){
        var v = String(st||'').trim().toLowerCase();
        return v==='' || v==='-' || v==='aberto' || v==='desistiu';
      }
      var avancados = itens.filter(function(it){return !isNaoAvancou(it.status);});
      var naoAvancou = itens.filter(function(it){return isNaoAvancou(it.status);});
      function tblQual(arr, vazio){
        if(!arr.length) return '<div class="fb-det-vazio">'+vazio+'</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Cliente</th><th>Treinamento</th><th>Status</th><th>Origem</th><th class="val">Valor</th></tr></thead><tbody>'
          + arr.map(function(it){
              var stTxt = String(it.status||'').trim();
              if(!stTxt || stTxt==='-') stTxt = '— sem status';
              return '<tr>'
                + '<td class="nome">'+it.cliente+'</td>'
                + '<td>'+(it.treinamento||'—')+'</td>'
                + '<td>'+_stTag(it.status||'aberto')+(stTxt==='— sem status'?' <span style="font-size:10px;color:var(--muted);">'+stTxt+'</span>':'')+'</td>'
                + '<td>'+_srcTag(it.src, it.srcNome)+' <span style="font-size:11px;color:var(--muted);margin-left:4px;">'+_srcDescr(it)+'</span></td>'
                + '<td class="val">'+_fmtR(it.valor)+'</td>'
              + '</tr>';
            }).join('')
          + '</tbody></table>';
      }
      return formulaHtml
        + '<div class="fb-det-stats">'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Total clientes</div><div class="fb-det-stat-val">'+m.total+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Não avançou</div><div class="fb-det-stat-val red">'+m.aberto+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">— em aberto</div><div class="fb-det-stat-val">'+(m.aberto - (m.desistiu||0) - (m.semStatus||0))+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">— desistiu</div><div class="fb-det-stat-val">'+(m.desistiu||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">— sem status (-)</div><div class="fb-det-stat-val">'+(m.semStatus||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Avançaram</div><div class="fb-det-stat-val green">'+(m.total-m.aberto)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">% avançado</div><div class="fb-det-stat-val blue">'+(m.pct!=null?Math.round(m.pct*100)+'%':'—')+'</div></div>'
        + '</div>'
        + '<div class="fb-det-secao-h">✅ Avançaram ('+avancados.length+')</div>'
        + tblQual(avancados, 'Nenhum cliente avançou.')
        + '<div class="fb-det-secao-h">⏳ Não avançaram — aberto · desistiu · sem status ('+naoAvancou.length+')</div>'
        + tblQual(naoAvancou, '🎉 Carteira inteira engajada.');
    }

    /* ── Negociação ── */
    if(key === 'neg'){
      var pagos = itens.filter(function(it){return it.status==='pago';});
      var negs  = itens.filter(function(it){return it.status==='negociacao';});
      var ents  = itens.filter(function(it){return it.status==='entrada';});
      /* Soma de entradas (R$) — vem do campo it.entrada quando o sub tem entrada parcial */
      var totalEntradas = ents.reduce(function(s,it){return s+(+it.entrada||0)+((+it.valor||0)*0);},0);
      /* Se entrada não tiver valor próprio, usa it.valor como referência */
      var totalEntradasVal = ents.reduce(function(s,it){
        var v = +it.entrada || 0;
        return s + (v > 0 ? v : (+it.valor || 0));
      }, 0);
      function tblNeg(arr, colVal){
        return '<table class="fb-det-tbl"><thead><tr><th>Cliente</th><th>Treinamento</th><th>Origem</th><th class="val">'+colVal+'</th></tr></thead><tbody>'
          + arr.map(function(it){
              var v = (colVal === 'Entrada paga') ? ((+it.entrada||0) || (+it.valor||0)) : (+it.valor||0);
              return '<tr><td class="nome">'+it.cliente+'</td><td>'+(it.treinamento||'—')+'</td><td>'+_srcTag(it.src, it.srcNome)+' <span style="font-size:11px;color:var(--muted);margin-left:4px;">'+_srcDescr(it)+'</span></td><td class="val">'+_fmtR(v)+'</td></tr>';
            }).join('')
          + '</tbody></table>';
      }
      return formulaHtml
        + '<div class="fb-det-stats">'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Pagos</div><div class="fb-det-stat-val green">'+(m.pagos||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Em negociação</div><div class="fb-det-stat-val amber">'+(m.negoc||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Com entrada</div><div class="fb-det-stat-val" style="color:#ffb740;">'+(m.entrada||ents.length||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Conversão</div><div class="fb-det-stat-val blue">'+(m.convMeu!=null?Math.round(m.convMeu*100)+'%':'—')+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Ticket médio</div><div class="fb-det-stat-val">'+(m.ticketMeu?_fmtR(m.ticketMeu):'—')+'</div></div>'
        + '</div>'
        + '<div class="fb-det-secao-h">✅ Pagos no mês ('+pagos.length+')</div>'
        + (pagos.length ? tblNeg(pagos, 'Valor pago') : '<div class="fb-det-vazio">Nenhuma venda paga neste mês.</div>')
        + '<div class="fb-det-secao-h">🤝 Em negociação ('+negs.length+')</div>'
        + (negs.length ? tblNeg(negs, 'Valor estimado') : '<div class="fb-det-vazio">Nenhuma negociação em curso.</div>')
        + '<div class="fb-det-secao-h">💵 Com entrada parcial ('+ents.length+(totalEntradasVal>0?' · '+_fmtR(totalEntradasVal):'')+')</div>'
        + (ents.length ? tblNeg(ents, 'Entrada paga') : '<div class="fb-det-vazio">Nenhum cliente com entrada parcial.</div>');
    }

    /* ── Follow-up ── */
    if(key === 'fup'){
      var paradas = _metricasCache.paradasItens || [];
      var hoje = new Date();
      return formulaHtml
        + '<div class="fb-det-stats">'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Negociações ativas</div><div class="fb-det-stat-val">'+(m.totalNeg||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Paradas > 14 dias</div><div class="fb-det-stat-val red">'+(m.parados||0)+'</div></div>'
        + '</div>'
        + '<div class="fb-det-secao-h">⏰ Negociações paradas > 14 dias ('+paradas.length+')</div>'
        + (paradas.length ? '<table class="fb-det-tbl"><thead><tr><th>Cliente</th><th>Treinamento</th><th>Origem</th><th>Último update</th><th>Dias parado</th></tr></thead><tbody>'
            + paradas.map(function(it){
                var dias = '—';
                try { dias = _icFbDiasEntre(it.data, hoje.toISOString().slice(0,10)); } catch(e){}
                return '<tr><td class="nome">'+it.cliente+'</td><td>'+it.treinamento+'</td><td>'+_srcTag(it.src, it.srcNome)+'</td><td>'+_fmtData(it.data)+'</td><td class="val" style="color:var(--red);">'+dias+'d</td></tr>';
              }).join('')
            + '</tbody></table>'
          : '<div class="fb-det-vazio">✅ Nenhuma negociação parada — cadência saudável!</div>');
    }

    /* ── Constância ── */
    if(key === 'const'){
      var hist = _metricasCache.constHist || [];
      return formulaHtml
        + '<div class="fb-det-stats">'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Meses analisados</div><div class="fb-det-stat-val">'+(m.totalComMeta||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Bateu meta</div><div class="fb-det-stat-val green">'+(m.batidos||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">% atingimento</div><div class="fb-det-stat-val blue">'+(m.totalComMeta>0?Math.round(m.batidos/m.totalComMeta*100)+'%':'—')+'</div></div>'
        + '</div>'
        + '<div class="fb-det-secao-h">📅 Mês a mês (últimos 6)</div>'
        + (hist.length ? '<table class="fb-det-tbl"><thead><tr><th>Mês</th><th class="val">Meta (Mínima)</th><th class="val">Realizado</th><th>Bateu?</th></tr></thead><tbody>'
            + hist.slice().reverse().map(function(h){
                return '<tr><td class="nome">'+h.mes+'</td><td class="val">'+_fmtR(h.meta)+'</td><td class="val">'+_fmtR(h.realizado)+'</td><td>'+(h.batido?'<span class="fb-det-st-tag pago">✓ SIM</span>':h.meta>0?'<span class="fb-det-st-tag aberto" style="color:var(--red);">✗ NÃO</span>':'<span class="fb-det-st-tag aberto">sem meta</span>')+'</td></tr>';
              }).join('')
            + '</tbody></table>'
          : '<div class="fb-det-vazio">Sem histórico de metas configuradas.</div>');
    }

    /* ── Mix de produto ── */
    if(key === 'mix'){
      var pagos = itens.filter(function(it){return it.status==='pago';});
      var porTrein = {};
      pagos.forEach(function(it){
        var t = it.treinamento || '—';
        if(!porTrein[t]) porTrein[t] = { qtd:0, total:0, clientes:[] };
        porTrein[t].qtd++;
        porTrein[t].total += +it.valor||0;
        porTrein[t].clientes.push(it.cliente);
      });
      var lista = Object.keys(porTrein).map(function(t){
        return Object.assign({treinamento:t}, porTrein[t]);
      });
      return formulaHtml
        + '<div class="fb-det-stats">'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Treinamentos distintos</div><div class="fb-det-stat-val blue">'+(m.distintos||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Pagos totais</div><div class="fb-det-stat-val green">'+(m.pagos||0)+'</div></div>'
        + '</div>'
        + '<div class="fb-det-secao-h">🎒 Produtos vendidos no mês ('+lista.length+')</div>'
        + (lista.length ? '<table class="fb-det-tbl"><thead><tr><th>Treinamento</th><th class="val">Qtd</th><th class="val">Total R$</th><th>Clientes</th></tr></thead><tbody>'
            + lista.sort(function(a,b){return b.qtd-a.qtd;}).map(function(l){
                return '<tr><td class="nome">'+l.treinamento+'</td><td class="val">'+l.qtd+'</td><td class="val">'+_fmtR(l.total)+'</td><td style="font-size:11px;color:var(--muted);">'+l.clientes.join(', ')+'</td></tr>';
              }).join('')
            + '</tbody></table>'
          : '<div class="fb-det-vazio">Nenhuma venda paga neste mês.</div>');
    }

    /* ── Aproveitamento ── */
    if(key === 'apr'){
      /* Mostra TODOS os itens do mês (cada treinamento por cliente vira linha) */
      var pagosL  = itens.filter(function(it){return it.status==='pago';});
      var negocL  = itens.filter(function(it){return it.status==='negociacao';});
      var entradaL = itens.filter(function(it){return it.status==='entrada';});
      var abertoL = itens.filter(function(it){return it.status==='aberto';});
      /* Quebra de pagos por origem (turma vs avulso da Pipeline Comercial) */
      var pagosTurma  = pagosL.filter(function(it){return it.src==='turma';});
      var pagosAvulso = pagosL.filter(function(it){return it.src==='avulso';});
      function tbl(arr, vazio){
        if(!arr.length) return '<div class="fb-det-vazio">'+vazio+'</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Cliente</th><th>Treinamento</th><th>Origem detalhada</th><th>Status</th><th class="val">Valor</th></tr></thead><tbody>'
          + arr.map(function(it){
              return '<tr>'
                + '<td class="nome">'+it.cliente+'</td>'
                + '<td>'+(it.treinamento||'—')+'</td>'
                + '<td>'+_srcTag(it.src, it.srcNome)+' <span style="font-size:11px;color:var(--muted);margin-left:4px;">'+_srcDescr(it)+'</span></td>'
                + '<td>'+_stTag(it.status)+'</td>'
                + '<td class="val">'+_fmtR(it.valor)+'</td>'
              + '</tr>';
            }).join('')
          + '</tbody></table>';
      }
      var notaOrigem = '<div style="font-size:11px;color:var(--muted);padding:8px 12px;background:var(--surface2);border-radius:6px;margin:8px 0 14px;line-height:1.55;">'
        + '<b style="color:var(--text);">Origem dos pagos:</b> '
        + '<span style="color:var(--blue);">'+pagosTurma.length+' de turma</span>'
        + ' + <span style="color:#a78bfa;">'+pagosAvulso.length+' avulsa</span>'
        + ' = <b style="color:var(--green);">'+pagosL.length+' total</b>'
        + ' &nbsp;·&nbsp; vendas avulsas vêm de <code style="font-size:10px;">pipelineSales/'+(_metricasCache.mes||'')+'</code> (mesma fonte da aba Pipeline Comercial)'
        + '</div>';
      /* Seções: ordem dinâmica — não-vazias primeiro, vazias por último.
         Dentro de cada grupo, mantém a ordem natural (Pagos · Entrada · Negociação · Aberto). */
      var secoes = [
        { titulo:'✅ Pagos',         arr:pagosL,   vazio:'Nenhum cliente pago no mês.' },
        { titulo:'💵 Com entrada',   arr:entradaL, vazio:'Nenhum cliente com entrada parcial.' },
        { titulo:'🤝 Em negociação', arr:negocL,   vazio:'Nenhum cliente em negociação.' },
        { titulo:'📋 Em aberto',     arr:abertoL,  vazio:'🎉 Carteira inteira engajada.' }
      ];
      /* sort estável: 0 vai pro fim */
      secoes.sort(function(a,b){
        var az = a.arr.length === 0 ? 1 : 0;
        var bz = b.arr.length === 0 ? 1 : 0;
        return az - bz;
      });
      var secoesHtml = secoes.map(function(s){
        return '<div class="fb-det-secao-h">'+s.titulo+' ('+s.arr.length+')</div>' + tbl(s.arr, s.vazio);
      }).join('');
      return formulaHtml
        + '<div class="fb-det-stats">'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Total carteira</div><div class="fb-det-stat-val">'+(m.total||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Pagos</div><div class="fb-det-stat-val green">'+(m.pagos||0)+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Aproveitamento</div><div class="fb-det-stat-val blue">'+(m.pct!=null?Math.round(m.pct*100)+'%':'—')+'</div></div>'
        + '</div>'
        + notaOrigem
        + secoesHtml;
    }

    /* ── Visão (Oportunidades) ── */
    if(key === 'vis'){
      function pct(v){return v!=null?Math.round(v*100)+'%':'—';}
      function corDe(v){
        if(v == null) return '';
        if(v >= 0.8) return 'green';
        if(v >= 0.6) return 'blue';
        if(v >= 0.4) return 'amber';
        return 'red';
      }
      var retroLbl = m.retroMeses > 0 ? ('últimos '+m.retroMeses+' meses') : 'todas as turmas anteriores';
      var componentes = [
        { lbl:'🛡 Preservação',           peso:40, val:m.preserv,   det:'1 − (desistiu '+(m.perdidos? '· '+m.perdidos : '0')+' + sem-status) ÷ '+ (_metricasCache.metricas.qual.total||0) +' total' },
        { lbl:'🔭 Potencial / Cobertura', peso:40, val:m.cobertura!=null?Math.min(1.5,m.cobertura)/1.5:null, det:'Pipeline R$ ('+_fmtR(m.rPag+m.rNeg+m.rEnt)+') ÷ meta básica '+_fmtR(m.metaBas)+' = '+pct(m.cobertura) },
        { lbl:'♻ Recuperação',            peso:20, val:m.recup,     det:(m.clienAntigosVivos||0)+' vivos de '+(m.clienAntigos||0)+' · '+retroLbl }
      ];
      var compCards = '<div class="fb-det-stats">'
        + componentes.map(function(c){
            return '<div class="fb-det-stat" style="grid-column:span 1;">'
              + '<div class="fb-det-stat-lbl">'+c.lbl+' · '+c.peso+'%</div>'
              + '<div class="fb-det-stat-val '+corDe(c.val)+'">'+pct(c.val)+'</div>'
              + '<div style="font-size:10px;color:var(--muted);margin-top:4px;line-height:1.4;">'+c.det+'</div>'
              + '</div>';
          }).join('')
        + '</div>';
      /* Controle de retroação — chips clicáveis */
      var retroOpts = [
        { v:0, lbl:'Todas anteriores' },
        { v:3, lbl:'3 meses' },
        { v:6, lbl:'6 meses' },
        { v:12, lbl:'12 meses' }
      ];
      var ativo = +(window._icFbVisRetroMeses || 0);
      var ctrlRetro = '<div style="margin:14px 0;padding:12px 14px;background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.25);border-radius:8px;">'
        + '<div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:8px;">♻ Recuperação · até que mês retroagir?</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
        + retroOpts.map(function(o){
            var cls = o.v === ativo ? 'fb-btn primary' : 'fb-btn ghost';
            return '<button class="'+cls+'" style="padding:5px 12px;font-size:11px;" onclick="_fbVisSetRetro('+o.v+')">'+o.lbl+'</button>';
          }).join('')
        + '</div>'
        + (m.cutoff ? '<div style="font-size:10px;color:var(--muted);margin-top:6px;">Filtrando turmas com periodStart ≥ <b style="color:var(--text);">'+m.cutoff+'</b></div>' : '')
        + '</div>';
      /* Tabelas auxiliares */
      var perdidosL = itens.filter(function(it){
        var s = String(it.status||'').trim().toLowerCase();
        return s === 'desistiu' || s === '' || s === '-';
      });
      var pipelineVivo = itens.filter(function(it){
        return it.status === 'negociacao' || it.status === 'entrada';
      });
      var recList = m.recuperacaoList || [];
      function tblVis(arr, vazio, colVal){
        if(!arr.length) return '<div class="fb-det-vazio">'+vazio+'</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Cliente</th><th>Treinamento</th><th>Origem</th><th>Status</th><th class="val">'+colVal+'</th></tr></thead><tbody>'
          + arr.map(function(it){
              return '<tr><td class="nome">'+it.cliente+'</td><td>'+(it.treinamento||'—')+'</td>'
                + '<td>'+_srcTag(it.src, it.srcNome)+' <span style="font-size:11px;color:var(--muted);margin-left:4px;">'+_srcDescr(it)+'</span></td>'
                + '<td>'+_stTag(it.status||'aberto')+'</td>'
                + '<td class="val">'+_fmtR(it.valor)+'</td></tr>';
            }).join('')
          + '</tbody></table>';
      }
      function tblRec(arr, vazio){
        if(!arr.length) return '<div class="fb-det-vazio">'+vazio+'</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Cliente</th><th>Treinamento</th><th>Turma (início)</th><th>Status atual</th><th class="val">Valor</th></tr></thead><tbody>'
          + arr.map(function(r){
              return '<tr><td class="nome">'+r.cliente+'</td><td>'+(r.treinamento||'—')+'</td>'
                + '<td><span class="fb-det-src-tag turma" title="'+r.srcNome+'">TURMA</span> <span style="font-size:11px;color:var(--muted);margin-left:4px;">'+r.srcNome+' · '+r.turmaInicio+'</span></td>'
                + '<td>'+_stTag(r.status||'aberto')+'</td>'
                + '<td class="val">'+_fmtR(r.valor)+'</td></tr>';
            }).join('')
          + '</tbody></table>';
      }
      var vivos = recList.filter(function(r){return r.vivo;});
      var mortos = recList.filter(function(r){return !r.vivo;});
      /* Ordena seções: vazias por último */
      var secoes = [
        { titulo:'♻ Recuperados / vivos · de turmas anteriores', arr:vivos, render:function(){return tblRec(vivos, 'Nenhum cliente vivo vindo de turmas anteriores no escopo.');} },
        { titulo:'⚰ Parados / mortos · de turmas anteriores',     arr:mortos, render:function(){return tblRec(mortos, 'Nenhum cliente parado/morto.');} },
        { titulo:'🔭 Pipeline cultivado · negociação + entrada', arr:pipelineVivo, render:function(){return tblVis(pipelineVivo, 'Sem pipeline ativo — falta cultivar.', 'Valor');}, suf:' · '+_fmtR(m.rNeg+m.rEnt) },
        { titulo:'⚠ Oportunidades perdidas · desistiu / sem status', arr:perdidosL, render:function(){return tblVis(perdidosL, '✅ Nada perdido neste mês.', 'Valor');} }
      ];
      secoes.sort(function(a,b){
        var az = a.arr.length === 0 ? 1 : 0;
        var bz = b.arr.length === 0 ? 1 : 0;
        return az - bz;
      });
      var secoesHtml = secoes.map(function(s){
        return '<div class="fb-det-secao-h">'+s.titulo+' ('+s.arr.length+(s.suf||'')+')</div>' + s.render();
      }).join('');
      return formulaHtml
        + compCards
        + ctrlRetro
        + secoesHtml;
    }

    return '<div class="fb-det-vazio">Sem detalhes disponíveis para esta competência.</div>';
  }

  /* ── Hook: quando abrir o Mapeamento, popular consultores
        no select assim que _npUsuarios estiver carregado. */
  var _origAbrirMap = window.abrirMapeamento;
  if(typeof _origAbrirMap === 'function'){
    window.abrirMapeamento = function(btn){
      _origAbrirMap(btn);
      /* Espera um beat para _npUsuarios estar populado */
      setTimeout(_icFbPopularConsultores, 600);
    };
  }

})();
