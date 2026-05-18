/* ════════════════════════════════════════════════════════════════
   RT-CORE — Engine realtime do dashboard (vanilla, file://-safe)
   ════════════════════════════════════════════════════════════════
   Expõe:
     window.RTBus    — pub/sub central (on/off/emit)
     window.RTLog    — log estruturado (console agrupado)
     window.RT_OPTS  — flags de configuração

   Nenhum framework. Nenhum ES module. Compatível com file://.
   Não substitui código existente — apenas adiciona infraestrutura.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Flags globais (podem ser sobrescritas via console p/ debug) ── */
  window.RT_OPTS = Object.assign({
    debug:        false,   // true = console.log dos eventos
    debugFilter:  null,    // regex p/ filtrar eventos no log
    granularRender: false, // F3: usa render granular (ainda não ativo)
    presenceUI:   true,    // F4: mostra badge online
  }, window.RT_OPTS || {});

  /* ────────────────────────────────────────────────────────────────
     RTLog — log estruturado para depuração do realtime
  ──────────────────────────────────────────────────────────────── */
  var RTLog = {
    _hist: [],      // últimos 200 eventos para inspeção via console
    _max: 200,
    event: function(tipo, payload){
      var entry = { ts: Date.now(), tipo: tipo, payload: payload };
      this._hist.push(entry);
      if(this._hist.length > this._max) this._hist.shift();
      if(window.RT_OPTS.debug){
        var f = window.RT_OPTS.debugFilter;
        if(!f || (f && new RegExp(f).test(tipo))){
          // eslint-disable-next-line no-console
          console.log('%c[RT]%c '+tipo, 'color:#f5b400;font-weight:700;', 'color:#aaa;', payload||'');
        }
      }
    },
    error: function(tipo, err){
      // eslint-disable-next-line no-console
      console.warn('[RT·ERR] '+tipo, err);
      this.event('error.'+tipo, { msg: (err && err.message) || String(err) });
    },
    last: function(n){
      n = n || 30;
      return this._hist.slice(-n);
    }
  };
  window.RTLog = RTLog;

  /* ────────────────────────────────────────────────────────────────
     RTBus — pub/sub central
     Eventos padronizados:
       'turma:enter'      { id }
       'turma:leave'      { id }
       'data:mutate'      { ri, campo, val, source }
       'data:reload'      { fonte: 'fb'|'local'|'broadcast' }
       'sub:add'          { path, scope }
       'sub:remove'       { path, scope }
       'save:start'       { patch }
       'save:ok'          { patch }
       'save:fail'        { patch, err }
       'presence:change'  { uid, online }
  ──────────────────────────────────────────────────────────────── */
  var _handlers = Object.create(null);

  var RTBus = {
    on: function(evt, fn, opts){
      opts = opts || {};
      if(!_handlers[evt]) _handlers[evt] = [];
      // evita duplicata exata se opts.unique
      if(opts.unique){
        for(var i=0;i<_handlers[evt].length;i++){
          if(_handlers[evt][i].fn === fn) return;
        }
      }
      _handlers[evt].push({ fn: fn, scope: opts.scope || null });
      return fn; // retorna a referência p/ off()
    },
    off: function(evt, fn){
      if(!_handlers[evt]) return;
      _handlers[evt] = _handlers[evt].filter(function(h){ return h.fn !== fn; });
      if(!_handlers[evt].length) delete _handlers[evt];
    },
    /* Remove todos os handlers de um scope (ex: scope='turma' ao trocar turma) */
    offScope: function(scope){
      Object.keys(_handlers).forEach(function(evt){
        _handlers[evt] = _handlers[evt].filter(function(h){ return h.scope !== scope; });
        if(!_handlers[evt].length) delete _handlers[evt];
      });
      RTLog.event('bus:offScope', { scope: scope });
    },
    emit: function(evt, payload){
      RTLog.event('emit:'+evt, payload);
      if(!_handlers[evt]) return;
      // copia array antes de iterar (handler pode chamar off)
      var hs = _handlers[evt].slice();
      for(var i=0;i<hs.length;i++){
        try { hs[i].fn(payload); }
        catch(e){ RTLog.error('handler.'+evt, e); }
      }
    },
    /* Conta handlers ativos (debug) */
    count: function(){
      var n = 0;
      Object.keys(_handlers).forEach(function(e){ n += _handlers[e].length; });
      return n;
    },
    /* Inspeção via console: RTBus.dump() */
    dump: function(){
      var out = {};
      Object.keys(_handlers).forEach(function(e){
        out[e] = _handlers[e].length;
      });
      return out;
    }
  };
  window.RTBus = RTBus;

  RTLog.event('rt-core', { version: 1, ts: Date.now() });
})();
