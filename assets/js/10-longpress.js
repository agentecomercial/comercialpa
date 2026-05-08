
/* ══════════════════════════════════════════════════════════════
   LONGPRESS — Clicar e segurar em qualquer turma = definirTurmaAtiva
   Funciona em TODOS os layouts (Cards, A-H, Swimlane)
   Estratégia: event delegation na telaTurmasScreen
   Limiar: 600ms
══════════════════════════════════════════════════════════════ */
(function _iniciarLongPressTurma(){
  var LIMIAR_MS=600;
  var _timer=null;
  var _alvo=null;
  var _feedbackEl=null;

  /* Extrair turma ID de qualquer elemento clicável */
  function _extrairId(el){
    var cur=el;
    for(var i=0;i<8;i++){
      if(!cur||cur===document.body) break;
      var oc=cur.getAttribute('onclick')||'';
      var m=oc.match(/entrarTurma\(['"]([^'"]+)['"]\)/);
      if(m) return m[1];
      cur=cur.parentElement;
    }
    return null;
  }

  /* Mostrar anel de progresso ao redor do cursor */
  function _mostrarFeedback(x,y,id){
    _removerFeedback();
    var div=document.createElement('div');
    div.id='_lpFeedback';
    div.style.cssText='position:fixed;left:'+(x-28)+'px;top:'+(y-28)+'px;'
      +'width:56px;height:56px;border-radius:50%;pointer-events:none;z-index:9999;'
      +'border:3px solid transparent;box-sizing:border-box;'
      +'background:conic-gradient(var(--accent) 0%,transparent 0%);'
      +'transition:background '+(LIMIAR_MS/1000)+'s linear;';
    document.body.appendChild(div);
    _feedbackEl=div;
    /* Forçar reflow e iniciar animação */
    void div.offsetWidth;
    div.style.background='conic-gradient(var(--accent) 100%,transparent 100%)';
    /* Label */
    var lbl=document.createElement('div');
    lbl.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;'
      +'font-size:9px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.04em;';
    lbl.textContent='Ativar';
    div.appendChild(lbl);
    _feedbackEl=div;
  }

  function _removerFeedback(){
    var existing=document.getElementById('_lpFeedback');
    if(existing) existing.remove();
    _feedbackEl=null;
  }

  /* Flash no card após ativar */
  function _flashCard(id){
    var cards=document.querySelectorAll('.turma-card');
    cards.forEach(function(card){
      if(card.innerHTML.indexOf("'"+id+"'")>=0||card.innerHTML.indexOf('"'+id+'"')>=0){
        card.classList.add('flash-ativa');
        setTimeout(function(){card.classList.remove('flash-ativa');},450);
      }
    });
  }

  function _onDown(e){
    /* Ignorar botões de ação (Entrar →, toggle ATIVA, etc.) */
    var tag=(e.target.tagName||'').toLowerCase();
    if(tag==='button'||tag==='input'||tag==='select'||tag==='a') return;
    var oc=e.target.getAttribute('onclick')||'';
    if(oc.indexOf('definirTurmaAtiva')>=0) return; /* o toggle já tem seu próprio click */

    var id=_extrairId(e.target);
    if(!id) return;

    _alvo=id;
    var x=e.clientX||e.touches&&e.touches[0]&&e.touches[0].clientX||0;
    var y=e.clientY||e.touches&&e.touches[0]&&e.touches[0].clientY||0;
    _mostrarFeedback(x,y,id);

    _timer=setTimeout(function(){
      _timer=null;
      _removerFeedback();
      if(_alvo){
        definirTurmaAtiva(_alvo);
        _flashCard(_alvo);
      }
    },LIMIAR_MS);
  }

  function _cancelar(){
    if(_timer){clearTimeout(_timer);_timer=null;}
    _removerFeedback();
    _alvo=null;
  }

  /* Registrar ao abrir a tela de turmas — usa delegation na tela */
  function _registrar(){
    var tela=document.getElementById('telaTurmasScreen');
    if(!tela){
      /* Tentar novamente — tela pode não existir ainda no DOM */
      setTimeout(_registrar,300);
      return;
    }
    /* Evitar registrar duas vezes */
    if(tela._longPressAtivo) return;
    tela._longPressAtivo=true;

    tela.addEventListener('pointerdown',_onDown);
    tela.addEventListener('pointerup',_cancelar);
    tela.addEventListener('pointermove',function(e){
      /* Cancelar se mover mais de 8px */
      if(_timer&&_alvo){
        var x=e.clientX,y=e.clientY;
        var fb=document.getElementById('_lpFeedback');
        if(fb){
          var fbX=parseFloat(fb.style.left)+28;
          var fbY=parseFloat(fb.style.top)+28;
          if(Math.abs(x-fbX)>8||Math.abs(y-fbY)>8) _cancelar();
        }
      }
    });
    tela.addEventListener('pointercancel',_cancelar);
    tela.addEventListener('contextmenu',function(e){
      /* Evitar menu de contexto no mobile durante longpress */
      if(_alvo) e.preventDefault();
    });

    console.log('[LongPress] Registrado em telaTurmasScreen ✅');
  }

  /* Hook: registrar sempre que a tela de turmas for aberta */
  var _origAbrirTelaTurmas=window.abrirTelaTurmas;
  window.abrirTelaTurmas=function(){
    if(typeof _origAbrirTelaTurmas==='function') _origAbrirTelaTurmas.apply(this,arguments);
    setTimeout(_registrar,100);
  };

  /* Tentar registrar imediatamente (caso a tela já exista) */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',_registrar);
  } else {
    setTimeout(_registrar,200);
  }

  /* Tooltip de instrução na barra de layouts */
  var _origRenderTurmasGrid=window.renderTurmasGrid;
  window.renderTurmasGrid=function(){
    if(typeof _origRenderTurmasGrid==='function') _origRenderTurmasGrid.apply(this,arguments);
    setTimeout(function(){
      var hint=document.getElementById('_lpHint');
      if(!hint){
        var bar=document.getElementById('turmasYearBar')||document.getElementById('turmasGrid');
        if(bar){
          hint=document.createElement('div');
          hint.id='_lpHint';
          hint.style.cssText='font-size:10px;color:var(--muted);padding:4px 0 8px;opacity:.7;';
          hint.textContent='💡 Clique e segure numa turma para ativá-la';
          bar.parentElement&&bar.parentElement.insertBefore(hint,bar);
        }
      }
    },60);
  };
})();

