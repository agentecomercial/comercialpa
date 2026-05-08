(function _iniciarRealtime(){
  'use strict';

  /* ── Estado interno ── */
  var _listeners       = {};   // path → unsubscribe (não usamos, Firebase RTDB não retorna unsub facilmente)
  var _rtLocalWrite    = false; // flag anti-loop: true quando salvamento local está em andamento
  var _rtIniciado      = false; // evitar dupla inicialização
  var _debounceTimers  = {};   // path → timer de debounce
  var RT_DEBOUNCE_MS   = 400;  // ms de espera antes de re-renderizar

  /* ── Debounce helper ── */
  function _debounce(key, fn){
    clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(fn, RT_DEBOUNCE_MS);
  }

  /* ── Interceptar markUnsaved/saveStorage para setar flag ── */
  function _patchAntiLoop(){
    var _origMarkUnsaved = window.markUnsaved;
    var _origSaveStorage = window.saveStorage;
    var _origFbSave      = window._fbSave;

    window.markUnsaved = function(){
      _rtLocalWrite = true;
      if(typeof _origMarkUnsaved==='function') _origMarkUnsaved.apply(this, arguments);
      // Resetar flag após 2s (tempo suficiente para o listener disparar e ignorar)
      clearTimeout(window._rtLocalWriteTimer);
      window._rtLocalWriteTimer = setTimeout(function(){ _rtLocalWrite=false; }, 2000);
    };

    // Também marcar ao salvar diretamente no Firebase
    if(typeof _origFbSave==='function'){
      window._fbSave = function(){
        _rtLocalWrite = true;
        clearTimeout(window._rtLocalWriteTimer);
        window._rtLocalWriteTimer = setTimeout(function(){ _rtLocalWrite=false; }, 2000);
        return _origFbSave.apply(this, arguments);
      };
    }
  }

  /* ── Re-renderizar clientes/dashboard ── */
  function _reRenderClientes(){
    try{
      if(typeof buildSelects==='function')    buildSelects();
      if(typeof buildFilterBtns==='function') buildFilterBtns();
      if(typeof renderAll==='function')       renderAll();
      if(typeof renderConsultor==='function') renderConsultor();
      if(typeof renderTreinador==='function') renderTreinador();
      if(typeof renderProduto==='function')   renderProduto();
    }catch(e){ console.warn('[RT] render clientes:', e); }
  }

  /* ── Re-renderizar usuários ── */
  function _reRenderUsuarios(){
    try{
      if(typeof _renderUsuariosGrid==='function')     _renderUsuariosGrid();
      if(typeof renderMgmtUsuarios==='function')       renderMgmtUsuarios();
    }catch(e){ console.warn('[RT] render usuarios:', e); }
  }

  /* ── Re-renderizar turmas ── */
  function _reRenderTurmas(){
    try{
      if(typeof renderTurmasGrid==='function') renderTurmasGrid();
    }catch(e){ console.warn('[RT] render turmas:', e); }
  }

  /* ── Processar snapshot de clientes da turma ativa ── */
  function _onClientesChange(novosDados){
    if(_rtLocalWrite){ return; } // anti-loop: ignorar mudança originada localmente

    var id = (typeof _turmaAtiva!=='undefined' && _turmaAtiva) ? _turmaAtiva.id : null;
    if(!id || !novosDados) return;

    // Extrair array de clientes
    var clientes = novosDados.clientes;
    if(!clientes) return;
    if(!Array.isArray(clientes) && typeof clientes==='object'){
      clientes = Object.values(clientes).filter(Boolean);
    }
    if(!Array.isArray(clientes)) return;

    // Comparar com dados atuais para evitar render desnecessário
    var atual = typeof data!=='undefined' ? JSON.stringify(data) : '';
    var novo  = JSON.stringify(clientes);
    if(atual === novo) return;

    // Atualizar dados e re-renderizar
    data = clientes;
    savedData = JSON.stringify(data);
    _debounce('clientes', function(){
      _reRenderClientes();
      if(typeof _showToast==='function') _showToast('🔄 Dados atualizados em tempo real','var(--muted)');
      /* debug log removido */
    });
  }

  /* ── Processar snapshot de usuários ── */
  function _onUsuariosChange(fbUsuarios){
    if(_rtLocalWrite) return;
    if(!fbUsuarios || typeof fbUsuarios!=='object') return;
    _debounce('usuarios', function(){
      _reRenderUsuarios();
      /* debug log removido */
    });
  }

  /* ── Processar snapshot de turmas ── */
  function _onTurmasChange(fbTurmas){
    if(_rtLocalWrite) return;
    if(!fbTurmas) return;
    _debounce('turmas', function(){
      _reRenderTurmas();
      /* debug log removido */
    });
  }

  /* ── Iniciar listener da turma ativa ── */
  var _escutarAttempts = 0;
  function _escutarTurmaAtiva(){
    var id = (typeof _turmaAtiva!=='undefined' && _turmaAtiva) ? _turmaAtiva.id : null;
    if(!id){
      _escutarAttempts++;
      if(_escutarAttempts < 60) setTimeout(_escutarTurmaAtiva, 1000);
      return;
    }
    _escutarAttempts = 0;
    if(_listeners['turma_'+id]) return; // já escutando

    var TURMAS = typeof TURMAS_NODE!=='undefined' ? TURMAS_NODE : 'turmas';
    var path   = TURMAS+'/'+id;

    if(typeof window._fbListen==='function'){
      window._fbListen(path, function(snapshot){
        _onClientesChange(snapshot);
      });
      _listeners['turma_'+id] = true;
    } else {
      console.error('[RT] _fbListen não disponível ainda — tentando novamente...');
      _escutarAttempts++;
      if(_escutarAttempts < 60) setTimeout(_escutarTurmaAtiva, 1000);
    }
  }

  /* ── Iniciar listeners de usuários e turmas ── */
  function _escutarUsuarios(){
    if(typeof window._fbListen==='function'){
      window._fbListen('usuarios', _onUsuariosChange);
      /* debug log removido */
    }
  }

  function _escutarTurmas(){
    var TURMAS = typeof TURMAS_NODE!=='undefined' ? TURMAS_NODE : 'turmas';
    if(typeof window._fbListen==='function'){
      window._fbListen(TURMAS, _onTurmasChange);
      /* debug log removido */
    }
  }

  /* ── Ponto de entrada ── */
  function iniciarRealtime(){
    if(_rtIniciado) return;
    _rtIniciado = true;

    // Aguardar Firebase estar pronto
    var _fbReady = window._fbReadyPromise || Promise.resolve();
    _fbReady.then(function(){
      _patchAntiLoop();
      _escutarUsuarios();
      _escutarTurmas();

      // Para a turma ativa: pode não existir ainda (usuário precisa logar e selecionar)
      // Verificar repetidamente até a turma ser selecionada
      _escutarTurmaAtiva();

      // Quando o usuário entrar em uma turma, re-registrar o listener
      var _origEntrarTurma = window.entrarTurma;
      if(typeof _origEntrarTurma==='function'){
        window.entrarTurma = function(id){
          _origEntrarTurma.apply(this, arguments);
          // Após entrar na turma, dar tempo para _turmaAtiva ser definido
          setTimeout(function(){
            delete _listeners['turma_'+id]; // forçar re-registro
            _escutarTurmaAtiva();
          }, 800);
        };
      }

      /* debug log removido */
      if(typeof _showToast==='function'){
        setTimeout(function(){
          _showToast('📡 Atualização em tempo real ativa','var(--muted)');
        }, 2000);
      }
    }).catch(function(e){
      console.warn('[RT] Firebase não inicializou:', e);
    });
  }

  // Expor para uso externo (ex: após login)
  window.iniciarRealtime = iniciarRealtime;

  // Iniciar automaticamente após o DOM carregar
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(iniciarRealtime, 500); });
  } else {
    setTimeout(iniciarRealtime, 500);
  }

  /* debug log removido */
})();
