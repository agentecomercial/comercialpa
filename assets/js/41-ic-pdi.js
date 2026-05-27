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

  /* Mesmas 8 competências do Feedback */
  var COMPS_DEF = [
    { key:'prosp', label:'Prospecção',     ico:'🎯', treins:['DP','MAESTRIA'] },
    { key:'qual',  label:'Qualificação',   ico:'🔍', treins:['DP','CIS'] },
    { key:'apres', label:'Apresentação',   ico:'🎤', treins:['CIS','MAESTRIA','TEAM'] },
    { key:'neg',   label:'Negociação',     ico:'🤝', treins:['CIS','PDA','ML5'] },
    { key:'fup',   label:'Follow-up',      ico:'📨', treins:['MAESTRIA','PDA','TEAM'] },
    { key:'const', label:'Constância',     ico:'📅', treins:['MAESTRIA','PDA'] },
    { key:'mix',   label:'Mix de produto', ico:'🎒', treins:['MAESTRIA'] },
    { key:'apr',   label:'Aproveitamento', ico:'⚡', treins:['MAESTRIA','DP'] }
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
    apr:   ['Carteira inflada','Conversão fraca','Aproveita médio','Carteira enxuta e eficiente','80%+ de conversão']
  };

  /* Estado */
  var _doc = null;           /* { trimestre, status, alvos[], ... } */
  var _consultorAtivo = '';
  var _trimestre = '';       /* "YYYY-Q1".."YYYY-Q4" */
  var _historico = [];
  var _medFeedback = null;   /* {key: media1-10} — vem de icFeedbacks */
  var _comparativoTime = null;

  /* ── Helpers ── */
  function _trimAtual(){
    var d = new Date();
    var q = Math.floor(d.getMonth()/3) + 1;
    return d.getFullYear()+'-Q'+q;
  }
  function _trimLabel(tid){
    if(!tid) return '—';
    var p = tid.split('-Q');
    var nomes = {1:'Jan–Mar', 2:'Abr–Jun', 3:'Jul–Set', 4:'Out–Dez'};
    return 'Q'+p[1]+' / '+p[0]+' ('+nomes[+p[1]]+')';
  }
  function _trimOptions(){
    var d = new Date();
    var y = d.getFullYear();
    var atual = _trimAtual();
    var opts = [];
    /* últimos 8 trimestres */
    for(var i=-1; i<=6; i++){
      var ym = (i>=4 ? y+1 : y);
      var qi = ((d.getMonth()/3|0) + 1 - i);
      while(qi < 1){ qi += 4; }
      while(qi > 4){ qi -= 4; }
      /* simplificação: gera 8 trimestres em torno do atual */
    }
    /* gerar 6 trimestres: atual + 5 anteriores + 2 futuros */
    var trims = [];
    var dt = new Date(d.getFullYear(), Math.floor(d.getMonth()/3)*3, 1);
    for(var i=-5; i<=2; i++){
      var ddt = new Date(dt.getFullYear(), dt.getMonth()+i*3, 1);
      var qq = Math.floor(ddt.getMonth()/3)+1;
      trims.push(ddt.getFullYear()+'-Q'+qq);
    }
    return trims;
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
    _pdiPopularTrimestres();
    if(_initDone) return;
    _initDone = true;
    document.getElementById('pdiConsultor').addEventListener('change', function(){
      _consultorAtivo = this.value || '';
      _pdiCarregar();
      _pdiCarregarHistorico();
      _pdiCarregarFeedbackMedias();
    });
    document.getElementById('pdiTrimestre').addEventListener('change', function(){
      _trimestre = this.value || _trimAtual();
      _pdiCarregar();
    });
  }

  function _pdiPopularConsultores(){
    var sel = document.getElementById('pdiConsultor');
    if(!sel) return;
    var usuarios = window._npUsuarios || {};
    var nomes = [];
    Object.values(usuarios).forEach(function(u){
      if(u && u.perfil === 'consultor' && u.nome) nomes.push(u.nome);
    });
    nomes.sort(function(a,b){return String(a).localeCompare(String(b),'pt-BR');});
    var atualVal = sel.value;
    sel.innerHTML = '<option value="">— selecione um consultor —</option>'
      + nomes.map(function(n){return '<option value="'+n+'">'+n+'</option>';}).join('');
    if(atualVal && nomes.indexOf(atualVal) >= 0) sel.value = atualVal;
    else if(_consultorAtivo && nomes.indexOf(_consultorAtivo) >= 0) sel.value = _consultorAtivo;
  }
  function _pdiPopularTrimestres(){
    var sel = document.getElementById('pdiTrimestre');
    if(!sel) return;
    var atual = _trimAtual();
    if(!_trimestre) _trimestre = atual;
    sel.innerHTML = _trimOptions().reverse().map(function(t){
      var lbl = _trimLabel(t) + (t===atual ? ' · atual' : '');
      return '<option value="'+t+'"'+(t===_trimestre?' selected':'')+'>'+lbl+'</option>';
    }).join('');
  }

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
    window._fbGet('icPDIs/'+_consultorAtivo+'/'+_trimestre).then(function(d){
      if(d){ _doc = d; _pdiAplicarDocNaUI(); }
      else { _pdiResetDoc(); }
    }).catch(_pdiResetDoc);
  }
  function _pdiResetDoc(){
    _doc = {
      trimestre: _trimestre,
      status: 'rascunho',
      alvos: []
    };
    _pdiAplicarDocNaUI();
  }
  function _pdiAplicarDocNaUI(){
    _pdiRenderAlvos();
    _pdiRenderStatus();
    _pdiAtualizarFooter();
  }

  function _pdiRenderStatus(){
    var bar = document.getElementById('pdiStatusBar');
    if(!bar || !_doc) return;
    bar.classList.remove('iniciado','concluido');
    var s = _doc.status || 'rascunho';
    if(s === 'iniciado'){ bar.textContent = '⚙ Em andamento'; bar.classList.add('iniciado'); }
    else if(s === 'concluido'){ bar.textContent = '✅ Concluído'; bar.classList.add('concluido'); }
    else { bar.textContent = '○ Rascunho'; }
  }

  /* ── Diagnóstico (sugestões baseadas no feedback) ── */
  function _pdiRenderDiag(){
    var el = document.getElementById('pdiDiagList');
    if(!el) return;
    if(!_consultorAtivo){
      el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;grid-column:1/-1;">Selecione um consultor para ver as sugestões.</div>';
      return;
    }
    if(!_medFeedback){
      el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;grid-column:1/-1;">Sem feedbacks anteriores para este consultor — adicione competências manualmente abaixo.</div>';
      return;
    }
    var ord = COMPS_DEF.slice().sort(function(a,b){
      var ma = _medFeedback[a.key], mb = _medFeedback[b.key];
      if(ma == null) return 1; if(mb == null) return -1;
      return ma - mb;
    });
    var top4 = ord.slice(0,4);
    el.innerHTML = top4.map(function(c){
      var m = _medFeedback[c.key];
      var jaAdded = (_doc.alvos||[]).some(function(a){return a.key === c.key;});
      var sc = m == null ? '—' : m.toFixed(1);
      var cls = m == null ? '' : (m < 6 ? 'bad' : m < 7.5 ? 'warn' : 'ok');
      var info = m == null ? 'Sem dados nos últimos ciclos' : (m < 6 ? '⚠ candidata prioritária' : 'oportunidade de evolução');
      return '<div class="pdi-diag-card">'
        + '<div class="pdi-diag-top">'
        +   '<div class="pdi-diag-lbl"><span>'+c.ico+'</span>'+c.label+'</div>'
        +   '<div class="pdi-diag-score '+cls+'">'+sc+'</div>'
        + '</div>'
        + '<div class="pdi-diag-info">Média dos últimos 3 ciclos · '+info+'</div>'
        + '<button class="pdi-diag-btn '+(jaAdded?'added':'')+'" '+(jaAdded?'disabled':'onclick="_pdiAddAlvo(\''+c.key+'\')"')+'>'
        +   (jaAdded ? '✓ Adicionada' : '+ Adicionar ao PDI')
        + '</button>'
        + '</div>';
    }).join('');
  }

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
      status: 'iniciar'
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
  }

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
    window._fbSave('icPDIs/'+_consultorAtivo+'/'+_trimestre, _doc).then(function(){
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
      return '<div class="pdi-hist-item" data-id="'+h._id+'">'
        + '<div class="pdi-hist-row"><span class="pdi-hist-trim">'+_trimLabel(h._id)+'</span><span class="pdi-hist-pct '+pctCls+'">'+pct+'%</span></div>'
        + '<div class="pdi-hist-bar"><div class="pdi-hist-bar-fill" style="width:'+pct+'%;background:'+barCol+';"></div></div>'
        + '<div class="pdi-hist-comps">'+compsTxt+'</div>'
        + '</div>';
    }).join('');
    el.querySelectorAll('.pdi-hist-item').forEach(function(it){
      it.addEventListener('click', function(){
        var id = it.getAttribute('data-id');
        var sel = document.getElementById('pdiTrimestre');
        if(sel){ sel.value = id; _trimestre = id; _pdiCarregar(); }
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

})();
