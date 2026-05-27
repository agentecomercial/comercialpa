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
  var COMPS_DEF = [
    { key:'prosp', label:'Prospecção',   ico:'🎯' },
    { key:'qual',  label:'Qualificação', ico:'🔍' },
    { key:'apres', label:'Apresentação', ico:'🎤' },
    { key:'neg',   label:'Negociação',   ico:'🤝' },
    { key:'fup',   label:'Follow-up',    ico:'📨' }
  ];
  var MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  /* doc atual carregado / em edição */
  var _doc = null;            /* { ciclo, data, comps, notaGestor, notaAuto, acoes, status } */
  var _consultorAtivo = '';   /* string UPPER */
  var _ciclo = 'quinzenal';
  var _historico = [];        /* todos os docs do consultor, mais recente primeiro */
  var _medTime = [6,6,6,6,6]; /* fallback antes de termos médias reais */

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

  /* Popular o select de consultores (lê de window._npUsuarios, igual ao Pipeline) */
  function _icFbPopularConsultores(){
    var sel = document.getElementById('fbConsultor');
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
    /* Tentativa de manter seleção */
    if(atualVal && nomes.indexOf(atualVal) >= 0) sel.value = atualVal;
    else if(nomes.length === 1){ sel.value = nomes[0]; _consultorAtivo = nomes[0]; _icFbCarregar(); _icFbCarregarHistorico(); }
    else if(_consultorAtivo && nomes.indexOf(_consultorAtivo) >= 0) sel.value = _consultorAtivo;
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
    /* Comps → sliders */
    COMPS_DEF.forEach(function(c,i){
      var inp = document.querySelector('input[data-comp="'+c.key+'"]');
      if(!inp) return;
      var v = +(_doc.comps && _doc.comps[c.key]);
      if(!v || v<1) v = 6;
      inp.value = v;
      var val = document.getElementById('fbCv'+i);
      if(val){ val.textContent = v; val.className = 'fb-comp-val '+_lvClass(v); }
    });
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
  }

  /* ── Render do bloco de competências (sliders) ──────────── */
  function _icFbRenderComps(){
    var html = COMPS_DEF.map(function(c,i){
      var v = (_doc && _doc.comps && _doc.comps[c.key]) || 6;
      return '<div class="fb-comp">'
        + '<div class="fb-comp-label"><span class="ico">'+c.ico+'</span>'+c.label+'</div>'
        + '<div class="fb-comp-slider">'
        +   '<input type="range" min="1" max="10" step="1" value="'+v+'" data-idx="'+i+'" data-comp="'+c.key+'">'
        +   '<div class="fb-comp-scale"><span>1</span><span>3</span><span>5</span><span>7</span><span>10</span></div>'
        + '</div>'
        + '<div class="fb-comp-val '+_lvClass(v)+'" id="fbCv'+i+'">'+v+'</div>'
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
        _icFbRenderRadar();
        _icFbRenderComparativo();
      });
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
