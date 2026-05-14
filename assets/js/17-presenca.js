/* ═══════════════════════════════════════════════════════════
   17-presenca.js — Controle de Presença de Clientes
   Módulo autônomo: não polui 02-main.js
   Integra com: data[], saveStorage(), _getSessao(), renderAll()
═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── Constantes ── */
var PRESENCA_OPTS = [
  { v: 'pendente',  l: 'Pendente', icon: '⏳', cor: 'var(--muted)', bg: 'rgba(136,136,136,.12)', border: 'rgba(136,136,136,.3)' },
  { v: 'presente',  l: 'Presente', icon: '✅', cor: '#34d399',      bg: 'rgba(52,211,153,.12)',  border: 'rgba(52,211,153,.35)' },
  { v: 'falta',     l: 'Falta',    icon: '❌', cor: '#ff5f57',      bg: 'rgba(255,95,87,.10)',   border: 'rgba(255,95,87,.35)'  }
];

/* ── Estado ── */
var _filtroPresenca = null; // null = todos

/* ── Lookup rápido ── */
function _opt(v){ return PRESENCA_OPTS.find(function(o){ return o.v===v; }) || PRESENCA_OPTS[0]; }

/* ── Verificar permissão de edição ── */
function _podeEditar(ri){
  var d = (typeof data !== 'undefined') ? data[ri] : null;
  if(!d) return false;
  var sess = (typeof _getSessao === 'function') ? _getSessao() : null;
  if(!sess) return true; // sem sessão = adm local
  var perfil = sess.perfil || 'adm';
  if(perfil === 'adm') return true;
  if(perfil === 'consultor'){
    var vinculo = (sess.vinculo || '').toUpperCase();
    return (d.consultor || '').toUpperCase() === vinculo;
  }
  return false;
}

/* ── Próximo status no ciclo ── */
function _proximoStatus(atual){
  var idx = PRESENCA_OPTS.findIndex(function(o){ return o.v === atual; });
  return PRESENCA_OPTS[(idx + 1) % PRESENCA_OPTS.length].v;
}

/* ── Alterar presença inline ── */
window._alterarPresenca = function(ri, novoStatus){
  if(!_podeEditar(ri)) return;
  var d = data[ri];
  if(!d) return;
  var anterior = d.presenca || 'pendente';
  if(anterior === novoStatus) return;

  // Registrar no histórico
  var sess = (typeof _getSessao === 'function') ? _getSessao() : null;
  var quem = sess ? (sess.vinculo || sess.nome || sess.login || 'adm') : 'adm';
  if(!d.presencaLog) d.presencaLog = [];
  d.presencaLog.push({
    por: quem,
    em: new Date().toISOString(),
    de: anterior,
    para: novoStatus
  });

  d.presenca = novoStatus;

  if(typeof markUnsaved === 'function') markUnsaved();
  if(typeof saveStorage === 'function') saveStorage();

  // Atualizar somente o badge — sem re-renderizar tudo
  _atualizarBadge(ri);
  _atualizarContadores();
  if(typeof window._atualizarBarraPresencaConsultor==='function') window._atualizarBarraPresencaConsultor();

  // Toast
  var opt = _opt(novoStatus);
  if(typeof _showToast === 'function'){
    _showToast(opt.icon + ' ' + d.cliente + ' → ' + opt.l, opt.cor);
  }
};

/* ── Ciclo de clique no badge ── */
/* ── Abrir dropdown de seleção ── */
window._abrirDropPresenca = function(e, ri){
  e.stopPropagation();
  if(!_podeEditar(ri)){
    if(typeof _showToast === 'function') _showToast('⛔ Sem permissão para alterar presença.','var(--red)');
    return;
  }
  // Fechar dropdown anterior
  var old = document.getElementById('_presDropdown');
  if(old){ old.remove(); return; }

  var d = data[ri];
  var btn = e.currentTarget;
  var rect = btn.getBoundingClientRect();

  var drop = document.createElement('div');
  drop.id = '_presDropdown';
  drop.style.cssText = 'position:fixed;z-index:99999;background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:6px;min-width:180px;box-shadow:0 16px 48px rgba(0,0,0,.75);display:flex;flex-direction:column;gap:3px;';
  drop.style.top  = Math.min(rect.bottom + 6, window.innerHeight - 200) + 'px';
  drop.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';

  PRESENCA_OPTS.forEach(function(opt){
    var item = document.createElement('button');
    var atual = (d.presenca || 'pendente') === opt.v;
    item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;border:1px solid '+(atual?opt.border:'transparent')+';background:'+(atual?opt.bg:'transparent')+';font-family:"DM Sans",sans-serif;font-size:12px;color:'+(atual?opt.cor:'var(--muted)')+';width:100%;text-align:left;transition:background .1s;';
    item.innerHTML = '<span style="font-size:14px;">'+opt.icon+'</span><span style="font-weight:'+(atual?'700':'400')+';">'+opt.l+'</span>'+(atual?'<span style="margin-left:auto;font-size:10px;color:'+opt.cor+';">●</span>':'');
    item.onmouseover = function(){ if(!atual){ this.style.background='var(--surface2)'; this.style.color='var(--text)'; } };
    item.onmouseout  = function(){ if(!atual){ this.style.background='transparent'; this.style.color='var(--muted)'; } };
    item.onclick = function(){ drop.remove(); window._alterarPresenca(ri, opt.v); };
    drop.appendChild(item);
  });

  document.body.appendChild(drop);
  setTimeout(function(){
    document.addEventListener('click', function _c(){ drop.remove(); document.removeEventListener('click',_c); });
  }, 0);
};

