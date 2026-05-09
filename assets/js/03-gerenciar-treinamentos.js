(function _iniciarGerenciarTreinamentos(){
  /* ── Mostrar botão de gerenciar apenas para ADM ── */
  function _verificarPermissaoTreinamentos(){
    var sessao = typeof _getSessao==='function' ? _getSessao() : null;
    var perfil  = sessao ? (sessao.perfil||'') : 'adm';
    var btn = document.getElementById('btnAbrirGerenciarTreinamentos');
    if(btn) btn.style.display = (perfil==='adm') ? 'block' : 'none';
  }

  /* ── Renderizar lista de treinamentos com botão remover ── */
  window._renderListaTreinamentosGerenciar = function(){
    var lista = document.getElementById('listaTreinamentosGerenciar');
    if(!lista) return;
    var arr = Array.isArray(allTreinamentos) ? allTreinamentos : [];
    if(!arr.length){
      lista.innerHTML='<span style="font-size:12px;color:var(--muted);">Nenhum treinamento cadastrado.</span>';
      return;
    }
    lista.innerHTML = arr.map(function(t){
      var esc = t.replace(/'/g,"\\'");
      return '<div style="display:inline-flex;align-items:center;gap:4px;background:var(--surface2);'
            +'border:1px solid var(--border2);border-radius:20px;padding:3px 10px 3px 12px;">'
            +'<span style="font-size:11px;font-weight:600;text-transform:uppercase;">'+t+'</span>'
            +'<button onclick="_removerTreinamentoGerenciar(\''+esc+'\')" '
            +'style="background:none;border:none;color:var(--muted);cursor:pointer;'
            +'font-size:13px;line-height:1;padding:0 0 0 2px;" title="Remover '+t+'">×</button>'
            +'</div>';
    }).join('');
  };

  /* ── Adicionar treinamento ── */
  window._addTreinamentoGerenciar = function(){
    var inp = document.getElementById('novoTreinamentoInput');
    if(!inp) return;
    var nome = inp.value.trim().toUpperCase();
    if(!nome){ inp.focus(); return; }
    if(!Array.isArray(allTreinamentos)) return;
    if(allTreinamentos.indexOf(nome) >= 0){
      if(typeof _showToast==='function') _showToast('⚠️ "'+nome+'" já existe na lista.','var(--amber)');
      return;
    }
    allTreinamentos.push(nome);
    inp.value = '';
    // Atualizar os selects do modal de novo cliente e de edição
    if(typeof buildSelects==='function') buildSelects();
    // Atualizar a lista visual
    window._renderListaTreinamentosGerenciar();
    // Persistir no Firebase se disponível
    _salvarTreinamentosFirebase();
    if(typeof _showToast==='function') _showToast('✅ Treinamento "'+nome+'" adicionado!','var(--accent)');
  };

  /* ── Remover treinamento ── */
  window._removerTreinamentoGerenciar = function(nome){
    if(!confirm('Remover o treinamento "'+nome+'" da lista?\n\nClientes com este treinamento não serão afetados.')) return;
    if(!Array.isArray(allTreinamentos)) return;
    var idx = allTreinamentos.indexOf(nome);
    if(idx < 0) return;
    allTreinamentos.splice(idx, 1);
    // Atualizar os selects
    if(typeof buildSelects==='function') buildSelects();
    // Atualizar a lista visual
    window._renderListaTreinamentosGerenciar();
    // Persistir
    _salvarTreinamentosFirebase();
    if(typeof _showToast==='function') _showToast('🗑 Treinamento "'+nome+'" removido.','var(--red)');
  };

  /* ── Persistência Firebase ── */
  function _salvarTreinamentosFirebase(){
    if(typeof window._fbSave!=='function') return;
    var turmaId = (window._turmaAtiva&&window._turmaAtiva.id)?window._turmaAtiva.id:null;
    if(turmaId){
      window._fbSave('turmas/'+turmaId+'/treinamentos', allTreinamentos)
        .catch(function(e){ console.warn('[Treinamentos] Firebase save:', e); });
    }
  }

  /* ── Mostrar/ocultar botão ao abrir o modal ──
     IMPORTANTE: openAddModal está definido no bloco JS principal (block 6).
     Não pode ser capturado aqui pois este IIFE executa antes.
     Usamos sobrescrita lazy via DOMContentLoaded para garantir que
     block 6 já foi executado antes de fazer o hook.
  */
  function _hookOpenAddModal(){
    var _origOpenAddModal = window.openAddModal;
    if(typeof _origOpenAddModal !== 'function'){
      // Ainda não definido — tentar novamente
      setTimeout(_hookOpenAddModal, 100);
      return;
    }
    window.openAddModal = function(){
      _origOpenAddModal.apply(this, arguments);
      // Fechar seção de gerenciar ao reabrir o modal
      var sec = document.getElementById('gerenciarTreinamentosSection');
      if(sec) sec.style.display = 'none';
      _verificarPermissaoTreinamentos();
    };
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(_hookOpenAddModal, 0);
      _verificarPermissaoTreinamentos();
    });
  } else {
    setTimeout(_hookOpenAddModal, 0);
    setTimeout(_verificarPermissaoTreinamentos, 0);
  }

  window._renderListaTreinamentosGerenciar = window._renderListaTreinamentosGerenciar;
  window._addTreinamentoGerenciar          = window._addTreinamentoGerenciar;
  window._removerTreinamentoGerenciar      = window._removerTreinamentoGerenciar;

  console.log('[GerenciarTreinamentos] Módulo carregado ✅');

  /* ── Modal dedicado de gerenciar treinamentos ── */
  window.abrirGerenciarTreinamentosModal = function(){
    var ov = document.getElementById('gerenciarTreinamentosModalOverlay');
    if(!ov) return;
    gtmRenderLista();
    ov.classList.add('open');
    setTimeout(function(){
      var inp=document.getElementById('gtmNovoInput');
      if(inp) inp.focus();
    },120);
  };

  window.fecharGerenciarTreinamentosModal = function(){
    var ov = document.getElementById('gerenciarTreinamentosModalOverlay');
    if(ov) ov.classList.remove('open');
  };

  function gtmRenderLista(){
    var lista=document.getElementById('gtmListaTreinamentos');
    var vazio=document.getElementById('gtmVazio');
    if(!lista) return;
    var arr=Array.isArray(allTreinamentos)?allTreinamentos:[];
    if(!arr.length){ lista.innerHTML=''; if(vazio) vazio.style.display='block'; return; }
    if(vazio) vazio.style.display='none';
    var html='';
    arr.forEach(function(t,i){
      var esc=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      html+='<div style="display:inline-flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border2);border-radius:20px;padding:5px 8px 5px 14px;">'
        +'<span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--text);">'+esc+'</span>'
        +'<button class="gtm-rm-btn" onclick="gtmRemoverTreinamento('+i+')" title="Remover '+esc+'">×</button>'
        +'</div>';
    });
    lista.innerHTML=html;
  }
  window.gtmAdicionarTreinamento = function(){
    var inp  = document.getElementById('gtmNovoInput');
    if(!inp) return;
    var nome = inp.value.trim().toUpperCase();
    if(!nome){ inp.focus(); return; }
    if(!Array.isArray(allTreinamentos)) return;
    if(allTreinamentos.indexOf(nome) >= 0){
      if(typeof _showToast==='function') _showToast('⚠️ "'+nome+'" já existe.','var(--amber)');
      return;
    }
    allTreinamentos.push(nome);
    inp.value='';
    inp.focus();
    gtmRenderLista();
    // Sincronizar selects e persistir
    if(typeof buildSelects==='function') buildSelects();
    window._renderListaTreinamentosGerenciar && window._renderListaTreinamentosGerenciar();
    if(typeof _showToast==='function') _showToast('✅ "'+nome+'" adicionado!','var(--accent)');
    // Persistir Firebase (função interna do módulo)
    var turmaId=(window._turmaAtiva&&window._turmaAtiva.id)?window._turmaAtiva.id:null;
    if(turmaId&&typeof window._fbSave==='function'){
      window._fbSave('turmas/'+turmaId+'/treinamentos',allTreinamentos)
        .catch(function(e){console.warn('[GTM] Firebase:',e);});
    }
  };

  window.gtmRemoverTreinamento = function(idx){
    if(!Array.isArray(allTreinamentos)||!allTreinamentos[idx]) return;
    var nome=allTreinamentos[idx];
    if(!confirm('Remover "'+nome+'"?\n\nClientes com este treinamento não serão afetados.')) return;
    allTreinamentos.splice(idx,1);
    gtmRenderLista();
    if(typeof buildSelects==='function') buildSelects();
    window._renderListaTreinamentosGerenciar && window._renderListaTreinamentosGerenciar();
    if(typeof _showToast==='function') _showToast('🗑 "'+nome+'" removido.','var(--red)');
    var turmaId=(window._turmaAtiva&&window._turmaAtiva.id)?window._turmaAtiva.id:null;
    if(turmaId&&typeof window._fbSave==='function'){
      window._fbSave('turmas/'+turmaId+'/treinamentos',allTreinamentos)
        .catch(function(e){console.warn('[GTM] Firebase:',e);});
    }
  };

  // Fechar com ESC
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      var ov=document.getElementById('gerenciarTreinamentosModalOverlay');
      if(ov&&ov.classList.contains('open')) window.fecharGerenciarTreinamentosModal();
    }
  });

})();

