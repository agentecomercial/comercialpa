/* ============================================================
   PROPOSTA RENDERER — engine genérica de propostas HTML "premium"
   Usa: window.PropostaRenderer.registrar(codigo, definicao)
        window.PropostaRenderer.abrir(codigo)
============================================================ */
(function(){
  var _registry = {};

  // Endereços predefinidos disponíveis para o campo LOCAL_TURMA
  var LOCAIS_PRESET = [
    { label: '— Selecione um local —', value: '' },
    { label: 'Febracis Belém — Nazaré', value: 'R. João Balbi, 1067 - Nazaré, Belém - PA, 66060-425, Brasil' },
    { label: 'Personalizar...', value: '__custom__' }
  ];

  function _injetarEstilos(){
    if(document.getElementById('propostaRendererStyles')) return;
    var s = document.createElement('style');
    s.id = 'propostaRendererStyles';
    s.textContent = [
      '.pr-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99990;display:flex;align-items:center;justify-content:center;padding:20px;}',
      '.pr-modal{background:#1a1a1a;color:#fff;border:1px solid rgba(201,168,76,.3);border-radius:8px;width:100%;max-width:560px;max-height:90vh;overflow:auto;font-family:"DM Sans",system-ui,sans-serif;}',
      '.pr-modal-view{max-width:1200px;width:90vw;height:90vh;display:flex;flex-direction:column;overflow:hidden;}',
      '.pr-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,.08);}',
      '.pr-head h3{margin:0;font-family:"Playfair Display",serif;font-size:18px;font-weight:500;color:#e8c97a;}',
      '.pr-head .pr-sub{font-size:11px;color:rgba(255,255,255,.5);letter-spacing:.05em;margin-top:2px;}',
      '.pr-close{background:none;border:none;color:rgba(255,255,255,.6);font-size:22px;cursor:pointer;padding:4px 10px;line-height:1;}',
      '.pr-close:hover{color:#fff;}',
      '.pr-body{padding:20px 22px;overflow:auto;}',
      '.pr-field{margin-bottom:14px;}',
      '.pr-field label{display:block;font-size:11px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;}',
      '.pr-field input,.pr-field textarea{width:100%;background:#0d0d0d;border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:10px 12px;color:#fff;font-family:inherit;font-size:14px;transition:border-color .2s;}',
      '.pr-field input:focus,.pr-field textarea:focus{outline:none;border-color:rgba(201,168,76,.5);}',
      '.pr-field textarea{min-height:70px;resize:vertical;}',
      '.pr-field select{width:100%;background:#0d0d0d;border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:10px 12px;color:#fff;font-family:inherit;font-size:14px;transition:border-color .2s;cursor:pointer;}',
      '.pr-field select:focus{outline:none;border-color:rgba(201,168,76,.5);}',
      '.pr-field select option{background:#1a1a1a;color:#fff;}',
      '.pr-field .pr-custom-input{margin-top:8px;}',
      '.pr-foot{padding:14px 22px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:flex-end;gap:8px;background:rgba(0,0,0,.2);}',
      '.pr-btn{background:transparent;border:1px solid rgba(255,255,255,.15);color:#fff;padding:8px 16px;border-radius:4px;font-size:13px;font-family:inherit;cursor:pointer;transition:border-color .2s,background .2s;}',
      '.pr-btn:hover{border-color:rgba(201,168,76,.5);}',
      '.pr-btn-primary{background:#c9a84c;border-color:#c9a84c;color:#0a0a0a;font-weight:500;}',
      '.pr-btn-primary:hover{background:#e8c97a;border-color:#e8c97a;}',
      '.pr-iframe{flex:1;width:100%;border:none;background:#000;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function _toast(msg, tipo){
    if(typeof window._showToast === 'function'){ window._showToast(msg, tipo || 'success'); return; }
    if(typeof window.alert === 'function') window.alert(msg);
  }

  function _fechar(el){ if(el && el.parentNode) el.parentNode.removeChild(el); }

  function _renderTokens(template, dados, definicao){
    // blocos condicionais: {{#KEY}}...{{/KEY}} — renderiza apenas se KEY for não-vazio
    var result = template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, function(_, k, block){
      var val = (dados[k] !== undefined && dados[k] !== null && dados[k] !== '') ? dados[k] : null;
      if(!val){
        var campo = (definicao.campos || []).find(function(c){ return c.key === k; });
        val = (campo && campo.fallback !== undefined && campo.fallback !== '') ? campo.fallback : null;
      }
      return val ? block : '';
    });
    return result.replace(/\{\{(\w+)\}\}/g, function(_, k){
      if(dados[k] !== undefined && dados[k] !== null && dados[k] !== '') return dados[k];
      var campo = (definicao.campos || []).find(function(c){ return c.key === k; });
      return campo && campo.fallback !== undefined ? campo.fallback : '';
    });
  }

  function _slug(s){
    return String(s || 'cliente').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40) || 'cliente';
  }

  function _abrirVisualizacao(codigo, definicao, dados){
    var html = _renderTokens(definicao.template, dados, definicao);
    var nomeArq = 'proposta-' + codigo + '-' + _slug(dados.NOME_CLIENTE) + '.html';

    var ov = document.createElement('div');
    ov.className = 'pr-overlay';
    ov.innerHTML = ''
      + '<div class="pr-modal pr-modal-view">'
      + '  <div class="pr-head">'
      + '    <div><h3>Proposta ' + codigo + '</h3><div class="pr-sub">' + (dados.NOME_CLIENTE || 'pré-visualização') + '</div></div>'
      + '    <button class="pr-close" data-act="close" title="Fechar">×</button>'
      + '  </div>'
      + '  <iframe class="pr-iframe"></iframe>'
      + '  <div class="pr-foot">'
      + '    <button class="pr-btn" data-act="back">← Voltar</button>'
      + '    <button class="pr-btn" data-act="print">Imprimir</button>'
      + '    <button class="pr-btn" data-act="newtab">Abrir em nova aba</button>'
      + '    <button class="pr-btn pr-btn-primary" data-act="download">Baixar HTML</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(ov);

    var ifr = ov.querySelector('iframe');
    ifr.srcdoc = html;

    ov.addEventListener('click', function(e){
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if(!act) return;
      if(act === 'close'){ _fechar(ov); return; }
      if(act === 'back'){ _fechar(ov); _abrirForm(codigo, definicao, dados); return; }
      if(act === 'print'){
        try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }
        catch(err){ _toast('Não foi possível imprimir: ' + err.message, 'error'); }
        return;
      }
      if(act === 'newtab'){
        try{
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var blobUrl = URL.createObjectURL(blob);
          var tab = window.open(blobUrl, '_blank');
          if(!tab){ _toast('Permita pop-ups para este site e tente novamente.', 'error'); }
          setTimeout(function(){ URL.revokeObjectURL(blobUrl); }, 60000);
        }catch(err){
          _toast('Erro ao abrir: ' + err.message, 'error');
        }
        return;
      }
      if(act === 'download'){
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = nomeArq;
        document.body.appendChild(a); a.click();
        setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        _toast('Proposta baixada: ' + nomeArq);
        return;
      }
    });
  }

  function _abrirForm(codigo, definicao, dadosIniciais){
    var dados = dadosIniciais || {};
    var ov = document.createElement('div');
    ov.className = 'pr-overlay';
    var camposHtml = (definicao.campos || []).map(function(c){
      var val = dados[c.key] != null ? String(dados[c.key]).replace(/"/g,'&quot;') : '';
      var temSelect = (c.key === 'LOCAL_TURMA') || (c.options && c.options.length);
      if(temSelect){
        var opts = c.options || LOCAIS_PRESET;
        var valAtual = dados[c.key] != null ? String(dados[c.key]) : '';
        var isPreset = opts.some(function(o){ return o.value === valAtual && o.value !== '__custom__' && o.value !== ''; });
        var selVal    = valAtual === '' ? '' : (isPreset ? valAtual : '__custom__');
        var customVal = (selVal === '__custom__') ? valAtual.replace(/"/g,'&quot;') : '';
        var selectHtml = '<select name="' + c.key + '_sel">'
          + opts.map(function(o){
              var optVal = String(o.value).replace(/"/g,'&quot;');
              return '<option value="' + optVal + '"' + (o.value === selVal ? ' selected' : '') + '>' + o.label + '</option>';
            }).join('')
          + '</select>';
        var customStyle = selVal !== '__custom__' ? 'display:none' : '';
        var customHtml = '<input type="text" name="' + c.key + '" class="pr-custom-input" value="' + customVal + '" placeholder="' + (c.placeholder || '') + '" style="' + customStyle + '">';
        return '<div class="pr-field"><label>' + c.label + '</label>' + selectHtml + customHtml + '</div>';
      }
      var input = c.multiline
        ? '<textarea name="' + c.key + '" placeholder="' + (c.placeholder || '') + '">' + val + '</textarea>'
        : '<input type="text" name="' + c.key + '" value="' + val + '" placeholder="' + (c.placeholder || '') + '">';
      return '<div class="pr-field"><label>' + c.label + '</label>' + input + '</div>';
    }).join('');
    ov.innerHTML = ''
      + '<div class="pr-modal">'
      + '  <div class="pr-head">'
      + '    <div><h3>Proposta ' + codigo + '</h3><div class="pr-sub">Personalize os dados (todos os campos são opcionais)</div></div>'
      + '    <button class="pr-close" data-act="close" title="Fechar">×</button>'
      + '  </div>'
      + '  <div class="pr-body"><form>' + camposHtml + '</form></div>'
      + '  <div class="pr-foot">'
      + '    <button class="pr-btn" data-act="close">Cancelar</button>'
      + '    <button class="pr-btn pr-btn-primary" data-act="view">Visualizar →</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(ov);

    // Listeners para os selects de campos com endereços predefinidos (ex.: LOCAL_TURMA)
    ov.querySelectorAll('select[name$="_sel"]').forEach(function(sel){
      var key = sel.name.replace(/_sel$/, '');
      var customInput = ov.querySelector('input[name="' + key + '"]');
      sel.addEventListener('change', function(){
        if(sel.value === '__custom__'){
          if(customInput){ customInput.style.display = ''; customInput.focus(); }
        } else {
          if(customInput){ customInput.style.display = 'none'; customInput.value = ''; }
        }
      });
    });

    ov.addEventListener('click', function(e){
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if(!act) return;
      if(act === 'close'){ _fechar(ov); return; }
      if(act === 'view'){
        var inputs = ov.querySelectorAll('input[name],textarea[name]');
        var d = {};
        // preserva tokens computados (HERO_BG_CLASS, ABOUT_VISUAL, etc.) que não são campos do form
        Object.keys(dados).forEach(function(k){ d[k] = dados[k]; });
        // valores do form sobrescrevem os iniciais (prioridade do vendedor)
        inputs.forEach(function(i){ d[i.name] = i.value.trim(); });
        // Processar pares select+custom (campos com endereços predefinidos)
        ov.querySelectorAll('select[name$="_sel"]').forEach(function(sel){
          var key = sel.name.replace(/_sel$/, '');
          if(sel.value === '__custom__'){
            var ci = ov.querySelector('input[name="' + key + '"]');
            d[key] = ci ? ci.value.trim() : '';
          } else {
            d[key] = sel.value;
          }
          delete d[sel.name]; // remove a chave temporária _sel
        });
        _fechar(ov);
        _abrirVisualizacao(codigo, definicao, d);
      }
    });
  }

  window.PropostaRenderer = {
    registrar: function(codigo, definicao){ _registry[codigo] = definicao; },
    abrir: function(codigo){
      _injetarEstilos();
      var def = _registry[codigo];
      if(!def){ _toast('Renderer da proposta ' + codigo + ' não encontrado', 'error'); return; }
      var iniciais = typeof def.dadosIniciais === 'function' ? def.dadosIniciais() : (def.dadosIniciais || {});
      _abrirForm(codigo, def, iniciais);
    },
    tem: function(codigo){ return !!_registry[codigo]; }
  };
})();
