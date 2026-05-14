function _mostrarTurmaInativa(){
  _mostrarTela('turmaInativaScreen',true);
}

function _mostrarPropostaComercial(){
  _mostrarTela('propostaComercialScreen');
  // Renderizar cards de produtos
  var grid = document.getElementById('propostaComercialCards');
  if(grid && typeof _PRODUTOS_PROPOSTA !== 'undefined'){
    grid.innerHTML = _getProdutosOrdem().map(function(cod){
      var p = _PRODUTOS_PROPOSTA[cod];
      var imgStyle = p.img ? (function(){
      var posMap={'JE':'center 45%','MAESTRIA':'center 50%','DP':'center 45%','CIS_GLOBAL':'center 20%','TEAM':'center 50%'};
      var pos=posMap[cod]||'center 5%';
      return 'background-image:url('+p.img+');background-size:115%;background-position:'+pos+';';
    })()
      : 'background:var(--surface2);';
      return '<div class="prop-prod-card" data-cod="'+cod+'" style="cursor:pointer;border-radius:10px;overflow:hidden;border:1px solid var(--border2);transition:transform .15s;" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'\'">'
        +'<div style="'+imgStyle+'height:140px;position:relative;overflow:hidden;">'
        +'<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.3) 55%,transparent 100%);"></div>'
        +'<div style="position:absolute;top:7px;left:7px;background:rgba(200,240,90,.18);border:1px solid rgba(200,240,90,.35);border-radius:4px;font-size:8px;font-weight:700;color:#c8f05a;padding:2px 6px;letter-spacing:.06em;">'+cod+'</div>'
        +'<div style="position:absolute;bottom:10px;left:0;right:0;padding:0 10px;"><div style="font-size:11px;font-weight:700;color:#fff;line-height:1.3;">'+p.nome+'</div></div>'
        +'</div>'
        +'<div class="gp-btn" style="padding:7px 10px;background:#0a150a;text-align:center;font-size:10px;font-weight:600;color:#fff;letter-spacing:.04em;border-top:1px solid rgba(200,240,90,.15);transition:background .25s,color .25s;">Gerar Proposta</div>'
        +'</div>';
    }).join('');
    // Event delegation
    grid.addEventListener('click',function(e){
      var card=e.target.closest('.prop-prod-card');
      if(card&&card.dataset.cod) abrirPropProd(card.dataset.cod);
    });
  }
}

/* ============================================================
   PROPOSTA COMERCIAL
============================================================ */
var _PROPOSTA_TEXTO = "É uma imensa honra tê-lo conosco e poder fazer parte da sua jornada.\nSabemos que você superou diversos desafios para chegar até esse curso e queremos te parabenizar por isso.\nAcreditar que existe uma vida extraordinária e agir em direção a ela é um ato de ousadia e coragem.\nMas, reforçamos que existe um nível ainda mais alto e queremos muito te conduzir em direção a ele.\nE é justamente por esse motivo, que venho te lembrar dos treinamentos que ainda faltam para concluir a jornada e se tornar um GOLDEN BELT Febracis.\nTemos a total certeza de que juntos construiremos dia após dia o seu legado dentro e fora da Febracis.";

var _PROPOSTA_PRECOS = {
  'IF':        {integral:4596.40,  parcelado:299.70,  parcelado_desc:3596.40,  avista_credito:2997.00, avista:2497.00,  reciclagem:1798.20},
  'MASTER':    {integral:8796.47,  parcelado:649.71,  parcelado_desc:7796.52,  avista_credito:6497.00, avista:6497.00,  reciclagem:3898.24},
  'FCIS':      {integral:11796.49, parcelado:899.71,  parcelado_desc:10796.52, avista_credito:8997.00, avista:8997.00,  reciclagem:5398.25},
  'ML5':       {integral:11796.49, parcelado:899.71,  parcelado_desc:5398.26,  avista_credito:8997.00, avista:8997.00,  reciclagem:5398.25},
  'BHP':       {integral:6996.45,  parcelado:499.70,  parcelado_desc:5996.40,  avista_credito:4997.00, avista:4997.00,  reciclagem:2998.23},
  'FGPC':      {integral:6996.45,  parcelado:499.70,  parcelado_desc:5996.40,  avista_credito:4997.00, avista:4997.00,  reciclagem:2998.23},
  'CEOP':      {integral:6996.45,  parcelado:499.70,  parcelado_desc:5996.40,  avista_credito:4997.00, avista:4997.00,  reciclagem:2998.23},
  'TAV':       {integral:3997.00,  parcelado:249.75,  parcelado_desc:2997.00,  avista_credito:2497.00, avista:1997.00,  reciclagem:1498.50},
  'MAESTRIA':  {integral:85000.00, parcelado:7083.63, parcelado_desc:80000.00, avista_credito:70000.00,avista:70000.00, reciclagem:null},
  'CIS_GLOBAL':{integral:1997.00,  parcelado:199.70,  parcelado_desc:199.70,   avista_credito:1997.00, avista:1997.00,  reciclagem:998.50},
};

var _PROPOSTA_LABELS = {
  integral:      'Integral',
  parcelado:     '12x',
  parcelado_desc:'12x c/ desconto',
  avista_credito:'À Vista no crédito',
  avista:        'À Vista',
  reciclagem:    'Reciclagem 50%'
};

// Treinamentos disponíveis para proposta (tabela de preços)
var _PROPOSTA_TREINAMENTOS = Object.keys(_PROPOSTA_PRECOS);

