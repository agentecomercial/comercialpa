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

  /* ── Worker OCR reutilizável ────────────────────────────────── */
  var _ocrWorker = null;
  var _ocrPronto = false;
  var _ocrFila   = []; // callbacks aguardando warmup

  function _iniciarWorker(cb){
    if(_ocrPronto){ if(cb) cb(); return; }
    if(typeof Tesseract==='undefined'){ if(cb) cb(); return; }
    _ocrWorker = Tesseract.createWorker('por+eng', 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
      langPath:   'https://tessdata.projectnaptha.com/4.0.0'
    });
    _ocrWorker.then(function(w){
      _ocrWorker  = w;
      _ocrPronto  = true;
      if(cb) cb();
      _ocrFila.forEach(function(fn){ fn(); });
      _ocrFila = [];
    }).catch(function(e){
      console.warn('[Leads OCR] warmup falhou:', e);
      _ocrWorker = null;
      _ocrPronto = false;
      if(cb) cb();
    });
  }

  /* ── Helpers ────────────────────────────────────────────────── */
  function _mk(){ return typeof window._mesKey==='function'?window._mesKey():(function(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})(); }
  function _id(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _toast(msg,cor){ if(typeof _showToast==='function') _showToast(msg,cor||'var(--accent)'); }
  function _consultores(){ return window._npConsultores&&window._npConsultores.length?window._npConsultores:[]; }

  /* ── Compressão de imagem ───────────────────────────────────── */
  function _comprimir(base64, callback){
    var MAX_W = 720;
    var QUALITY = 0.70;
    var img = new Image();
    img.onload = function(){
      var ratio = Math.min(1, MAX_W / img.width);
      var w = Math.round(img.width  * ratio);
      var h = Math.round(img.height * ratio);
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', QUALITY));
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

  /* ── Filtro ativo ───────────────────────────────────────────── */
  window._ldFiltrar = function(consultor){
    _filtroConsultor = consultor||'';
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
    _renderFiltros();
    _renderResumo();
    _renderProximo();
    var el = document.getElementById('npLeadsGrid');
    if(!el) return;
    var todas = Object.entries(_leads).sort(function(a,b){ return (b[1].criadoEm||0)-(a[1].criadoEm||0); });
    var lista = _filtroConsultor
      ? todas.filter(function(e){
          if(_filtroConsultor==='__sem__') return !e[1].consultor;
          return (e[1].consultor||'')=== _filtroConsultor;
        })
      : todas;

    if(!todas.length){
      el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Nenhum lead cadastrado.<br>Arraste uma imagem do WhatsApp acima.</div>';
      return;
    }
    if(!lista.length){
      el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Nenhum lead encontrado para este filtro.</div>';
      return;
    }
    el.innerHTML = lista.map(function(e){
      var id=e[0]; var l=e[1];
      var dist = l.consultor
        ?'<span style="font-size:10px;background:rgba(200,240,90,.12);color:var(--accent);border:1px solid rgba(200,240,90,.25);border-radius:20px;padding:2px 8px;white-space:nowrap;">✅ '+_esc(l.consultor)+'</span>'
        :'<span style="font-size:10px;background:rgba(255,82,82,.1);color:var(--red);border:1px solid rgba(255,82,82,.25);border-radius:20px;padding:2px 8px;">Não distribuído</span>';
      return '<div class="np-lead-card">'
        +(l.imgBase64?'<img src="'+l.imgBase64+'" onclick="window._ldVerImg(\''+id+'\')" style="width:100%;border-radius:8px;margin-bottom:10px;cursor:pointer;max-height:160px;object-fit:cover;">':'')
        +'<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:2px;">'+_esc(l.nome||'Sem nome')+'</div>'
        +'<div style="font-size:11px;color:var(--muted);margin-bottom:4px;">'+_esc(l.telefone||'—')+'</div>'
        +'<div style="font-size:11px;color:var(--text);font-style:italic;margin-bottom:8px;line-height:1.4;">'+_esc(l.mensagem||'')+'</div>'
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">'
          +dist
          +'<div style="display:flex;gap:6px;">'
            +'<button onclick="window._ldDistribuir(\''+id+'\')" style="font-size:10px;padding:3px 8px;border-radius:6px;border:1px solid rgba(200,240,90,.3);background:rgba(200,240,90,.08);color:var(--accent);cursor:pointer;">📤 Distribuir</button>'
            +(l.consultor?'<button onclick="window._ldDesfazer(\''+id+'\')" style="font-size:10px;padding:3px 8px;border-radius:6px;border:1px solid rgba(255,180,0,.3);background:rgba(255,180,0,.07);color:var(--amber);cursor:pointer;">↩</button>':'')
            +'<button onclick="window._ldEditar(\''+id+'\')" style="font-size:10px;padding:3px 8px;border-radius:6px;border:1px solid var(--border2);background:rgba(255,255,255,.04);color:var(--muted);cursor:pointer;">✏</button>'
            +'<button onclick="window._ldRemover(\''+id+'\')" style="font-size:10px;padding:3px 8px;border-radius:6px;border:1px solid rgba(255,82,82,.3);background:rgba(255,82,82,.06);color:var(--red);cursor:pointer;">✕</button>'
          +'</div>'
        +'</div>'
        +'</div>';
    }).join('');
  }

  /* ── Barra de filtros por consultor ─────────────────────────── */
  function _renderFiltros(){
    var el = document.getElementById('npLeadsFiltros');
    if(!el) return;
    var todas = Object.values(_leads);
    var total = todas.length;
    if(!total){ el.innerHTML=''; return; }

    var map = {};
    todas.forEach(function(l){
      var k = l.consultor||'__sem__';
      map[k] = (map[k]||0)+1;
    });

    var btns = '<button onclick="window._ldFiltrar(\'\')" style="'
      +_btnStyle(_filtroConsultor==='')+'">'
      +'Todos <span style="font-size:9px;opacity:.7;">('+total+')</span></button>';

    if(map['__sem__']){
      btns += '<button onclick="window._ldFiltrar(\'__sem__\')" style="'
        +_btnStyle(_filtroConsultor==='__sem__','var(--red)')+'">'
        +'❗ Sem consultor <span style="font-size:9px;opacity:.7;">('+map['__sem__']+')</span></button>';
    }

    Object.keys(map).filter(function(k){ return k!=='__sem__'; }).sort().forEach(function(cons){
      btns += '<button onclick="window._ldFiltrar(\''+_esc(cons)+'\')" style="'
        +_btnStyle(_filtroConsultor===cons)+'">'
        +_esc(cons)+' <span style="font-size:9px;opacity:.7;">('+map[cons]+')</span></button>';
    });

    el.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">'+btns+'</div>';
  }

  function _btnStyle(ativo, cor){
    cor = cor||'var(--accent)';
    return 'font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;cursor:pointer;transition:all .15s;'
      +(ativo
        ?'background:'+cor+';color:#000;border:1px solid '+cor+';'
        :'background:rgba(255,255,255,.04);color:var(--muted);border:1px solid var(--border2);');
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
      return '<div style="background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;min-width:160px;">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:'+cor+'22;color:'+cor+';border:1.5px solid '+cor+'55;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;">'+nome.charAt(0).toUpperCase()+'</div>'
        +'<div><div style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">'+_esc(nome)+'</div>'
        +'<div style="font-size:10px;color:var(--muted);">'+map[nome]+' lead'+(map[nome]!==1?'s':'')+'</div>'
        +'</div></div>';
    }).join('');

    var semDist = map['__sem__']||0;
    if(semDist){
      cards = '<div style="background:rgba(255,82,82,.06);border:1px solid rgba(255,82,82,.2);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;min-width:160px;">'
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

  /* ── Extração OCR via worker reutilizável ───────────────────── */
  function _extrairOCR(base64, callback){
    if(typeof Tesseract==='undefined'){
      console.warn('[Leads OCR] Tesseract não carregado');
      callback({}); return;
    }
    _toast('🔍 Lendo imagem...','var(--muted)');

    function _reconhecer(){
      /* worker já inicializado (createWorker resolvido) */
      if(_ocrPronto && _ocrWorker && typeof _ocrWorker.recognize === 'function'){
        _ocrWorker.recognize(base64).then(function(result){
          var txt = result.data.text||'';
          console.log('[Leads OCR] texto bruto:\n', txt);
          var dados = _parsearWhatsApp(txt);
          console.log('[Leads OCR] dados:', dados);
          callback(dados);
        }).catch(function(e){
          console.warn('[Leads OCR] erro:', e);
          callback({});
        });
      } else {
        /* fallback sem worker */
        Tesseract.recognize(base64, 'por+eng', {
          workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
          corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
          langPath:   'https://tessdata.projectnaptha.com/4.0.0'
        }).then(function(result){
          var txt = result.data.text||'';
          var dados = _parsearWhatsApp(txt);
          callback(dados);
        }).catch(function(e){
          console.warn('[Leads OCR] fallback erro:', e);
          callback({});
        });
      }
    }

    if(_ocrPronto){ _reconhecer(); }
    else if(_ocrWorker){ _ocrFila.push(_reconhecer); }
    else { _reconhecer(); }
  }

  /* ── Parser regex para screenshots do WhatsApp ──────────────── */
  function _parsearWhatsApp(txt){
    var linhas = txt.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);

    var rTel = txt.match(/(\+\d{1,3}[\s\-]?\d{2}[\s\-]?\d{4,5}[\s\-]?\d{4})/);
    var telefone = rTel ? rTel[1].replace(/\s+/g,' ').trim() : '';

    var nome = '';
    var iNome = -1;
    linhas.forEach(function(l,i){
      if(!nome && /^~/.test(l)){ nome = l.replace(/^[\s.,;:!?()\-_~'"*]+/,'').trim(); iNome=i; }
    });
    if(!nome && telefone){
      var iTel = linhas.findIndex(function(l){ return l.indexOf(telefone.split(' ')[0])!==-1; });
      if(iTel!==-1 && linhas[iTel+1]) { nome = linhas[iTel+1].replace(/^[\s.,;:!?()\-_~'"*]+/,'').trim(); iNome=iTel+1; }
    }

    var excluir = /criptografia|contatos|grupos|ferramentas|bloquear|nenhum|seguran|mensagens|ligaç/i;
    var horaRe  = /^\d{1,2}:\d{2}$/;
    var candidatas = linhas.filter(function(l, i){
      return l.length > 10 && !excluir.test(l) && !horaRe.test(l) && i !== iNome && l !== telefone;
    });
    var mensagem = candidatas.length ? candidatas[candidatas.length-1] : '';

    function _limpar(s){
      return s.replace(/^[\s.,;:!?()\-_~'"*]+/,'').replace(/[\s.,;:!?()\-_~'"*]+$/,'').trim();
    }
    mensagem = _limpar(mensagem);
    nome     = _limpar(nome);

    return { nome: nome, telefone: telefone, mensagem: mensagem };
  }

  /* ── Extração via Gemini (fallback opcional com chave) ──────── */
  function _extrairGemini(base64, mediaType, callback){
    var key = _getApiKey();
    if(!key){ callback(null); return; }
    var pureB64 = base64.replace(/^data:[^;]+;base64,/,'');
    fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+key,{
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify({
        contents:[{ parts:[
          { inline_data:{ mime_type: mediaType||'image/jpeg', data: pureB64 } },
          { text:'Captura de tela do WhatsApp. Retorne SOMENTE JSON (sem markdown): {"nome":"","telefone":"","mensagem":""}. Nome: contato. Telefone: com DDI. Mensagem: o que o lead escreveu.' }
        ]}],
        generationConfig:{ maxOutputTokens:200, temperature:0 }
      })
    })
    .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(res){
      var text = (((res.candidates||[])[0]||{}).content||{});
      text = ((text.parts||[])[0]||{}).text||'{}';
      text = text.replace(/```[a-z]*/gi,'').replace(/```/g,'').trim();
      try{ callback(JSON.parse(text)); } catch(e){ callback(null); }
    })
    .catch(function(){ callback(null); });
  }

  /* ── Orquestrador: OCR primeiro, Gemini melhora se necessário ─ */
  function _extrairDadosIA(base64, mediaType, callback){
    _ultimoBase64 = base64;
    _extrairOCR(base64, function(ocrDados){
      var key = _getApiKey();
      if(!key || (ocrDados.nome && ocrDados.telefone && ocrDados.mensagem)){
        callback(ocrDados); return;
      }
      _extrairGemini(base64, mediaType, function(gemDados){
        if(!gemDados){ callback(ocrDados); return; }
        callback({
          nome:     gemDados.nome     || ocrDados.nome     || '',
          telefone: gemDados.telefone || ocrDados.telefone || '',
          mensagem: gemDados.mensagem || ocrDados.mensagem || ''
        });
      });
    });
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

  function _processarArquivo(file){
    if(!file.type.startsWith('image/')){ _toast('Só imagens são aceitas.','var(--amber)'); return; }
    var reader=new FileReader();
    reader.onload=function(e){
      var base64Raw = e.target.result;
      var mediaType = file.type||'image/jpeg';
      /* comprimir antes de usar */
      _comprimir(base64Raw, function(base64){
        if(!_getApiKey()){
          _abrirModal(null, base64);
          return;
        }
        _extrairDadosIA(base64, mediaType, function(dados){
          _abrirModal(null, base64, dados);
        });
      });
    };
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

  /* ── Distribuir (round-robin) ───────────────────────────────── */
  window._ldDistribuir = function(id){
    var l = _leads[id]; if(!l) return;
    var cons = _consultores();
    if(!cons.length){ _toast('Nenhum consultor disponível neste mês.','var(--amber)'); return; }
    var consultor = cons[_rrIdx % cons.length];
    _rrIdx++;
    _salvarRR();

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

    l.consultor=consultor; l.distribuidoEm=Date.now();
    _leads[id]=l;
    _salvarLead(id,l);
    _render();
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
    /* aquecer o worker OCR em background */
    if(typeof Tesseract!=='undefined' && !_ocrWorker){
      setTimeout(_iniciarWorker, 500);
    }
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

})();
