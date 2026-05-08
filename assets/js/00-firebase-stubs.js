// ── Stubs seguros: aguardam _fbReadyPromise e chamam a implementação REAL ──
window._fbReadyPromise = new Promise(function(resolve, reject){
  window._fbResolve = resolve;
  window._fbReject  = reject;
  // Watchdog: se o módulo Firebase CDN não carregar em 10s, desbloqueia os stubs
  // para que mostrem erro descritivo em vez de ficarem pendentes para sempre.
  setTimeout(function(){
    if(!window._fbReady){
      console.error('[Firebase] Timeout — módulo CDN não carregou em 10s. Verifique conexão.');
      try{ if(typeof _showToast==='function') _showToast('❌ Firebase offline. Verifique conexão e recarregue a página.','var(--red)'); }catch(_){}
      resolve();
    }
  }, 10000);
});

// Captura erro de rede ao carregar o <script type="module"> da CDN do Firebase
window.addEventListener('error', function(ev){
  if(ev && ev.filename && /firebasejs|gstatic\.com/.test(ev.filename)){
    console.error('[Firebase] Falha ao carregar módulo CDN:', ev.message);
    if(!window._fbReady && typeof window._fbResolve==='function') window._fbResolve();
    try{ if(typeof _showToast==='function') _showToast('❌ Firebase CDN inacessível. Recarregue ou verifique conexão.','var(--red)'); }catch(_){}
  }
}, true);

// Factory de stubs: erro descritivo quando _real não está disponível
function _fbStub(name){
  return function(){
    var args=arguments;
    return window._fbReadyPromise.then(function(){
      var real=window[name+'_real'];
      if(typeof real!=='function'){
        var err=new Error('[Firebase] '+name+' indisponível — CDN não carregou ou regras bloquearam o acesso.');
        console.error(err);
        try{ if(typeof _showToast==='function') _showToast('❌ Firebase offline. Verifique conexão e recarregue.','var(--red)'); }catch(_){}
        throw err;
      }
      return real.apply(null,args);
    });
  };
}
window._fbGet      = _fbStub('_fbGet');
window._fbSave     = _fbStub('_fbSave');
window._fbOnChange = _fbStub('_fbOnChange');
window._fbPush     = _fbStub('_fbPush');
window._fbRemove   = _fbStub('_fbRemove');
window._fbUpdate   = _fbStub('_fbUpdate');
window._fbListen   = _fbStub('_fbListen');
window._fbChange   = window._fbOnChange;