/* ── Gerar HTML do badge para a tabela ── */
window._presencaBadgeHtml = function(ri){
  var d = data[ri];
  if(!d) return '';
  var opt = _opt(d.presenca || 'pendente');
  var podeEdit = _podeEditar(ri);
  var cursor = podeEdit ? 'cursor:pointer;' : 'cursor:default;';
  var onclick = podeEdit
    ? 'onclick="_abrirDropPresenca(event,'+ri+')"'
    : '';
  return '<span '+onclick+' title="'+opt.l+(podeEdit?' · Clique para alterar':'')+'" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;border:1px solid '+opt.border+';background:'+opt.bg+';color:'+opt.cor+';'+cursor+'white-space:nowrap;user-select:none;transition:opacity .15s;" onmouseover="this.style.opacity=\'0.8\'" onmouseout="this.style.opacity=\'1\'">'
    + opt.icon + ' ' + opt.l + '</span>';
};

/* ── Atualizar só o badge de 1 linha (sem re-render) ── */
function _atualizarBadge(ri){
  // Atualiza em qualquer elemento com data-presenca-ri (td na tabela geral, div no accordion)
  document.querySelectorAll('[data-presenca-ri="'+ri+'"]').forEach(function(el){
    el.innerHTML = window._presencaBadgeHtml(ri);
  });
}

/* ── Contadores de presença ── */
function _atualizarContadores(){
  var bar = document.getElementById('presencaCountBar');
  if(!bar) return;
  var base = (typeof data !== 'undefined') ? data.filter(function(d){ return d&&d.cliente; }) : [];
  if(_filtroPresenca) base = base.filter(function(d){ return (d.presenca||'pendente')===_filtroPresenca; });
  var total    = base.length;
  var presente = base.filter(function(d){ return d.presenca==='presente'; }).length;
  var falta    = base.filter(function(d){ return d.presenca==='falta'; }).length;
  var pendente = base.filter(function(d){ return !d.presenca||d.presenca==='pendente'; }).length;
  var pct      = total>0 ? Math.round((presente/total)*100) : 0;

  bar.innerHTML =
    '<span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-right:8px;">Presença</span>'
    +'<span style="font-size:11px;color:#34d399;font-weight:700;" title="Presentes">✅ '+presente+'</span>'
    +'<span style="font-size:11px;color:var(--muted);margin:0 6px;">·</span>'
    +'<span style="font-size:11px;color:#ff5f57;font-weight:700;" title="Faltas">❌ '+falta+'</span>'
    +'<span style="font-size:11px;color:var(--muted);margin:0 6px;">·</span>'
    +'<span style="font-size:11px;color:var(--muted);" title="Pendentes">⏳ '+pendente+'</span>'
    +'<span style="font-size:11px;color:var(--muted);margin:0 8px;">|</span>'
    +'<span style="font-size:12px;font-weight:700;color:'+(pct>=80?'#34d399':pct>=50?'#ffb740':'#ff5f57')+';">'+pct+'% presença</span>';
}
window._presencaAtualizarContadores = _atualizarContadores;

/* ── Atualizar barra de presença no card do consultor ── */
window._atualizarBarraPresencaConsultor = function(){
  var bar = document.getElementById('presencaBarConsultor');
  if(!bar) return;
  var c = window._consultorAtivo;
  if(!c || typeof data === 'undefined') return;
  var base = data.filter(function(d){ return d&&d.cliente&&d.consultor===c; });
  var pres = base.filter(function(d){ return d.presenca==='presente'; }).length;
  var falt = base.filter(function(d){ return d.presenca==='falta'; }).length;
  var pend = base.filter(function(d){ return !d.presenca||d.presenca==='pendente'; }).length;
  var tot  = base.length;
  var pct  = tot>0 ? Math.round((pres/tot)*100) : 0;
  var cor  = pct>=80?'#34d399':pct>=50?'#ffb740':'#ff5f57';
  bar.innerHTML =
    '<span style="font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-right:2px;">Presença</span>'
    +'<span style="color:#34d399;font-weight:700;">✅ '+pres+'</span>'
    +'<span style="color:var(--muted);">·</span>'
    +'<span style="color:#ff5f57;font-weight:700;">❌ '+falt+'</span>'
    +'<span style="color:var(--muted);">·</span>'
    +'<span style="color:var(--muted);">⏳ '+pend+'</span>'
    +'<span style="color:var(--muted);margin:0 4px;">|</span>'
    +'<span style="font-weight:700;color:'+cor+';">'+pct+'% presença</span>';
};

