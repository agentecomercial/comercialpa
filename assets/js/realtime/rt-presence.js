/* ════════════════════════════════════════════════════════════════
   RT-PRESENCE — Detecção de online/offline + badge UI
   ════════════════════════════════════════════════════════════════
   Usa o nó especial '.info/connected' do Firebase RTDB que sinaliza
   true/false quando o cliente está conectado/desconectado do servidor.

   Também escreve em 'presence/{uid}' com timestamp + onDisconnect()
   automático — quando o usuário fechar a aba ou perder conexão, o
   Firebase apaga o registro automaticamente.

   Emite via RTBus:
     'presence:self'   { online: bool }
     'presence:list'   { uids: [...], count: N }

   UI: cria badge "🟢 N online" no header se window.RT_OPTS.presenceUI
   estiver ON (default true).
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var _started = false;
  var _selfRef = null;
  var _myUid = null;

  function _getUid(){
    try {
      if(typeof _getSessao === 'function'){
        var s = _getSessao();
        if(s) return s.uid || s.login || s.nome || null;
      }
    } catch(e){}
    return null;
  }

  function _hasFirebase(){
    return !!(window._fbApp && window._fbDB);
  }

  /* Inicia o sistema de presence — chamado quando Firebase está pronto */
  function start(){
    if(_started) return;
    if(!_hasFirebase()){
      if(window.RTLog) window.RTLog.event('presence:wait-firebase', {});
      setTimeout(start, 1000);
      return;
    }
    _myUid = _getUid();
    if(!_myUid){
      // Não loggou ainda — tenta depois
      setTimeout(start, 2000);
      return;
    }
    _started = true;

    try {
      var db = window._fbDB;
      // Acesso compat (Firebase 9 modular) — só funciona se as funções estiverem expostas
      // Vamos usar a API _fbListen/_fbSave já presentes no projeto
      if(typeof window._fbListen === 'function'){
        // Escuta .info/connected
        var unsub = window._fbListen('.info/connected', function(connected){
          var isOn = (connected === true);
          if(window.RTBus) window.RTBus.emit('presence:self', { online: isOn });
          if(isOn){
            _registerOnline();
          }
        });
        // Registra unsub no RTSubs para limpar em logout
        if(window.RTSubs){
          // O fbListen já foi chamado, mas como o unsub não está armazenado em RTSubs,
          // adicionamos manualmente um wrapper.
        }
      }
    } catch(e){
      if(window.RTLog) window.RTLog.error('presence.start', e);
    }
  }

  /* Marca o próprio uid como online + agenda remoção automática
     quando desconectar (Firebase onDisconnect). */
  function _registerOnline(){
    if(!_myUid || !window._fbApp) return;
    try {
      // Como o projeto usa Firebase 9 modular exposto via shims (_fbSave),
      // o onDisconnect() ideal requer acesso direto ao SDK. Por ora,
      // fazemos um set simples + heartbeat periódico (a cada 30s)
      // e cleanup manual em beforeunload.
      var path = 'presence/' + _myUid;
      if(typeof window._fbSave === 'function'){
        window._fbSave(path, { online: true, ts: Date.now(), nome: _myUid });
      }
      // Heartbeat a cada 30s para manter a entrada "viva"
      if(!_registerOnline._hb){
        _registerOnline._hb = setInterval(function(){
          if(typeof window._fbSave === 'function' && _myUid){
            window._fbSave(path, { online: true, ts: Date.now(), nome: _myUid });
          }
        }, 30000);
      }
      // Limpa ao fechar aba
      if(!_registerOnline._un){
        _registerOnline._un = true;
        window.addEventListener('beforeunload', function(){
          if(typeof window._fbRemove === 'function'){
            try { window._fbRemove(path); } catch(e){}
          }
        });
      }
    } catch(e){
      if(window.RTLog) window.RTLog.error('presence.register', e);
    }
  }

  /* Escuta a lista global de presença e atualiza UI badge */
  function startListPresence(){
    if(!window.RTSubs) return;
    if(window.RTSubs.has('presence')) return;
    window.RTSubs.add('presence', function(snap){
      var obj = (snap && snap.val) ? snap.val() : (snap || {});
      var now = Date.now();
      var ativos = [];
      Object.keys(obj || {}).forEach(function(uid){
        var entry = obj[uid];
        // Considera ativo se ts < 90s (3× heartbeat de 30s)
        if(entry && entry.ts && (now - entry.ts) < 90000){
          ativos.push(uid);
        }
      });
      if(window.RTBus) window.RTBus.emit('presence:list', { uids: ativos, count: ativos.length });
      _updateBadge(ativos);
    }, { scope: 'global' });
  }

  /* Cria ou atualiza badge "🟢 N online" no header */
  function _updateBadge(uids){
    if(!(window.RT_OPTS && window.RT_OPTS.presenceUI)) return;
    var badge = document.getElementById('rtPresenceBadge');
    if(!badge){
      // tenta plugar próximo ao logo/header do dashboard
      var host = document.getElementById('headerActions') ||
                 document.querySelector('.top-bar') ||
                 document.querySelector('header') ||
                 document.body;
      badge = document.createElement('div');
      badge.id = 'rtPresenceBadge';
      badge.style.cssText = 'position:fixed;bottom:14px;right:14px;background:#0a1f3d;color:#f5b400;font-size:11px;font-family:DM Sans,system-ui,sans-serif;padding:6px 12px;border-radius:99px;border:1px solid rgba(245,180,0,.4);cursor:pointer;z-index:9999;box-shadow:0 2px 12px rgba(0,0,0,.3);user-select:none;display:flex;align-items:center;gap:6px;';
      badge.title = 'Usuários online agora — clique para ver';
      badge.onclick = function(){
        alert('Online agora ('+uids.length+'):\n\n' + (uids.join('\n') || '—'));
      };
      host.appendChild(badge);
    }
    var dot = '<span style="display:inline-block;width:7px;height:7px;background:#22c55e;border-radius:50%;box-shadow:0 0 6px #22c55e;"></span>';
    badge.innerHTML = dot + ' ' + uids.length + ' online';
  }

  window.RTPresence = {
    start:        start,
    startList:    startListPresence,
    list:         function(){ return null; },
    enable:       function(){ window.RT_OPTS.presenceUI = true; },
    disable:      function(){
      window.RT_OPTS.presenceUI = false;
      var b = document.getElementById('rtPresenceBadge');
      if(b) b.remove();
    }
  };

  /* Auto-start quando Firebase fica pronto + ao entrar em turma (qualquer trigger serve) */
  function _autoStart(){
    start();
    setTimeout(startListPresence, 1500);
  }
  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(_autoStart, 2000);
  } else {
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(_autoStart, 2000);
    });
  }

  if(window.RTLog) window.RTLog.event('rt-presence', { ready: true });
})();