var _PRODUTOS_PROPOSTA={
'IF':{customRenderer:true,nome:'Inteligência Financeira',codigo:'IF',img:'assets/img/propostas/IF.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Inteligência Financeira.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'MASTER':{customRenderer:true,nome:'Master Coaching',codigo:'MASTER',img:'assets/img/propostas/MASTER.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Master Coaching.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'CEOP':{customRenderer:true,nome:'Comunicação e Oratória Persuasiva',codigo:'CEOP',img:'assets/img/propostas/CEOP.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Comunicação e Oratória Persuasiva.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'FGPC':{customRenderer:true,nome:'Formação em Gestão de Pessoas',codigo:'FGPC',img:'assets/img/propostas/FGPC.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Formação em Gestão de Pessoas.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'BHP':{customRenderer:true,nome:'Gestão de Negócios',codigo:'BHP',img:'assets/img/propostas/BHP.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o BHP — Gestão de Negócios.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'FCIS':{customRenderer:true,nome:'Formação em Coaching Integral Sistêmico',codigo:'FCIS',img:'assets/img/propostas/FCIS.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o FCIS — Coaching Integral Sistêmico.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},

'ML5':{customRenderer:true,nome:'Formação de Líderes',codigo:'ML5',img:'assets/img/propostas/ML5.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o ML5 — Formação de Líderes.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'TAV':{customRenderer:true,nome:'Técnicas Avançadas de Vendas',codigo:'TAV',img:'assets/img/propostas/TAV.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Técnicas Avançadas de Vendas.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'JE':{nome:'Jornada do Enriquecimento',codigo:'JE',img:'assets/img/propostas/JE.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Jornada do Enriquecimento.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'GE':{nome:'Gestão Eficaz',codigo:'GE',img:'assets/img/propostas/GE.png',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Gestão Eficaz.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'MAESTRIA':{nome:'Maestria em Negócios',codigo:'MAESTRIA',img:'assets/img/propostas/MAESTRIA.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Maestria em Negócios.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'PDA':{nome:'O Poder da Ação',codigo:'PDA',img:'assets/img/propostas/PDA.png',texto:'\u00c9 uma imensa honra convidá-lo(a) para o O Poder da Ação.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'DP':{nome:'Decifre e Influencie Pessoas',codigo:'DP',img:'assets/img/propostas/DP.png',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Decifre e Influencie Pessoas.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'CIS_GLOBAL':{customRenderer:true,nome:'Método CIS Global',codigo:'CIS_GLOBAL',img:'assets/img/propostas/CIS_GLOBAL.jpg',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Método CIS Global.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
'CIS':{customRenderer:true,nome:'Método CIS Presencial',codigo:'CIS',img:'assets/img/propostas/CIS.png',texto:'O Método CIS (Coaching Integral Sistêmico) é o maior e mais completo treinamento de inteligência emocional do mundo, criado por Paulo Vieira — especialista em comportamento humano e presidente da Febracis.\n\nCom mais de 248 edições realizadas e 1,8 milhão de pessoas impactadas em 83 países, o programa é projetado para ajudar você a desbloquear seu potencial máximo através de 5 pilares essenciais que transformam todas as 11 áreas da sua vida:\n\n✅ Performance: maior capacidade de liderança\n✅ Emocional: elimine hábitos tóxicos e sabotadores\n✅ Financeiro: organize e alavanche sua vida financeira\n✅ Profissional: cresça e se destaque na sua área\n✅ Relacionamentos: restaure e fortaleça seus laços\n\nSão mais de 50 horas de imersão profunda em 3 dias de treinamento presencial, com Paulo Vieira, Camila Vieira e Júlia Vieira.\n\nNão perca essa oportunidade de transformar sua vida de dentro para fora!',preco:'R$ [VALOR]',validade:'30 dias'},
'TEAM':{nome:'Team Coaching Febracis',codigo:'TEAM',img:'assets/img/propostas/TEAM.png',texto:'\u00c9 uma imensa honra convidá-lo(a) para o Team Coaching Febracis.\n\n[TEXTO_DO_PRODUTO — substitua com base no PDF do treinamento]\n\nNão deixe essa oportunidade passar!',preco:'R$ [VALOR]',validade:'30 dias'},
};

function abrirPropostaModal(){
  var sess = _getSessao ? _getSessao() : null;
  var isAdm = !sess || sess.perfil === 'adm';

  // Exibir consultor responsável
  var dispConsultor = document.getElementById('propostaConsultorDisplay');
  var nomeConsultor = '';
  if(isAdm){
    nomeConsultor = 'ADM';
  } else if(sess && sess.vinculo){
    nomeConsultor = sess.vinculo.toUpperCase();
  } else if(sess && sess.nome){
    nomeConsultor = sess.nome.toUpperCase();
  }
  if(dispConsultor) dispConsultor.textContent = nomeConsultor || '—';

  // Popular clientes da turma
  var sel = document.getElementById('propostaCliente');
  sel.innerHTML = '<option value="">Selecione um cliente...</option>';
  var clientes;
  if(!isAdm && sess && sess.vinculo){
    var meus = data.filter(function(d){return d&&d.cliente&&d.consultor&&d.consultor.toUpperCase()===(sess.vinculo||'').toUpperCase();});
    clientes = [...new Set(meus.map(function(d){return d.cliente;}))].sort();
  } else {
    clientes = [...new Set(data.filter(function(d){return d&&d.cliente;}).map(function(d){return d.cliente;}))].sort();
  }
  clientes.forEach(function(c){
    var opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  });

  // Renderizar treinamentos e resetar preview
  _propostaRenderTreinamentos();
  _propostaRecalcular();
  var frame = document.getElementById('propostaPreviewFrame');
  var ph = document.getElementById('propostaPreviewPlaceholder');
  if(frame){frame.src='about:blank';frame.style.display='none';}
  if(ph) ph.style.display='flex';
  document.getElementById('propostaOverlay').classList.add('open');
}

function fecharPropostaModal(){
  document.getElementById('propostaOverlay').classList.remove('open');
}

function _propostaRenderTreinamentos(){
  var pagamento = document.getElementById('propostaPagamento').value;
  var container = document.getElementById('propostaTreinamentos');
  container.innerHTML = '';

  // Treinamentos da tabela de preços
  var _isMensal = (pagamento === 'parcelado' || pagamento === 'parcelado_desc');
  _PROPOSTA_TREINAMENTOS.forEach(function(nome){
    var precos = _PROPOSTA_PRECOS[nome];
    var precoBase = precos[pagamento];
    var preco = (pagamento === 'parcelado_desc' && precoBase != null) ? precoBase / 12 : precoBase;
    var indisponivel = precoBase === null;

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--border2);background:var(--surface2);cursor:pointer;transition:all .15s;';
    if(indisponivel) row.style.opacity = '0.4';

    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id = 'prop_' + nome;
    chk.disabled = indisponivel;
    chk.style.cssText = 'accent-color:var(--accent);width:15px;height:15px;flex-shrink:0;cursor:pointer;';
    chk.addEventListener('change', _propostaRecalcular);

    var label = document.createElement('label');
    label.htmlFor = 'prop_' + nome;
    label.style.cssText = 'flex:1;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;';

    var nomeSpan = document.createElement('span');
    nomeSpan.style.cssText = 'font-size:13px;font-weight:600;color:var(--text);';
    nomeSpan.textContent = nome;

    var precoInput = document.createElement('input');
    precoInput.type = 'text';
    precoInput.id = 'propval_' + nome;
    precoInput.value = indisponivel ? '—' : formatVal(preco);
    precoInput.disabled = indisponivel;
    precoInput.style.cssText = 'width:120px;background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:4px 8px;color:var(--accent);font-size:12px;font-weight:700;text-align:right;font-family:DM Mono,monospace;';
    precoInput.addEventListener('change', function(){_propostaRecalcular();});
    precoInput.addEventListener('focus', function(){this.select();});

    label.appendChild(nomeSpan);
    label.appendChild(precoInput);
    row.appendChild(chk);
    row.appendChild(label);
    row.addEventListener('click', function(e){
      if(e.target === chk || e.target === precoInput || indisponivel) return;
      chk.checked = !chk.checked;
      _propostaRecalcular();
    });
    container.appendChild(row);
  });

}

function _propostaSelecionarTodos(){
  var container = document.getElementById('propostaTreinamentos');
  if(!container) return;
  var chks = container.querySelectorAll('input[type=checkbox]:not(:disabled)');
  var todos = Array.from(chks).every(function(c){ return c.checked; });
  chks.forEach(function(c){ c.checked = !todos; });
  var btn = document.getElementById('btnPropostaSelecionarTodos');
  if(btn) btn.textContent = todos ? 'Selecionar todos' : 'Desmarcar todos';
  _propostaRecalcular();
}

function _propostaAtualizar(){
  var cliente = document.getElementById('propostaCliente').value;
  var sub = document.getElementById('propostaSub');
  if(cliente && sub) sub.textContent = 'Cliente: ' + cliente;
  else if(sub) sub.textContent = 'Selecione o cliente e os treinamentos';
}

function _propostaRecalcular(){
  var pagamento = document.getElementById('propostaPagamento').value;
  // Atualizar preços nos inputs
  _PROPOSTA_TREINAMENTOS.forEach(function(nome){
    var inp = document.getElementById('propval_' + nome);
    var chk = document.getElementById('prop_' + nome);
    if(!inp || !chk) return;
    var precoBase = _PROPOSTA_PRECOS[nome][pagamento];
    var preco = (pagamento === 'parcelado_desc' && precoBase != null) ? precoBase / 12 : precoBase;
    if(preco !== null && !chk.dataset.edited){
      inp.value = formatVal(preco);
    }
  });

  // Calcular total
  var total = 0;
  var selecionados = [];
  var container = document.getElementById('propostaTreinamentos');
  if(!container) return;
  container.querySelectorAll('input[type=checkbox]').forEach(function(chk){
    if(!chk.checked) return;
    var nome = chk.id.replace('prop_', '');
    var inp = document.getElementById('propval_' + nome);
    var val = inp ? parseVal(inp.value) : 0;
    total += val;
    selecionados.push({nome: nome, val: val});
  });

  document.getElementById('propostaTotal').textContent = formatVal(total);
  var detalhe = document.getElementById('propostaTotalDetalhe');
  if(detalhe){
    detalhe.textContent = selecionados.length
      ? selecionados.length + ' treinamento' + (selecionados.length > 1 ? 's' : '') + ' · ' + _PROPOSTA_LABELS[pagamento]
      : 'Nenhum treinamento selecionado';
  }
}

function _propostaPreview(){
  var cliente = document.getElementById('propostaCliente').value;
  var pagamento = document.getElementById('propostaPagamento').value;
  var pagLabel = _PROPOSTA_LABELS[pagamento];
  var selecionados = [];
  var container = document.getElementById('propostaTreinamentos');
  if(container) container.querySelectorAll('input[type=checkbox]').forEach(function(chk){
    if(!chk.checked) return;
    var nome = chk.id.replace('prop_','');
    var inp = document.getElementById('propval_'+nome);
    selecionados.push({nome:nome, val:inp?parseVal(inp.value):0});
  });
  var total = selecionados.reduce(function(a,s){return a+s.val;},0);
  var consultor = document.getElementById('propostaConsultorDisplay') ? document.getElementById('propostaConsultorDisplay').textContent : '';
  var fonte = parseInt(document.getElementById('propFonte').value)||10;
  var padding = parseInt(document.getElementById('propPadding').value)||4;
  var corH = document.getElementById('propCorHeader').value||'#0f0f0f';
  var corA = document.getElementById('propCorAccent').value||'#c8f05a';
  var validade = document.getElementById('propValidade').value||'30';

  // Gerar HTML de preview
  var rows = selecionados.map(function(s){
    return '<tr><td style="padding:'+padding+'px 10px;font-weight:600;font-size:'+fonte+'pt;">'+s.nome+'</td>'
          +'<td style="padding:'+padding+'px 10px;text-align:center;font-size:'+fonte+'pt;">'+pagLabel+'</td>'
          +'<td style="padding:'+padding+'px 10px;text-align:right;font-weight:700;font-size:'+fonte+'pt;color:#1a6b2e;">'+formatVal(s.val)+'</td></tr>';
  }).join('');

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    +'<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:helvetica,sans-serif;background:#f4f4f4;padding:20px;}'
    +'.doc{background:#fff;max-width:700px;margin:auto;box-shadow:0 2px 12px rgba(0,0,0,.15);}'
    +'.header{background:'+corH+';padding:24px 28px;position:relative;border-left:6px solid '+corA+';}'
    +'.header h1{color:'+corA+';font-size:20pt;margin-bottom:4px;}'
    +'.header p{color:#aaa;font-size:'+fonte+'pt;}'
    +'.section{padding:20px 28px;}'
    +'.cliente-box{background:#f0f7f0;border:1px solid #2e7d32;border-radius:6px;padding:12px 16px;margin-bottom:16px;}'
    +'.cliente-box .label{font-size:9pt;color:#555;margin-bottom:4px;}'
    +'.cliente-box .nome{font-size:14pt;font-weight:700;color:#111;}'
    +'.info-row{display:flex;gap:20px;margin-bottom:16px;}'
    +'.info-item{flex:1;}'
    +'.info-item .label{font-size:9pt;color:#888;}'
    +'.info-item .val{font-size:11pt;font-weight:600;color:#111;}'
    +'table{width:100%;border-collapse:collapse;}'
    +'thead tr{background:#2e7d32;}'
    +'thead th{color:#fff;padding:'+padding+'px 10px;text-align:left;font-size:'+fonte+'pt;}'
    +'thead th:last-child{text-align:right;}'
    +'thead th:nth-child(2){text-align:center;}'
    +'tbody tr:nth-child(even){background:#f8fdf8;}'
    +'tbody tr{border-bottom:1px solid #e0e0e0;}'
    +'.total-bar{background:'+corH+';padding:12px 28px;display:flex;justify-content:space-between;align-items:center;}'
    +'.total-bar .label{color:#aaa;font-size:10pt;}'
    +'.total-bar .val{color:'+corA+';font-size:16pt;font-weight:700;}'
    +'.footer{padding:16px 28px;font-size:9pt;color:#888;border-top:1px solid #eee;display:flex;justify-content:space-between;}'
    +'</style></head><body>'
    +'<div class="doc">'
    +'<div class="header"><h1>PROPOSTA COMERCIAL</h1>'
    +'<p>Inteligência Financeira Febrace &nbsp;·&nbsp; '+new Date().toLocaleDateString('pt-BR')+'</p></div>'
    +'<div class="section">'
    +'<div class="cliente-box"><div class="label">CLIENTE</div><div class="nome">'+(cliente||'—')+'</div></div>'
    +'<div class="info-row">'
    +'<div class="info-item"><div class="label">CONSULTOR</div><div class="val">'+consultor+'</div></div>'
    +'<div class="info-item"><div class="label">PAGAMENTO</div><div class="val">'+pagLabel+'</div></div>'
    +'<div class="info-item"><div class="label">VALIDADE</div><div class="val">'+validade+' dias</div></div>'
    +'</div>'
    +'<div style="margin:16px 0;padding:14px 16px;background:#f9fdf9;border-left:4px solid #2e7d32;border-radius:0 6px 6px 0;">'
    +'<p style="font-size:'+fonte+'pt;color:#333;line-height:1.7;white-space:pre-line;">'+_PROPOSTA_TEXTO+'</p>'
    +'</div>'
    +'<table><thead><tr><th>Treinamento</th><th>Forma de Pagamento</th><th>Valor</th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table>'
    +'</div>'
    +'<div class="total-bar"><span class="label">TOTAL DA PROPOSTA</span><span class="val">'+formatVal(total)+'</span></div>'
    +'<div class="footer"><span>Esta proposta é válida por '+validade+' dias a partir da emissão.</span><span>Febrace · Inteligência Financeira</span></div>'
    +'</div></body></html>';

  var frame = document.getElementById('propostaPreviewFrame');
  var ph = document.getElementById('propostaPreviewPlaceholder');
  frame.srcdoc = html;
  frame.style.display = 'block';
  if(ph) ph.style.display = 'none';
}

function gerarPropostaPDF(){
  var cliente = document.getElementById('propostaCliente').value;
  if(!cliente){_showToast('⚠️ Selecione um cliente.','var(--amber)');return;}

  var pagamento = document.getElementById('propostaPagamento').value;
  var pagLabel = _PROPOSTA_LABELS[pagamento];
  var selecionados = [];
  var container = document.getElementById('propostaTreinamentos');
  container.querySelectorAll('input[type=checkbox]').forEach(function(chk){
    if(!chk.checked) return;
    var nome = chk.id.replace('prop_', '');
    var inp = document.getElementById('propval_' + nome);
    var val = inp ? parseVal(inp.value) : 0;
    selecionados.push({nome: nome, val: val});
  });

  if(!selecionados.length){_showToast('⚠️ Selecione ao menos um treinamento.','var(--amber)');return;}
  if(typeof window.jspdf === 'undefined'){
    if(typeof window._ensureJsPDF==='function'){
      _showToast('⏳ Preparando gerador de PDF (primeira vez)…','var(--muted)');
      window._ensureJsPDF().then(gerarPropostaPDF).catch(function(){
        _showToast('❌ Erro ao carregar jsPDF.','var(--red)');
      });
      return;
    }
    _showToast('❌ jsPDF não carregado.','var(--red)');return;
  }

  var total = selecionados.reduce(function(a,s){return a+s.val;},0);
  // Ler ajustes visuais
  var _fonte = parseInt(document.getElementById('propFonte').value)||10;
  var _pad   = parseInt(document.getElementById('propPadding').value)||4;
  var _corH  = document.getElementById('propCorHeader').value||'#0f0f0f';
  var _corA  = document.getElementById('propCorAccent').value||'#c8f05a';
  var _valid = document.getElementById('propValidade').value||'30';
  var _consultor = document.getElementById('propostaConsultorDisplay').textContent||'';

  function _hexRgb(hex){
    var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return [r,g,b];
  }
  var rgbH = _hexRgb(_corH);
  var rgbA = _hexRgb(_corA);

  var doc = new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  var W = 210, mg = 20;

  // Cabeçalho
  doc.setFillColor.apply(doc,rgbH);
  doc.rect(0,0,W,36,'F');
  doc.setFillColor.apply(doc,rgbA);
  doc.rect(0,0,5,36,'F');
  doc.setTextColor.apply(doc,rgbA);
  doc.setFontSize(18);doc.setFont('helvetica','bold');
  doc.text('PROPOSTA COMERCIAL',mg+2,15);
  doc.setFontSize(_fonte-1);doc.setFont('helvetica','normal');
  doc.setTextColor(180,180,180);
  doc.text('Inteligência Financeira Febrace · '+new Date().toLocaleDateString('pt-BR'),mg+2,23);
  doc.text('Forma de pagamento: '+pagLabel,mg+2,29);

  // Info: Cliente + Consultor
  var y = 44;
  doc.setFillColor(240,247,235);
  doc.rect(mg,y,W-mg*2,16,'F');
  doc.setDrawColor(46,139,87);doc.setLineWidth(0.4);
  doc.rect(mg,y,W-mg*2,16,'S');
  doc.setTextColor(80,80,80);doc.setFontSize(_fonte-2);doc.setFont('helvetica','normal');
  doc.text('CLIENTE',mg+4,y+5);
  doc.setTextColor(15,15,15);doc.setFontSize(_fonte+2);doc.setFont('helvetica','bold');
  doc.text(cliente.toUpperCase(),mg+4,y+12);
  // Consultor à direita
  doc.setTextColor(80,80,80);doc.setFontSize(_fonte-2);doc.setFont('helvetica','normal');
  doc.text('CONSULTOR',W-mg-40,y+5);
  doc.setTextColor(15,15,15);doc.setFontSize(_fonte);doc.setFont('helvetica','bold');
  doc.text(_consultor,W-mg-40,y+12);
  y += 24;

  // Texto da proposta
  doc.setTextColor(60,60,60);
  doc.setFontSize(_fonte-1);
  doc.setFont('helvetica','normal');
  var _linhasTexto = doc.splitTextToSize(_PROPOSTA_TEXTO, W-mg*2);
  doc.text(_linhasTexto, mg, y);
  y += _linhasTexto.length * (_fonte-1) * 0.38 + 6;

  // Tabela de treinamentos
  doc.autoTable({
    startY: y,
    head: [['Treinamento', 'Forma de Pagamento', 'Valor']],
    body: selecionados.map(function(s){
      return [s.nome, pagLabel, formatVal(s.val)];
    }),
    margin:{left:mg,right:mg},
    styles:{fontSize:_fonte,cellPadding:_pad,halign:'center'},
    headStyles:{fillColor:[46,139,87],textColor:[255,255,255],fontStyle:'bold',fontSize:_fonte,halign:'center'},
    columnStyles:{
      0:{cellWidth:80,halign:'left',fontStyle:'bold'},
      1:{cellWidth:60,halign:'center'},
      2:{cellWidth:30,halign:'right',fontStyle:'bold'}
    },
    theme:'grid',
    alternateRowStyles:{fillColor:[248,252,248]},
  });

  y = doc.lastAutoTable.finalY + 6;

  // Total
  doc.setFillColor.apply(doc,rgbH);
  doc.rect(mg,y,W-mg*2,13,'F');
  doc.setTextColor(180,180,180);doc.setFontSize(_fonte-1);doc.setFont('helvetica','normal');
  doc.text('TOTAL DA PROPOSTA',mg+4,y+8);
  doc.setTextColor.apply(doc,rgbA);
  doc.setFontSize(_fonte+3);doc.setFont('helvetica','bold');
  doc.text(formatVal(total),W-mg-2,y+9,{align:'right'});
  y += 20;

  // Rodapé
  doc.setTextColor(150,150,150);doc.setFontSize(_fonte-2);doc.setFont('helvetica','normal');
  doc.text('Esta proposta é válida por '+_valid+' dias a partir da data de emissão.',mg,y);
  doc.text('Febrace · Inteligência Financeira',W-mg,y,{align:'right'});

  fecharPropostaModal();
  doc.save('proposta-'+cliente.toLowerCase().replace(/\s+/g,'-')+'-'+new Date().toISOString().slice(0,10)+'.pdf');
  _showToast('✅ Proposta gerada para '+cliente+'!','var(--accent)');
  if(typeof _addPendLog==='function') _addPendLog('Proposta gerada','Cliente: '+cliente+' · '+selecionados.length+' treinamentos','📋');
}

/* ============================================================
   PROPOSTA PERSONALIZADA POR PRODUTO
============================================================ */

/* ============================================================
   ORDENAÇÃO DE CARDS POR DRAG-AND-DROP (ADM)
============================================================ */
var _PRODUTOS_ORDEM_KEY = 'ci_produtos_ordem';

function _getProdutosOrdem(){
  try{
    var saved = localStorage.getItem(_PRODUTOS_ORDEM_KEY);
    if(saved){
      var arr = JSON.parse(saved);
      // Garantir que novos produtos sejam incluídos no final
      var todos = Object.keys(_PRODUTOS_PROPOSTA);
      todos.forEach(function(cod){ if(arr.indexOf(cod)===-1) arr.push(cod); });
      // Remover códigos que não existem mais
      arr = arr.filter(function(cod){ return _PRODUTOS_PROPOSTA[cod]; });
      return arr;
    }
  }catch(e){}
  return Object.keys(_PRODUTOS_PROPOSTA);
}

function _saveProdutosOrdem(arr){
  try{ localStorage.setItem(_PRODUTOS_ORDEM_KEY, JSON.stringify(arr)); }catch(e){}
}

function _isAdm(){
  var sess = typeof _getSessao === 'function' ? _getSessao() : null;
  return !sess || sess.perfil === 'adm';
}

var _dragSrcCod = null;


var _modoReordenar = false;

function _toggleReordenar(){
  _modoReordenar = true;
  document.getElementById('btnReordenar').style.display = 'none';
  document.getElementById('btnSalvarOrdem').style.display = 'inline-block';
  document.getElementById('btnResetOrdem').style.display = 'inline-block';
  var dica = document.getElementById('produtoPropDica');
  if(dica) dica.textContent = 'Arraste os cards para reordenar';
  _renderProdutoPropCardsOrdenado(true);
}

function _finalizarReordenar(){
  _modoReordenar = false;
  document.getElementById('btnReordenar').style.display = 'inline-block';
  document.getElementById('btnSalvarOrdem').style.display = 'none';
  document.getElementById('btnResetOrdem').style.display = 'none';
  var dica = document.getElementById('produtoPropDica');
  if(dica) dica.textContent = 'Clique no card para gerar';
  _renderProdutoPropCardsOrdenado(false);
}

function _resetOrdem(){
  if(!confirm('Resetar a ordem para o padrão original?')) return;
  try{ localStorage.removeItem('ci_produtos_ordem'); }catch(e){}
  _finalizarReordenar();
  _showToast('✅ Ordem resetada','var(--accent)');
}

function _buildCard(cod, dragMode){
  var p = _PRODUTOS_PROPOSTA[cod];
  var imgStyle = p.img
    ? (function(){
      var posMap={'JE':'center 45%','MAESTRIA':'center 50%','DP':'center 45%','CIS_GLOBAL':'center 20%','TEAM':'center 50%'};
      var pos=posMap[cod]||'center 5%';
      return 'background-image:url('+p.img+');background-size:115%;background-position:'+pos+';';
    })()
    : 'background:var(--surface2);';

  var dragAttrs = dragMode
    ? ' draggable="true" data-cod="'+cod+'"'
    : '';
  var hoverEvents = dragMode ? '' :
    ' onmouseover="this.style.transform=\'translateY(-5px) scale(1.02)\';this.style.boxShadow=\'0 12px 40px rgba(200,240,90,.18)\';this.style.borderColor=\'#c8f05a55\';this.querySelector(\'.gp-btn\').style.background=\'#c8f05a\';this.querySelector(\'.gp-btn\').style.color=\'#0a150a\'"'
    +' onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\';this.style.borderColor=\'#1a2a1a\';this.querySelector(\'.gp-btn\').style.background=\'#0a150a\';this.querySelector(\'.gp-btn\').style.color=\'#fff\'"';
  var clickAttr = dragMode ? '' : ' onclick="abrirPropProd(\''+cod+'\')"';
  var cursor = dragMode ? 'grab' : 'pointer';
  var extraStyle = dragMode ? 'opacity:.95;' : '';
  var dragHandle = dragMode
    ? '<div style="position:absolute;top:7px;right:7px;background:rgba(0,0,0,.5);border-radius:4px;padding:3px 5px;cursor:grab;" title="Arrastar para reordenar">'
      +'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="3" cy="3" r="1.2" fill="#c8f05a"/><circle cx="9" cy="3" r="1.2" fill="#c8f05a"/><circle cx="3" cy="6" r="1.2" fill="#c8f05a"/><circle cx="9" cy="6" r="1.2" fill="#c8f05a"/><circle cx="3" cy="9" r="1.2" fill="#c8f05a"/><circle cx="9" cy="9" r="1.2" fill="#c8f05a"/></svg>'
      +'</div>'
    : '';

  return '<div'+dragAttrs+clickAttr+hoverEvents+' style="cursor:'+cursor+';border-radius:12px;overflow:hidden;border:1px solid #1a2a1a;background:#111;transition:transform .3s,box-shadow .3s,border-color .3s;'+extraStyle+'">'
    +'<div style="'+imgStyle+'height:140px;position:relative;overflow:hidden;">'
    +'<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.3) 55%,transparent 100%);"></div>'
    +'<div style="position:absolute;top:7px;left:7px;background:rgba(200,240,90,.18);border:1px solid rgba(200,240,90,.35);border-radius:4px;font-size:8px;font-weight:700;color:#c8f05a;padding:2px 6px;letter-spacing:.06em;">'+cod+'</div>'
    + dragHandle
    +'<div style="position:absolute;bottom:10px;left:0;right:0;padding:0 10px;"><div style="font-size:11px;font-weight:700;color:#fff;line-height:1.3;">'+p.nome+'</div></div>'
    +'</div>'
    +'<div class="gp-btn" style="padding:7px 10px;background:#0a150a;text-align:center;font-size:10px;font-weight:600;color:#fff;letter-spacing:.04em;border-top:1px solid rgba(200,240,90,.15);transition:background .25s,color .25s;">'
    +(dragMode ? '<span style="color:rgba(200,240,90,.4);font-size:9px;">☰ segurar para mover</span>' : 'Gerar Proposta')
    +'</div>'
    +'</div>';
}

function _renderProdutoPropCardsOrdenado(dragMode){
  var grid = document.getElementById('produtoPropCards');
  if(!grid) return;
  var ordem = _getProdutosOrdem();
  grid.innerHTML = ordem.map(function(cod){ return _buildCard(cod, dragMode); }).join('');
  if(dragMode) _attachDragEvents(grid);
}

function _attachDragEvents(grid){
  var cards = grid.querySelectorAll('[draggable="true"]');
  cards.forEach(function(card){
    card.addEventListener('dragstart', function(e){
      _dragSrcCod = this.dataset.cod;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(function(){ card.style.opacity='0.4'; }, 0);
    });
    card.addEventListener('dragend', function(){
      card.style.opacity='';
      grid.querySelectorAll('[draggable="true"]').forEach(function(c){
        c.style.border='1px solid #1a2a1a';
        c.style.transform='';
      });
    });
    card.addEventListener('dragover', function(e){
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if(this.dataset.cod !== _dragSrcCod){
        this.style.border='1px solid #c8f05a88';
        this.style.transform='scale(1.03)';
      }
    });
    card.addEventListener('dragleave', function(){
      this.style.border='1px solid #1a2a1a';
      this.style.transform='';
    });
    card.addEventListener('drop', function(e){
      e.preventDefault();
      var destCod = this.dataset.cod;
      if(_dragSrcCod && destCod && _dragSrcCod !== destCod){
        var ordem = _getProdutosOrdem();
        var srcIdx = ordem.indexOf(_dragSrcCod);
        var dstIdx = ordem.indexOf(destCod);
        if(srcIdx > -1 && dstIdx > -1){
          ordem.splice(srcIdx, 1);
          ordem.splice(dstIdx, 0, _dragSrcCod);
          _saveProdutosOrdem(ordem);
          _renderProdutoPropCardsOrdenado(true);
          _showToast('✅ Ordem salva!','var(--accent)');
        }
      }
    });
  });
}

var _propProdAtual = null;

function _renderProdutoPropCards(){
  _renderProdutoPropCardsOrdenado(false);
  // Botão reordenar visível só para ADM
  var btnRow = document.getElementById('produtoPropBtnRow');
  if(btnRow) btnRow.style.display = _isAdm() ? 'flex' : 'none';
}
function _renderProdutoPropCards_UNUSED(){
  var grid = document.getElementById('produtoPropCards');
  if(!grid) return;
  grid.innerHTML = Object.keys(_PRODUTOS_PROPOSTA).map(function(cod){
    var p = _PRODUTOS_PROPOSTA[cod];
    var imgStyle = p.img
      ? (function(){
      var posMap={'JE':'center 45%','MAESTRIA':'center 50%','DP':'center 45%','CIS_GLOBAL':'center 20%','TEAM':'center 50%'};
      var pos=posMap[cod]||'center 5%';
      return 'background-image:url('+p.img+');background-size:115%;background-position:'+pos+';';
    })()
      : 'background:var(--surface2);';
    return '<div onclick="abrirPropProd(\''+cod+'\')" style="cursor:pointer;border-radius:12px;overflow:hidden;border:1px solid #1a2a1a;background:#111;transition:transform .3s,box-shadow .3s,border-color .3s;" onmouseover="this.style.transform=\'translateY(-5px) scale(1.02)\';this.style.boxShadow=\'0 12px 40px rgba(200,240,90,.18)\';this.style.borderColor=\'#c8f05a55\';this.querySelector(\'.gp-btn\').style.background=\'#c8f05a\';this.querySelector(\'.gp-btn\').style.color=\'#0a150a\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\';this.style.borderColor=\'#1a2a1a\';this.querySelector(\'.gp-btn\').style.background=\'#0a150a\';this.querySelector(\'.gp-btn\').style.color=\'#fff\'">'
      +'<div style="'+imgStyle+'height:140px;position:relative;overflow:hidden;">'
      +'<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.3) 55%,transparent 100%);"></div>'
      +'<div style="position:absolute;top:7px;left:7px;background:rgba(200,240,90,.18);border:1px solid rgba(200,240,90,.35);border-radius:4px;font-size:8px;font-weight:700;color:#c8f05a;padding:2px 6px;letter-spacing:.06em;">'+cod+'</div>'
      +'<div style="position:absolute;bottom:10px;left:0;right:0;padding:0 10px;"><div style="font-size:11px;font-weight:700;color:#fff;line-height:1.3;">'+p.nome+'</div></div>'
      +'</div>'
      +'<div class="gp-btn" style="padding:7px 10px;background:#0a150a;text-align:center;font-size:10px;font-weight:600;color:#fff;letter-spacing:.04em;border-top:1px solid rgba(200,240,90,.15);transition:background .25s,color .25s;">Gerar Proposta</div>'
      +'</div>';
  }).join('');
}

function abrirPropProd(codigo){
  _propProdAtual = codigo;
  var p = _PRODUTOS_PROPOSTA[codigo];
  if(!p) return;
  if(p.customRenderer && window.PropostaRenderer && window.PropostaRenderer.tem(codigo)){ window.PropostaRenderer.abrir(codigo); return; }

  document.getElementById('propProdTitulo').textContent = p.nome;
  document.getElementById('propProdSub').textContent = 'Personalize a proposta para o cliente.';
  document.getElementById('propProdPreco').value = p.preco;
  document.getElementById('propProdValidade').value = '30';
  document.getElementById('propProdClienteManual').value = '';

  // Popular clientes da turma
  var sel = document.getElementById('propProdCliente');
  var sess = _getSessao ? _getSessao() : null;
  var isAdm = !sess || sess.perfil === 'adm';
  sel.innerHTML = '<option value="">Selecione ou digite abaixo</option>';
  var clientes = data && data.length
    ? (isAdm
        ? [...new Set(data.map(function(d){return d.cliente;}))]
        : [...new Set(data.filter(function(d){return d.consultor.toUpperCase()===(sess.vinculo||'').toUpperCase();}).map(function(d){return d.cliente;}))])
    : [];
  clientes.sort().forEach(function(c){
    var opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  });

  // Consultor
  var nomeConsultor = isAdm ? 'ADM' : (sess && sess.vinculo ? sess.vinculo.toUpperCase() : (sess && sess.nome ? sess.nome.toUpperCase() : '—'));
  document.getElementById('propProdConsultor').textContent = nomeConsultor;

  document.getElementById('propProdOverlay').classList.add('open');
}

function fecharPropProd(){
  document.getElementById('propProdOverlay').classList.remove('open');
  _propProdAtual = null;
}

function gerarPropostaProduto(){
  // Helper local para escape HTML (prevenir XSS via dados de cliente/consultor)
  function _escHtml(s){ return window._esc(s); }
  var p = _PRODUTOS_PROPOSTA[_propProdAtual];
  if(!p){ _showToast('❌ Produto não encontrado.','var(--red)'); return; }

  var clienteSel = document.getElementById('propProdCliente').value;
  var clienteManual = document.getElementById('propProdClienteManual').value.trim().toUpperCase();
  var cliente = clienteManual || clienteSel;
  if(!cliente){ _showToast('⚠️ Informe o nome do cliente.','var(--amber)'); return; }

  var preco = document.getElementById('propProdPreco').value || p.preco;
  var validade = document.getElementById('propProdValidade').value || '30';
  var consultor = document.getElementById('propProdConsultor').textContent || '—';

  // WhatsApp do consultor
  var sess = _getSessao ? _getSessao() : null;
  var wpp = '';
  if(sess && sess.uid){
    var localU = _getUsuariosLocal();
    wpp = (localU[sess.uid] && localU[sess.uid].whatsapp) || '';
  }
  var wppLink = wpp ? 'https://wa.me/55'+wpp : '#';

  // Texto personalizado
  var texto = p.texto
    .replace('[NOME_CLIENTE]', cliente)
    .replace('[TEXTO_DO_PRODUTO]', '[Texto de apresentação do '+p.nome+' — edite conforme o PDF do produto]');

  // Gerar HTML
  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proposta — '+_escHtml(p.nome)+'</title>'
    +'<style>'
    +'*{box-sizing:border-box;margin:0;padding:0;}'
    +'body{font-family:\'Segoe UI\',sans-serif;background:#0a0a0a;color:#f0f0f0;min-height:100vh;}'
    +'.hero{width:100%;max-height:60vh;object-fit:cover;display:block;}'
    +'.container{max-width:600px;margin:0 auto;padding:28px 20px 60px;}'
    +'.badge{display:inline-block;background:rgba(200,240,90,.15);color:#c8f05a;border:1px solid rgba(200,240,90,.3);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:16px;}'
    +'.titulo{font-size:28px;font-weight:800;color:#fff;margin-bottom:6px;line-height:1.2;}'
    +'.subtitulo{font-size:14px;color:#888;margin-bottom:24px;}'
    +'.cliente-box{background:#111;border:1px solid #222;border-radius:12px;padding:18px 20px;margin-bottom:24px;}'
    +'.cliente-label{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;}'
    +'.cliente-nome{font-size:20px;font-weight:700;color:#c8f05a;}'
    +'.texto{font-size:15px;color:#ccc;line-height:1.8;white-space:pre-line;margin-bottom:28px;}'
    +'.preco-titulo{font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;}'
    +'.preco-table{width:100%;border-collapse:collapse;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;margin-bottom:24px;}'
    +'.preco-table th{font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.06em;padding:10px 14px;background:#0d0d0d;border-bottom:1px solid #222;text-align:left;}'
    +'.preco-table td{padding:10px 14px;font-size:14px;font-weight:600;color:#f0f0f0;border-bottom:1px solid #1a1a1a;}'
    +'.preco-table tr:last-child td{border-bottom:none;}'
    +'.preco-table td.val{color:#c8f05a;font-size:16px;font-weight:800;text-align:right;}'
    +'.preco-table tr.destaque td{background:rgba(200,240,90,.06);}'
    +'.validade{font-size:12px;color:#555;margin-bottom:24px;}'
    +'.wpp-btn{display:block;width:100%;background:#25d366;color:#fff;border:none;border-radius:12px;padding:16px;font-size:16px;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;margin-bottom:16px;}'
    +'.consultor-box{text-align:center;font-size:12px;color:#444;padding-top:16px;border-top:1px solid #1a1a1a;}'
    +'</style>'
    +'</head><body>'
    +'<img class="hero" src="'+_escHtml(p.img)+'" alt="'+_escHtml(p.nome)+'" />'
    +'<div class="container">'
    +'<div class="badge">Proposta Personalizada</div>'
    +'<div class="titulo">'+_escHtml(p.nome)+'</div>'
    +'<div class="subtitulo">Febracis · Escola de Negócios</div>'
    +'<div class="cliente-box">'
    +'<div class="cliente-label">Para</div>'
    +'<div class="cliente-nome">'+_escHtml(cliente)+'</div>'
    +'</div>'
    +'<div class="texto">'+_escHtml(texto)+'</div>'
    +(function(){
      var pc = _PROPOSTA_PRECOS[_propProdAtual];
      var fmtR = function(v){ return v==null ? '—' : 'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
      if(!pc) return '<div style="font-size:14px;color:#c8f05a;margin-bottom:24px;">'+_escHtml(preco)+'</div>';
      var linhas = [
        {k:'integral',      label:'Integral',             destaque:false},
        {k:'parcelado',     label:'12x (mensal)',          destaque:false},
        {k:'parcelado_desc',label:'12x c/ desconto (total)',destaque:true},
        {k:'avista_credito',label:'À Vista no crédito',    destaque:false},
        {k:'avista',        label:'À Vista',               destaque:true},
        {k:'reciclagem',    label:'Reciclagem 50%',        destaque:false},
      ];
      var rows = linhas.filter(function(l){ return pc[l.k]!=null; }).map(function(l){
        return '<tr'+(l.destaque?' class="destaque"':'')+'>'+
          '<td>'+l.label+'</td>'+
          '<td class="val">'+fmtR(pc[l.k])+'</td>'+
          '</tr>';
      }).join('');
      return '<div class="preco-titulo">Condições de Pagamento</div>'+
        '<table class="preco-table"><thead><tr><th>Modalidade</th><th style="text-align:right;">Valor</th></tr></thead>'+
        '<tbody>'+rows+'</tbody></table>';
    })()
    +'<div class="validade">Proposta válida por '+_escHtml(validade)+' dias</div>'
    +(wpp ? '<a class="wpp-btn" href="'+_escHtml(wppLink)+'" target="_blank">Falar com '+_escHtml(consultor)+' no WhatsApp</a>' : '')
    +'<div class="consultor-box">Proposta apresentada por <strong>'+_escHtml(consultor)+'</strong> · Febracis</div>'
    +'</div>'
    +'</body></html>';

  // Abrir preview
  window._ppHtml = html;
  window._ppNomeArquivo = 'proposta-'+_propProdAtual.toLowerCase()+'-'+cliente.toLowerCase().replace(/\s+/g,'-')+'.html';
  window._ppBlobUrl = null;

  var blob = new Blob([html], {type:'text/html'});
  var url = URL.createObjectURL(blob);
  window._ppBlobUrl = url;

  var iframe = document.getElementById('ppIframe');
  iframe.src = url;
  document.getElementById('ppLinkInput').value = url;
  document.getElementById('ppPreviewTitulo').textContent = 'Proposta — '+p.nome+' · '+cliente;

  var ov = document.getElementById('propProdPreviewOverlay');
  ov.style.display = 'flex';

  fecharPropProd();
  _showToast('✅ Proposta gerada para '+cliente+'!','var(--accent)');
  if(typeof _addPendLog==='function') _addPendLog('Proposta HTML gerada',cliente+' · '+p.nome,'📄');
}

function fecharPreviewPropProd(){
  var ov = document.getElementById('propProdPreviewOverlay');
  ov.style.display = 'none';
  document.getElementById('ppIframe').src = 'about:blank';
  if(window._ppBlobUrl){ URL.revokeObjectURL(window._ppBlobUrl); window._ppBlobUrl = null; }
}

function ppBaixar(){
  if(!window._ppHtml) return;
  var blob = new Blob([window._ppHtml], {type:'text/html'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = window._ppNomeArquivo || 'proposta.html';
  a.click();
  URL.revokeObjectURL(url);
}

function ppAbrirAba(){
  if(window._ppBlobUrl) window.open(window._ppBlobUrl, '_blank');
}

function ppCopiarLink(){
  var link = document.getElementById('ppLinkInput').value;
  if(!link) return;
  navigator.clipboard.writeText(link).then(function(){
    _showToast('🔗 Link copiado! Válido nesta sessão do navegador.','var(--accent)');
  }).catch(function(){
    document.getElementById('ppLinkInput').select();
    document.execCommand('copy');
    _showToast('🔗 Link copiado!','var(--accent)');
  });
}

function ppCopiarHtml(){
  if(!window._ppHtml) return;
  navigator.clipboard.writeText(window._ppHtml).then(function(){
    _showToast('📋 HTML copiado para a área de transferência!','var(--accent)');
  }).catch(function(){
    _showToast('❌ Não foi possível copiar.','var(--red)');
  });
}

/* ── Fix 4: Impedir fechamento de modais ao clicar fora ── */
(function _fixModalClick(){
  var ids=['novoUsuarioOverlay','alterarSenhaOverlay','primeiroAcessoOverlay',
           'usuariosOverlay','permsModalOverlay','novaTurmaOverlay'];
  function _bind(){
    ids.forEach(function(id){
      var el=document.getElementById(id);
      if(el&&!el._fixClick){
        el._fixClick=true;
        el.addEventListener('click',function(e){
          if(e.target===el) e.stopPropagation();
        });
      }
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',_bind);
  } else {
    _bind();
  }
})();
