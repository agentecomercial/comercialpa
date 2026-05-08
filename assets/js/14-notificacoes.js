/* ═══════════════════════════════════════════════════════
   FASE 6.1 — NOTIFICAÇÕES
═══════════════════════════════════════════════════════ */
(function(){
  var _notifListener=null;
  var _notifAuditListener=null;
  var _notifCache=[];           /* cache local da lista */
  var _notifOpen=false;

  /* Helpers locais — _esc e _fmtR só estão disponíveis dentro de outros IIFEs. */
  function _esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function _fmtR(v){return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}

  /* ── Tipos de notificação ── */
  var NOTIF_ICONS={pagamento:'💰',meta_batida:'🏆',turma_vencendo:'📅',cliente_novo:'👤',cancelamento:'❌',sistema:'🔔'};

  /* ── Gravar notificação para um uid ── */
  window._notifPush=function(uid,notif){
    if(!uid||!window._fbPush||!window._fbUpdate) return;
    notif.criadoEm=Date.now();
    notif.lida=false;
    window._fbPush('notifications/'+uid,notif).then(function(){
      window._fbGet('notifications_meta/'+uid+'/unread').then(function(n){
        window._fbUpdate('notifications_meta/'+uid,{unread:(+(n||0))+1});
      }).catch(function(){window._fbUpdate('notifications_meta/'+uid,{unread:1});});
    }).catch(function(){});
  };

  /* ── Marcar uma como lida ── */
  window._notifMarkRead=function(notifId){
    var s=typeof _getSessao==='function'?_getSessao():null;
    if(!s||!notifId) return;
    var uid=s.uid||s.login;
    window._fbUpdate('notifications/'+uid+'/'+notifId,{lida:true}).then(function(){
      window._fbGet('notifications_meta/'+uid+'/unread').then(function(n){
        var novo=Math.max(0,(+(n||0))-1);
        window._fbUpdate('notifications_meta/'+uid,{unread:novo});
      }).catch(function(){});
    }).catch(function(){});
  };

  /* ── Marcar todas como lidas ── */
  window._notifMarkAllRead=function(){
    var s=typeof _getSessao==='function'?_getSessao():null;
    if(!s) return;
    var uid=s.uid||s.login;
    _notifCache.forEach(function(n){
      if(!n.lida) window._fbUpdate('notifications/'+uid+'/'+n._id,{lida:true}).catch(function(){});
    });
    window._fbUpdate('notifications_meta/'+uid,{unread:0}).catch(function(){});
    _notifCache.forEach(function(n){n.lida=true;});
    _notifRenderList();
    _notifRenderBadge(0);
    _notifDropdown(false);
  };

  /* ── Atualizar badges ── */
  function _notifRenderBadge(count){
    ['notifBadge1','notifBadge2'].forEach(function(id){
      var el=document.getElementById(id);if(!el)return;
      el.textContent=count>99?'99+':count;
      el.hidden=count===0;
    });
    ['notifBell1','notifBell2'].forEach(function(id){
      var el=document.getElementById(id);if(!el)return;
      el.classList.toggle('has-unread',count>0);
    });
  }

  /* ── Renderizar lista no dropdown ── */
  function _notifRenderList(){
    var ul=document.getElementById('notifList');if(!ul)return;
    if(!_notifCache.length){
      ul.innerHTML='<li class="notif-empty">Nenhuma notificação ainda.</li>';return;
    }
    ul.innerHTML=_notifCache.slice(0,30).map(function(n){
      var icon=NOTIF_ICONS[n.tipo]||'🔔';
      var lida=n.lida?'':'unread';
      return '<li class="notif-item '+lida+'" onclick="_notifClick(\''+n._id+'\')">'
        +'<span class="notif-icon">'+icon+'</span>'
        +'<div class="notif-body">'
        +'<div class="notif-title">'+_esc(n.titulo||'Notificação')+'</div>'
        +'<div class="notif-msg">'+_esc(n.mensagem||'')+'</div>'
        +'<div class="notif-time">'+_notifTempo(n.criadoEm)+'</div>'
        +'</div>'
        +'<span class="notif-dot"></span>'
        +'</li>';
    }).join('');
  }

  /* ── Tempo relativo ── */
  function _notifTempo(ts){
    if(!ts) return '';
    var diff=Date.now()-ts;
    if(diff<60000)  return 'agora';
    if(diff<3600000)return Math.floor(diff/60000)+' min atrás';
    if(diff<86400000)return Math.floor(diff/3600000)+'h atrás';
    return new Date(ts).toLocaleDateString('pt-BR');
  }

  /* ── Abrir/fechar dropdown ── */
  function _notifDropdown(abrir){
    var d=document.getElementById('notifDropdown');if(!d)return;
    _notifOpen=abrir;
    d.classList.toggle('hidden',!abrir);
  }
  window._notifToggle=function(e){
    if(e){e.stopPropagation();}
    _notifDropdown(!_notifOpen);
    if(_notifOpen) _notifRenderList();
  };
  document.addEventListener('click',function(e){
    if(_notifOpen&&!e.target.closest('#notifDropdown')&&!e.target.closest('.notif-bell')){
      _notifDropdown(false);
    }
  });

  /* ── Clique em notificação ── */
  window._notifClick=function(id){
    var n=_notifCache.find(function(x){return x._id===id;});
    if(!n) return;
    if(!n.lida) window._notifMarkRead(id);
    n.lida=true;
    _notifRenderList();
    _notifDropdown(false);
    /* Navegar se tiver link */
    if(n.link&&n.link.tipo==='turma'&&n.link.id){
      if(typeof entrarTurma==='function') entrarTurma(n.link.id);
    } else if(n.link&&n.link.tipo==='pipeline'){
      if(typeof abrirNovaPipeline==='function') abrirNovaPipeline();
    }
  };

  /* ── Listener em tempo real ── */
  window._notifListen=function(){
    var s=typeof _getSessao==='function'?_getSessao():null;
    if(!s||!window._fbChange) return;
    var uid=s.uid||s.login;
    /* Escutar metadados (unread counter) */
    _notifListener=window._fbChange('notifications_meta/'+uid,function(meta){
      var count=(meta&&meta.unread)||0;
      _notifRenderBadge(count);
    });
    /* Escutar notificações (últimas 30) */
    window._fbGet('notifications/'+uid).then(function(data){
      _notifCache=Object.entries(data||{}).map(function(e){
        return Object.assign({_id:e[0]},e[1]);
      }).sort(function(a,b){return b.criadoEm-a.criadoEm;});
      _notifRenderBadge(_notifCache.filter(function(n){return!n.lida;}).length);
    }).catch(function(){});

    /* Listener no audit_log para gerar notificações em tempo real */
    _notifAuditListener=window._fbChange('audit_log',function(log){
      if(!log) return;
      var sessao=typeof _getSessao==='function'?_getSessao():null;
      if(!sessao) return;
      /* Processar apenas eventos recentes (últimos 10s) */
      var agora=Date.now();
      Object.values(log).forEach(function(evt){
        if(!evt||!evt.ts) return;
        if(agora-evt.ts>10000) return; /* ignorar eventos antigos */
        var notif=_notifFromAudit(evt,sessao);
        if(notif) window._notifPush(notif.uid,notif);
      });
    });
  };

  window._notifUnlisten=function(){
    if(typeof _notifListener==='function') try{_notifListener();}catch(_){}
    if(typeof _notifAuditListener==='function') try{_notifAuditListener();}catch(_){}
    _notifListener=null;_notifAuditListener=null;
    _notifCache=[];
    _notifRenderBadge(0);
  };

  /* ── Mapear evento de audit → notificação ── */
  function _notifFromAudit(evt,sessao){
    /* Somente adm cria turma e define metas — sem auto-notificação */
    /* Gatilhos futuros: pagamento confirmado por consultor notifica adm */
    return null;
  }

  /* ── Notificação ao confirmar pagamento ── */
  window._notifOnPagamento=function(turmaId,turmaNome,clienteNome,consultor,valor){
    var s=typeof _getSessao==='function'?_getSessao():null;
    if(!s) return;
    /* Normalizar parâmetros — vendas avulsas podem vir sem consultor / cliente */
    var consUp=String(consultor||'').toUpperCase();
    var nomeCliente=String(clienteNome||'—');
    var nomeTurma=String(turmaNome||'—');
    /* Notificar o adm */
    window._fbGet('usuarios').then(function(us){
      Object.entries(us||{}).forEach(function(e){
        var uid=e[0],u=e[1]||{};
        var ehAdm=u.perfil==='adm';
        var ehDono=consUp&&u.vinculo&&String(u.vinculo).toUpperCase()===consUp;
        if(ehAdm||ehDono){
          window._notifPush(uid,{
            tipo:'pagamento',
            titulo:'Pagamento confirmado',
            mensagem:nomeCliente+' pagou '+_fmtR(valor)+' — '+nomeTurma,
            link:{tipo:'turma',id:turmaId}
          });
        }
      });
    }).catch(function(){});
  };

})();