/* ── Filtros de presença ── */
window._setFiltroPresenca = function(v){
  _filtroPresenca = (_filtroPresenca === v) ? null : v; // toggle
  // Atualizar botões
  PRESENCA_OPTS.forEach(function(opt){
    var btn = document.getElementById('pfbtn_'+opt.v);
    if(!btn) return;
    var ativo = _filtroPresenca === opt.v;
    btn.style.background = ativo ? opt.bg : 'transparent';
    btn.style.borderColor = ativo ? opt.border : 'rgba(255,255,255,.08)';
    btn.style.color = ativo ? opt.cor : 'var(--muted)';
    btn.style.fontWeight = ativo ? '700' : '400';
  });
  if(typeof renderAll === 'function') renderAll();
};

window._getFiltroPresenca = function(){ return _filtroPresenca; };

/* ── Estado filtro presença do card consultor ── */
var _filtroPresencaConsultor = null;

window._setFiltroPresencaConsultor = function(v){
  _filtroPresencaConsultor = (_filtroPresencaConsultor === v) ? null : v;
  _renderFiltrosPresencaConsultor();
  if(typeof _renderConsultorDetail === 'function' && window._consultorAtivo){
    _renderConsultorDetail(window._consultorAtivo);
  }
};

window._getFiltroPresencaConsultor = function(){ return _filtroPresencaConsultor; };

function _renderFiltrosPresencaConsultor(){
  var wrap = document.getElementById('presencaFBtnsConsultor');
  if(!wrap) return;
  wrap.innerHTML = PRESENCA_OPTS.map(function(opt){
    var ativo = _filtroPresencaConsultor === opt.v;
    return '<button id="pfbtnc_'+opt.v+'" onclick="_setFiltroPresencaConsultor(\''+opt.v+'\')" '
      +'style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid '+(ativo?opt.border:'rgba(255,255,255,.08)')+';background:'+(ativo?opt.bg:'transparent')+';color:'+(ativo?opt.cor:'var(--muted)')+';cursor:pointer;font-family:\'DM Sans\',sans-serif;font-weight:'+(ativo?'700':'400')+';transition:all .12s;white-space:nowrap;"'
      +' onmouseover="this.style.opacity=\'0.8\'" onmouseout="this.style.opacity=\'1\'">'
      +opt.icon+' '+opt.l+'</button>';
  }).join('');
}
window._renderFiltrosPresencaConsultor = _renderFiltrosPresencaConsultor;

/* ── Renderizar botões de filtro (aba geral) ── */
window._renderFiltrosPresenca = function(){
  var wrap = document.getElementById('presencaFBtns');
  if(!wrap) return;
  wrap.innerHTML = PRESENCA_OPTS.map(function(opt){
    var ativo = _filtroPresenca === opt.v;
    return '<button id="pfbtn_'+opt.v+'" onclick="_setFiltroPresenca(\''+opt.v+'\')" '
      +'style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid '+(ativo?opt.border:'rgba(255,255,255,.08)')+';background:'+(ativo?opt.bg:'transparent')+';color:'+(ativo?opt.cor:'var(--muted)')+';cursor:pointer;font-family:\'DM Sans\',sans-serif;font-weight:'+(ativo?'700':'400')+';transition:all .12s;white-space:nowrap;"'
      +' onmouseover="this.style.opacity=\'0.8\'" onmouseout="this.style.opacity=\'1\'">'
      +opt.icon+' '+opt.l+'</button>';
  }).join('');
};

/* ── Aplicar filtro de presença no filtered() — patch ── */
var _origFiltered = null;
function _patchFiltered(){
  if(typeof filtered !== 'function') return;
  if(_origFiltered) return; // já patchado
  _origFiltered = filtered;
  window.filtered = function(){
    var f = _origFiltered.apply(this, arguments);
    if(_filtroPresenca){
      f = f.filter(function(d){ return (d.presenca||'pendente') === _filtroPresenca; });
    }
    return f;
  };
}

/* ── Inicializar após DOM pronto ── */
function _init(){
  _patchFiltered();
  _atualizarContadores();
  _renderFiltrosPresenca();

  // Patch no renderAll para sempre atualizar contadores
  if(typeof renderAll === 'function' && !window._presencaRenderAllPatchado){
    window._presencaRenderAllPatchado = true;
    var _origRA = window.renderAll;
    window.renderAll = function(){
      _origRA.apply(this, arguments);
      _atualizarContadores();
      _renderFiltrosPresenca();
    };
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}

// Expor para re-init após login
window._presencaInit = _init;

window._log&&window._log('[Presença] Módulo carregado ✅');
})();
