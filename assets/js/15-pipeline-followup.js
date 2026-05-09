/* ════════════════════════════════════════════════════════════════
   PIPELINE — FOLLOW-UP DE NEGOCIAÇÕES
   Armazena em: pipelineFollowUp/{mesKey}/{chave}
   chave = norm(consultor) + '_' + norm(cliente)
════════════════════════════════════════════════════════════════ */
(function(){

  /* ── Estado ─────────────────────────────────────────────────── */
  var _fuData  = {};   // {chave: {proximaAcao, dataFollowUp, consultor, cliente, atualizadoEm}}
  var _fuMes   = '';   // mesKey ativo
  var _fuAberto= null; // chave do follow-up aberto no modal

  /* ── Helpers ────────────────────────────────────────────────── */
  function _norm(s){ return (s||'').trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''); }
  function _chave(consultor, cliente){ return _norm(consultor)+'__'+_norm(cliente); }
  function _hoje(){
    var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function _fmtDataBR(iso){
    if(!iso) return '';
    var p=iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0];
  }
  function _mesKey(){
    if(typeof window._mesKey==='function') return window._mesKey();
    var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ── Carregar do Firebase ───────────────────────────────────── */
  function _fuCarregar(mk){
    _fuMes=mk;
    if(!window._fbGet) return;
    window._fbGet('pipelineFollowUp/'+mk).then(function(d){
      _fuData=d&&typeof d==='object'?d:{};
      _fuRenderWidget();
      _fuAtualizarIndicadores();
    }).catch(function(){ _fuData={}; });
  }

  /* ── Salvar no Firebase ─────────────────────────────────────── */
  function _fuSalvar(chave, obj){
    if(!window._fbSave) return;
    window._fbSave('pipelineFollowUp/'+_fuMes+'/'+chave, obj)
      .catch(function(e){ console.warn('[FollowUp] save:', e); });
  }

  /* ── Abrir modal ────────────────────────────────────────────── */
  window.npAbrirFollowUp = function(consultor, cliente){
    _fuAberto = _chave(consultor, cliente);
    var ov = document.getElementById('npFollowUpOverlay');
    if(!ov) return;
    var exist = _fuData[_fuAberto]||{};
    document.getElementById('npFuConsultor').textContent = (consultor||'').toUpperCase();
    document.getElementById('npFuCliente').textContent   = (cliente||'').toUpperCase();
    document.getElementById('npFuAcao').value            = exist.proximaAcao||'';
    document.getElementById('npFuData').value            = exist.dataFollowUp||_hoje();
    ov.classList.add('open');
    setTimeout(function(){ var el=document.getElementById('npFuAcao'); if(el){el.focus();el.select();} },100);
  };

  window.npFecharFollowUp = function(){
    var ov=document.getElementById('npFollowUpOverlay');
    if(ov) ov.classList.remove('open');
    _fuAberto=null;
  };

  window.npSalvarFollowUp = function(){
    if(!_fuAberto) return;
    var acao = (document.getElementById('npFuAcao').value||'').trim();
    var data = document.getElementById('npFuData').value||'';
    if(!acao){ if(typeof _showToast==='function') _showToast('Descreva a próxima ação.','var(--amber)'); return; }
    if(!data){ if(typeof _showToast==='function') _showToast('Defina a data de follow-up.','var(--amber)'); return; }
    var cons = document.getElementById('npFuConsultor').textContent;
    var cli  = document.getElementById('npFuCliente').textContent;
    var obj  = { proximaAcao:acao, dataFollowUp:data, consultor:cons, cliente:cli, atualizadoEm:Date.now() };
    _fuData[_fuAberto] = obj;
    _fuSalvar(_fuAberto, obj);
    npFecharFollowUp();
    _fuRenderWidget();
    _fuAtualizarIndicadores();
    if(typeof _showToast==='function') _showToast('✅ Follow-up salvo!','var(--accent)');
  };

  window.npRemoverFollowUp = function(){
    if(!_fuAberto) return;
    delete _fuData[_fuAberto];
    if(window._fbSave) window._fbSave('pipelineFollowUp/'+_fuMes+'/'+_fuAberto, null).catch(function(){});
    npFecharFollowUp();
    _fuRenderWidget();
    _fuAtualizarIndicadores();
    if(typeof _showToast==='function') _showToast('Follow-up removido.','var(--muted)');
  };

  /* ── Widget "Follow-ups do dia" no Dashboard ────────────────── */
  function _fuRenderWidget(){
    var el = document.getElementById('npFollowUpWidget');
    if(!el) return;
    var hoje = _hoje();
    var lista = Object.values(_fuData).filter(function(f){ return f&&f.dataFollowUp; });
    var vencidos = lista.filter(function(f){ return f.dataFollowUp < hoje; });
    var deHoje   = lista.filter(function(f){ return f.dataFollowUp === hoje; });
    var proximos = lista.filter(function(f){ return f.dataFollowUp > hoje; }).slice(0,3);

    if(!lista.length){ el.style.display='none'; return; }
    el.style.display='';

    var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
      +'<span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;">📋 Follow-ups</span>'
      +'<div style="display:flex;gap:6px;">'
      +(vencidos.length?'<span style="font-size:10px;font-weight:700;color:var(--red);background:rgba(255,82,82,.12);border:1px solid rgba(255,82,82,.25);border-radius:20px;padding:2px 8px;">'+vencidos.length+' vencido'+(vencidos.length!==1?'s':'')+'</span>':'')
      +(deHoje.length?'<span style="font-size:10px;font-weight:700;color:var(--accent);background:rgba(200,240,90,.1);border:1px solid rgba(200,240,90,.25);border-radius:20px;padding:2px 8px;">'+deHoje.length+' hoje</span>':'')
      +'</div></div>';

    var itens = vencidos.concat(deHoje).concat(proximos);
    html += itens.map(function(f){
      var venc = f.dataFollowUp < hoje;
      var hj   = f.dataFollowUp === hoje;
      var cor  = venc?'var(--red)':hj?'var(--accent)':'var(--muted)';
      var bg   = venc?'rgba(255,82,82,.06)':hj?'rgba(200,240,90,.05)':'rgba(255,255,255,.02)';
      var brd  = venc?'rgba(255,82,82,.2)':hj?'rgba(200,240,90,.2)':'var(--border2)';
      return '<div onclick="npAbrirFollowUp(\''+_esc(f.consultor||'')+'\',\''+_esc(f.cliente||'')+'\''+')" style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:8px;border:1px solid '+brd+';background:'+bg+';margin-bottom:6px;cursor:pointer;transition:opacity .15s;" onmouseover="this.style.opacity=\'.8\'" onmouseout="this.style.opacity=\'1\'">'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:11px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_esc(f.consultor||'')+'</div>'
        +'<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_esc(f.cliente||'')+'</div>'
        +'<div style="font-size:11px;color:var(--text);margin-top:3px;font-style:italic;">'+_esc(f.proximaAcao||'')+'</div>'
        +'</div>'
        +'<div style="font-size:10px;font-weight:700;color:'+cor+';white-space:nowrap;padding-top:2px;">'+(venc?'⚠ ':hj?'📅 ':'🔜 ')+_fmtDataBR(f.dataFollowUp)+'</div>'
        +'</div>';
    }).join('');

    el.innerHTML = html;
  }

  /* ── Indicadores na aba Vendas ──────────────────────────────── */
  function _fuAtualizarIndicadores(){
    var hoje = _hoje();
    document.querySelectorAll('.np-fu-btn').forEach(function(btn){
      var cons = btn.dataset.cons||'';
      var cli  = btn.dataset.cli||'';
      var ch   = _chave(cons, cli);
      var f    = _fuData[ch];
      if(f&&f.dataFollowUp){
        var venc = f.dataFollowUp < hoje;
        var hj   = f.dataFollowUp === hoje;
        btn.title    = (venc?'⚠ Vencido: ':hj?'Hoje: ':'Próximo: ')+_fmtDataBR(f.dataFollowUp)+' — '+f.proximaAcao;
        btn.style.color      = venc?'var(--red)':hj?'var(--accent)':'var(--blue)';
        btn.style.opacity    = '1';
        btn.textContent      = '📅';
      } else {
        btn.title            = 'Definir próxima ação';
        btn.style.color      = 'var(--muted)';
        btn.style.opacity    = '.5';
        btn.textContent      = '📅';
      }
    });
  }

  /* ── Injetar botão follow-up nas linhas de negociação ───────── */
  window._fuInjetarBotoes = function(){
    _fuAtualizarIndicadores();
  };

  /* ── Init: chamado pela pipeline ao mudar mês ───────────────── */
  window._fuInit = function(mesKey){
    _fuCarregar(mesKey||_mesKey());
  };

  /* ── Expor helper de chave para uso externo ─────────────────── */
  window._fuChave = _chave;

  /* ── ESC fecha modal ────────────────────────────────────────── */
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape'){
      var ov=document.getElementById('npFollowUpOverlay');
      if(ov&&ov.classList.contains('open')) window.npFecharFollowUp();
    }
  });

  /* ── Auto-init quando pipeline já estiver carregada ────────── */
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){ window._fuInit(); }, 1500);
  });

})();
