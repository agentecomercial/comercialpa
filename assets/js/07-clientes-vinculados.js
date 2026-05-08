/* ─────────────────────────────────────────────────────────────
   abrirClientesVinculados(nomeConsultor)
   Mostra TODOS os clientes vinculados ao consultor,
   SEM filtro de status (não apenas pagos)
───────────────────────────────────────────────────────────── */

/* Abre o modal de edição acima do modal de clientes vinculados */
function abrirEdicaoSobreVinculados(ri){
  // Garante que o modal de edição fica acima
  var mo = document.getElementById('modalOverlay');
  if(mo) mo.classList.add('sobre-vinculados');
  var co = document.getElementById('confirmOverlay');
  if(co) co.classList.add('sobre-vinculados');
  openModal(ri);
}
function abrirClientesVinculados(nomeConsultor){
  var ov  = document.getElementById('clientesVinculadosOverlay');
  var tbl = document.getElementById('cvTabela');
  var nom = document.getElementById('cvNome');
  var sub = document.getElementById('cvSub');
  var sts = document.getElementById('cvStats');
  if(!ov||!tbl) return;

  // Filtrar data por consultor — SEM filtro de status
  var vinculados = (Array.isArray(data)?data:[]).filter(function(d){
    return (d.consultor||'').toUpperCase().trim() === nomeConsultor.toUpperCase().trim();
  }).sort(function(a,b){ return (a.cliente||'').localeCompare(b.cliente||'','pt-BR'); });

  // Totalizadores
  var totalCarteira = vinculados.reduce(function(s,d){ return s+(d.valor||0); },0);
  var totalPago     = vinculados.filter(function(d){ return d.status==='pago'; }).reduce(function(s,d){ return s+(d.valor||0); },0);
  var totalAberto   = vinculados.filter(function(d){ return d.status==='aberto'; }).reduce(function(s,d){ return s+(d.valor||0); },0);
  var totalEntrada  = vinculados.reduce(function(s,d){ return s+(d.entrada||0); },0);
  var qtdPago       = vinculados.filter(function(d){ return d.status==='pago'; }).length;

  nom.textContent = nomeConsultor.toUpperCase();
  sub.textContent = vinculados.length+' cliente'+(vinculados.length!==1?'s':'')+' vinculado'+(vinculados.length!==1?'s':'')+' · carteira completa';

  // Stats
  var fv = typeof formatVal==='function' ? formatVal : function(v){ return 'R$ '+v; };
  sts.innerHTML=[
    {l:'Carteira total',   v:fv(totalCarteira), cor:'var(--blue)'},
    {l:'Faturado',         v:fv(totalPago),     cor:'var(--green)'},
    {l:'Em aberto',        v:fv(totalAberto),   cor:'var(--amber)'},
    {l:'Entradas',         v:fv(totalEntrada),  cor:'var(--accent)'},
    {l:'Clientes pagos',   v:qtdPago+'/'+vinculados.length, cor:'var(--muted)'}
  ].map(function(s){
    return '<div class="cv-stat"><span class="cv-stat-l">'+s.l+'</span>'
          +'<span class="cv-stat-v" style="color:'+s.cor+'">'+s.v+'</span></div>';
  }).join('');

  // Status labels e cores
  var SL  = {pago:'PAGO',aberto:'ABERTO',negociacao:'NEGOCIAÇÃO',desistiu:'DESISTIU',estorno:'ESTORNO',entrada:'ENTRADA','-':'—'};
  var SCR = {pago:'var(--green)',aberto:'var(--amber)',negociacao:'var(--blue)',desistiu:'var(--red)',estorno:'var(--muted)',entrada:'var(--accent)','-':'var(--muted)'};

  if(!vinculados.length){
    tbl.innerHTML='<tr><td colspan="6" style="padding:28px;text-align:center;color:var(--muted);">Nenhum cliente vinculado a este consultor.</td></tr>';
  } else {
    tbl.innerHTML = vinculados.map(function(d){
      var ri    = data.indexOf(d);
      var ip    = d.status==='pago';
      var cor   = SCR[d.status||'-']||'var(--muted)';
      var stLbl = SL[d.status||'-']||d.status||'—';
      // onclick usa stopPropagation para não fechar o overlay ao clicar na linha
      return '<tr onclick="event.stopPropagation();abrirEdicaoSobreVinculados('+ri+')" title="Clique para editar">'
        +'<td style="font-weight:600;text-transform:uppercase;white-space:nowrap;'+(ip?'color:#39ff14;':'')+'">'+d.cliente+'</td>'
        +'<td class="center">'+( d.treinamento||'—')+'</td>'
        +'<td class="center" style="font-family:monospace;'+(ip?'color:var(--green);font-weight:700;':'')+'">'+fv(d.valor||0)+'</td>'
        +'<td class="center">'
          +'<span style="font-size:10px;font-weight:500;color:'+cor+';background:'+cor+'1a;'
            +'border:1px solid '+cor+'33;border-radius:4px;padding:2px 9px;white-space:nowrap;">'+stLbl+'</span>'
        +'</td>'
        +'<td class="center" style="'+(d.entrada>0?'color:var(--accent);font-weight:600;font-family:monospace;':'color:var(--muted);')+'">'+(d.entrada>0?fv(d.entrada):'—')+'</td>'
        +'<td class="center" style="color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+(d.info||'')+'">'+(d.info&&d.info.trim()?d.info.trim().slice(0,40)+(d.info.trim().length>40?'…':''):'—')+'</td>'
        +'</tr>';
    }).join('');
  }

  ov.classList.add('open');
}

function fecharClientesVinculados(){
  var ov = document.getElementById('clientesVinculadosOverlay');
  if(ov) ov.classList.remove('open');
}

// Fechar com ESC
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    var ov=document.getElementById('clientesVinculadosOverlay');
    if(ov&&ov.classList.contains('open')) fecharClientesVinculados();
  }
});

window.abrirClientesVinculados  = abrirClientesVinculados;
window.fecharClientesVinculados = fecharClientesVinculados;
window.abrirEdicaoSobreVinculados = abrirEdicaoSobreVinculados;
