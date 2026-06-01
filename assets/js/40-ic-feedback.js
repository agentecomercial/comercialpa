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
  var _doc = null;             /* { ciclo, data, tipo, comps, notaGestor, notaAuto, acoes, status, metricas } */
  var _consultorAtivo = '';    /* string UPPER */
  var _ciclo = 'quinzenal';
  var _historico = [];         /* todos os docs do consultor, mais recente primeiro */
  var _medTime = [6,6,6,6,6,6,6,6,6]; /* fallback (9 comps) */
  var _metricasCache = null;   /* { metricas: {comp: {auto, ...detalhes}}, contexto: {...} } */

  /* Modo do feedback (Fase B):
     - 'onboarding'  → 1ª vez com o consultor (sem histórico)
     - 'pulse'       → quinzenal, formato curto (Stop/Start/Continue)
     - 'completo'    → cada 3 pulses, com 9 competências + diagnóstico
     Docs antigos sem tipo são tratados como 'completo' (mesma UX). */
  var _fbModo = 'completo';        /* default — recalculado em _icFbDetectarModo */
  var _fbModoManual = false;       /* true se o gestor mudou manualmente nesta sessão */

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
    /* Inicializa a janela default (só mês do ciclo) e marca o chip */
    if(window._icFbJanelaMeses == null) window._icFbJanelaMeses = 0;
    document.querySelectorAll('.fb-jan').forEach(function(b){
      b.classList.toggle('active', +b.getAttribute('data-jan') === window._icFbJanelaMeses);
    });
    var info = document.getElementById('fbJanInfo');
    if(info){
      var v = window._icFbJanelaMeses;
      info.textContent = v === 0 ? 'apenas o mês do ciclo'
                       : v === -1 ? 'todos os meses disponíveis (até 24)'
                       : 'últimos '+v+' meses (incluindo o do ciclo)';
    }
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
        /* Fase B: doc antigo sem tipo → trata como completo (compat) */
        if(!_doc.tipo) _doc.tipo = 'completo';
        /* Modo segue o que está salvo no doc carregado */
        _fbModo = _doc.tipo;
        _fbModoManual = false;  /* novo doc, novo cálculo automático */
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
      tipo: _fbModo,                          /* Fase B: tipo do feedback */
      comps: COMPS_DEF.reduce(function(o,c){o[c.key]=6;return o;},{}),
      notaGestor: '',
      notaAuto: '',
      acoes: [],
      status: 'rascunho',
      /* Campos novos por modo (Fase B) — preenchidos quando o modo for ativado */
      termometro: null,                       /* Pulse · 1-5 */
      stopStartContinue: { stop:'', start:'', continue:'' },
      compromissos: [],                       /* [{texto, prazo, feito}] */
      contexto: '',                           /* Onboarding · trajetória */
      expectativas: '',                       /* Onboarding · expectativas mútuas */
      diagnostico: { fortes:'', fracas:'' },  /* Completo · diagnóstico do gestor */
      alvosSugeridos: []                      /* Completo · keys de competências */
    };
    _icFbAplicarDocNaUI();
  }

  /* ── Fase B: detecta modo automaticamente a partir do histórico ──
     - Sem feedbacks → onboarding
     - Tem feedbacks mas o último não foi "completo" há 3+ pulses → completo
     - Caso geral → pulse
     Retorna { modo, motivo } */
  function _icFbDetectarModo(){
    if(!_historico || !_historico.length){
      return { modo:'onboarding', motivo:'primeiro feedback do consultor' };
    }
    /* Pulses consecutivos desde o último Completo */
    var pulsesDesdeCompleto = 0;
    for(var i = 0; i < _historico.length; i++){
      var h = _historico[i];
      var tipoHist = h.tipo || 'completo';   /* docs antigos = completo */
      if(tipoHist === 'completo' || tipoHist === 'onboarding') break;
      if(tipoHist === 'pulse') pulsesDesdeCompleto++;
    }
    if(pulsesDesdeCompleto >= 2){
      return { modo:'completo', motivo:'3º pulse — hora do completo (deep dive)' };
    }
    return { modo:'pulse', motivo:'ritmo normal' };
  }

  /* ── Setter de modo (manual via tabs ou auto) ── */
  window._fbSetModo = function(modo, manual){
    if(['onboarding','pulse','completo'].indexOf(modo) < 0) return;
    _fbModo = modo;
    _fbModoManual = !!manual;
    if(_doc) _doc.tipo = modo;
    _icFbRenderModoTabs();
    /* re-render: blocos visíveis mudam conforme o modo (Etapas 2/3/4) */
    _icFbRenderModoBlocos();
  };

  /* Renderiza as tabs de modo no header com o sugerido em destaque */
  function _icFbRenderModoTabs(){
    var box = document.getElementById('fbModoTabs');
    if(!box) return;
    var sug = _icFbDetectarModo();
    var atual = _fbModo || 'pulse';
    var LBL = { onboarding:'👋 Onboarding', pulse:'⚡ Pulse', completo:'📋 Completo' };
    var TIP = {
      onboarding:'1ª vez com o consultor — mapeia trajetória, expectativas e linha de base',
      pulse:'Quinzenal — termômetro + delta + Stop/Start/Continue (10-15 min)',
      completo:'A cada 3 pulses — Pulse + 9 competências + diagnóstico + alvos pro PDI (30 min)'
    };
    var html = '<div class="fb-modo-tabs" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
    ['onboarding','pulse','completo'].forEach(function(m){
      var ehAtual = m === atual;
      var ehSug = m === sug.modo && !_fbModoManual;
      var bg = ehAtual ? 'var(--accent)' : 'var(--surface2)';
      var color = ehAtual ? '#0a0e1a' : 'var(--text)';
      var border = ehSug && !ehAtual ? '1px dashed var(--accent)' : '1px solid var(--border)';
      html += '<button class="fb-modo-tab" title="'+TIP[m]+'" onclick="window._fbSetModo(\''+m+'\',true)" '
        +'style="padding:6px 12px;font-size:11px;font-weight:700;background:'+bg+';color:'+color+';border:'+border+';border-radius:6px;cursor:pointer;font-family:inherit;">'
        +LBL[m]+(ehSug && !ehAtual?' ★':'')+'</button>';
    });
    html += '<span style="margin-left:auto;font-size:10px;color:var(--muted);font-style:italic;">'
      +'💡 Sugerido: <b style="color:var(--accent);font-style:normal;">'+LBL[sug.modo]+'</b> · '+sug.motivo
      +(!_fbModoManual ? ' <span style="color:var(--accent);">(auto)</span>' : '')
      +'</span>';
    html += '</div>';
    box.innerHTML = html;
  }

  /* Controla visibilidade dos blocos de acordo com o modo:
     - card data-fbblk="pulse"      → visível em pulse + completo
     - card data-fbblk="onboarding" → visível só em onboarding
     - card data-fbblk="completo"   → visível só em completo
     - card data-fbblk="todos" (default) → sempre visível
     - card data-fbblk="exceto-onboarding" → escondido em onboarding */
  function _icFbRenderModoBlocos(){
    var root = document.querySelector('[data-icpane="desenvolvimento"]');
    if(!root) return;
    root.setAttribute('data-fbmodo', _fbModo);
    document.querySelectorAll('[data-fbblk]').forEach(function(el){
      var blk = el.getAttribute('data-fbblk');
      var show =
        blk === 'todos' ||
        (blk === 'pulse'      && (_fbModo === 'pulse' || _fbModo === 'completo')) ||
        (blk === 'onboarding' &&  _fbModo === 'onboarding') ||
        (blk === 'completo'   &&  _fbModo === 'completo') ||
        (blk === 'exceto-onboarding' && _fbModo !== 'onboarding');
      el.style.display = show ? '' : 'none';
    });
    /* Renderiza dados do bloco Pulse quando ativo */
    _icFbRenderPulse();
    _icFbRenderCompromissos();
    /* Renderiza dados do bloco Onboarding quando ativo */
    _icFbRenderOnboarding();
  }

  /* ── BLOCO ONBOARDING (1ª vez com o consultor) ─────────────── */
  function _icFbRenderOnboarding(){
    if(_fbModo !== 'onboarding') return;
    if(!_doc) return;
    /* Contexto + Expectativas (textareas livres) */
    var elCtx = document.getElementById('fbOnbContexto');
    if(elCtx) elCtx.value = _doc.contexto || '';
    var elExp = document.getElementById('fbOnbExpectativas');
    if(elExp) elExp.value = _doc.expectativas || '';

    /* Autoavaliação 1-5 das 9 competências (linha de base inicial) */
    _icFbRenderAutoAvaliacao();

    /* Link pro Dossiê do consultor */
    var elDos = document.getElementById('fbOnbDossieLink');
    if(elDos){
      elDos.onclick = function(){
        if(typeof window._icAbrirDossie === 'function'){
          window._icAbrirDossie(null, _consultorAtivo);
        }
      };
    }
  }
  window._fbSetOnbCtx = function(v){ if(_doc) _doc.contexto = v; };
  window._fbSetOnbExp = function(v){ if(_doc) _doc.expectativas = v; };

  /* Autoavaliação 1-5 das 9 competências (vira linha de base.
     Importante: docs antigos têm comps em escala 1-10. No Onboarding
     usamos escala 1-5 dentro do mesmo campo comps — multiplicada por 2
     pra manter compatibilidade com o radar/histórico). */
  function _icFbRenderAutoAvaliacao(){
    var box = document.getElementById('fbOnbAuto');
    if(!box || !_doc) return;
    if(!_doc.comps) _doc.comps = {};
    box.innerHTML = COMPS_DEF.map(function(c){
      /* Valor armazenado é 1-10. Convertemos pra escala 1-5 na UI */
      var v10 = _doc.comps[c.key];
      var v5 = (v10 == null) ? null : Math.max(1, Math.min(5, Math.round(v10 / 2)));
      var stars = [1,2,3,4,5].map(function(n){
        var ativo = v5 != null && n <= v5;
        return '<button onclick="window._fbSetAutoComp(\''+c.key+'\','+n+')" '
          +'style="flex:1;padding:8px 4px;background:'+(ativo?'var(--accent)':'var(--surface2)')+';color:'+(ativo?'#0a0e1a':'var(--muted)')+';'
          +'border:1px solid '+(ativo?'var(--accent)':'var(--border)')+';border-radius:4px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;">'+n+'</button>';
      }).join('');
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;">'
        +'<div style="width:160px;font-size:11px;color:var(--text);font-weight:600;">'+c.ico+' '+c.label+'</div>'
        +'<div style="flex:1;display:flex;gap:3px;">'+stars+'</div>'
        +'<div style="width:60px;text-align:right;font-size:10px;color:var(--muted);">'+(v5 == null ? '—' : v5+'/5')+'</div>'
        +'</div>';
    }).join('');
  }
  window._fbSetAutoComp = function(key, n5){
    if(!_doc) return;
    if(!_doc.comps) _doc.comps = {};
    /* Toggle: se já estiver no valor, limpa */
    var v10atual = _doc.comps[key];
    var v5atual = (v10atual == null) ? null : Math.round(v10atual/2);
    if(v5atual === n5){
      delete _doc.comps[key];
    } else {
      /* Converte 1-5 pra 1-10 (mantém compat com histórico de escala 1-10) */
      _doc.comps[key] = n5 * 2;
    }
    _icFbRenderAutoAvaliacao();
  };

  /* ── BLOCO PULSE: termômetro + delta + Stop/Start/Continue ── */
  function _icFbRenderPulse(){
    if(_fbModo !== 'pulse' && _fbModo !== 'completo') return;
    _icFbRenderTermometro();
    _icFbRenderDelta();
    _icFbRenderStopStartContinue();
  }

  function _icFbRenderTermometro(){
    var box = document.getElementById('fbTermometro');
    if(!box || !_doc) return;
    var v = _doc.termometro;
    var EMOJIS = [
      { v:1, e:'😞', l:'Mal' },
      { v:2, e:'😐', l:'Cansado' },
      { v:3, e:'🙂', l:'OK'  },
      { v:4, e:'😊', l:'Bem' },
      { v:5, e:'🤩', l:'Top' }
    ];
    box.innerHTML = '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      +EMOJIS.map(function(em){
        var sel = v === em.v;
        return '<button onclick="window._fbSetTermometro('+em.v+')" '
          +'style="flex:1;min-width:60px;padding:10px 6px;background:'+(sel?'rgba(200,240,90,.18)':'var(--surface2)')+';'
          +'border:'+(sel?'2px solid var(--accent)':'1px solid var(--border)')+';border-radius:8px;cursor:pointer;font-family:inherit;">'
          +'<div style="font-size:24px;">'+em.e+'</div>'
          +'<div style="font-size:10px;color:'+(sel?'var(--accent)':'var(--muted)')+';font-weight:'+(sel?'700':'500')+';margin-top:2px;">'+em.l+'</div>'
          +'</button>';
      }).join('')
      +'</div>';
  }
  window._fbSetTermometro = function(v){
    if(!_doc) return;
    _doc.termometro = (_doc.termometro === v) ? null : v;
    _icFbRenderTermometro();
  };

  function _icFbRenderDelta(){
    var box = document.getElementById('fbDelta');
    if(!box || !_doc) return;
    var nome = (_consultorAtivo || '').toUpperCase();
    var kpis = { faturado:'—', conv:'—', ticket:'—' };
    var deltaFat = null, deltaConv = null;
    try {
      if(typeof window._npTodasVendas === 'function' && typeof window._npPorConsultor === 'function'){
        var todas = window._npTodasVendas();
        var rank = window._npPorConsultor(todas, '', 'pago');
        var r = rank.find(function(x){ return String(x.nome).toUpperCase() === nome; });
        if(r){
          kpis.faturado = 'R$ '+r.pago.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
          kpis.conv = (r.qtd ? Math.round(r.qtdPago/r.qtd*100) : 0)+'%';
          kpis.ticket = r.qtdPago ? ('R$ '+Math.round(r.pago/r.qtdPago).toLocaleString('pt-BR')) : '—';
        }
      }
    } catch(e){ /* silencioso */ }
    /* Compromissos do último pulse: quantos foram cumpridos */
    var ultPulse = _historico.find(function(h){ return h && (h.tipo === 'pulse' || h.tipo === 'completo'); });
    var compStat = '—';
    if(ultPulse && Array.isArray(ultPulse.compromissos) && ultPulse.compromissos.length){
      var done = ultPulse.compromissos.filter(function(c){ return c && c.feito; }).length;
      compStat = done+'/'+ultPulse.compromissos.length+' cumpridos';
    }
    box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">'
      + _deltaCard('💰 Faturado', kpis.faturado, '')
      + _deltaCard('📈 Conversão', kpis.conv, '')
      + _deltaCard('🎯 Ticket médio', kpis.ticket, '')
      + _deltaCard('🤝 Último pulse', compStat, 'compromissos')
      +'</div>';
  }
  function _deltaCard(titulo, valor, sub){
    return '<div style="padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;">'
      +'<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:700;">'+titulo+'</div>'
      +'<div style="font-size:14px;color:var(--text);font-weight:700;margin-top:4px;">'+valor+'</div>'
      +(sub?'<div style="font-size:9px;color:var(--muted);margin-top:2px;">'+sub+'</div>':'')
      +'</div>';
  }

  function _icFbRenderStopStartContinue(){
    if(!_doc) return;
    if(!_doc.stopStartContinue) _doc.stopStartContinue = { stop:'', start:'', continue:'' };
    var s = _doc.stopStartContinue;
    var stop = document.getElementById('fbStop'); if(stop) stop.value = s.stop || '';
    var start = document.getElementById('fbStart'); if(start) start.value = s.start || '';
    var cont = document.getElementById('fbContinue'); if(cont) cont.value = s.continue || '';
  }
  window._fbSetSSC = function(campo, valor){
    if(!_doc) return;
    if(!_doc.stopStartContinue) _doc.stopStartContinue = { stop:'', start:'', continue:'' };
    _doc.stopStartContinue[campo] = valor;
  };

  /* ── BLOCO COMPROMISSOS (próximos 15 dias úteis no Pulse) ── */
  function _icFbRenderCompromissos(){
    var box = document.getElementById('fbCompromissos');
    if(!box || !_doc) return;
    if(!Array.isArray(_doc.compromissos)) _doc.compromissos = [];
    var dataBase = _doc.data || _hoje();
    var prazoSugerido = '';
    if(window._icAddDiasUteis){
      var d = window._icAddDiasUteis(dataBase, 15);
      prazoSugerido = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    }
    var html = _doc.compromissos.map(function(c, i){
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;">'
        +'<input type="checkbox" '+(c.feito?'checked':'')+' onchange="window._fbToggleCompr('+i+')" style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent);">'
        +'<input type="text" value="'+_escAttr(c.texto||'')+'" oninput="window._fbSetComprTexto('+i+',this.value)" placeholder="Compromisso..." style="flex:1;padding:5px 8px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:inherit;">'
        +'<input type="date" value="'+(c.prazo||prazoSugerido)+'" oninput="window._fbSetComprPrazo('+i+',this.value)" style="padding:5px 8px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:10px;font-family:inherit;width:135px;">'
        +'<button onclick="window._fbRmCompr('+i+')" style="padding:4px 8px;background:transparent;color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:4px;cursor:pointer;font-size:11px;">×</button>'
        +'</div>';
    }).join('');
    html += '<button onclick="window._fbAddCompr()" style="margin-top:6px;padding:6px 14px;background:var(--surface2);color:var(--accent);border:1px dashed var(--accent);border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;">+ Adicionar compromisso</button>';
    if(_doc.compromissos.length){
      html += '<div style="font-size:10px;color:var(--muted);margin-top:8px;font-style:italic;">💡 Prazo padrão = 15 dias úteis a partir da data do ciclo (próximo pulse).</div>';
    }
    box.innerHTML = html;
  }
  window._fbAddCompr = function(){
    if(!_doc) return;
    if(!Array.isArray(_doc.compromissos)) _doc.compromissos = [];
    if(_doc.compromissos.length >= 5){ if(typeof _showToast==='function') _showToast('⚠ Máximo 5 compromissos por ciclo.', 'var(--amber)'); return; }
    var prazo = '';
    if(window._icAddDiasUteis){
      var d = window._icAddDiasUteis(_doc.data || _hoje(), 15);
      prazo = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    }
    _doc.compromissos.push({ texto:'', prazo:prazo, feito:false });
    _icFbRenderCompromissos();
  };
  window._fbRmCompr = function(i){
    if(!_doc || !_doc.compromissos) return;
    _doc.compromissos.splice(i, 1);
    _icFbRenderCompromissos();
  };
  window._fbToggleCompr = function(i){
    if(!_doc || !_doc.compromissos[i]) return;
    _doc.compromissos[i].feito = !_doc.compromissos[i].feito;
    _icFbRenderCompromissos();
  };
  window._fbSetComprTexto = function(i, v){ if(_doc && _doc.compromissos[i]) _doc.compromissos[i].texto = v; };
  window._fbSetComprPrazo = function(i, v){ if(_doc && _doc.compromissos[i]) _doc.compromissos[i].prazo = v; };

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
  /* Decide se uma turma entra no escopo de análise.
     A janela de análise é controlada por window._icFbJanelaMeses:
       0  → só mês do ciclo (snapshot mensal estrito)
       N  → últimos N meses até o mês do ciclo (inclusive)
       -1 → tudo (cumulativo: qualquer turma com periodStart <= mês alvo)
     Default = 3 meses (cobre o ciclo + 2 anteriores). */
  function _icFbMesNaTurma(mesAlvo, t){
    if(!mesAlvo) return true;
    var ps = (t.periodStart||'').slice(0,7);
    var pe = (t.periodEnd||'').slice(0,7);
    var mm = String(t.mesMeta||'').slice(0,7);
    var janela = window._icFbJanelaMeses;
    if(janela == null) janela = 0;
    /* Mínimo do range = mesAlvo - (janela-1) meses; se -1 = sem mínimo */
    var minMes = null;
    if(janela > 0){
      minMes = _icFbAddMeses(mesAlvo, -(janela - 1));
    } else if(janela === 0){
      minMes = mesAlvo;
    } /* -1 = sem mínimo (tudo) */
    function _passaMin(m){ return !minMes || m >= minMes; }
    /* Casa explícito por mesMeta */
    if(mm && mm >= (minMes||'0000-00') && mm <= mesAlvo) return true;
    /* Range completo: alguma parte da turma cai dentro da janela */
    if(ps && pe){
      /* turma cobre [ps,pe]; janela cobre [minMes,mesAlvo]; há intersecção se ps<=mesAlvo e pe>=minMes */
      return ps <= mesAlvo && (!minMes || pe >= minMes);
    }
    if(ps && !pe) return ps <= mesAlvo && _passaMin(ps);
    if(!ps && pe) return pe <= mesAlvo && _passaMin(pe);
    return true; /* sem info → inclui */
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
          if(!c) return;
          var nomeCli = c.cliente || c.clienteNome;
          if(!nomeCli) return;
          var consultor = String(c.consultor || c.consultorNome || '').toUpperCase().trim();
          if(Array.isArray(c.treinamentos) && c.treinamentos.length){
            c.treinamentos.forEach(function(sub){
              if(!sub) return;
              itens.push({
                consultor: consultor,
                cliente: String(nomeCli).toUpperCase(),
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
              cliente: String(nomeCli).toUpperCase(),
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
        /* Schema do Pipeline · Vendas avulsas grava com clienteNome /
           consultorNome / produto. Fallback para nomes legados. */
        itens.push({
          consultor: String(v.consultorNome || v.consultor || '').toUpperCase().trim(),
          cliente: String(v.clienteNome || v.cliente || '').toUpperCase(),
          treinamento: String(v.produto || v.treinamento || '').toUpperCase(),
          valor: +v.valor || 0,
          status: v.status || 'aberto',
          entrada: +v.entrada || 0,
          data: v.data || '',
          src: 'avulso',
          srcNome: 'Venda avulsa'
        });
      });
    }
    return itens;
  }

  /* Carrega dados: turmas (inteiras) + pipelineSales de TODOS os meses da
     janela + pipelineGoals dos últimos 6 (para Constância). Retorna Promise.
     A janela de meses respeita window._icFbJanelaMeses (default 3). */
  function _icFbLoadDados(dataYmd){
    if(typeof window._fbGet !== 'function') return Promise.resolve(null);
    var mesAlvo = _icFbMesKey(dataYmd);
    var janela = window._icFbJanelaMeses;
    if(janela == null) janela = 0;
    var mesesAvulso = [];
    if(janela === -1){
      /* Carrega até 24 meses para trás como aproximação de "tudo" */
      for(var i=0;i<24;i++) mesesAvulso.push(_icFbAddMeses(dataYmd, -i));
    } else if(janela === 0){
      mesesAvulso = [mesAlvo];
    } else {
      for(var i=0;i<janela;i++) mesesAvulso.push(_icFbAddMeses(dataYmd, -i));
    }
    var meses6 = [];
    for(var i=0;i<6;i++) meses6.push(_icFbAddMeses(dataYmd, -i));
    return Promise.all([
      window._fbGet('turmas').catch(function(){return {};}),
      Promise.all(mesesAvulso.map(function(mk){
        return window._fbGet('pipelineSales/'+mk).then(function(d){return d||{};}).catch(function(){return {};});
      })),
      Promise.all(meses6.map(function(mk){
        return window._fbGet('pipelineGoals/'+mk).then(function(g){return {mes:mk,goals:g||{}};}).catch(function(){return {mes:mk,goals:{}};});
      }))
    ]).then(function(res){
      /* Achata todas as avulsas em um único objeto (compatível com schema antigo) */
      var avulsoMerge = {};
      (res[1]||[]).forEach(function(mesData){
        Object.assign(avulsoMerge, mesData);
      });
      return {
        mesAlvo: mesAlvo,
        turmas: res[0]||{},
        vendasAvulso: avulsoMerge,
        goalsHist: res[2]||[],
        janela: janela
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
    /* Negociação: 70% conversão + 30% ticket relativo.
       NÃO altera o score; apenas registra a "Taxa de perda" como sinal
       complementar — desistiu ÷ (pagos+negoc+entrada+desistiu). Aparece
       no drill-down e no tooltip, sem entrar no cálculo principal. */
    var negScore = null;
    if(convMeu != null){
      var conv01 = convMeu;
      var ticketRel = ticketTime > 0 ? ticketMeu/ticketTime : 1;
      var blend = 0.7*conv01 + 0.3*Math.min(1.5, ticketRel)/1.5;
      negScore = clamp(Math.round(blend*10));
    }
    var taxaPerdaNeg = (convDenom + desistiuMeus) > 0 ? desistiuMeus / (convDenom + desistiuMeus) : null;
    /* Conversão FINAL combinada com taxa de perda — pagos ÷ (pagos+negoc+entrada+desistiu)
       Identidade: convCombinada = convMeu × (1 − taxaPerda). Sinal de visualização. */
    var convCombinadaNeg = (convDenom + desistiuMeus) > 0 ? pagosMeus / (convDenom + desistiuMeus) : null;
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
        if(!ps || ps >= dados.mesAlvo) return; /* só turmas anteriores (qualquer status, fechadas inclusive) */
        if(cutoff && ps < cutoff) return;       /* respeita cutoff retroativo */
        var nomeTurma = String(t.nome||t.titulo||tid).toUpperCase();
        var cls = t.clientes;
        if(cls && !Array.isArray(cls) && typeof cls === 'object') cls = Object.values(cls).filter(Boolean);
        cls = cls || [];
        cls.forEach(function(c){
          if(!c) return;
          var nomeCli = c.cliente || c.clienteNome;
          if(!nomeCli) return;
          var consultC = String(c.consultor || c.consultorNome || '').toUpperCase().trim();
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
            cliente: String(nomeCli).toUpperCase(),
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
        neg:   { auto: negScore,   convMeu: convMeu, convTime: convTime, ticketMeu: ticketMeu, ticketTime: ticketTime, pagos: pagosMeus, negoc: negocMeus, entrada: entradaMeus, desistiu: desistiuMeus, taxaPerda: taxaPerdaNeg, convCombinada: convCombinadaNeg },
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
        + '👥 Clientes considerados: '+d.meu+' novos do consultor (vs média '+d.media+' do time)\n\n'
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
        + '👥 Clientes considerados: '+d.total+' totais do consultor\n\n'
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
      var tp = d.taxaPerda != null ? (d.taxaPerda*100).toFixed(0)+'%' : '—';
      var cc = d.convCombinada != null ? (d.convCombinada*100).toFixed(0)+'%' : '—';
      var pP = d.pagos||0, pN = d.negoc||0, pE = d.entrada||0, pD = d.desistiu||0;
      var denomConv = pP + pN + pE;
      var denomFinal = denomConv + pD;
      return cab
        + '👥 Clientes considerados: '+(denomConv+pD)+' (pagos='+pP+' · negoc='+pN+' · entrada='+pE+' · desistiu='+pD+')\n\n'
        + '• Conversão (oficial): '+conv+' (time: '+convT+')\n'
        + '  fórmula: pagos ÷ (pagos+negoc+entrada) = '+pP+' ÷ ('+pP+'+'+pN+'+'+pE+') = '+pP+' ÷ '+denomConv+'\n'
        + '• Ticket médio: '+tk+' (média de '+pP+' venda'+(pP!==1?'s':'')+' paga'+(pP!==1?'s':'')+') · time: '+tkT+'\n'
        + '• Ticket relativo: '+ratio+'×\n'
        + '• Score = 70% conversão + 30% ticket relativo\n\n'
        + '⚠ Sinal complementar — Taxa de perda na negociação: '+tp+'\n'
        + '  fórmula: desistiu ('+pD+') ÷ (pagos+negoc+entrada+desistiu) = '+pD+' ÷ '+denomFinal+'\n'
        + '  → NÃO entra no score, mas alerta para clientes que escaparam\n\n'
        + '🧮 Conversão FINAL combinada com taxa de perda: '+cc+'\n'
        + '  fórmula: pagos ÷ (pagos+negoc+entrada+desistiu) = '+pP+' ÷ '+denomFinal+'\n'
        + '  = conversão × (1 − taxa de perda) → '+conv+' × (1 − '+tp+') = '+cc+'\n\n'
        + 'Sinal: '+(d.auto>=8?'fecha bem e mantém ticket':d.auto>=6?'fecha médio':'gargalo no fechamento ou descontos demais');
    }
    if(key==='fup'){
      return cab
        + '👥 Clientes considerados: '+d.totalNeg+' em negociação no escopo\n\n'
        + '• Negociações ativas: '+d.totalNeg+'\n'
        + '• Paradas há > 14 dias: '+d.parados+'\n'
        + '• Score = 10 − (2 × paradas), mínimo 1\n\n'
        + 'Sinal: '+(d.auto>=8?'cadência saudável':d.auto>=6?'algumas perdas':'cliente esfriando — risco real');
    }
    if(key==='const'){
      var p = d.totalComMeta>0 ? Math.round(d.batidos/d.totalComMeta*100)+'%' : '—';
      return cab
        + '📅 Meses considerados: '+d.totalComMeta+' (com meta configurada)\n\n'
        + '• Meses com meta configurada: '+d.totalComMeta+'\n'
        + '• Meses na meta (≥ Mínima): '+d.batidos+'\n'
        + '• Constância: '+p+'\n'
        + '• Score = ('+d.batidos+'/'+d.totalComMeta+') × 10\n\n'
        + 'Sinal: '+(d.auto>=8?'rocha — previsível':d.auto>=6?'consistente':'oscila — depende de fatores externos');
    }
    if(key==='mix'){
      return cab
        + '👥 Clientes considerados: '+d.pagos+' pagos no escopo\n\n'
        + '• Pagos no mês: '+d.pagos+'\n'
        + '• Treinamentos distintos: '+d.distintos+'\n'
        + '• Curva: 1=4 · 2=6 · 3=7 · 4=8 · 5=9 · 7+=10\n\n'
        + 'Sinal: '+(d.auto>=8?'vende portfólio amplo':d.auto>=6?'mix médio':'concentrado em poucos produtos — risco e perda de upsell');
    }
    if(key==='apr'){
      var pp = d.pct!=null ? (d.pct*100).toFixed(0)+'%' : '—';
      return cab
        + '👥 Clientes considerados: '+d.total+' totais na carteira\n\n'
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
      var totalQual = (_metricasCache && _metricasCache.metricas.qual && _metricasCache.metricas.qual.total) || 0;
      return cab
        + '👥 Universos considerados:\n'
        + '   • Preservação: '+totalQual+' clientes no escopo · '+(d.perdidos||0)+' perdidos (desistiu+sem-status)\n'
        + '   • Potencial: pipeline cultivado R$ '+Math.round((d.rPag||0)+(d.rNeg||0)+(d.rEnt||0)).toLocaleString('pt-BR')+' vs meta R$ '+Math.round(d.metaBas||0).toLocaleString('pt-BR')+'\n'
        + '   • Recuperação: '+(d.clienAntigosVivos||0)+' vivos de '+(d.clienAntigos||0)+' clientes em turmas anteriores\n\n'
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
    _doc.tipo = _fbModo;   /* Fase B: garante que o tipo atual é salvo */
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
      /* Fase B: histórico recém-carregado → re-avalia o modo automaticamente
         (apenas se o gestor não fixou manualmente nesta sessão) */
      if(!_fbModoManual){
        var sug = _icFbDetectarModo();
        _fbModo = sug.modo;
        if(_doc) _doc.tipo = _fbModo;
      }
      _icFbRenderModoTabs();
      _icFbRenderModoBlocos();
    }).catch(function(){
      _historico = [];
      _icFbRenderHistorico();
      _icFbRenderModoTabs();
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

  /* ── Radar SVG · TODAS as competências de COMPS_DEF ────── */
  function _icFbRenderRadar(){
    var svg = document.getElementById('fbRadar');
    if(!svg) return;
    var N = COMPS_DEF.length;         /* nº dinâmico (hoje 9) */
    var R = 90;
    var ANG_STEP = 2*Math.PI/N;
    svg.innerHTML = '';
    var labels = COMPS_DEF.map(function(c){return c.label;});
    var atual = COMPS_DEF.map(function(c){return (_doc && _doc.comps && _doc.comps[c.key]) || 0;});
    var anterior = _icFbAnteriorVals();
    /* Grid concêntrico (N-gono em cada nível) */
    for(var g=2; g<=10; g+=2){
      var pts = '';
      for(var i=0;i<N;i++){
        var ang = -Math.PI/2 + i*ANG_STEP;
        var r = (g/10)*R;
        pts += (r*Math.cos(ang))+','+(r*Math.sin(ang))+' ';
      }
      svg.innerHTML += '<polygon points="'+pts.trim()+'" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>';
    }
    /* Eixos + labels */
    for(var i=0;i<N;i++){
      var ang = -Math.PI/2 + i*ANG_STEP;
      var x = R*Math.cos(ang), y = R*Math.sin(ang);
      svg.innerHTML += '<line x1="0" y1="0" x2="'+x+'" y2="'+y+'" stroke="rgba(255,255,255,.06)" stroke-width="1"/>';
      var lx = (R+16)*Math.cos(ang), ly = (R+16)*Math.sin(ang) + 3;
      var anchor = Math.abs(Math.cos(ang)) < 0.2 ? 'middle' : (Math.cos(ang) > 0 ? 'start' : 'end');
      /* Label encurta se for grande (evita sobreposição com 9 eixos) */
      var lbl = labels[i].length > 12 ? labels[i].slice(0,11)+'…' : labels[i];
      svg.innerHTML += '<text x="'+lx+'" y="'+ly+'" fill="#bbb" font-size="9" font-weight="700" text-anchor="'+anchor+'">'+lbl+'</text>';
    }
    function poly(vals, color, opacity){
      if(!vals || !vals.length) return;
      var pts = '';
      for(var i=0;i<N;i++){
        var ang = -Math.PI/2 + i*ANG_STEP;
        var v = +(vals[i] || 0);
        var r = (v/10)*R;
        pts += (r*Math.cos(ang))+','+(r*Math.sin(ang))+' ';
      }
      svg.innerHTML += '<polygon points="'+pts.trim()+'" fill="'+color+'" fill-opacity="'+opacity+'" stroke="'+color+'" stroke-width="2"/>';
      for(var i=0;i<N;i++){
        var ang = -Math.PI/2 + i*ANG_STEP;
        var v = +(vals[i] || 0);
        var r = (v/10)*R;
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
  /* Janela de análise: escolhe quantos meses para trás considerar.
     0 = só mês do ciclo · 3/6/12 = últimos N meses · -1 = tudo (até 24m) */
  window._fbSetJanela = function(meses){
    window._icFbJanelaMeses = meses;
    /* visual: marca o chip ativo */
    document.querySelectorAll('.fb-jan').forEach(function(b){
      b.classList.toggle('active', +b.getAttribute('data-jan') === meses);
    });
    var info = document.getElementById('fbJanInfo');
    if(info){
      var txt = meses === 0 ? 'apenas o mês do ciclo'
              : meses === -1 ? 'todos os meses disponíveis (até 24)'
              : 'últimos '+meses+' meses (incluindo o do ciclo)';
      info.textContent = txt;
    }
    /* Recalcula sugestões e re-renderiza */
    _icFbAtualizarSugestoes();
  };

  /* Recalcula métricas de Aproveitamento com filtro de origem aplicado.
     Atualiza _metricasCache.metricas.apr e o badge da competência. */
  function _icFbRecalcApr(){
    if(!_metricasCache) return;
    var srcs = window._fbAprSrcs || new Set(['turma','avulso']);
    var itens = (_metricasCache.itens || []).filter(function(it){return srcs.has(it.src);});
    var pagos = itens.filter(function(it){return it.status==='pago';}).length;
    var total = itens.length;
    var pct = total > 0 ? pagos/total : null;
    var score = pct != null ? Math.max(1, Math.min(10, Math.round(pct*10))) : null;
    _metricasCache.metricas.apr.auto = score;
    _metricasCache.metricas.apr.pagos = pagos;
    _metricasCache.metricas.apr.total = total;
    _metricasCache.metricas.apr.pct = pct;
    _icFbRenderSugestoes();
  }
  /* Recalcula métricas de Negociação com filtro de origem aplicado. */
  function _icFbRecalcNeg(){
    if(!_metricasCache) return;
    var srcs = window._fbNegSrcs || new Set(['turma','avulso']);
    var itens = (_metricasCache.itens || []).filter(function(it){return srcs.has(it.src);});
    var pagosArr = itens.filter(function(it){return it.status==='pago';});
    var negoc = itens.filter(function(it){return it.status==='negociacao';}).length;
    var entrada = itens.filter(function(it){return it.status==='entrada';}).length;
    var desistiu = itens.filter(function(it){return it.status==='desistiu';}).length;
    var pagos = pagosArr.length;
    var convDen = pagos + negoc + entrada;
    var convMeu = convDen > 0 ? pagos/convDen : null;
    var ticketMeu = pagos > 0 ? pagosArr.reduce(function(s,it){return s+(+it.valor||0);},0)/pagos : 0;
    var ticketTime = _metricasCache.metricas.neg.ticketTime || 0;
    var negScore = null;
    if(convMeu != null){
      var ticketRel = ticketTime > 0 ? ticketMeu/ticketTime : 1;
      var blend = 0.7*convMeu + 0.3*Math.min(1.5, ticketRel)/1.5;
      negScore = Math.max(1, Math.min(10, Math.round(blend*10)));
    }
    var taxaPerda = (convDen + desistiu) > 0 ? desistiu/(convDen+desistiu) : null;
    var convCombinada = (convDen + desistiu) > 0 ? pagos/(convDen+desistiu) : null;
    Object.assign(_metricasCache.metricas.neg, {
      auto: negScore, pagos: pagos, negoc: negoc, entrada: entrada, desistiu: desistiu,
      convMeu: convMeu, ticketMeu: ticketMeu, taxaPerda: taxaPerda, convCombinada: convCombinada
    });
    _icFbRenderSugestoes();
  }

  /* Aproveitamento: alterna a inclusão de uma origem (turma/avulso) */
  window._fbAprToggleSrc = function(src){
    if(!window._fbAprSrcs || !window._fbAprSrcs.size){
      window._fbAprSrcs = new Set(['turma','avulso']);
    }
    var s = window._fbAprSrcs;
    if(s.has(src)){
      s.delete(src);
      if(s.size === 0){ s.add('turma'); s.add('avulso'); }
    } else {
      s.add(src);
    }
    _icFbRecalcApr();
    if(typeof window._fbDetAbrir === 'function') window._fbDetAbrir('apr');
  };
  /* Negociação: mesma lógica de toggle, estado próprio */
  window._fbNegToggleSrc = function(src){
    if(!window._fbNegSrcs || !window._fbNegSrcs.size){
      window._fbNegSrcs = new Set(['turma','avulso']);
    }
    var s = window._fbNegSrcs;
    if(s.has(src)){
      s.delete(src);
      if(s.size === 0){ s.add('turma'); s.add('avulso'); }
    } else {
      s.add(src);
    }
    _icFbRecalcNeg();
    if(typeof window._fbDetAbrir === 'function') window._fbDetAbrir('neg');
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

  /* Helper genérico: ordena seções colocando as vazias por último.
     Cada seção: {titulo, arr, render()|vazio} → vira string HTML pronta. */
  function _icFbOrdenarSecoes(secoes){
    return secoes.slice().sort(function(a,b){
      var az = (a.arr && a.arr.length) ? 0 : 1;
      var bz = (b.arr && b.arr.length) ? 0 : 1;
      return az - bz;
    });
  }
  function _icFbRenderSecoes(secoes){
    return _icFbOrdenarSecoes(secoes).map(function(s){
      var cnt = (s.arr && s.arr.length) || 0;
      var head = '<div class="fb-det-secao-h">'+s.titulo+' ('+cnt+(s.suf||'')+')</div>';
      if(s.render) return head + s.render();
      var conteudo = cnt
        ? (typeof s.tbl === 'function' ? s.tbl(s.arr) : '')
        : '<div class="fb-det-vazio">'+(s.vazio||'Sem dados.')+'</div>';
      return head + conteudo;
    }).join('');
  }

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
        + _icFbRenderSecoes([
            { titulo:'✅ Avançaram', arr:avancados, render:function(){return tblQual(avancados, 'Nenhum cliente avançou.');}, vazio:'Nenhum cliente avançou.' },
            { titulo:'⏳ Não avançaram — aberto · desistiu · sem status', arr:naoAvancou, render:function(){return tblQual(naoAvancou, '🎉 Carteira inteira engajada.');}, vazio:'🎉 Carteira inteira engajada.' }
          ]);
    }

    /* ── Negociação ── */
    if(key === 'neg'){
      /* Filtro de origem próprio do Negociação (independente do Aproveitamento) */
      if(!window._fbNegSrcs || !window._fbNegSrcs.size){
        window._fbNegSrcs = new Set(['turma','avulso']);
      }
      var nSrcs = window._fbNegSrcs;
      var nAtT = nSrcs.has('turma');
      var nAtA = nSrcs.has('avulso');
      function _fNegItens(arr){ return arr.filter(function(it){return nSrcs.has(it.src);}); }

      var pagos = itens.filter(function(it){return it.status==='pago';});
      var negs  = itens.filter(function(it){return it.status==='negociacao';});
      var ents  = itens.filter(function(it){return it.status==='entrada';});
      var desistiusL = itens.filter(function(it){return it.status==='desistiu';});
      /* Versões filtradas conforme cards clicados */
      var pagosFN = _fNegItens(pagos);
      var negsFN  = _fNegItens(negs);
      var entsFN  = _fNegItens(ents);
      var desistiusFN = _fNegItens(desistiusL);
      /* Taxa de perda (complementar, NÃO entra no score) */
      var denomPerda = pagosFN.length + negsFN.length + entsFN.length + desistiusFN.length;
      var taxaPerdaF = denomPerda > 0 ? desistiusFN.length / denomPerda : null;
      /* Quebra de Pagos por origem (3 partes) */
      var pagosTurma  = pagos.filter(function(it){return it.src==='turma';});
      var pagosAvulso = pagos.filter(function(it){return it.src==='avulso';});

      /* Recalcula KPIs com base no filtro */
      var convDenomF = pagosFN.length + negsFN.length + entsFN.length;
      var convF = convDenomF > 0 ? pagosFN.length/convDenomF : null;
      var ticketF = pagosFN.length > 0 ? pagosFN.reduce(function(s,it){return s+(+it.valor||0);},0) / pagosFN.length : 0;
      var totalEntradasVal = entsFN.reduce(function(s,it){
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

      /* Cards Turma/Avulsa clicáveis (mesmo padrão do Aproveitamento) */
      function bgPorPct(pct){
        if(pct >= 0.75) return {border:'rgba(52,211,153,.35)', bg:'rgba(52,211,153,.06)', cor:'var(--green)'};
        if(pct >= 0.5)  return {border:'rgba(96,165,250,.35)', bg:'rgba(96,165,250,.06)', cor:'var(--blue)'};
        if(pct >= 0.25) return {border:'rgba(255,183,64,.35)', bg:'rgba(255,183,64,.06)', cor:'var(--amber)'};
        return            {border:'rgba(255,95,87,.35)',   bg:'rgba(255,95,87,.06)', cor:'var(--red)'};
      }
      function negOrigemCard(titulo, ico, tag, src, itensOrig, ativo){
        var pagoO  = itensOrig.filter(function(it){return it.status==='pago';}).length;
        var negocO = itensOrig.filter(function(it){return it.status==='negociacao';}).length;
        var entO   = itensOrig.filter(function(it){return it.status==='entrada';}).length;
        var convDen = pagoO + negocO + entO;
        var convO   = convDen > 0 ? pagoO/convDen : 0;
        var st     = bgPorPct(convO);
        var rPag   = itensOrig.filter(function(it){return it.status==='pago';}).reduce(function(s,it){return s+(+it.valor||0);},0);
        var dim    = ativo ? '' : 'opacity:.45;filter:grayscale(.6);';
        var checkSel = ativo ? '<span style="font-size:11px;color:'+st.cor+';margin-left:6px;font-weight:800;">✓</span>' : '';
        return '<div onclick="_fbNegToggleSrc(\''+src+'\')" title="Clique para isolar/incluir esta origem" '
          + 'style="background:'+st.bg+';border:1px solid '+st.border+';border-radius:10px;padding:14px;cursor:pointer;transition:all .15s;'+dim+'" '
          + 'onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.2)\';" '
          + 'onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\';">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
          +   '<div style="font-size:13px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:6px;">'+ico+' '+titulo+' '+tag+checkSel+'</div>'
          +   '<div style="font-size:20px;font-weight:800;color:'+st.cor+';font-variant-numeric:tabular-nums;">'+(convDen>0?Math.round(convO*100)+'%':'—')+'</div>'
          + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;text-align:center;">'
          +   '<div><div style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Pagos</div><div style="font-size:15px;font-weight:800;color:var(--green);">'+pagoO+'</div></div>'
          +   '<div><div style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Negoc.</div><div style="font-size:15px;font-weight:800;color:#ffe000;">'+negocO+'</div></div>'
          +   '<div><div style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Entrada</div><div style="font-size:15px;font-weight:800;color:#ffb740;">'+entO+'</div></div>'
          +   '<div><div style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">R$ pago</div><div style="font-size:13px;font-weight:800;color:'+st.cor+';">'+_fmtR(rPag)+'</div></div>'
          + '</div>'
          + '</div>';
      }
      var itensTurmaN  = itens.filter(function(it){return it.src==='turma';});
      var itensAvulsoN = itens.filter(function(it){return it.src==='avulso';});
      var negOrigemCards = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0;">'
        + negOrigemCard('Turma',  '🏫', '<span class="fb-det-src-tag turma">TURMA</span>',   'turma',  itensTurmaN,  nAtT)
        + negOrigemCard('Avulsa', '📦', '<span class="fb-det-src-tag avulso">AVULSO</span>', 'avulso', itensAvulsoN, nAtA)
        + '</div>';
      var negDica = (nAtT && nAtA)
        ? 'Cards mostram conversão por origem. Clique pra isolar (ex: só Turma).'
        : ('Filtrado: <b style="color:var(--accent);">só '+(nAtT?'TURMA':'AVULSA')+'</b>. Clique no card desligado pra incluir os dois.');
      var negNotaFonte = '<div style="font-size:10px;color:var(--muted);padding:6px 10px;text-align:center;margin-bottom:14px;">'+negDica+'</div>';

      /* Seção Pagos em 3 partes (quando ambos ativos) — mesma lógica do Aproveitamento */
      var pagosNegHtml = '';
      if(nAtT && nAtA){
        pagosNegHtml = '<div class="fb-det-secao-h">✅ Pagos no mês ('+pagos.length+')</div>'
          + (pagos.length ? tblNeg(pagos, 'Valor pago') : '<div class="fb-det-vazio">Nenhuma venda paga neste mês.</div>')
          + '<div class="fb-det-secao-h">🏫 Pagos Turma ('+pagosTurma.length+')</div>'
          + (pagosTurma.length ? tblNeg(pagosTurma, 'Valor pago') : '<div class="fb-det-vazio">Nenhum pago de turma.</div>')
          + '<div class="fb-det-secao-h">📦 Pagos Avulso ('+pagosAvulso.length+')</div>'
          + (pagosAvulso.length ? tblNeg(pagosAvulso, 'Valor pago') : '<div class="fb-det-vazio">Nenhum pago avulso.</div>');
      } else if(nAtT){
        pagosNegHtml = '<div class="fb-det-secao-h">🏫 Pagos Turma ('+pagosTurma.length+')</div>'
          + (pagosTurma.length ? tblNeg(pagosTurma, 'Valor pago') : '<div class="fb-det-vazio">Nenhum pago de turma.</div>');
      } else {
        pagosNegHtml = '<div class="fb-det-secao-h">📦 Pagos Avulso ('+pagosAvulso.length+')</div>'
          + (pagosAvulso.length ? tblNeg(pagosAvulso, 'Valor pago') : '<div class="fb-det-vazio">Nenhum pago avulso.</div>');
      }

      /* Cor da taxa de perda: quanto menor melhor */
      var corPerda = taxaPerdaF == null ? 'var(--muted)'
                   : taxaPerdaF < 0.1  ? 'var(--green)'
                   : taxaPerdaF < 0.25 ? 'var(--amber)'
                                       : 'var(--red)';
      /* Conversão FINAL combinada com taxa de perda */
      var convFinalDenom = pagosFN.length + negsFN.length + entsFN.length + desistiusFN.length;
      var convFinalF = convFinalDenom > 0 ? pagosFN.length / convFinalDenom : null;
      return formulaHtml
        + '<div class="fb-det-stats">'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Pagos</div><div class="fb-det-stat-val green">'+pagosFN.length+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Em negociação</div><div class="fb-det-stat-val amber">'+negsFN.length+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Com entrada</div><div class="fb-det-stat-val" style="color:#ffb740;">'+entsFN.length+'</div></div>'
        +   '<div class="fb-det-stat" title="Pagos ÷ (pagos+negoc+entrada). Entra no score como peso 70%."><div class="fb-det-stat-lbl">Conversão (oficial)</div><div class="fb-det-stat-val blue">'+(convF!=null?Math.round(convF*100)+'%':'—')+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Ticket médio</div><div class="fb-det-stat-val">'+(ticketF?_fmtR(ticketF):'—')+'</div></div>'
        +   '<div class="fb-det-stat" title="Sinal complementar — desistiu ÷ (pagos+negoc+entrada+desistiu). Não entra no score.">'
        +     '<div class="fb-det-stat-lbl">⚠ Taxa de perda <small style="text-transform:none;font-weight:500;">(complementar)</small></div>'
        +     '<div class="fb-det-stat-val" style="color:'+corPerda+';">'+(taxaPerdaF!=null?Math.round(taxaPerdaF*100)+'%':'—')+'</div>'
        +     '<div style="font-size:9px;color:var(--muted);margin-top:3px;">'+(desistiusFN.length||0)+' desistiu(am) no escopo</div>'
        +   '</div>'
        +   '<div class="fb-det-stat" title="Pagos ÷ (pagos+negoc+entrada+desistiu) = conv × (1 − taxa de perda). Mostra o quadro real incluindo as perdas.">'
        +     '<div class="fb-det-stat-lbl">🧮 Conv. FINAL <small style="text-transform:none;font-weight:500;">(com perda)</small></div>'
        +     '<div class="fb-det-stat-val" style="color:'+(convFinalF!=null && convFinalF>=0.7?'var(--green)':convFinalF!=null && convFinalF>=0.4?'var(--blue)':'var(--amber)')+';">'+(convFinalF!=null?Math.round(convFinalF*100)+'%':'—')+'</div>'
        +     '<div style="font-size:9px;color:var(--muted);margin-top:3px;">'+(convF!=null && taxaPerdaF!=null?Math.round(convF*100)+'% × (1−'+Math.round(taxaPerdaF*100)+'%)':'—')+'</div>'
        +   '</div>'
        + '</div>'
        + negOrigemCards
        + negNotaFonte
        + pagosNegHtml
        + _icFbRenderSecoes([
            { titulo:'🤝 Em negociação', arr:negsFN,    render:function(){return tblNeg(negsFN, 'Valor estimado');},  vazio:'Nenhuma negociação em curso.' },
            { titulo:'💵 Com entrada parcial', arr:entsFN, suf:(totalEntradasVal>0?' · '+_fmtR(totalEntradasVal):''),
              render:function(){return tblNeg(entsFN, 'Entrada paga');}, vazio:'Nenhum cliente com entrada parcial.' },
            { titulo:'⚠ Desistiram durante o ciclo', arr:desistiusFN,
              render:function(){return tblNeg(desistiusFN, 'Valor potencial perdido');},
              vazio:'✅ Ninguém desistiu — todas as oportunidades preservadas.' }
          ]);
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
      /* Estado do filtro de origem (Turma/Avulsa) — toggle independente.
         Default: ambos ativos. Nunca permite ficar com nenhum (reseta). */
      if(!window._fbAprSrcs || !window._fbAprSrcs.size){
        window._fbAprSrcs = new Set(['turma','avulso']);
      }
      var srcs = window._fbAprSrcs;
      var ativoT = srcs.has('turma');
      var ativoA = srcs.has('avulso');
      function _fItens(arr){ return arr.filter(function(it){return srcs.has(it.src);}); }
      /* Listas FILTRADAS conforme cards clicados */
      var itensF   = _fItens(itens);
      var pagosL   = itens.filter(function(it){return it.status==='pago';});
      var pagosLF  = _fItens(pagosL);
      var pagosTurma  = pagosL.filter(function(it){return it.src==='turma';});
      var pagosAvulso = pagosL.filter(function(it){return it.src==='avulso';});
      var negocLF   = _fItens(itens.filter(function(it){return it.status==='negociacao';}));
      var entradaLF = _fItens(itens.filter(function(it){return it.status==='entrada';}));
      var abertoLF  = _fItens(itens.filter(function(it){return it.status==='aberto';}));
      /* KPIs do topo recalculados conforme filtro ativo */
      var totalF = itensF.length;
      var pagosFCount = pagosLF.length;
      var pctF = totalF > 0 ? pagosFCount/totalF : null;
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
      /* Cards clicáveis: cada um isola/inclui sua origem */
      function bgPorPct(pct){
        if(pct >= 0.75) return {border:'rgba(52,211,153,.35)', bg:'rgba(52,211,153,.06)', cor:'var(--green)'};
        if(pct >= 0.5)  return {border:'rgba(96,165,250,.35)', bg:'rgba(96,165,250,.06)', cor:'var(--blue)'};
        if(pct >= 0.25) return {border:'rgba(255,183,64,.35)', bg:'rgba(255,183,64,.06)', cor:'var(--amber)'};
        return            {border:'rgba(255,95,87,.35)',   bg:'rgba(255,95,87,.06)', cor:'var(--red)'};
      }
      function origemCard(titulo, ico, tag, src, itensOrig, ativo){
        var totalO = itensOrig.length;
        var pagoO  = itensOrig.filter(function(it){return it.status==='pago';}).length;
        var negocO = itensOrig.filter(function(it){return it.status==='negociacao';}).length;
        var entO   = itensOrig.filter(function(it){return it.status==='entrada';}).length;
        var abertoO= itensOrig.filter(function(it){return it.status==='aberto';}).length;
        var pctO   = totalO > 0 ? pagoO/totalO : 0;
        var st     = bgPorPct(pctO);
        var rPag   = itensOrig.filter(function(it){return it.status==='pago';}).reduce(function(s,it){return s+(+it.valor||0);},0);
        var dim    = ativo ? '' : 'opacity:.45;filter:grayscale(.6);';
        var checkSel = ativo ? '<span style="font-size:11px;color:'+st.cor+';margin-left:6px;font-weight:800;">✓</span>' : '';
        return '<div onclick="_fbAprToggleSrc(\''+src+'\')" title="Clique para isolar/incluir esta origem" '
          + 'style="background:'+st.bg+';border:1px solid '+st.border+';border-radius:10px;padding:14px;cursor:pointer;transition:all .15s;'+dim+'" '
          + 'onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.2)\';" '
          + 'onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\';">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
          +   '<div style="font-size:13px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:6px;">'+ico+' '+titulo+' '+tag+checkSel+'</div>'
          +   '<div style="font-size:20px;font-weight:800;color:'+st.cor+';font-variant-numeric:tabular-nums;">'+(totalO>0?Math.round(pctO*100)+'%':'—')+'</div>'
          + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;text-align:center;">'
          +   '<div><div style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Total</div><div style="font-size:15px;font-weight:800;color:var(--text);">'+totalO+'</div></div>'
          +   '<div><div style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Pagos</div><div style="font-size:15px;font-weight:800;color:var(--green);">'+pagoO+'</div></div>'
          +   '<div><div style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Negoc.</div><div style="font-size:15px;font-weight:800;color:#ffe000;">'+negocO+'</div></div>'
          +   '<div><div style="color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Outros</div><div style="font-size:15px;font-weight:800;color:var(--muted);">'+(entO+abertoO)+'</div></div>'
          + '</div>'
          + (rPag>0?'<div style="margin-top:8px;font-size:11px;color:var(--muted);text-align:right;">R$ pago: <b style="color:'+st.cor+';">'+_fmtR(rPag)+'</b></div>':'')
          + '</div>';
      }
      var itensTurma  = itens.filter(function(it){return it.src==='turma';});
      var itensAvulso = itens.filter(function(it){return it.src==='avulso';});
      var origemCards = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0;">'
        + origemCard('Turma',  '🏫', '<span class="fb-det-src-tag turma">TURMA</span>',   'turma',  itensTurma,  ativoT)
        + origemCard('Avulsa', '📦', '<span class="fb-det-src-tag avulso">AVULSO</span>', 'avulso', itensAvulso, ativoA)
        + '</div>';
      var dicaFiltro = (ativoT && ativoA)
        ? 'Cards mostram totais por origem. Clique pra isolar (ex: só Turma).'
        : ('Filtrado: <b style="color:var(--accent);">só '+(ativoT?'TURMA':'AVULSA')+'</b>. Clique no card desligado pra incluir os dois novamente.');
      var notaFonte = '<div style="font-size:10px;color:var(--muted);padding:6px 10px;text-align:center;margin-bottom:14px;">'
        + dicaFiltro
        + ' &nbsp;·&nbsp; Vendas avulsas vêm de <code style="font-size:9px;">pipelineSales/'+(_metricasCache.mes||'')+'</code>'
        + '</div>';
      /* Seção PAGOS com 3 partes — quando ambos ativos. Quando filtrado, mostra só a relevante. */
      var pagosHtml = '';
      if(ativoT && ativoA){
        pagosHtml = '<div class="fb-det-secao-h">✅ Pagos ('+pagosL.length+')</div>' + tbl(pagosL, 'Nenhum cliente pago no mês.')
          + '<div class="fb-det-secao-h">🏫 Pagos Turma ('+pagosTurma.length+')</div>' + tbl(pagosTurma, 'Nenhum pago de turma no mês.')
          + '<div class="fb-det-secao-h">📦 Pagos Avulso ('+pagosAvulso.length+')</div>' + tbl(pagosAvulso, 'Nenhum pago avulso no mês.');
      } else if(ativoT){
        pagosHtml = '<div class="fb-det-secao-h">🏫 Pagos Turma ('+pagosTurma.length+')</div>' + tbl(pagosTurma, 'Nenhum pago de turma no mês.');
      } else {
        pagosHtml = '<div class="fb-det-secao-h">📦 Pagos Avulso ('+pagosAvulso.length+')</div>' + tbl(pagosAvulso, 'Nenhum pago avulso no mês.');
      }
      /* Outras seções de status: filtradas, ordem dinâmica (vazias por último) */
      var outrasSecoes = [
        { titulo:'💵 Com entrada',   arr:entradaLF, vazio:'Nenhum cliente com entrada parcial.' },
        { titulo:'🤝 Em negociação', arr:negocLF,   vazio:'Nenhum cliente em negociação.' },
        { titulo:'📋 Em aberto',     arr:abertoLF,  vazio:'🎉 Carteira inteira engajada.' }
      ];
      outrasSecoes.sort(function(a,b){
        var az = a.arr.length === 0 ? 1 : 0;
        var bz = b.arr.length === 0 ? 1 : 0;
        return az - bz;
      });
      var outrasHtml = outrasSecoes.map(function(s){
        return '<div class="fb-det-secao-h">'+s.titulo+' ('+s.arr.length+')</div>' + tbl(s.arr, s.vazio);
      }).join('');
      return formulaHtml
        + '<div class="fb-det-stats">'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Total carteira</div><div class="fb-det-stat-val">'+totalF+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Pagos</div><div class="fb-det-stat-val green">'+pagosFCount+'</div></div>'
        +   '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Aproveitamento</div><div class="fb-det-stat-val blue">'+(pctF!=null?Math.round(pctF*100)+'%':'—')+'</div></div>'
        + '</div>'
        + origemCards
        + notaFonte
        + pagosHtml
        + outrasHtml;
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

  /* ══════════════════════════════════════════════════════════
     POPOVER ANO/MÊS/DIA para o campo "Data do ciclo"
     ══════════════════════════════════════════════════════════ */
  var _fbCalMode = 'mes';     /* 'ano' | 'mes' | 'dia' | 'periodo' */
  var _fbPending = null;      /* {mode,y,m,d, per:{start,end}} */
  var _fbCalY = (new Date()).getFullYear();
  var _fbCalM = (new Date()).getMonth()+1;
  /* Estado dos 2 mini-cals do Período */
  var _fbPerIniY = _fbCalY, _fbPerIniM = _fbCalM;
  var _fbPerFimY = _fbCalY, _fbPerFimM = _fbCalM;
  function _fbAddMes(ymObj, delta){
    var d = new Date(ymObj.y, ymObj.m-1+delta, ymObj.d || 1);
    return { y:d.getFullYear(), m:d.getMonth()+1, d:d.getDate() };
  }
  var _MESES_BR2 = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var _MESES_FULL2 = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var _DOW2 = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  function _fbHojeObj(){ var d=new Date(); return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()}; }
  function _fbDiasMes(y,m){ return new Date(y, m, 0).getDate(); }
  function _fbParseData(ymd){
    if(!ymd) return _fbHojeObj();
    var p = String(ymd).split('-');
    if(p.length !== 3) return _fbHojeObj();
    return { y:+p[0], m:+p[1], d:+p[2] };
  }
  function _fbFmtPicker(mode, sel){
    if(!sel) return 'Selecionar...';
    if(mode === 'ano') return 'Ano '+sel.y;
    if(mode === 'mes') return _MESES_FULL2[sel.m-1]+' / '+sel.y;
    if(mode === 'periodo' && sel.per && sel.per.start && sel.per.end){
      var s=sel.per.start, e=sel.per.end;
      return _MESES_BR2[s.m-1]+'/'+s.y+' → '+_MESES_BR2[e.m-1]+'/'+e.y;
    }
    return String(sel.d).padStart(2,'0')+' '+_MESES_BR2[sel.m-1]+' / '+sel.y;
  }
  function _fbTsDmy(o){ return o ? new Date(o.y, o.m-1, o.d).getTime() : null; }
  function _fbFmtDataCurta2(o){ return o ? String(o.d).padStart(2,'0')+'/'+String(o.m).padStart(2,'0')+'/'+o.y : '—'; }
  function _fbAtualizarLabelData(){
    var inp = document.getElementById('fbData');
    var lbl = document.getElementById('fbDataLabel');
    if(!inp || !lbl) return;
    var ymd = inp.value;
    if(!ymd){ lbl.textContent = 'Selecionar...'; return; }
    var s = _fbParseData(ymd);
    var mode = window._fbCalLastMode || 'mes';
    if(mode === 'periodo' && window._fbCalLastPer){
      lbl.textContent = _fbFmtPicker('periodo', { per: window._fbCalLastPer });
    } else {
      lbl.textContent = _fbFmtPicker(mode, s);
    }
  }

  window._fbCalAbrir = function(e){
    if(e){ e.stopPropagation(); }
    var pop = document.getElementById('fbCalPop');
    if(!pop) return;
    var inp = document.getElementById('fbData');
    var atual = inp && inp.value ? _fbParseData(inp.value) : _fbHojeObj();
    _fbCalY = atual.y; _fbCalM = atual.m;
    _fbCalMode = window._fbCalLastMode || 'mes';
    _fbPending = { mode:_fbCalMode, y:atual.y, m:atual.m, d:atual.d };
    /* Restaura última seleção de período se houver */
    if(window._fbCalLastPer && window._fbCalLastPer.start && window._fbCalLastPer.end){
      _fbPending.per = {
        start: Object.assign({}, window._fbCalLastPer.start),
        end:   Object.assign({}, window._fbCalLastPer.end)
      };
      _fbPerIniY = _fbPending.per.start.y; _fbPerIniM = _fbPending.per.start.m;
      _fbPerFimY = _fbPending.per.end.y;   _fbPerFimM = _fbPending.per.end.m;
    } else {
      _fbPending.per = { start:null, end:null };
      _fbPerIniY = atual.y; _fbPerIniM = atual.m;
      _fbPerFimY = atual.y; _fbPerFimM = atual.m;
    }
    _fbCalSincTabs();
    _fbCalRenderAtual();
    _fbCalAtualizarResumo();
    pop.classList.add('show');
  };
  window._fbCalFechar = function(e){
    if(e) e.stopPropagation();
    var pop = document.getElementById('fbCalPop');
    if(pop) pop.classList.remove('show');
    _fbPending = null;
  };
  document.addEventListener('click', function(e){
    var pop = document.getElementById('fbCalPop');
    if(!pop) return;
    if(pop.contains(e.target)) return;
    if(e.target.closest('#fbDataTrigger')) return;
    pop.classList.remove('show');
  });

  window._fbCalTab = function(mode, e){
    if(e) e.stopPropagation();
    if(_fbPending) _fbPending.mode = mode;
    else _fbCalMode = mode;
    _fbCalSincTabs();
    _fbCalRenderAtual();
    _fbCalAtualizarResumo();
  };
  function _fbCalSincTabs(){
    var mode = _fbPending ? _fbPending.mode : _fbCalMode;
    document.querySelectorAll('#fbCalPop .np-cal-tab').forEach(function(t){
      t.classList.toggle('active', t.getAttribute('data-mode') === mode);
    });
    document.querySelectorAll('#fbCalPop .np-cal-pane').forEach(function(p){
      p.classList.toggle('show', p.getAttribute('data-pane') === mode);
    });
  }
  function _fbCalRenderAtual(){
    var mode = _fbPending ? _fbPending.mode : _fbCalMode;
    if(mode === 'ano') _fbCalRenderAno();
    else if(mode === 'mes') _fbCalRenderMes();
    else if(mode === 'periodo') _fbCalRenderPeriodo();
    else _fbCalRenderDia();
  }
  function _fbCalAtualizarResumo(){
    var el = document.getElementById('fbCalResumo');
    if(!el) return;
    if(!_fbPending){ el.textContent = '—'; return; }
    el.innerHTML = 'Selecionado: <b style="color:var(--accent);">'+_fbFmtPicker(_fbPending.mode, _fbPending)+'</b>';
  }
  window._fbCalMesNav = function(delta, e){
    if(e) e.stopPropagation();
    _fbCalY += delta;
    _fbCalRenderMes();
  };
  window._fbCalDiaNav = function(delta, e){
    if(e) e.stopPropagation();
    _fbCalM += delta;
    if(_fbCalM<1){_fbCalM=12;_fbCalY--;}
    if(_fbCalM>12){_fbCalM=1;_fbCalY++;}
    _fbCalRenderDia();
  };
  function _fbCalRenderAno(){
    var grid = document.getElementById('fbCalGridAno');
    if(!grid) return;
    grid.innerHTML = '';
    var H = _fbHojeObj();
    var base = H.y - 4;
    for(var i=0;i<9;i++){
      var ano = base + i;
      var btn = document.createElement('button');
      btn.className = 'np-cal-cell';
      btn.textContent = ano;
      if(ano === H.y) btn.classList.add('atual');
      if(_fbPending && _fbPending.mode==='ano' && ano === _fbPending.y) btn.classList.add('selected');
      (function(a){
        btn.addEventListener('click', function(ev){
          ev.stopPropagation();
          if(_fbPending){ _fbPending.mode='ano'; _fbPending.y=a; }
          _fbCalRenderAno();
          _fbCalAtualizarResumo();
        });
      })(ano);
      grid.appendChild(btn);
    }
  }
  function _fbCalRenderMes(){
    var lbl = document.getElementById('fbCalMesYearLabel');
    if(lbl) lbl.textContent = _fbCalY;
    var grid = document.getElementById('fbCalGridMes');
    if(!grid) return;
    grid.innerHTML = '';
    var H = _fbHojeObj();
    for(var i=1;i<=12;i++){
      var btn = document.createElement('button');
      btn.className = 'np-cal-cell';
      btn.textContent = _MESES_BR2[i-1];
      if(_fbCalY===H.y && i===H.m) btn.classList.add('atual');
      if(_fbPending && _fbPending.mode==='mes' && _fbCalY===_fbPending.y && i===_fbPending.m) btn.classList.add('selected');
      (function(mi){
        btn.addEventListener('click', function(ev){
          ev.stopPropagation();
          if(_fbPending){ _fbPending.mode='mes'; _fbPending.y=_fbCalY; _fbPending.m=mi; }
          _fbCalRenderMes();
          _fbCalAtualizarResumo();
        });
      })(i);
      grid.appendChild(btn);
    }
  }
  function _fbCalRenderDia(){
    var lbl = document.getElementById('fbCalDiaLabel');
    if(lbl) lbl.textContent = _MESES_FULL2[_fbCalM-1] + ' / ' + _fbCalY;
    var grid = document.getElementById('fbCalGridDia');
    if(!grid) return;
    grid.innerHTML = '';
    _DOW2.forEach(function(d){
      var h = document.createElement('div');
      h.className = 'dow'; h.textContent = d;
      grid.appendChild(h);
    });
    var prim = new Date(_fbCalY, _fbCalM-1, 1).getDay();
    var total = _fbDiasMes(_fbCalY, _fbCalM);
    for(var v=0;v<prim;v++){
      var ph = document.createElement('div');
      ph.className = 'np-cal-cell empty';
      grid.appendChild(ph);
    }
    var H = _fbHojeObj();
    for(var i=1;i<=total;i++){
      var btn = document.createElement('button');
      btn.className = 'np-cal-cell';
      btn.textContent = i;
      if(_fbCalY===H.y && _fbCalM===H.m && i===H.d) btn.classList.add('atual');
      if(_fbPending && _fbPending.mode==='dia' && _fbCalY===_fbPending.y && _fbCalM===_fbPending.m && i===_fbPending.d) btn.classList.add('selected');
      (function(di){
        btn.addEventListener('click', function(ev){
          ev.stopPropagation();
          if(_fbPending){ _fbPending.mode='dia'; _fbPending.y=_fbCalY; _fbPending.m=_fbCalM; _fbPending.d=di; }
          _fbCalRenderDia();
          _fbCalAtualizarResumo();
        });
      })(i);
      grid.appendChild(btn);
    }
  }
  /* ── PERÍODO: mini calendários + presets ─────────────────── */
  function _fbCalRenderPeriodo(){
    document.getElementById('fbCalPerIniLabel').textContent = _MESES_FULL2[_fbPerIniM-1]+' / '+_fbPerIniY;
    document.getElementById('fbCalPerFimLabel').textContent = _MESES_FULL2[_fbPerFimM-1]+' / '+_fbPerFimY;
    _fbRenderPerMini('fbCalPerIniGrid', _fbPerIniY, _fbPerIniM);
    _fbRenderPerMini('fbCalPerFimGrid', _fbPerFimY, _fbPerFimM);
    var res = document.getElementById('fbCalPerResumo');
    var per = (_fbPending && _fbPending.per) || {start:null,end:null};
    if(per.start && per.end){
      var dias = Math.round((_fbTsDmy(per.end) - _fbTsDmy(per.start)) / 86400000) + 1;
      res.innerHTML = '<b>'+_fbFmtDataCurta2(per.start)+'</b> → <b>'+_fbFmtDataCurta2(per.end)+'</b> · '+dias+' dia'+(dias!==1?'s':'');
    } else if(per.start){
      res.innerHTML = '<b>'+_fbFmtDataCurta2(per.start)+'</b> → escolha o fim';
    } else {
      res.textContent = '— escolha início e fim —';
    }
  }
  function _fbRenderPerMini(gridId, y, m){
    var grid = document.getElementById(gridId);
    if(!grid) return;
    grid.innerHTML = '';
    _DOW2.forEach(function(d){
      var h = document.createElement('div');
      h.className = 'dow'; h.textContent = d;
      grid.appendChild(h);
    });
    var per = (_fbPending && _fbPending.per) || {start:null,end:null};
    var prim = new Date(y, m-1, 1).getDay();
    var total = _fbDiasMes(y, m);
    for(var v=0;v<prim;v++){
      var ph = document.createElement('div');
      ph.className = 'np-cal-cell empty';
      grid.appendChild(ph);
    }
    var H = _fbHojeObj();
    var sIni = _fbTsDmy(per.start), sFim = _fbTsDmy(per.end);
    for(var i=1;i<=total;i++){
      var btn = document.createElement('button');
      btn.className = 'np-cal-cell';
      btn.textContent = i;
      var sCur = new Date(y, m-1, i).getTime();
      if(y===H.y && m===H.m && i===H.d) btn.classList.add('atual');
      if((sIni && sCur===sIni) || (sFim && sCur===sFim)) btn.classList.add('range-edge');
      else if(sIni && sFim && sCur>sIni && sCur<sFim) btn.classList.add('range-mid');
      (function(di, dy, dm){
        btn.addEventListener('click', function(ev){
          ev.stopPropagation();
          _fbCalPerClick({y:dy, m:dm, d:di});
        });
      })(i, y, m);
      grid.appendChild(btn);
    }
  }
  function _fbCalPerClick(date){
    if(!_fbPending) return;
    if(!_fbPending.per) _fbPending.per = {start:null,end:null};
    var p = _fbPending.per;
    var sCur = _fbTsDmy(date);
    var sIni = _fbTsDmy(p.start);
    if(!p.start){ p.start = date; p.end = null; }
    else if(p.start && !p.end){
      if(sCur < sIni){ p.start = date; }
      else { p.end = date; }
    } else { p.start = date; p.end = null; }
    document.querySelectorAll('.np-per-preset').forEach(function(b){b.classList.remove('active');});
    _fbCalRenderPeriodo();
    _fbCalAtualizarResumo();
  }
  window._fbCalPerNav = function(qual, delta, e){
    if(e) e.stopPropagation();
    if(qual === 'ini'){
      _fbPerIniM += delta;
      if(_fbPerIniM<1){_fbPerIniM=12;_fbPerIniY--;}
      if(_fbPerIniM>12){_fbPerIniM=1;_fbPerIniY++;}
    } else {
      _fbPerFimM += delta;
      if(_fbPerFimM<1){_fbPerFimM=12;_fbPerFimY--;}
      if(_fbPerFimM>12){_fbPerFimM=1;_fbPerFimY++;}
    }
    _fbCalRenderPeriodo();
  };
  window._fbCalPerPreset = function(preset, e){
    if(e) e.stopPropagation();
    if(!_fbPending) return;
    var H = _fbHojeObj();
    var hd = new Date(H.y, H.m-1, H.d);
    function _toDmy(dt){return {y:dt.getFullYear(),m:dt.getMonth()+1,d:dt.getDate()};}
    var start=null, end=null;
    if(preset === 'atual3'){
      var qi = Math.floor((H.m-1)/3)*3 + 1;
      var qf = qi + 2;
      start = {y:H.y, m:qi, d:1};
      end   = {y:H.y, m:qf, d:_fbDiasMes(H.y, qf)};
    } else if(preset === 'ult3'){
      var fim3 = hd, ini3 = new Date(fim3); ini3.setMonth(ini3.getMonth()-2); ini3.setDate(1);
      start = _toDmy(ini3); end = _toDmy(fim3);
    } else if(preset === 'ult6'){
      var fim6 = hd, ini6 = new Date(fim6); ini6.setMonth(ini6.getMonth()-5); ini6.setDate(1);
      start = _toDmy(ini6); end = _toDmy(fim6);
    } else if(preset === 'ano'){
      start = {y:H.y, m:1, d:1};
      end   = {y:H.y, m:12, d:31};
    }
    _fbPending.mode = 'periodo';
    _fbPending.per = { start:start, end:end };
    if(start){ _fbPerIniY=start.y; _fbPerIniM=start.m; }
    if(end){ _fbPerFimY=end.y; _fbPerFimM=end.m; }
    document.querySelectorAll('.np-per-preset').forEach(function(b){
      b.classList.toggle('active', b.textContent.toLowerCase().indexOf(preset) >= 0 ||
        (preset==='atual3' && b.textContent.indexOf('Trimestre')>=0) ||
        (preset==='ult3' && b.textContent.indexOf('3')>=0 && b.textContent.indexOf('Últimos')>=0) ||
        (preset==='ult6' && b.textContent.indexOf('6')>=0) ||
        (preset==='ano' && b.textContent.indexOf('Ano')>=0));
    });
    _fbCalRenderPeriodo();
    _fbCalAtualizarResumo();
  };

  window._fbCalAplicar = function(e){
    if(e) e.stopPropagation();
    if(!_fbPending){ window._fbCalFechar(); return; }
    var p = _fbPending;
    /* Converte para YYYY-MM-DD conforme o modo */
    var ymd;
    if(p.mode === 'ano'){ ymd = p.y+'-01-01'; }
    else if(p.mode === 'mes'){ ymd = p.y+'-'+String(p.m).padStart(2,'0')+'-01'; }
    else if(p.mode === 'periodo'){
      if(!p.per || !p.per.start || !p.per.end){
        if(typeof _showToast==='function') _showToast('⚠️ Escolha início e fim do período.','var(--amber)');
        return;
      }
      /* Data do ciclo = fim · Janela de análise = N meses (incluindo start) */
      var endDt = p.per.end;
      ymd = endDt.y+'-'+String(endDt.m).padStart(2,'0')+'-'+String(endDt.d).padStart(2,'0');
      var sd = p.per.start, ed = p.per.end;
      var diffMeses = (ed.y - sd.y)*12 + (ed.m - sd.m) + 1;
      if(diffMeses < 1) diffMeses = 1;
      window._icFbJanelaMeses = diffMeses;
      /* Atualiza os chips de janela visualmente */
      document.querySelectorAll('.fb-jan').forEach(function(b){
        var v = +b.getAttribute('data-jan');
        b.classList.toggle('active', v === diffMeses || (diffMeses > 12 && v === -1));
      });
      var info = document.getElementById('fbJanInfo');
      if(info) info.textContent = 'período personalizado · '+diffMeses+' meses ('+_fbFmtDataCurta2(sd)+' → '+_fbFmtDataCurta2(ed)+')';
    }
    else { ymd = p.y+'-'+String(p.m).padStart(2,'0')+'-'+String(p.d).padStart(2,'0'); }
    _fbCalMode = p.mode;
    window._fbCalLastMode = p.mode;
    window._fbCalLastPer = p.mode === 'periodo' ? p.per : null;
    var inp = document.getElementById('fbData');
    if(inp){
      inp.value = ymd;
      try { inp.dispatchEvent(new Event('change')); } catch(err){}
    }
    _fbAtualizarLabelData();
    window._fbCalFechar();
  };

  /* Sobrescreve a inicialização da data: ao iniciar o módulo, popula com hoje
     e mostra no label customizado. */
  var _origIcFbInit = _icFbInit;
  _icFbInit = function(){
    _origIcFbInit();
    var inp = document.getElementById('fbData');
    if(inp && !inp.value){
      inp.value = _hoje();
    }
    _fbAtualizarLabelData();
  };

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
