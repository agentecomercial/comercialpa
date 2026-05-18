/* ════════════════════════════════════════════════════════════════
   RT-SUBS — Subscription Manager para Firebase RTDB
   ════════════════════════════════════════════════════════════════
   Resolve o memory leak: cada onValue() do Firebase retorna uma
   função `unsubscribe()` que precisa ser chamada quando o listener
   não é mais necessário (ex: ao trocar de turma).

   Hoje, _fbListen() em dashboard.html não armazena essa função, então
   listeners ficam vivos para sempre — toda troca de turma adiciona
   mais listeners ouvindo o mesmo path.

   RTSubs centraliza isso:
     RTSubs.add(path, cb, opts)   — registra com scope
     RTSubs.remove(path)          — desliga 1
     RTSubs.cleanup(scope)        — desliga todos do scope
     RTSubs.list()                — debug

   Scopes recomendados:
     'turma'  — listeners da turma ativa (limpos ao trocar turma)
     'auth'   — listeners de auth/usuário (vivem na sessão inteira)
     'global' — listeners cross-turma (turmas, usuarios, audit)
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // mapa: path → { unsub, scope, cb }
  var _subs = Object.create(null);

  function _hasFb(){
    return typeof window._fbListen === 'function';
  }

  var RTSubs = {
    /* Inscreve listener no Firebase com auto-cleanup garantido.
       Retorna a função unsubscribe (chamável manualmente também). */
    add: function(path, cb, opts){
      opts = opts || {};
      var scope = opts.scope || 'global';
      if(!_hasFb()){
        if(window.RTLog) window.RTLog.error('subs.add', new Error('_fbListen indisponível'));
        return function(){};
      }
      // Se já existe sub no mesmo path com mesmo scope, desliga antes (evita duplicação)
      if(_subs[path]){
        try { _subs[path].unsub(); } catch(e){}
        if(window.RTLog) window.RTLog.event('subs:replace', { path: path });
      }
      // Wrap do callback para logar e proteger contra exceções
      var wrappedCb = function(snap){
        try { cb(snap); }
        catch(e){
          if(window.RTLog) window.RTLog.error('subs.cb:'+path, e);
        }
      };
      var unsub = window._fbListen(path, wrappedCb);
      if(typeof unsub !== 'function'){
        if(window.RTLog) window.RTLog.error('subs.add', new Error('_fbListen retornou non-function para '+path));
        unsub = function(){};
      }
      _subs[path] = { unsub: unsub, scope: scope, cb: cb, ts: Date.now() };
      if(window.RTBus) window.RTBus.emit('sub:add', { path: path, scope: scope });
      return function(){ RTSubs.remove(path); };
    },

    /* Desliga um listener específico por path */
    remove: function(path){
      var s = _subs[path];
      if(!s) return false;
      try { s.unsub(); }
      catch(e){
        if(window.RTLog) window.RTLog.error('subs.remove', e);
      }
      delete _subs[path];
      if(window.RTBus) window.RTBus.emit('sub:remove', { path: path, scope: s.scope });
      return true;
    },

    /* Desliga todos os listeners de um scope.
       Ex: ao trocar turma → RTSubs.cleanup('turma') */
    cleanup: function(scope){
      var removed = [];
      Object.keys(_subs).forEach(function(path){
        if(_subs[path].scope === scope){
          try { _subs[path].unsub(); } catch(e){}
          delete _subs[path];
          removed.push(path);
        }
      });
      if(window.RTLog) window.RTLog.event('subs:cleanup', { scope: scope, count: removed.length, paths: removed });
      return removed.length;
    },

    /* Desliga TODOS (ex: logout) */
    cleanupAll: function(){
      var paths = Object.keys(_subs);
      paths.forEach(function(p){
        try { _subs[p].unsub(); } catch(e){}
        delete _subs[p];
      });
      if(window.RTLog) window.RTLog.event('subs:cleanupAll', { count: paths.length });
      return paths.length;
    },

    /* Lista todos os listeners ativos (debug) */
    list: function(){
      var out = {};
      Object.keys(_subs).forEach(function(p){
        out[p] = { scope: _subs[p].scope, idadeS: Math.floor((Date.now() - _subs[p].ts)/1000) };
      });
      return out;
    },

    /* Conta listeners ativos */
    count: function(){
      return Object.keys(_subs).length;
    },

    /* Verifica se path já tem listener */
    has: function(path){
      return !!_subs[path];
    }
  };

  window.RTSubs = RTSubs;

  /* ── Auto-cleanup ao trocar turma ──
     Quando RTBus emite turma:leave, limpa scope 'turma'.
     Outros módulos podem fazer cleanup adicional. */
  if(window.RTBus){
    window.RTBus.on('turma:leave', function(payload){
      RTSubs.cleanup('turma');
      if(window.RTLog) window.RTLog.event('subs:turma-leave', payload);
    });
  }

  if(window.RTLog) window.RTLog.event('rt-subs', { ready: true });
})();
