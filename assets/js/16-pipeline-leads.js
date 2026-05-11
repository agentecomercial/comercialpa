/* ════════════════════════════════════════════════════════════════
   PIPELINE — LEADS (WhatsApp)
   Firebase: pipelineLeads/{mesKey}/{id}
             pipelineLeads/{mesKey}/_rrIndex  (round-robin)
════════════════════════════════════════════════════════════════ */
(function(){

  /* ── Estado ─────────────────────────────────────────────────── */
  var _leads  = {};
  var _rrIdx  = 0;
  var _mesk   = '';
  var _editId = null;
  var _ultimoBase64 = '';
  var _filtroConsultor = '';
  var _filtroDist      = '';
  var _filtroBusca     = '';
  var _filtroStatus    = '';
  var _selecionados    = {};

  /* ── Config OCR (file:// compatível) ───────────────────────── */
  var _ocrCfg = {
    workerPath:    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    corePath:      'https://cdn.jsdelivr.net/npm/tesseract.js-core@5',
    langPath:      'https://tessdata.projectnaptha.com/4.0.0',
    workerBlobURL: true,  /* blobifica o worker -> contorna origem opaca do file:// */
    cacheMethod:   'none' /* IndexedDB errático em file:// */
  };

  /* ── Helpers ────────────────────────────────────────────────── */
  function _mk(){ return typeof window._mesKey==='function'?window._mesKey():(function(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})(); }
  function _id(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _toast(msg,cor){ if(typeof _showToast==='function') _showToast(msg,cor||'var(--accent)'); }
  /* pool completo de consultores do mês */
  function _consultoresTodos(){ return window._npConsultores&&window._npConsultores.length?window._npConsultores:[]; }

  /* pool de distribuição: localStorage ou todos */
  var _POOL_KEY = 'ld_pool_dist';
  function _poolSalvar(arr){ try{ localStorage.setItem(_POOL_KEY, JSON.stringify(arr)); }catch(e){} }
  function _poolCarregar(){
    try{
      var v = localStorage.getItem(_POOL_KEY);
      if(v){ var p=JSON.parse(v); if(Array.isArray(p)&&p.length) return p; }
    }catch(e){}
    return null; /* null = todos */
  }
  var _poolAtivo = _poolCarregar(); /* null | string[] */

  /* consultores efetivos para o round-robin */
  function _consultores(){
    var todos = _consultoresTodos();
    if(!_poolAtivo) return todos;
    return todos.filter(function(c){ return _poolAtivo.indexOf(c)!==-1; });
  }

  /* ── Compressão de imagem ───────────────────────────────────── */
  function _comprimir(base64, callback){
    var img = new Image();
    img.onload = function(){
      var ratio = Math.min(1, 1280 / img.width); /* 1280px: resolução mínima para OCR */
      var w = Math.round(img.width  * ratio);
      var h = Math.round(img.height * ratio);
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; /* fundo branco: evita preto no JPEG e melhora OCR */
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = function(){ callback(base64); };
    img.src = base64;
  }

  /* ── Firebase ───────────────────────────────────────────────── */
  function _fbPath(sub){ return 'pipelineLeads/'+_mesk+(sub?'/'+sub:''); }

  function _carregar(mk){
    _mesk = mk||_mk();
    if(!window._fbGet) return;
    window._fbGet(_fbPath()).then(function(d){
      if(!d||typeof d!=='object'){ _leads={}; _rrIdx=0; _render(); return; }
      _rrIdx = +(d._rrIndex||0);
      var tmp={};
      Object.keys(d).forEach(function(k){ if(k!=='_rrIndex') tmp[k]=d[k]; });
      _leads = tmp;
      _render();
    }).catch(function(){ _leads={}; _rrIdx=0; _render(); });
  }

  function _salvarLead(id,obj){
    if(!window._fbSave) return;
    window._fbSave(_fbPath(id), obj).catch(function(e){ console.warn('[Leads] save:',e); });
  }

  function _salvarRR(){
    if(!window._fbSave) return;
    window._fbSave(_fbPath('_rrIndex'), _rrIdx).catch(function(){});
  }

  /* ── Filtro de período ──────────────────────────────────────── */
  var _filtroPeriodo = 'tudo'; // padrão: tudo
  var _periodoCustomDe  = 0;
  var _periodoCustomAte = 0;

  function _inicioDia(d){ var r=new Date(d); r.setHours(0,0,0,0); return r.getTime(); }
  function _fimDia(d)   { var r=new Date(d); r.setHours(23,59,59,999); return r.getTime(); }

  function _periodoBounds(){
    var agora = new Date();
    switch(_filtroPeriodo){
      case 'hoje':
        return [_inicioDia(agora), _fimDia(agora)];
      case 'ontem':
        var ontem = new Date(agora); ontem.setDate(ontem.getDate()-1);
        return [_inicioDia(ontem), _fimDia(ontem)];
      case 'semana':
        var seg = new Date(agora); seg.setDate(agora.getDate()-agora.getDay()+1);
        return [_inicioDia(seg), _fimDia(agora)];
      case 'mes':
        var ini = new Date(agora.getFullYear(), agora.getMonth(), 1);
        return [_inicioDia(ini), _fimDia(agora)];
      case 'mes_passado':
        var mp  = new Date(agora.getFullYear(), agora.getMonth()-1, 1);
        var mpe = new Date(agora.getFullYear(), agora.getMonth(), 0);
        return [_inicioDia(mp), _fimDia(mpe)];
      case 'custom':
        return [_periodoCustomDe, _periodoCustomAte];
      default: // 'tudo'
        return [0, Infinity];
    }
  }

  function _periodoDentro(ts){
    if(_filtroPeriodo==='tudo') return true;
    if(!ts) return false; /* sem data de distribuição: só aparece em "tudo" */
    var b = _periodoBounds();
    return ts>=b[0] && ts<=b[1];
  }

  window._ldPeriodo = function(p){
    _filtroPeriodo = p;
    /* atualiza botões ativos */
    document.querySelectorAll('.ld-periodo-btn').forEach(function(b){
      b.classList.remove('ativo');
    });
    var mapa = {hoje:0,ontem:1,semana:2,mes:3,mes_passado:4,tudo:5,custom:6};
    var btns = document.querySelectorAll('.ld-periodo-btn');
    if(btns[mapa[p]]) btns[mapa[p]].classList.add('ativo');
    /* mostra/esconde inputs de datas */
    var customDiv = document.getElementById('ldPeriodoCustom');
    if(customDiv) customDiv.style.display = p==='custom' ? 'flex' : 'none';
    _render();
  };

  window._ldPeriodoCustomAplicar = function(){
    var de  = document.getElementById('ldPeriodoDe');
    var ate = document.getElementById('ldPeriodoAte');
    _periodoCustomDe  = de  && de.value  ? _inicioDia(new Date(de.value+'T00:00:00'))  : 0;
    _periodoCustomAte = ate && ate.value ? _fimDia(new Date(ate.value+'T00:00:00')) : Infinity;
    _render();
  };

  /* ── Filtros (toolbar estilo Funil) ────────────────────────── */
  function _filtroAtivo(){ return _filtroConsultor||_filtroDist||_filtroBusca||_filtroStatus; }

  function _atualizarBotaoLimpar(){
    var btn=document.getElementById('ldFilLimpar');
    if(btn) btn.style.display=_filtroAtivo()?'':'none';
    var sc=document.getElementById('ldFilConsultor');
    var sd=document.getElementById('ldFilDist');
    var ss=document.getElementById('ldFilStatus');
    if(sc) sc.classList.toggle('ativo',!!_filtroConsultor);
    if(sd) sd.classList.toggle('ativo',!!_filtroDist);
    if(ss) ss.classList.toggle('ativo',!!_filtroStatus);
  }

  function _populaSelectConsultores(){
    var sel=document.getElementById('ldFilConsultor');
    if(!sel) return;
    var cons=Array.from(new Set(
      Object.values(_leads).map(function(l){ return l.consultor||''; }).filter(Boolean)
    )).sort();
    var cur=sel.value;
    sel.innerHTML='<option value="">Todos consultores</option>'
      +cons.map(function(c){ return '<option value="'+_esc(c)+'"'+(c===cur?' selected':'')+'>'+_esc(c)+'</option>'; }).join('');
  }

  window._ldBuscar=function(v){
    _filtroBusca=(v||'').trim().toLowerCase();
    _atualizarBotaoLimpar();
    _render();
  };

  window._ldFiltrarSel=function(){
    var sc=document.getElementById('ldFilConsultor');
    var sd=document.getElementById('ldFilDist');
    var ss=document.getElementById('ldFilStatus');
    _filtroConsultor=sc?sc.value:'';
    _filtroDist=sd?sd.value:'';
    _filtroStatus=ss?ss.value:'';
    _atualizarBotaoLimpar();
    _render();
  };

  window._ldLimparFiltros=function(){
    _filtroConsultor=''; _filtroDist=''; _filtroBusca=''; _filtroStatus='';
    var sc=document.getElementById('ldFilConsultor'); if(sc) sc.value='';
    var sd=document.getElementById('ldFilDist');      if(sd) sd.value='';
    var ss=document.getElementById('ldFilStatus');    if(ss) ss.value='';
    var si=document.getElementById('ldSearch');       if(si) si.value='';
    _atualizarBotaoLimpar();
    _render();
  };

  window._ldFiltrar=function(consultor){
    _filtroConsultor=(consultor==='__sem__')?'':( consultor||'');
    _filtroDist=(consultor==='__sem__')?'nao':_filtroDist;
    _atualizarBotaoLimpar();
    _render();
  };

  window._ldFiltrarCard=function(nome){
    if(nome==='__sem__'){
      /* toggle filtro "sem consultor" */
      if(_filtroDist==='nao'){ _filtroDist=''; }
      else { _filtroDist='nao'; _filtroConsultor=''; }
    } else {
      /* toggle filtro por consultor */
      if(_filtroConsultor===nome){ _filtroConsultor=''; }
      else { _filtroConsultor=nome; _filtroDist=''; }
    }
    var sc=document.getElementById('ldFilConsultor'); if(sc) sc.value=_filtroConsultor;
    var sd=document.getElementById('ldFilDist');      if(sd) sd.value=_filtroDist;
    _atualizarBotaoLimpar();
    _render();
  };

  /* ── Seleção em lote ────────────────────────────────────────── */
  window._ldToggleSel=function(id){
    if(_selecionados[id]) delete _selecionados[id];
    else _selecionados[id]=true;
    _render();
  };
  window._ldToggleSelTodos=function(check){
    var el=document.getElementById('npLeadsGrid');
    if(!el) return;
    var chks=el.querySelectorAll('tbody .ld-chk');
    chks.forEach(function(c){
      var id=c.closest('tr') && c.closest('tr').querySelector('[data-dist-id]') && c.closest('tr').querySelector('[data-dist-id]').getAttribute('data-dist-id');
      /* fallback: pegar id do onchange */
      if(!id){
        var oc=c.getAttribute('onchange')||'';
        var m=oc.match(/'([^']+)'/);
        if(m) id=m[1];
      }
      if(id){ if(check) _selecionados[id]=true; else delete _selecionados[id]; }
    });
    _render();
  };
  window._ldLimparSelecao=function(){
    _selecionados={};
    _render();
  };

  window._ldDistribuirLote=function(){
    var ids=Object.keys(_selecionados);
    if(!ids.length) return;
    var cons=_consultores(); /* respeita o pool ativo de "👥 Distribuir para:" */
    if(!cons.length){ _toast('Nenhum consultor no pool. Configure em 👥 Distribuir para.','var(--amber)'); return; }
    /* distribui em round-robin entre os consultores do pool */
    var ts=Date.now();
    ids.forEach(function(id,i){
      var consultor=cons[i%cons.length];
      var lead=_leads[id]; if(!lead) return;
      lead.consultor=consultor;
      lead.distribuidoEm=ts;
      _fbSave(_mesk+'/'+id+'/consultor',consultor);
      _fbSave(_mesk+'/'+id+'/distribuidoEm',ts);
      delete _selecionados[id];
    });
    _toast('✅ '+ids.length+' lead'+(ids.length!==1?'s':'')+' distribuído'+(ids.length!==1?'s':'')+' entre '+cons.length+' consultor'+(cons.length!==1?'es':''),'var(--accent)');
    requestAnimationFrame(_render);
  };

  /* ── Pool de distribuição — dropdown com checkboxes ────────── */
  window._ldAbrirPool = function(){
    var drop = document.getElementById('ldPoolDropdown');
    var btn  = document.getElementById('ldPoolBtn');
    if(!drop||!btn) return;
    if(drop.style.display!=='none'){ drop.style.display='none'; return; }

    var todos = _consultoresTodos();
    if(!todos.length){ _toast('Nenhum consultor disponível.','var(--amber)'); return; }
    var sel = _poolAtivo ? _poolAtivo : todos.slice();

    drop.innerHTML = '<div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border2);">Quem recebe leads</div>'
      + todos.map(function(c){
          var chk = sel.indexOf(c)!==-1;
          return '<label style="display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;" '
            +'onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'">'
            +'<input type="checkbox" id="ldpc_'+_esc(c)+'" value="'+_esc(c)+'"'+(chk?' checked':'')
            +' style="accent-color:var(--accent);width:15px;height:15px;cursor:pointer;">'
            +'<span style="font-size:13px;font-weight:600;color:var(--text);">'+_esc(c)+'</span>'
            +'</label>';
        }).join('')
      +'<div style="padding:8px 12px;border-top:1px solid var(--border2);">'
      +'<button onclick="window._ldPoolAplicar()" style="width:100%;padding:7px;background:var(--accent);color:#000;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Confirmar</button>'
      +'</div>';

    /* posicionar abaixo do botão */
    var r = btn.getBoundingClientRect();
    drop.style.top  = (r.bottom+4)+'px';
    drop.style.left = r.left+'px';
    drop.style.display = 'block';

    setTimeout(function(){
      function _fora(e){
        if(!drop.contains(e.target)&&e.target!==btn){
          drop.style.display='none';
          document.removeEventListener('click',_fora);
        }
      }
      document.addEventListener('click',_fora);
    },10);
  };

  window._ldPoolAplicar = function(){
    var checks = document.querySelectorAll('#ldPoolDropdown input[type=checkbox]:checked');
    var todos  = _consultoresTodos();
    var sels   = Array.from(checks).map(function(c){ return c.value; });
    _poolAtivo = sels.length===todos.length ? null : (sels.length ? sels : null);
    _poolSalvar(_poolAtivo||[]);
    document.getElementById('ldPoolDropdown').style.display='none';
    _render();
    _toast('✅ Pool atualizado');
  };

  window._ldPoolChange = function(){}; /* sem ação — aplica no Confirmar */

  function _renderPoolSelect(){} /* sem ação — mantido para compatibilidade */

  function _renderPoolBtn(){
    var lbl  = document.getElementById('ldPoolLabel');
    var btn  = document.getElementById('ldPoolBtn');
    if(!lbl||!btn) return;
    var todos = _consultoresTodos();
    var n = _poolAtivo ? _poolAtivo.length : todos.length;
    var ativo = _poolAtivo && _poolAtivo.length < todos.length;
    lbl.textContent = ativo ? n+'/'+todos.length : 'Todos';
    btn.style.borderColor = ativo ? 'var(--accent)' : '';
    btn.style.color       = ativo ? 'var(--accent)' : '';
  }

  /* ── SLA e Status ──────────────────────────────────────────── */
  var _STATUS_ORDEM = ['novo','contatado','negociando','ganho','perdido'];
  var _STATUS_LABEL = {novo:'Novo',contatado:'Contatado',negociando:'Negociando',ganho:'✅ Ganho',perdido:'❌ Perdido'};
  var _STATUS_CSS   = {novo:'ld-status-novo',contatado:'ld-status-contatado',negociando:'ld-status-negociando',ganho:'ld-status-ganho',perdido:'ld-status-perdido'};

  function _slaChip(distribuidoEm){
    if(!distribuidoEm) return '';
    var min = Math.floor((Date.now()-distribuidoEm)/60000);
    var cls, label;
    if(min<15){      cls='ld-sla-verde';    label='⏱ '+min+'min'; }
    else if(min<60){ cls='ld-sla-amarelo';  label='⏱ '+min+'min'; }
    else if(min<240){cls='ld-sla-laranja';  label='⏱ '+Math.floor(min/60)+'h'; }
    else{            cls='ld-sla-vermelho'; label='⏱ '+Math.floor(min/60)+'h'; }
    return '<span class="ld-sla '+cls+'">'+label+'</span>';
  }

  function _fmtDataHora(ts){
    if(!ts) return '—';
    var d = new Date(ts);
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '
          +d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }

  window._ldAvancarStatus = function(id){
    var l = _leads[id]; if(!l) return;
    var cur = l.status||'novo';
    var idx = _STATUS_ORDEM.indexOf(cur);
    /* ganho e perdido são terminais — clique rewind para novo */
    var prox = (idx>=_STATUS_ORDEM.length-1||cur==='ganho'||cur==='perdido')
      ? 'novo' : _STATUS_ORDEM[idx+1];
    if((prox==='perdido')&&!confirm('Marcar como Perdido?')) return;
    l.status=prox; _leads[id]=l;
    _salvarLead(id,l);
    _render();
  };

  /* ── Próximo consultor (round-robin) ────────────────────────── */
  function _proximoConsultor(){
    var cons = _consultores();
    if(!cons.length) return null;
    return cons[_rrIdx % cons.length];
  }

  function _renderProximo(){
    var el = document.getElementById('npLeadsProximo');
    if(!el) return;
    var prox = _proximoConsultor();
    el.innerHTML = prox
      ? '<span style="font-size:12px;color:var(--muted);">Próximo: </span>'
        +'<span style="font-size:12px;font-weight:700;color:var(--accent);">'+_esc(prox)+'</span>'
      : '';
  }

  /* ── Render principal ───────────────────────────────────────── */
  function _render(){
    _renderResumo();
    _renderProximo();
    _renderPoolBtn();
    _populaSelectConsultores();
    var el = document.getElementById('npLeadsGrid');
    if(!el) return;
    var todas = Object.entries(_leads).sort(function(a,b){ return (b[1].criadoEm||0)-(a[1].criadoEm||0); });
    var lista = todas.filter(function(e){
      var l=e[1];
      if(_filtroConsultor && (l.consultor||'')!==_filtroConsultor) return false;
      if(_filtroDist==='sim' && !l.consultor) return false;
      if(_filtroDist==='nao' && l.consultor)  return false;
      if(_filtroStatus && (l.status||'novo')!==_filtroStatus) return false;
      if(!_periodoDentro(l.distribuidoEm)) return false;
      if(_filtroBusca){
        var haystack=((l.nome||'')+' '+(l.telefone||'')).toLowerCase();
        if(haystack.indexOf(_filtroBusca)===-1) return false;
      }
      return true;
    });

    if(!todas.length){
      el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Nenhum lead cadastrado.<br>Arraste uma imagem do WhatsApp acima.</div>';
      return;
    }
    if(!lista.length){
      el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Nenhum lead encontrado para este filtro.</div>';
      return;
    }
    var ids = lista.map(function(e){ return e[0]; });
    var todosSel = ids.length > 0 && ids.every(function(id){ return _selecionados[id]; });

    var rows = lista.map(function(e){
      var id=e[0]; var l=e[1];
      var sel = _selecionados[id] ? ' checked' : '';
      var trCls = _selecionados[id] ? ' class="ld-tr-sel"' : '';
      var foto = l.imgBase64
        ? '<img class="ld-thumb" src="'+l.imgBase64+'" onclick="window._ldVerImg(\''+id+'\')" title="Ver imagem">'
        : '<div class="ld-thumb-ph">👤</div>';

      var st = l.status||'novo';
      var statusChip = '<span class="ld-status '+(_STATUS_CSS[st]||'ld-status-novo')+'" '
        +'onclick="window._ldAvancarStatus(\''+id+'\')" title="Clique para avançar o status">'
        +(_STATUS_LABEL[st]||'Novo')+'</span>';

      var consCell;
      if(l.consultor){
        consCell = '<span onclick="window._ldDistribuir(\''+id+'\',event)" title="Clique para redistribuir" style="cursor:pointer;font-size:10px;background:rgba(200,240,90,.12);color:var(--accent);border:1px solid rgba(200,240,90,.25);border-radius:20px;padding:2px 8px;white-space:nowrap;">'+_esc(l.consultor)+'</span>';
      } else {
        consCell = '<span onclick="window._ldDistribuir(\''+id+'\',event)" title="Clique para distribuir" style="cursor:pointer;font-size:10px;background:rgba(255,82,82,.1);color:var(--red);border:1px solid rgba(255,82,82,.25);border-radius:20px;padding:2px 8px;">Não dist.</span>';
      }

      var distCell = l.distribuidoEm
        ? '<span style="font-size:11px;color:var(--text);">'+_fmtDataHora(l.distribuidoEm)+'</span>'
        : '<span style="color:var(--muted);font-size:11px;">—</span>';

      var desfazer = l.consultor
        ? '<button onclick="window._ldDesfazer(\''+id+'\')" title="Desfazer distribuição" style="font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid rgba(255,180,0,.3);background:rgba(255,180,0,.07);color:var(--amber);cursor:pointer;">↩</button>'
        : '';

      return '<tr'+trCls+'>'
        +'<td class="td-check"><input type="checkbox" class="ld-chk"'+sel+' onchange="window._ldToggleSel(\''+id+'\')" onclick="event.stopPropagation()"></td>'
        +'<td class="td-foto">'+foto+'</td>'
        +'<td class="td-nome" title="'+_esc(l.nome||'')+'">'
          +'<span style="display:flex;align-items:center;gap:5px;">'
          +_esc(l.nome||'Sem nome')
          +'<button onclick="window._ldAbrirObs(\''+id+'\')" title="'+(l.obs?_esc(l.obs):'Adicionar observação')+'" '
          +'style="width:16px;height:16px;border-radius:50%;border:1.5px solid '+(l.obs?'var(--accent)':'rgba(255,255,255,.2)')+';'
          +'background:'+(l.obs?'rgba(200,240,90,.15)':'transparent')+';color:'+(l.obs?'var(--accent)':'rgba(255,255,255,.3)')+';'
          +'font-size:10px;font-style:italic;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;'
          +'flex-shrink:0;line-height:1;padding:0;font-family:Georgia,serif;"><em>i</em></button>'
          +'</span>'
        +'</td>'
        +'<td class="td-tel">'+_esc(l.telefone||'—')+'</td>'
        +'<td class="td-msg" title="'+_esc(l.mensagem||'')+'">'+_esc(l.mensagem||'')+'</td>'
        +'<td>'+statusChip+'</td>'
        +'<td class="td-cons">'+consCell+'</td>'
        +'<td>'+distCell+'</td>'
        +'<td class="td-acoes"><div class="td-acoes-inner">'
          +'<button data-dist-id="'+id+'" onclick="window._ldDistribuir(\''+id+'\',event)" title="Distribuir" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid rgba(200,240,90,.3);background:rgba(200,240,90,.08);color:var(--accent);cursor:pointer;">📤</button>'
          +desfazer
          +'<button onclick="window._ldEditar(\''+id+'\')" title="Editar" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid var(--border2);background:rgba(255,255,255,.04);color:var(--muted);cursor:pointer;">✏</button>'
          +'<button onclick="window._ldRemover(\''+id+'\')" title="Remover" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid rgba(255,82,82,.3);background:rgba(255,82,82,.06);color:var(--red);cursor:pointer;">✕</button>'
        +'</div></td>'
        +'</tr>';
    }).join('');

    var qtdSel = Object.keys(_selecionados).length;
    var barraLote = qtdSel > 0
      ? '<div class="ld-barra-lote">'
        +'<span style="font-size:12px;color:var(--text);font-weight:600;">'+qtdSel+' lead'+(qtdSel!==1?'s':'')+' selecionado'+(qtdSel!==1?'s':'')+'</span>'
        +'<button onclick="window._ldDistribuirLote()" style="font-size:11px;padding:4px 12px;border-radius:6px;border:1px solid rgba(200,240,90,.4);background:rgba(200,240,90,.1);color:var(--accent);cursor:pointer;font-weight:600;">📤 Distribuir selecionados</button>'
        +'<button onclick="window._ldLimparSelecao()" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border2);background:rgba(255,255,255,.04);color:var(--muted);cursor:pointer;">✕ Limpar seleção</button>'
        +'</div>'
      : '';

    el.innerHTML = barraLote + '<table class="ld-table">'
      +'<thead><tr>'
      +'<th class="td-check"><input type="checkbox" class="ld-chk"'+(todosSel?' checked':'')+' onchange="window._ldToggleSelTodos(this.checked)" title="Selecionar todos"></th>'
      +'<th></th><th>Nome</th><th>Telefone</th><th>Mensagem</th><th>Status</th><th>Consultor</th><th>Distribuído em</th><th>Ações</th>'
      +'</tr></thead>'
      +'<tbody>'+rows+'</tbody>'
      +'</table>';
  }


  /* ── Resumo por consultor (mini cards) ──────────────────────── */
  function _renderResumo(){
    var el = document.getElementById('npLeadsResumo');
    if(!el) return;
    var todas = Object.values(_leads);
    if(!todas.length){ el.innerHTML=''; return; }

    var map = {};
    todas.forEach(function(l){
      var k = l.consultor||'__sem__';
      map[k] = (map[k]||0)+1;
    });

    var COR = ['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8'];
    var cons = Object.keys(map).filter(function(k){ return k!=='__sem__'; }).sort();
    var i=0;
    var cards = cons.map(function(nome){
      var cor = COR[(i++)%COR.length];
      var ativo = _filtroConsultor===nome;
      return '<div onclick="window._ldFiltrarCard(\''+nome.replace(/'/g,"\\'")+'\')" title="Clique para filtrar" style="cursor:pointer;background:var(--surface);border:1px solid '+(ativo?cor:' var(--border2)')+';border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;min-width:160px;transition:border-color .15s,box-shadow .15s;'+(ativo?'box-shadow:0 0 0 2px '+cor+'44;':'')+'">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:'+cor+'22;color:'+cor+';border:1.5px solid '+cor+'55;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;">'+nome.charAt(0).toUpperCase()+'</div>'
        +'<div><div style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">'+_esc(nome)+'</div>'
        +'<div style="font-size:10px;color:var(--muted);">'+map[nome]+' lead'+(map[nome]!==1?'s':'')+'</div>'
        +'</div></div>';
    }).join('');

    var semDist = map['__sem__']||0;
    if(semDist){
      var ativoSem = _filtroDist==='nao';
      cards = '<div onclick="window._ldFiltrarCard(\'__sem__\')" title="Filtrar não distribuídos" style="cursor:pointer;background:rgba(255,82,82,.06);border:1px solid '+(ativoSem?'var(--red)':'rgba(255,82,82,.2)')+';border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;min-width:160px;transition:border-color .15s;'+(ativoSem?'box-shadow:0 0 0 2px rgba(255,82,82,.3);':'')+'">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,82,82,.15);color:var(--red);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">❗</div>'
        +'<div><div style="font-size:12px;font-weight:700;color:var(--red);">Sem consultor</div>'
        +'<div style="font-size:10px;color:var(--muted);">'+semDist+' lead'+(semDist!==1?'s':'')+'</div>'
        +'</div></div>'+cards;
    }

    el.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">'+cards+'</div>';
  }

  /* ── Drop zone ──────────────────────────────────────────────── */
  function _initDrop(){
    var zone = document.getElementById('npLeadsDropZone');
    if(!zone||zone._ldInit) return;
    zone._ldInit=true;
    ['dragenter','dragover'].forEach(function(ev){
      zone.addEventListener(ev,function(e){ e.preventDefault(); zone.classList.add('ativo'); });
    });
    ['dragleave','drop'].forEach(function(ev){
      zone.addEventListener(ev,function(e){ e.preventDefault(); zone.classList.remove('ativo'); });
    });
    zone.addEventListener('drop',function(e){
      var files=e.dataTransfer?e.dataTransfer.files:[];
      if(files.length) _processarArquivo(files[0]);
    });
    document.addEventListener('paste',function(e){
      var tab=document.getElementById('npTabLeads');
      if(!tab||!tab.classList.contains('ativo')) return;
      var items=(e.clipboardData||{}).items||[];
      for(var i=0;i<items.length;i++){
        if(items[i].type.startsWith('image/')){
          e.preventDefault();
          _processarArquivo(items[i].getAsFile());
          zone.classList.add('ativo');
          setTimeout(function(){ zone.classList.remove('ativo'); },400);
          return;
        }
      }
    });
    zone.addEventListener('click',function(){
      var inp=document.createElement('input');
      inp.type='file'; inp.accept='image/*';
      inp.onchange=function(){ if(inp.files.length) _processarArquivo(inp.files[0]); };
      inp.click();
    });
  }

  /* ── Chave da API ───────────────────────────────────────────── */
  function _getApiKey(){ return localStorage.getItem('ld_gemini_key')||''; }

  window._ldSalvarChave = function(){
    var inp = document.getElementById('npLdApiKeyInput');
    var key = (inp&&inp.value||'').trim();
    if(!key){ _toast('Digite a chave.','var(--amber)'); return; }
    localStorage.setItem('ld_gemini_key', key);
    window._ldFecharChave();
    _toast('✅ Chave salva!');
  };

  window._ldFecharChave = function(){
    var ov = document.getElementById('npLdApiKeyOverlay');
    if(ov) ov.classList.remove('open');
  };

  window._ldAbrirChave = function(){
    var ov = document.getElementById('npLdApiKeyOverlay');
    if(!ov) return;
    var inp = document.getElementById('npLdApiKeyInput');
    if(inp) inp.value = _getApiKey();
    ov.classList.add('open');
    setTimeout(function(){ if(inp){inp.focus();inp.select();} },100);
  };

  /* ── Extração OCR (file:// compatível, sem worker persistente) ─ */
  function _extrairOCR(base64, callback){
    if(typeof Tesseract==='undefined'){
      console.warn('[Leads OCR] Tesseract não carregado');
      callback({}); return;
    }
    _toast('🔍 Lendo imagem...','var(--muted)');
    /* decodifica em canvas com fundo branco antes de passar ao Tesseract:
       evita que o worker leia o canvas interno da página em file:// */
    var img = new Image();
    img.onload = function(){
      var canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      Tesseract.recognize(canvas, 'por+eng', _ocrCfg)
        .then(function(result){
          var txt = (result&&result.data&&result.data.text)||'';
          console.log('[Leads OCR] texto bruto:\n', txt);
          var dados = _parsearWhatsApp(txt);
          console.log('[Leads OCR] dados:', dados);
          callback(dados);
        })
        .catch(function(e){
          console.warn('[Leads OCR] erro:', e);
          callback({});
        });
    };
    img.onerror = function(){
      console.warn('[Leads OCR] imagem inválida');
      callback({});
    };
    img.src = base64;
  }

  /* ── Parser regex para screenshots do WhatsApp ──────────────── */
  function _parsearWhatsApp(txt){
    if(!txt) return {nome:'', telefone:'', mensagem:''};

    function _limpar(s){
      return String(s||'').replace(/^[~\-\s>•·]+/,'').replace(/[\s>•·]+$/,'').replace(/\s+/g,' ').trim();
    }

    var RUIDO = /^(online|digitando|visto por último|visto|hoje|ontem|agora|últ\.|últ |status|story indispon|ver perfil|segue você|seguidores|posts?|novas mensagens|número de telefone|mensagem do whatsapp|ligar|mensagem\.\.\.|mensagem$|respondeu ao seu story|min online|\d{1,2}:\d{2}|\d{1,2} de [a-zç]+|ontem,?\s*\d|hoje,?\s*\d|\d{1,2}\/\d{1,2}|video|vídeo|chamada|áudio|foto|imagem|encaminhada|criptografia|contatos|grupos|ferramentas|bloquear|nenhum|seguran|ligaç)/i;

    function _ehRuido(l){
      var s = _limpar(l).toLowerCase();
      if(!s||s.length<2) return true;
      if(/^[\d\s:\-\/\.,]+$/.test(s)) return true;
      if(RUIDO.test(s)) return true;
      if(/^@/.test(s)) return true;
      return false;
    }

    var linhasRaw = txt.split(/\r?\n/);
    var linhas = [];
    for(var i=0;i<linhasRaw.length;i++){
      var lx=_limpar(linhasRaw[i]);
      if(lx) linhas.push(lx);
    }

    /* ── TELEFONE ─────────────────────────────────────────────── */
    var telefone = '';
    var rTel1 = txt.match(/(\+\d{1,3}[\s\-]?\(?\d{2}\)?[\s\-]?\d{4,5}[\s\-]?\d{4})/);
    var rTel2 = txt.match(/(\(\d{2}\)\s?\d{4,5}[\s\-]?\d{4})/);
    var rTel5 = txt.match(/(\b\d{2}\d{4,5}[\s\-]\d{4}\b)/);
    var rTel3 = txt.match(/(\b\d{2}\s\d{4,5}[\s\-]?\d{4}\b)/);
    var rTel4 = txt.match(/(\b\d{10,11}\b)/);
    if(rTel1) telefone=rTel1[1];
    else if(rTel2) telefone=rTel2[1];
    else if(rTel5) telefone=rTel5[1];
    else if(rTel3) telefone=rTel3[1];
    else if(rTel4) telefone=rTel4[1];
    if(telefone){
      var soDig=telefone.replace(/\D/g,'');
      if(soDig.length===13&&soDig.indexOf('55')===0) soDig=soDig.substring(2);
      if(soDig.length===12&&soDig.indexOf('55')===0) soDig=soDig.substring(2);
      if(soDig.length===11) telefone='('+soDig.substring(0,2)+') '+soDig.substring(2,7)+'-'+soDig.substring(7);
      else if(soDig.length===10) telefone='('+soDig.substring(0,2)+') '+soDig.substring(2,6)+'-'+soDig.substring(6);
    }

    /* ── NOME ─────────────────────────────────────────────────── */
    var nome=''; var iNome=-1;

    /* 1) WhatsApp: ~ */
    for(var a=0;a<linhas.length;a++){
      if(/^~/.test(linhas[a])){ nome=_limpar(linhas[a].replace(/^~/,'')); iNome=a; break; }
    }

    /* 2) Instagram: linha antes do @username */
    if(!nome){
      for(var b=0;b<linhas.length;b++){
        if(/^@?[a-z0-9_.]{3,}$/i.test(linhas[b])&&/[a-z]/.test(linhas[b])&&!/\s/.test(linhas[b])){
          for(var bb=b-1;bb>=0&&bb>=b-3;bb--){
            if(_ehRuido(linhas[bb])) continue;
            var pals=linhas[bb].split(/\s+/);
            if(pals.length>=1&&pals.length<=4&&/^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/.test(pals[0])){
              nome=linhas[bb]; iNome=bb; break;
            }
          }
          if(nome) break;
        }
      }
    }

    /* 3) Linha após "Número de telefone" */
    if(!nome){
      for(var d=0;d<linhas.length;d++){
        if(/n[uú]mero de telefone/i.test(linhas[d])){
          for(var dd=d+1;dd<linhas.length&&dd<=d+3;dd++){
            if(!_ehRuido(linhas[dd])){
              var pp=linhas[dd].split(/\s+/);
              if(pp.length>=2&&/^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/.test(pp[0])){ nome=linhas[dd]; iNome=dd; break; }
            }
          }
          if(nome) break;
        }
      }
    }

    /* 4) Primeira linha com 2–5 palavras todas capitalizadas */
    if(!nome){
      for(var e=0;e<linhas.length;e++){
        if(_ehRuido(linhas[e])) continue;
        var palavras=linhas[e].split(/\s+/);
        if(palavras.length>=2&&palavras.length<=5){
          var todasCap=true;
          for(var f=0;f<palavras.length;f++){
            if(!/^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç'\-]+$/.test(palavras[f])){ todasCap=false; break; }
          }
          if(todasCap){ nome=linhas[e]; iNome=e; break; }
        }
      }
    }

    /* ── MENSAGEM ─────────────────────────────────────────────── */
    var mensagem='';
    /* prioriza linha curta com ? ou ! */
    for(var g=0;g<linhas.length;g++){
      if(g===iNome) continue;
      var lg=linhas[g];
      if(_ehRuido(lg)||lg===nome) continue;
      if(telefone&&lg.replace(/\D/g,'').length>=8) continue;
      if(/[?!]/.test(lg)&&lg.length<=120){ mensagem=lg; break; }
    }
    /* fallback: primeira linha razoável */
    if(!mensagem){
      for(var h=0;h<linhas.length;h++){
        if(h===iNome) continue;
        var lh=linhas[h];
        if(_ehRuido(lh)||lh===nome) continue;
        if(lh.replace(/\D/g,'').length>=8) continue;
        if(lh.length>=3&&lh.length<=200&&/[a-záéíóúç]/i.test(lh)){ mensagem=lh; break; }
      }
    }

    return { nome: nome||'', telefone: telefone||'', mensagem: mensagem||'' };
  }

  /* ── Extração de dados da imagem (OCR) ─────────────────────── */
  function _extrairDadosIA(base64, mediaType, callback){
    _ultimoBase64 = base64;
    _extrairOCR(base64, callback);
  }

  /* ── Deduplicação por telefone ──────────────────────────────── */
  function _telefoneExiste(tel){
    if(!tel) return null;
    var norm = tel.replace(/\D/g,'');
    var found = null;
    Object.entries(_leads).forEach(function(e){
      var t = (e[1].telefone||'').replace(/\D/g,'');
      if(t && t === norm) found = e[1].nome || e[0];
    });
    return found;
  }

  var _processando = false; /* flag anti-duplo disparo */
  function _processarArquivo(file){
    if(!file||!file.type.startsWith('image/')){ _toast('Só imagens são aceitas.','var(--amber)'); return; }
    if(_processando) return;
    _processando = true;
    var reader=new FileReader();
    reader.onload=function(e){
      var base64Raw = e.target.result;
      var mediaType = file.type||'image/jpeg';
      _comprimir(base64Raw, function(base64){
        _extrairDadosIA(base64, mediaType, function(dados){
          _processando = false;
          _abrirModal(null, base64, dados);
        });
      });
    };
    reader.onerror = function(){ _processando = false; };
    reader.readAsDataURL(file);
  }

  /* ── Modal edição/criação ───────────────────────────────────── */
  function _abrirModal(id, imgBase64, dadosIA){
    _editId = id;
    var exist = id?(_leads[id]||{}):{};
    dadosIA = dadosIA||{};
    var ov = document.getElementById('npLeadsModalOverlay');
    if(!ov) return;
    document.getElementById('npLdNome').value = dadosIA.nome||exist.nome||'';
    document.getElementById('npLdTel').value  = dadosIA.telefone||exist.telefone||'';
    document.getElementById('npLdMsg').value  = dadosIA.mensagem||exist.mensagem||'';
    var prev = document.getElementById('npLdImgPreview');
    var src  = imgBase64||exist.imgBase64||'';
    if(prev){ prev.src=src; prev.style.display=src?'block':'none'; }
    ov.dataset.img = src;
    ov.classList.add('open');
    var badge = document.getElementById('npLdIABadge');
    if(badge) badge.style.display = dadosIA.nome||dadosIA.telefone||dadosIA.mensagem ? '' : 'none';
    setTimeout(function(){ var el=document.getElementById('npLdNome'); if(el){el.focus();} },100);
  }

  window._ldEditar = function(id){ _abrirModal(id, null); };

  window._ldFecharModal = function(){
    var ov=document.getElementById('npLeadsModalOverlay');
    if(ov){ ov.classList.remove('open'); ov.dataset.img=''; }
    _editId=null;
  };

  window._ldSalvar = function(){
    var nome = (document.getElementById('npLdNome').value||'').trim();
    var tel  = (document.getElementById('npLdTel').value||'').trim();
    var msg  = (document.getElementById('npLdMsg').value||'').trim();
    if(!nome&&!tel){ _toast('Preencha ao menos nome ou telefone.','var(--amber)'); return; }

    /* deduplicação: verificar telefone duplicado apenas para leads novos */
    if(!_editId && tel){
      var dup = _telefoneExiste(tel);
      if(dup){
        if(!confirm('⚠️ Já existe um lead com esse telefone ('+dup+'). Salvar mesmo assim?')) return;
      }
    }

    var ov   = document.getElementById('npLeadsModalOverlay');
    var img  = (ov&&ov.dataset.img)||'';
    var id   = _editId||_id();
    var exist= _leads[id]||{};
    var obj  = Object.assign({},exist,{ nome:nome, telefone:tel, mensagem:msg, imgBase64:img, criadoEm:exist.criadoEm||Date.now() });
    _leads[id]=obj;
    _salvarLead(id,obj);
    window._ldFecharModal();
    _render();
    _toast('✅ Lead salvo!');
  };

  /* ── Ver imagem ampliada ─────────────────────────────────────── */
  window._ldVerImg = function(id){
    var l=_leads[id]; if(!l||!l.imgBase64) return;
    var ov=document.getElementById('npLeadsImgOverlay');
    if(!ov) return;
    document.getElementById('npLeadsImgBig').src=l.imgBase64;
    ov.classList.add('open');
  };
  window._ldFecharImg=function(){
    var ov=document.getElementById('npLeadsImgOverlay');
    if(ov) ov.classList.remove('open');
  };

  /* ── Distribuir — escolha manual do consultor ──────────────── */
  var _distDropId = null; // id do lead com dropdown aberto

  window._ldDistribuir = function(id, evt){
    var l = _leads[id]; if(!l) return;
    var cons = _consultores();
    if(!cons.length){ _toast('Nenhum consultor disponível neste mês.','var(--amber)'); return; }

    /* fecha dropdown anterior se existir */
    if(_distDropId && _distDropId!==id){
      var prev = document.getElementById('ldDrop_'+_distDropId);
      if(prev) prev.remove();
    }
    /* toggle: fecha se já está aberto para este lead */
    var existing = document.getElementById('ldDrop_'+id);
    if(existing){ existing.remove(); _distDropId=null; return; }
    _distDropId = id;

    var drop = document.createElement('div');
    drop.id = 'ldDrop_'+id;
    drop.style.cssText = 'position:fixed;z-index:9999;background:var(--surface);'
      +'border:1px solid var(--border2);border-radius:10px;padding:6px;'
      +'box-shadow:0 8px 24px rgba(0,0,0,.5);min-width:160px;';

    cons.forEach(function(c){
      var item = document.createElement('button');
      item.textContent = c;
      item.style.cssText = 'display:block;width:100%;text-align:left;padding:7px 12px;'
        +'background:none;border:none;color:var(--text);font-size:12px;font-weight:600;'
        +'cursor:pointer;border-radius:6px;';
      item.onmouseover = function(){ item.style.background='var(--surface2)'; };
      item.onmouseout  = function(){ item.style.background='none'; };
      item.onclick = function(){ _confirmarDistribuicao(id, c); drop.remove(); _distDropId=null; };
      drop.appendChild(item);
    });

    document.body.appendChild(drop);

    /* posicionar: usa o elemento clicado (evt.target) ou o botão 📤 como fallback */
    var ancora = (evt && evt.currentTarget) || (evt && evt.target) || document.querySelector('[data-dist-id="'+id+'"]');
    if(ancora){
      var rect = ancora.getBoundingClientRect();
      var dropW = 160;
      var left = rect.left;
      /* não sair da tela pela direita */
      if(left + dropW > window.innerWidth - 8) left = window.innerWidth - dropW - 8;
      drop.style.top  = (rect.bottom + 4) + 'px';
      drop.style.left = left + 'px';
    }

    /* fechar ao clicar fora */
    setTimeout(function(){
      function _fora(e){ if(!drop.contains(e.target)){ drop.remove(); _distDropId=null; document.removeEventListener('click',_fora); } }
      document.addEventListener('click',_fora);
    },10);
  };

  function _confirmarDistribuicao(id, consultor){
    var l = _leads[id]; if(!l) return;

    /* fecha qualquer dropdown aberto ANTES de re-renderizar */
    document.querySelectorAll('[id^="ldDrop_"]').forEach(function(el){ el.remove(); });
    _distDropId = null;

    var texto = '📋 *LEAD — Febracis*\n'
      +'👤 *Nome:* '+(l.nome||'Não informado')+'\n'
      +'📞 *Telefone:* '+(l.telefone||'Não informado')+'\n'
      +'💬 *O que disse:* '+(l.mensagem||'Não informado')+'\n'
      +'─────────────────────\n'
      +'🎯 *Consultor(a):* '+consultor;

    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(texto).then(function(){
        _toast('📋 Copiado para '+consultor+'!');
      }).catch(function(){ _copiarFallback(texto,consultor); });
    } else { _copiarFallback(texto,consultor); }

    l.consultor=consultor; l.distribuidoEm=Date.now(); l.status=l.status||'novo';
    _leads[id]=l;
    _salvarLead(id,l);
    requestAnimationFrame(_render); /* fora do contexto do clique — evita conflito com listener _fora */
  };

  /* ── Desfazer distribuição ──────────────────────────────────── */
  window._ldDesfazer = function(id){
    var l = _leads[id]; if(!l||!l.consultor) return;
    if(!confirm('Desfazer distribuição para '+l.consultor+'?')) return;
    /* recua o índice round-robin */
    if(_rrIdx > 0){ _rrIdx--; _salvarRR(); }
    delete l.consultor; delete l.distribuidoEm;
    _leads[id]=l;
    _salvarLead(id,l);
    _render();
    _toast('↩ Distribuição desfeita.','var(--amber)');
  };

  function _copiarFallback(texto,consultor){
    var ta=document.createElement('textarea');
    ta.value=texto; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); _toast('📋 Copiado para '+consultor+'!'); }
    catch(e){ _toast('Não foi possível copiar.','var(--amber)'); }
    document.body.removeChild(ta);
  }

  /* ── Remover ────────────────────────────────────────────────── */
  window._ldRemover = function(id){
    if(!confirm('Remover este lead?')) return;
    delete _leads[id];
    if(window._fbSave) window._fbSave(_fbPath(id),null).catch(function(){});
    _render();
    _toast('Lead removido.','var(--muted)');
  };

  /* ── Init público ───────────────────────────────────────────── */
  window._initDrop = _initDrop;
  window._ldInit = function(mk){
    _carregar(mk||_mk());
    setTimeout(_initDrop, 200);
  };


  /* ESC fecha modais */
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      window._ldFecharModal();
      window._ldFecharImg();
    }
  });

  document.addEventListener('DOMContentLoaded',function(){
    setTimeout(function(){ window._ldInit(); }, 1800);
  });

  /* ── Observações do lead (só ADM edita) ────────────────────── */
  window._ldAbrirObs = function(id){
    var l = _leads[id]||{};
    var sess = window._getSessao ? window._getSessao() : null;
    var isAdm = !sess || sess.perfil === 'adm';

    var ov = document.getElementById('ldObsOverlay');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'ldObsOverlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9000;display:flex;align-items:center;justify-content:center;';
      ov.innerHTML = '<div style="background:#111a11;border:1px solid #1e2e1e;border-radius:14px;width:min(480px,95vw);padding:24px;display:flex;flex-direction:column;gap:14px;">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;">'
        +'<span style="font-size:14px;font-weight:700;color:#fff;">ℹ️ Observação do Lead</span>'
        +'<button onclick="window._ldFecharObs()" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;">✕</button>'
        +'</div>'
        +'<div id="ldObsNome" style="font-size:12px;color:var(--muted);"></div>'
        +'<textarea id="ldObsTexto" rows="5" style="width:100%;background:#0d160d;border:1px solid #1e2e1e;border-radius:8px;color:#e8f0e8;font-size:13px;padding:10px;resize:vertical;font-family:inherit;outline:none;" placeholder="Digite uma observação sobre este lead..."></textarea>'
        +'<div id="ldObsAcoes" style="display:flex;gap:8px;justify-content:flex-end;"></div>'
        +'</div>';
      ov.addEventListener('click', function(e){ if(e.target===ov) window._ldFecharObs(); });
      document.body.appendChild(ov);
    }

    ov.dataset.id = id;
    document.getElementById('ldObsNome').textContent = (l.nome||'Sem nome').toUpperCase();
    var txt = document.getElementById('ldObsTexto');
    txt.value = l.obs||'';
    txt.readOnly = !isAdm;
    txt.style.color = isAdm ? '#e8f0e8' : '#8aaa8a';

    var acoes = document.getElementById('ldObsAcoes');
    if(isAdm){
      acoes.innerHTML = '<button onclick="window._ldFecharObs()" style="padding:8px 16px;border-radius:8px;border:1px solid #1e2e1e;background:#1a2a1a;color:#8aaa8a;cursor:pointer;font-size:12px;">Cancelar</button>'
        +'<button onclick="window._ldSalvarObs()" style="padding:8px 20px;border-radius:8px;border:none;background:#c8f05a;color:#0a150a;font-weight:700;cursor:pointer;font-size:12px;">💾 Salvar</button>';
    } else {
      acoes.innerHTML = '<button onclick="window._ldFecharObs()" style="padding:8px 20px;border-radius:8px;border:none;background:#c8f05a;color:#0a150a;font-weight:700;cursor:pointer;font-size:12px;">Fechar</button>';
    }

    ov.style.display = 'flex';
  };

  window._ldFecharObs = function(){
    var ov = document.getElementById('ldObsOverlay');
    if(ov) ov.style.display = 'none';
  };

  window._ldSalvarObs = function(){
    var ov = document.getElementById('ldObsOverlay');
    if(!ov) return;
    var id = ov.dataset.id;
    var obs = (document.getElementById('ldObsTexto').value||'').trim();
    if(!_leads[id]) return;
    _leads[id].obs = obs;
    _salvarLead(id, _leads[id]);
    window._ldFecharObs();
    _render();
    _toast('✅ Observação salva!','var(--accent)');
  };

})();
