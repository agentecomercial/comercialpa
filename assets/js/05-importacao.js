/* ════════════════════════════════════════════════════════════════
   IMPORTAÇÃO v3 — variável global para que confirmar() a acesse
════════════════════════════════════════════════════════════════ */

// ── VARIÁVEL GLOBAL (requisito explícito do spec) ──────────────
var dadosImportacao = [];
var _impUltimoRes   = null;  // guarda o res completo para re-renders de checkbox
var _impProcessando = false; // guard contra duplo processamento do arquivo

// ── Aliases de colunas ─────────────────────────────────────────
var IMP_ALIASES = {
  cliente:     ['cliente','nome','cliente_nome','nome_do_cliente','aluno','name','nome completo','nome_completo'],
  treinamento: ['treinamento','curso','produto','product','course','nome_curso','nome da venda','nome_da_venda'],
  consultor:   ['utm_gclid','consultor','responsavel','responsável','vendedor','sales'],
  valor:       ['valor','preco','preço','total','value','price','valor_total','investimento'],
  status:      ['status','situacao','situação','state','status_pagamento'],
  entrada:     ['entrada','sinal','down_payment','entrada_valor','valor_entrada'],
  acao:        ['acao','ação','observacao','observação','obs','nota','info','notes']
};

// Status do Onboarding — REGRA CRÍTICA
var IMP_ONBOARD_ALIASES = ['status do onboarding','status_do_onboarding','statusdoonboarding','onboarding','status_onboarding'];
var IMP_ONBOARD_OK      = 'confirmado';

// Normalização de status
var IMP_STATUS = {
  'pago':'pago','paid':'pago','recebido':'pago','quitado':'pago',
  'aberto':'aberto','open':'aberto','pendente':'aberto','em aberto':'aberto',
  'negociacao':'negociacao','negociação':'negociacao','negoc':'negociacao',
  'desistiu':'desistiu','cancelado':'desistiu','cancelou':'desistiu',
  'estorno':'estorno','devolvido':'estorno','chargeback':'estorno',
  'entrada':'entrada'
};

/* ── Chave de identidade entre imports ───────────────────────── */
function impGerarKey(cliente){
  return 'nome:' + impNorm(String(cliente||''));
}

/* ── Utilitários ─────────────────────────────────────────────── */
function impNorm(s){
  return String(s||'').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,'');
}
function impNormSpace(s){
  return String(s||'').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
}
function impParseNum(s){
  if(!s && s!==0) return 0;
  var n=parseFloat(String(s).trim().replace(/R\$\s*/,'').replace(/\./g,'').replace(',','.'));
  return isNaN(n)?0:n;
}
function impNormStatus(s){
  var k=impNorm(s);
  return IMP_STATUS[k]||IMP_STATUS[impNormSpace(s)]||'-';
}
function impEsc(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Mapear colunas do cabeçalho ─────────────────────────────── */
function impMapearColunas(headers){
  var mapa={};
  headers.forEach(function(h,i){
    var hn=impNorm(h), hs=impNormSpace(h);

    // Status do Onboarding
    if(mapa.__onboard===undefined){
      var isOnboard=IMP_ONBOARD_ALIASES.some(function(a){ return impNorm(a)===hn||impNormSpace(a)===hs; });
      if(isOnboard) mapa.__onboard=i;
    }
    // Demais campos
    Object.keys(IMP_ALIASES).forEach(function(campo){
      if(mapa[campo]!==undefined) return;
      var hit=IMP_ALIASES[campo].some(function(alias){
        return impNorm(alias)===hn||impNormSpace(alias)===hs;
      });
      if(hit) mapa[campo]=i;
    });
  });
  return mapa;
}

/* ── Processar AOA → objetos ─────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════
   CORREÇÃO DE ENCODING — 3 camadas para resolver caracteres corrompidos
   Problema: planilhas Excel/Windows salvas em CP-1252 lidas como UTF-8
   Resultado: "Ã§" → "ç", "Ã\x83" → "Ã", "NEGRI█DE" → "NEGRIGDE" limpo
══════════════════════════════════════════════════════════════════ */

/* ── Camada 2: mapa de mojibake (sequências corrompidas mais comuns) ── */
var _MOJIBAKE_MAP = [
  // Vogais acentuadas maiúsculas
  [/Ã‚/g,'Â'],[/Ã€/g,'À'],[/Ã/g,'Á'],[/Ã„/g,'Ä'],
  [/Ã‡/g,'Ç'],[/Ãˆ/g,'È'],[/Ã‰/g,'É'],[/ÃŠ/g,'Ê'],[/Ã‹/g,'Ë'],
  [/ÃŒ/g,'Ì'],[/Ã/g,'Í'],[/ÃŽ/g,'Î'],[/Ã'/g,'Ñ'],
  [/Ã'/g,'Ò'],[/Ã"/g,'Ó'],[/Ã"/g,'Ô'],[/Ã•/g,'Õ'],[/Ã–/g,'Ö'],
  [/Ã™/g,'Ù'],[/Ãš/g,'Ú'],[/Ã›/g,'Û'],[/Ãœ/g,'Ü'],
  // Vogais acentuadas minúsculas
  [/Ã¢/g,'â'],[/Ã /g,'à'],[/Ã¡/g,'á'],[/Ã¤/g,'ä'],
  [/Ã§/g,'ç'],[/Ã¨/g,'è'],[/Ã©/g,'é'],[/Ãª/g,'ê'],[/Ã«/g,'ë'],
  [/Ã¬/g,'ì'],[/Ã­/g,'í'],[/Ã®/g,'î'],[/Ã±/g,'ñ'],
  [/Ã²/g,'ò'],[/Ã³/g,'ó'],[/Ã´/g,'ô'],[/Ãµ/g,'õ'],[/Ã¶/g,'ö'],
  [/Ã¹/g,'ù'],[/Ãº/g,'ú'],[/Ã»/g,'û'],[/Ã¼/g,'ü'],
  // Casos especiais PT-BR
  [/Ã£/g,'ã'],[/Ã\x83/g,'Ã'],[/Ãƒ/g,'Ã'],
  // Caracteres de controle e caixas que aparecem como █
  [/[\u0080-\u009F]/g,''],[/\uFFFD/g,''],
  // Aspas e travessão corrompidos
  [/â€œ/g,'"'],[/â€/g,'"'],[/â€™/g,"'"],[/â€"/g,'—'],[/â€¦/g,'…'],
];

/* ── Camada 2: sanitizar texto com NFC + mapa de mojibake ── */
function _sanitizarTexto(str){
  if(!str) return str;
  var s = String(str);
  // Passo 1: normalizar composição Unicode (NFC)
  try{ s = s.normalize('NFC'); }catch(e){}
  // Passo 2: aplicar mapa de mojibake
  for(var i=0;i<_MOJIBAKE_MAP.length;i++){
    s = s.replace(_MOJIBAKE_MAP[i][0], _MOJIBAKE_MAP[i][1]);
  }
  // Passo 3: remover bytes nulos e caracteres não-imprimíveis restantes
  s = s.replace(/\0/g,'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
  return s.trim();
}

/* ── Camada 2: aplicar sanitização em todo o AOA ── */
function _sanitizarAOA(aoa){
  return aoa.map(function(row){
    return row.map(function(cell){
      if(cell===null||cell===undefined) return cell;
      if(typeof cell==='string') return _sanitizarTexto(cell);
      return cell;
    });
  });
}

/* ── Detecção de mojibake: verifica se o texto provavelmente está corrompido ── */
function _temMojibake(texto){
  // Sequências típicas de UTF-8 lido como Latin-1
  return /Ã[¡-¾]|Ã§|Ã£|â€/.test(texto);
}

function impProcessarAOA(aoa){
  if(!aoa||aoa.length<2){
    _showToast('⚠️ Planilha sem dados ou sem cabeçalho.','var(--amber)');
    return null;
  }

  // ── Camada 2: sanitizar TODO o AOA antes de processar ────────────
  // Corrige mojibake (UTF-8 lido como Latin-1 e vice-versa)
  // Ex: "Ã§" → "ç", "Ãµ" → "õ", "â€œ" → """
  aoa = _sanitizarAOA(aoa);

  // ── Camada 3: detectar linha de cabeçalho ────────────────────────
  // Planilhas exportadas de CRMs têm metadados nas primeiras linhas
  // (ex: título, filtros, data de exportação). Escaneia até 25 linhas
  // para encontrar aquela com mais colunas reconhecidas.
  (function(){
    var bestIdx = 0, bestScore = 0;
    for (var r = 0; r < Math.min(aoa.length, 25); r++) {
      var rowH = aoa[r];
      if (!rowH || rowH.length === 0) continue;
      var testMapa = impMapearColunas(rowH.map(function(h){ return String(h||''); }));
      var score = Object.keys(testMapa).length;
      if (score > bestScore) { bestScore = score; bestIdx = r; }
    }
    if (bestIdx > 0) {
      console.log('[IMPORT v3] Cabeçalho detectado na linha ' + (bestIdx + 1) + ' (score: ' + bestScore + ')');
      aoa = aoa.slice(bestIdx);
    }
  })();

  var upper  = document.getElementById('importOptMaiusculo').checked;
  var headers= aoa[0].map(function(h){ return String(h||''); });
  var mapa   = impMapearColunas(headers);
  var _isTCE = window._turmaAtiva&&(window._turmaAtiva.codigo||'').toUpperCase()==='TCE-BEL';
  /* No modo TCE: forçar coluna Promoção para treinamento */
  if(_isTCE){
    var _iPromocao=headers.findIndex(function(h){
      var hn=impNorm(h);
      return hn==='promocao'||hn==='promo'||h.toLowerCase().trim()==='promoção';
    });
    if(_iPromocao>=0) mapa.treinamento=_iPromocao;
    /* Forçar onboarding via coluna "Fase" se existir */
    if(mapa.__onboard===undefined){
      var _iFase=headers.findIndex(function(h){ return h.toLowerCase().trim()==='fase'; });
      if(_iFase>=0) mapa.__onboard=_iFase;
    }
  }

  // Log mapeamento
  console.group('[IMPORT v3] Mapeamento detectado');
  Object.keys(IMP_ALIASES).forEach(function(c){
    if(mapa[c]!==undefined) console.log('  ✅',c,'→ col',mapa[c],'"'+headers[mapa[c]]+'"');
    else                     console.log('  ⚠️',c,'→ não encontrado');
  });
  if(mapa.__onboard!==undefined) console.log('  ✅ Onboarding → col',mapa.__onboard,'"'+headers[mapa.__onboard]+'"');
  else                            console.warn('  ⚠️ Coluna "Status do Onboarding" não encontrada — todas as linhas passam pelo filtro');
  console.groupEnd();

  if(mapa.cliente===undefined){
    _showToast('❌ Coluna "cliente"/"nome" não encontrada. Verifique o cabeçalho.','var(--red)');
    return null;
  }

  function _get(row,campo){
    if(mapa[campo]===undefined) return '';
    var v=row[mapa[campo]];
    return (v===null||v===undefined)?'':String(v).trim();
  }

  var resultado=[], semNome=0, filtrado=0;

  for(var i=1;i<aoa.length;i++){
    var row=aoa[i];
    if(row.every(function(c){ return !c||String(c).trim()===''; })) continue;

    // ── REGRA CRÍTICA: Status do Onboarding = CONFIRMADO ──────
    if(mapa.__onboard!==undefined){
      var onbVal=impNorm(row[mapa.__onboard]||'');
      var onbOk=_isTCE
        ? (onbVal==='fechada'||onbVal==='aprovada'||onbVal===IMP_ONBOARD_OK)
        : onbVal===IMP_ONBOARD_OK;
      if(!onbOk){ filtrado++; continue; }
    }

    var clienteRaw=upper?_get(row,'cliente').toUpperCase():_get(row,'cliente');
    if(!clienteRaw.trim()){ semNome++; continue; }

    var treinamentoRaw=_get(row,'treinamento');
    /* Modo TCE: normalizar promoção para os 4 tipos aceitos */
    if(_isTCE&&treinamentoRaw){
      var _TCE_TIPOS=['TCE - BLACK','TCE - VIP','TCE - OURO','TCE - BRONZE'];
      var _trNorm=treinamentoRaw.toUpperCase();
      var _match=_TCE_TIPOS.find(function(t){return _trNorm.startsWith(t);});
      treinamentoRaw=_match||treinamentoRaw; /* mantém original se não bater */
    }
    resultado.push({
      cliente:     clienteRaw,
      consultor:   upper?_get(row,'consultor').toUpperCase():_get(row,'consultor'),
      treinamento: treinamentoRaw,
      valor:       impParseNum(_get(row,'valor')),
      status:      impNormStatus(_get(row,'status')),
      entrada:     impParseNum(_get(row,'entrada')),
      info:        _get(row,'acao'),
      _importKey:  impGerarKey(clienteRaw)
    });
  }

  /* debug log removido */

  return {dados:resultado, total:aoa.length-1, filtrado:filtrado, dup:0, semNome:semNome};
}

/* ── Resumo dinâmico por consultor ──────────────────────────── */
function impGerarResumoConsultores(dados){
  var mapa={};
  dados.forEach(function(d){
    var k=(d.consultor&&d.consultor.trim())?d.consultor.trim():'SEM CONSULTOR';
    mapa[k]=(mapa[k]||0)+1;
  });
  return mapa;
}

/* ── Atualizar campos editados antes de confirmar ────────────── */
function atualizarConsultoresEditados(){
  document.querySelectorAll('.imp-consultor-input').forEach(function(inp){
    var idx=parseInt(inp.dataset.index,10);
    if(!isNaN(idx)&&dadosImportacao[idx]!==undefined){
      dadosImportacao[idx].consultor=inp.value.trim();
    }
  });
}

/* ── Abrir painel de distribuição equilibrada (SEM CONSULTOR) ── */
function impAbrirDistribuicao(){
  var sem=dadosImportacao.filter(function(d){return !d.consultor||!d.consultor.trim();});
  if(!sem.length){ _showToast('Nenhum cliente sem consultor.','var(--amber)'); return; }
  var cons=typeof allConsultors!=='undefined'&&allConsultors.length
    ? allConsultors.slice()
    : Object.keys(impGerarResumoConsultores(dadosImportacao)).filter(function(k){return k!=='SEM CONSULTOR';});
  if(!cons.length){ _showToast('Nenhum consultor disponível na turma.','var(--amber)'); return; }
  var CORES=['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8','#e879f9','#4ade80'];
  var total=sem.length, n=cons.length;
  var base=Math.floor(total/n), extra=total%n;
  // Estado dos cards: excluídos e qtd
  window._impDistExcl={};
  window._impDistCons=cons;
  window._impDistTotal=total;
  function _recalcAuto(){
    var ativos=cons.filter(function(k){return !window._impDistExcl[k];});
    var na=ativos.length;
    if(!na) return;
    var ba=Math.floor(total/na), ea=total%na;
    ativos.forEach(function(k,i){
      var inp=document.getElementById('impDQt_'+cons.indexOf(k));
      if(inp) inp.value=ba+(i<ea?1:0);
    });
    _impDistAtualizarTotal();
  }
  function _impDistAtualizarTotal(){
    var soma=cons.reduce(function(a,k,i){
      if(window._impDistExcl[k]) return a;
      return a+(parseInt((document.getElementById('impDQt_'+i)||{}).value)||0);
    },0);
    var ct=document.getElementById('impDistModalCount');
    var tt=document.getElementById('impDistModalTotal');
    if(ct){ct.textContent=soma;ct.style.color=soma===total?'var(--green)':(soma>total?'var(--red)':'var(--amber)');}
    if(tt) tt.textContent=total;
  }
  // Montar cards
  var grid=document.getElementById('impDistModalGrid');
  if(grid) grid.innerHTML=cons.map(function(k,i){
    var cor=CORES[i%CORES.length];
    var ini=k.trim().charAt(0).toUpperCase();
    var bg=cor+'26';
    return '<div class="imp-cons-card" id="impDCard_'+i+'">'+
      '<div class="imp-cons-avatar" style="background:'+bg+';color:'+cor+';border:1.5px solid '+cor+'55;">'+ini+'</div>'+
      '<div class="imp-cons-nome" title="'+impEsc(k)+'">'+impEsc(k)+'</div>'+
      '<input type="number" class="imp-cons-qt" id="impDQt_'+i+'" value="'+( base+(i<extra?1:0) )+'" min="0" max="'+total+'" oninput="_impDistAtualizarTotal()">'+
      '<button class="imp-cons-x" title="Excluir da distribuição" onclick="impDistToggleExcl('+i+')">&times;</button>'+
      '</div>';
  }).join('');
  // Título e subtítulo
  var tit=document.getElementById('impDistModalTitle');
  var sub=document.getElementById('impDistModalSub');
  if(tit) tit.textContent=total+' clientes sem consultor';
  if(sub) sub.textContent='Defina quantos clientes cada consultor vai receber. Clique no × para excluir um consultor da distribuição.';
  // Rodapé
  var footer=document.getElementById('impDistModalFooter');
  if(footer) footer.innerHTML=
    '<button class="imp-dist-btn-primary" onclick="impAplicarDistribuicao()">✓ Aplicar distribuição</button>'+
    '<button class="imp-dist-btn-secondary" onclick="impDistribuirAutoModal()">↻ Equilibrar automaticamente</button>'+
    +'<button class="imp-dist-btn-cancel" onclick="impFecharDistModal()">Fechar</button>';
  // Contador inicial
  _impDistAtualizarTotal();
  // Abrir modal
  var dm=document.getElementById('impDistModal');
  if(dm) dm.classList.add('open');
  // Expor funções no escopo global
  window._impDistAtualizarTotal=_impDistAtualizarTotal;
  window._recalcAuto=_recalcAuto;
}

/* ── Equilibrar automaticamente (recalcula base/extra) ── */
function impFecharDistModal(){var dm=document.getElementById('impDistModal');if(dm)dm.classList.remove('open');}

function impDistribuirAuto(total,n){
  var base=Math.floor(total/n), extra=total%n;
  for(var i=0;i<n;i++){
    var el=document.getElementById('impDistQt_'+i);
    if(el) el.value=base+(i<extra?1:0);
  }
  var lbl=document.getElementById('impDistTotalLabel');
  if(lbl){ lbl.textContent=total; lbl.style.color='var(--green)'; }
}
/* Nova função para equilibrar no modal dedicado */
function impDistribuirAutoModal(){
  var cons=window._impDistCons||[];
  var total=window._impDistTotal||0;
  var ativos=cons.filter(function(k){return !(window._impDistExcl&&window._impDistExcl[k]);});
  var na=ativos.length;
  if(!na) return;
  var ba=Math.floor(total/na), ea=total%na;
  ativos.forEach(function(k,ai){
    var ci=cons.indexOf(k);
    var inp=document.getElementById('impDQt_'+ci);
    if(inp) inp.value=ba+(ai<ea?1:0);
  });
  if(window._impDistAtualizarTotal) window._impDistAtualizarTotal();
}

/* ── Aplicar distribuição aos dados ── */
function impAplicarDistribuicao(){
  var cons=window._impDistCons||[];
  var total=window._impDistTotal||0;
  var n=cons.length;
  var qtds=cons.map(function(k,i){
    if(window._impDistExcl&&window._impDistExcl[k]) return 0;
    return Math.max(0,parseInt((document.getElementById('impDQt_'+i)||{}).value)||0);
  });
  var soma=qtds.reduce(function(a,v){return a+v;},0);
  if(soma>total){ _showToast('A soma ('+soma+') excede os '+total+' clientes sem consultor.','var(--red)'); return; }
  var semIdx=[];
  dadosImportacao.forEach(function(d,i){ if(!d.consultor||!d.consultor.trim()) semIdx.push(i); });
  var ptr=0;
  cons.forEach(function(nome,ci){
    for(var j=0;j<qtds[ci];j++){
      if(ptr>=semIdx.length) break;
      dadosImportacao[semIdx[ptr]].consultor=nome;
      ptr++;
    }
  });
  document.getElementById('impDistModal').classList.remove('open');
  impRenderPrevia({dados:dadosImportacao,total:dadosImportacao.length,filtrado:0,dup:0,semNome:0});
  var restantes=dadosImportacao.filter(function(d){return !d.consultor||!d.consultor.trim();}).length;
  _showToast(soma+' clientes distribuídos!'+(restantes>0?' ('+restantes+' ainda sem consultor)':''),'var(--accent)');
}

/* ── Garantir que o modal de distribuição existe no DOM ── */
function _garantirImpDistModal(){
  if(document.getElementById('impDistModal')) return;
  var dm=document.createElement('div');
  dm.id='impDistModal';
  dm.setAttribute('role','dialog');
  dm.innerHTML='<div class="imp-dist-box">'
    +'<div class="imp-dist-header">'
      +'<div class="imp-dist-title" id="impDistModalTitle"></div>'
      +'<div class="imp-dist-sub" id="impDistModalSub"></div>'
    +'</div>'
    +'<div class="imp-dist-body">'
      +'<div class="imp-cons-grid" id="impDistModalGrid"></div>'
      +'<div class="imp-dist-total">Distribuindo: <span id="impDistModalCount">0</span> / <span id="impDistModalTotal">0</span> clientes</div>'
    +'</div>'
    +'<div class="imp-dist-footer" id="impDistModalFooter"></div>'
  +'</div>';
  document.body.appendChild(dm);
}

/* ── Redistribuição de sem-consultor nos dados REAIS (modal Clientes) ── */
function redistSemConsultorReal(){
  _garantirImpDistModal();
  var arr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
  var sem=arr.filter(function(d){return !d.consultor||!d.consultor.trim();});
  if(!sem.length){_showToast('Nenhum cliente sem consultor.','var(--amber)');return;}
  var cons=typeof allConsultors!=='undefined'&&allConsultors.length?allConsultors.slice():[];
  if(!cons.length){_showToast('Nenhum consultor disponível na turma.','var(--amber)');return;}
  var CORES=['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8','#e879f9','#4ade80'];
  var total=sem.length,n=cons.length;
  var base=Math.floor(total/n),extra=total%n;
  window._impDistExcl={};
  window._impDistCons=cons;
  window._impDistTotal=total;
  function _atuTotal(){
    var soma=cons.reduce(function(a,k,i){
      if(window._impDistExcl[k]) return a;
      return a+(parseInt((document.getElementById('impDQt_'+i)||{}).value)||0);
    },0);
    var ct=document.getElementById('impDistModalCount');
    var tt=document.getElementById('impDistModalTotal');
    if(ct){ct.textContent=soma;ct.style.color=soma===total?'var(--green)':(soma>total?'var(--red)':'var(--amber)');}
    if(tt) tt.textContent=total;
  }
  var grid=document.getElementById('impDistModalGrid');
  if(grid) grid.innerHTML=cons.map(function(k,i){
    var cor=CORES[i%CORES.length];
    var ini=k.trim().charAt(0).toUpperCase();
    var bg=cor+'26';
    return '<div class="imp-cons-card" id="impDCard_'+i+'">'
      +'<div class="imp-cons-avatar" style="background:'+bg+';color:'+cor+';border:1.5px solid '+cor+'55;">'+ini+'</div>'
      +'<div class="imp-cons-nome" title="'+impEsc(k)+'">'+impEsc(k)+'</div>'
      +'<input type="number" class="imp-cons-qt" id="impDQt_'+i+'" value="'+(base+(i<extra?1:0))+'" min="0" max="'+total+'" oninput="_impDistAtualizarTotal()">'
      +'<button class="imp-cons-x" title="Excluir da distribuição" onclick="impDistToggleExcl('+i+')">&times;</button>'
      +'</div>';
  }).join('');
  var tit=document.getElementById('impDistModalTitle');
  var sub=document.getElementById('impDistModalSub');
  if(tit) tit.textContent=total+' clientes sem consultor';
  if(sub) sub.textContent='Defina quantos clientes cada consultor vai receber. Clique no × para excluir um consultor da distribuição.';
  var footer=document.getElementById('impDistModalFooter');
  if(footer) footer.innerHTML=
    '<button class="imp-dist-btn-primary" onclick="redistAplicarDistribuicaoReal()">✓ Aplicar distribuição</button>'
    +'<button class="imp-dist-btn-secondary" onclick="impDistribuirAutoModal()">↻ Equilibrar automaticamente</button>'
    +'<button class="imp-dist-btn-cancel" onclick="impFecharDistModal()">Fechar</button>';
  _atuTotal();
  document.getElementById('impDistModal').classList.add('open');
  window._impDistAtualizarTotal=_atuTotal;
  window._recalcAuto=function(){
    var ativos=cons.filter(function(k){return !window._impDistExcl[k];});
    var na=ativos.length; if(!na) return;
    var ba=Math.floor(total/na),ea=total%na;
    ativos.forEach(function(k,i){var inp=document.getElementById('impDQt_'+cons.indexOf(k));if(inp)inp.value=ba+(i<ea?1:0);});
    _atuTotal();
  };
}

/* ── Aplicar redistribuição ao data[] real ── */
function redistAplicarDistribuicaoReal(){
  var arr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
  var cons=window._impDistCons||[];
  var total=window._impDistTotal||0;
  var qtds=cons.map(function(k,i){
    if(window._impDistExcl&&window._impDistExcl[k]) return 0;
    return Math.max(0,parseInt((document.getElementById('impDQt_'+i)||{}).value)||0);
  });
  var soma=qtds.reduce(function(a,v){return a+v;},0);
  if(soma>total){_showToast('A soma ('+soma+') excede os '+total+' clientes sem consultor.','var(--red)');return;}
  var semIdx=[];
  arr.forEach(function(d,i){if(!d.consultor||!d.consultor.trim()) semIdx.push(i);});
  var ptr=0;
  cons.forEach(function(nome,ci){
    for(var j=0;j<qtds[ci];j++){
      if(ptr>=semIdx.length) break;
      arr[semIdx[ptr]].consultor=nome;
      ptr++;
    }
  });
  document.getElementById('impDistModal').classList.remove('open');
  var restantes=arr.filter(function(d){return !d.consultor||!d.consultor.trim();}).length;
  _showToast(soma+' clientes distribuídos!'+(restantes>0?' ('+restantes+' ainda sem consultor)':''),'var(--accent)');
  if(typeof markUnsaved   ==='function') markUnsaved();
  if(typeof saveStorage   ==='function') saveStorage();
  if(typeof renderConsultor==='function') renderConsultor();
  if(typeof renderAll     ==='function') renderAll();
  // Atualizar botão no overlay de clientes
  var btn=document.getElementById('lcBtnDistribuir');
  if(btn){
    if(restantes>0){btn.textContent='⚖ Distribuir sem consultor ('+restantes+')';btn.style.display='';}
    else btn.style.display='none';
  }
  try{lcRenderizar('');}catch(e){}
}

/* ── Redistribuir clientes de um consultor ── */
function impAbrirRedistribuir(nomeOrig,cardEl){
  var meus=dadosImportacao.filter(function(d){ return (d.consultor||'').trim()===nomeOrig; });
  if(!meus.length){ _showToast('Nenhum cliente com este consultor.','var(--amber)'); return; }
  var CORES=['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8','#e879f9','#4ade80'];
  var cons=(typeof allConsultors!=='undefined'&&allConsultors.length
    ? allConsultors.slice()
    : Object.keys(impGerarResumoConsultores(dadosImportacao)).filter(function(k){return k!=='SEM CONSULTOR';}))
    .filter(function(k){return k!==nomeOrig;});
  if(!cons.length){ _showToast('Nenhum outro consultor disponível.','var(--amber)'); return; }
  var total=meus.length;
  window._impRedistExcl={};
  window._impRedistCons=cons;
  window._impRedistOrig=nomeOrig;
  window._impRedistTotal=total;
  function _atualizarMovendo(){
    var soma=cons.reduce(function(a,k,i){
      if(window._impRedistExcl[k]) return a;
      return a+(parseInt((document.getElementById('impRQt_'+i)||{}).value)||0);
    },0);
    var ct=document.getElementById('impDistModalCount');
    var tt=document.getElementById('impDistModalTotal');
    if(ct){ct.textContent=soma;ct.style.color=soma<=total?(soma===total?'var(--green)':'var(--amber)'):'var(--red)';}
    if(tt) tt.textContent=total;
  }
  var grid=document.getElementById('impDistModalGrid');
  if(grid) grid.innerHTML=cons.map(function(k,i){
    var cor=CORES[i%CORES.length];
    var ini=k.trim().charAt(0).toUpperCase();
    var bg=cor+'26';
    return '<div class="imp-cons-card" id="impRCard_'+i+'">'+
      '<div class="imp-cons-avatar" style="background:'+bg+';color:'+cor+';border:1.5px solid '+cor+'55;">'+ini+'</div>'+
      '<div class="imp-cons-nome" title="'+impEsc(k)+'">'+impEsc(k)+'</div>'+
      '<input type="number" class="imp-cons-qt" id="impRQt_'+i+'" value="0" min="0" max="'+total+'" oninput="_atualizarMovendo()">'+
      '<button class="imp-cons-x" title="Excluir da redistribuição" onclick="impRedistToggleExcl('+i+')">&times;</button>'+
      '</div>';
  }).join('');
  var tit=document.getElementById('impDistModalTitle');
  var sub=document.getElementById('impDistModalSub');
  if(tit) tit.innerHTML='Redistribuir clientes de <span style="color:var(--accent);">'+impEsc(nomeOrig)+'</span>';
  if(sub) sub.textContent='Defina quantos dos '+total+' clientes deste consultor serão movidos para outros.';
  var footer=document.getElementById('impDistModalFooter');
  if(footer) footer.innerHTML=
    '<button class="imp-dist-btn-primary" onclick="impAplicarRedistribuicaoModal()">✓ Aplicar redistribuição</button>'+
    +'<button class="imp-dist-btn-cancel" onclick="impFecharDistModal()">Fechar</button>';
  _atualizarMovendo();
  window._atualizarMovendo=_atualizarMovendo;
  var dm=document.getElementById('impDistModal');
  if(dm) dm.classList.add('open');
}

/* ── Aplicar redistribuição de um consultor ── */
function impAplicarRedistribuicaoModal(){
  var nomeOrig=window._impRedistOrig||'';
  var cons=window._impRedistCons||[];
  var total=window._impRedistTotal||0;
  var qtds=cons.map(function(k,i){
    if(window._impRedistExcl&&window._impRedistExcl[k]) return 0;
    return Math.max(0,parseInt((document.getElementById('impRQt_'+i)||{}).value)||0);
  });
  var soma=qtds.reduce(function(a,v){return a+v;},0);
  if(soma>total){ _showToast('Soma ('+soma+') excede os '+total+' clientes deste consultor.','var(--red)'); return; }
  var meusIdx=[];
  dadosImportacao.forEach(function(d,i){ if((d.consultor||'').trim()===nomeOrig) meusIdx.push(i); });
  var ptr=0;
  cons.forEach(function(nome,ci){
    for(var j=0;j<qtds[ci];j++){
      if(ptr>=meusIdx.length) break;
      dadosImportacao[meusIdx[ptr]].consultor=nome;
      ptr++;
    }
  });
  document.getElementById('impDistModal').classList.remove('open');
  impRenderPrevia({dados:dadosImportacao,total:dadosImportacao.length,filtrado:0,dup:0,semNome:0});
  _showToast(soma+' clientes redistribuídos!','var(--accent)');
}
/* alias para compatibilidade */
function impAplicarRedistribuicao(a,b,c){ impAplicarRedistribuicaoModal(); }

/* ── Toggle excluir consultor da distribuição ── */
function impDistToggleExcl(i){
  window._impDistExcl=window._impDistExcl||{};
  var nome=(window._impDistCons&&window._impDistCons[i])||('_idx'+i);
  var card=document.getElementById('impDCard_'+i);
  var inp=document.getElementById('impDQt_'+i);
  var isExcl=window._impDistExcl[nome];
  if(isExcl){
    delete window._impDistExcl[nome];
    if(card) card.classList.remove('excluido');
    if(inp){ inp.disabled=false; inp.value=0; }
  } else {
    window._impDistExcl[nome]=true;
    if(card) card.classList.add('excluido');
    if(inp){ inp.value=0; inp.disabled=true; }
  }
  if(window._impDistAtualizarTotal) window._impDistAtualizarTotal();
}
function impRedistToggleExcl(i){
  window._impRedistExcl=window._impRedistExcl||{};
  var nome=(window._impRedistCons&&window._impRedistCons[i])||('_idx'+i);
  var card=document.getElementById('impRCard_'+i);
  var inp=document.getElementById('impRQt_'+i);
  var isExcl=window._impRedistExcl[nome];
  if(isExcl){
    delete window._impRedistExcl[nome];
    if(card) card.classList.remove('excluido');
    if(inp){ inp.disabled=false; inp.value=0; }
  } else {
    window._impRedistExcl[nome]=true;
    if(card) card.classList.add('excluido');
    if(inp){ inp.value=0; inp.disabled=true; }
  }
  if(window._atualizarMovendo) window._atualizarMovendo();
}

/* ── Renderizar prévia no modal ─────────────────────────────── */
function impRenderPrevia(res){
  // ── Atribuição GLOBAL (requisito do spec) ──────────────────
  _impUltimoRes = res;
  dadosImportacao = res.dados;

  // Atualizar contador no botão
  document.getElementById('importQtdSpan').textContent = dadosImportacao.length;
  document.getElementById('importBtnConfirmar').disabled = dadosImportacao.length===0;
  document.getElementById('importBtnConfirmar').style.opacity = dadosImportacao.length?'1':'.4';

  // ── STATS: fixos + dinâmicos por consultor ─────────────────
  var resumoConsultores = impGerarResumoConsultores(dadosImportacao);
  var statsHTML = [
    {l:'Lidas na planilha',       v:res.total,             cor:'var(--blue)'},
    {l:'Para importar',           v:dadosImportacao.length, cor:dadosImportacao.length?'var(--accent)':'var(--red)'},
    {l:'Filtro onboarding',       v:res.filtrado,          cor:'var(--amber)'},
    {l:'Duplicatas',              v:res.dup,               cor:'var(--muted)'},
    {l:'Sem nome (inválidas)',     v:res.semNome,           cor:'var(--red)'}
  ].map(function(s){
    return '<div class="imp-stat-card"><div class="imp-stat-label">'+s.l+'</div>'
      +'<div class="imp-stat-val" style="color:'+s.cor+'">'+s.v+'</div></div>';
  }).join('');

  // Cards dinâmicos por consultor — interativos
  var COR_CONS=['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8','#e879f9','#4ade80'];
  var consKeys=Object.keys(resumoConsultores).sort();
  statsHTML += consKeys.map(function(k,i){
    var isSem=(k==='SEM CONSULTOR');
    var cor=isSem?'#ff6b6b':COR_CONS[i%COR_CONS.length];
    var onclick=isSem
      ? 'impAbrirDistribuicao()'
      : 'impAbrirRedistribuir(\''+k+'\',this)';
    return '<div class="imp-stat-card clickable" onclick="'+onclick+'" '
      +'onmousedown="this.classList.add(\'pressed\')" '
      +'onmouseup="this.classList.remove(\'pressed\')" '
      +'onmouseleave="this.classList.remove(\'pressed\')">'  
      +'<div class="imp-stat-label" style="color:'+cor+';">'+impEsc(k)+'</div>'
      +'<div class="imp-stat-val">'+resumoConsultores[k]+'</div>'
      +'</div>';
  }).join('');

  document.getElementById('importStats').innerHTML=statsHTML;

  // Botão de redistribuição no rodapé — só ADM e só quando há sem-consultor
  var _btnDistImp=document.getElementById('importBtnDistribuir');
  if(_btnDistImp){
    var _isAdm=typeof _getSessao==='function'&&((_getSessao()||{}).perfil==='adm');
    var _semConsImp=dadosImportacao.filter(function(d){return !d.consultor||!d.consultor.trim();}).length;
    _btnDistImp.style.display=(_isAdm&&_semConsImp>0)?'':'none';
    if(_isAdm&&_semConsImp>0) _btnDistImp.textContent='⚖ Distribuir sem consultor ('+_semConsImp+')';
  }

  // Injetar painel de distribuição após importStats (se não existir)
  if(!document.getElementById('impDistPanel')){
    var dp=document.createElement('div');
    dp.id='impDistPanel';
    dp.style.cssText='display:none;padding:12px 24px;background:var(--surface2);border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:hidden;overflow-y:auto;max-height:360px;';
    var statsEl=document.getElementById('importStats');
    statsEl.parentNode.insertBefore(dp,statsEl.nextSibling);
  }
  // Injetar modal de distribuição no body (se não existir)
  if(!document.getElementById('impDistModal')){
    var dm=document.createElement('div');
    dm.id='impDistModal';
    dm.setAttribute('role','dialog');
    dm.innerHTML='<div class="imp-dist-box">'
      +'<div class="imp-dist-header">'
        +'<div class="imp-dist-title" id="impDistModalTitle"></div>'
        +'<div class="imp-dist-sub" id="impDistModalSub"></div>'
      +'</div>'
      +'<div class="imp-dist-body">'
        +'<div class="imp-cons-grid" id="impDistModalGrid"></div>'
        +'<div class="imp-dist-total">Distribuindo: <span id="impDistModalCount">0</span> / <span id="impDistModalTotal">0</span> clientes</div>'
      +'</div>'
      +'<div class="imp-dist-footer" id="impDistModalFooter"></div>'
    +'</div>';
    document.body.appendChild(dm);
    // Fechar ao clicar no backdrop
    /* backdrop removido — modal só fecha pelo botão */
  }

  // ── TABELA DE PRÉVIA ───────────────────────────────────────
  if(!dadosImportacao.length){
    document.getElementById('importPreviewHead').innerHTML='';
    document.getElementById('importPreviewBody').innerHTML=
      '<tr><td colspan="6" style="padding:32px;text-align:center;color:var(--muted);font-size:13px;">'
      +'Nenhum registro com "Status do Onboarding = CONFIRMADO" encontrado.</td></tr>';
    return;
  }

  document.getElementById('importPreviewHead').innerHTML=
    '<tr>'
    +'<th style="text-align:left;padding:9px 10px;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap;">Cliente</th>'
    +'<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap;">Consultor ✏</th>'
    +'<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap;">Treinamento</th>'
    +'<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap;">Valor</th>'
    +'<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap;">Status</th>'
    +'<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap;">Entrada</th>'
    +'<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap;">Obs</th>'
    +'</tr>';

  var STATUS_COR={pago:'var(--green)',aberto:'var(--amber)',negociacao:'var(--blue)',desistiu:'var(--red)',estorno:'var(--muted)',entrada:'var(--accent)'};
  var preview=dadosImportacao.slice(0,300);

  document.getElementById('importPreviewBody').innerHTML=preview.map(function(d,i){
    var cor=STATUS_COR[d.status]||'var(--muted)';
    return '<tr style="'+(i%2===0?'':'background:rgba(255,255,255,.015)')+'">'
      // Cliente: alinhado à esquerda
      +'<td style="text-align:left;padding:7px 10px;font-weight:600;white-space:nowrap;">'+impEsc(d.cliente)+'</td>'
      // Consultor: EDITÁVEL com select
      +'<td style="text-align:center;padding:4px 8px;min-width:120px;">'
        +(function(){
          var cons=typeof allConsultors!=='undefined'&&allConsultors.length?allConsultors:[];
          var opts=cons.map(function(x){
            return '<option value="'+impEsc(x)+'"'+(x===(d.consultor||'')?'selected':'')+'>'+impEsc(x)+'</option>';
          }).join('');
          var hasVal=cons.indexOf(d.consultor||'')>=0;
          return '<select class="imp-consultor-input" data-index="'+i+'" '
            +'style="background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:3px 6px;color:var(--text);font-family:\'DM Sans\',sans-serif;font-size:11px;width:100%;outline:none;cursor:pointer;">'
            +'<option value="">— sem consultor —</option>'
            +opts
            +(d.consultor&&!hasVal?'<option value="'+impEsc(d.consultor)+'" selected>'+impEsc(d.consultor)+'</option>':'')
            +'</select>';
        })()
      +'</td>'
      +'<td style="text-align:center;padding:7px 10px;font-size:11px;color:var(--muted);white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;">'+impEsc(d.treinamento||'—')+'</td>'
      +'<td style="text-align:center;padding:7px 10px;font-family:monospace;color:var(--blue);">'+(d.valor?'R$'+d.valor.toLocaleString('pt-BR',{minimumFractionDigits:2}):'—')+'</td>'
      +'<td style="text-align:center;padding:7px 10px;"><span style="font-size:10px;font-weight:700;color:'+cor+';background:'+cor+'1a;border:1px solid '+cor+'33;border-radius:20px;padding:2px 8px;">'+impEsc(d.status||'—')+'</span></td>'
      +'<td style="text-align:center;padding:7px 10px;font-family:monospace;color:var(--accent);">'+(d.entrada?'R$'+d.entrada.toLocaleString('pt-BR',{minimumFractionDigits:2}):'—')+'</td>'
      +'<td style="text-align:center;padding:7px 10px;color:var(--muted);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+impEsc((d.info||'').slice(0,40))+'</td>'
      +'</tr>';
  }).join('');

  if(dadosImportacao.length>300){
    document.getElementById('importPreviewBody').innerHTML+=
      '<tr><td colspan="6" style="padding:8px;text-align:center;color:var(--muted);font-size:11px;">'
      +'… e mais '+(dadosImportacao.length-300)+' registros (todos serão importados)</td></tr>';
  }
}

/* ── Processar arquivo via SheetJS ──────────────────────────── */
function impLerArquivo(event){
  var file=event.target.files[0];
  event.target.value='';
  if(!file) return;
  if(_impProcessando) return;
  _impProcessando=true;

  var ext=file.name.split('.').pop().toLowerCase();
  if(!['xlsx','xls','csv','pdf'].includes(ext)){
    _showToast('❌ Formato inválido. Use .xlsx, .xls, .csv ou .pdf','var(--red)');
    return;
  }
  if(typeof XLSX==='undefined'){
    _showToast('❌ SheetJS não carregado.','var(--red)');
    return;
  }

  _showToast('📊 Lendo arquivo...','var(--blue)');
  document.getElementById('importModalSub').textContent='Lendo: '+file.name+'...';

  // ── Função auxiliar: processar workbook → AOA → render ──────────
  function _processarWB(wb){
    _impProcessando=false;
    var ws=wb.Sheets[wb.SheetNames[0]];
    var aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
    var res=impProcessarAOA(aoa); // _sanitizarAOA é chamado dentro
    if(!res) return;
    impRenderPrevia(res);
    document.getElementById('importModalSub').textContent='Arquivo: '+file.name;
  }

  var reader=new FileReader();

  if(ext==='csv'){
    // ── Camada 1: CSV — tentar UTF-8, detectar mojibake, re-tentar com windows-1252 ──
    reader.onload=function(e){
      try{
        var textoUTF8=e.target.result;
        // Verificar primeiros 2000 chars por sequências de mojibake
        var amostra=textoUTF8.slice(0,2000);
        if(_temMojibake(amostra)){
          // Encontrou mojibake → re-ler com windows-1252
          console.warn('[IMPORT] Mojibake detectado. Re-lendo com Windows-1252...');
          var readerLatin=new FileReader();
          readerLatin.onload=function(e2){
            try{
              var wb=XLSX.read(e2.target.result,{type:'string',raw:false});
              _processarWB(wb);
              _showToast('ℹ️ Encoding corrigido automaticamente (Windows-1252)','var(--accent)');
            }catch(err){
              console.error('[IMPORT] Erro com Windows-1252:',err);
              // Fallback: usar UTF-8 original com sanitização
              var wb=XLSX.read(textoUTF8,{type:'string',raw:false});
              _processarWB(wb);
            }
          };
          readerLatin.readAsText(file,'windows-1252');
        } else {
          // UTF-8 sem mojibake — processar normalmente
          var wb=XLSX.read(textoUTF8,{type:'string',raw:false});
          _processarWB(wb);
        }
      }catch(err){
        _impProcessando=false;
        console.error('[IMPORT v3]',err);
        _showToast('❌ Erro ao ler CSV: '+err.message,'var(--red)');
      }
    };
    reader.readAsText(file,'UTF-8');

  } else {
    // ── Camada 3: Excel — passar codepage 1252 para compatibilidade com Windows ──
    reader.onload=function(e){
      try{
        var arr=new Uint8Array(e.target.result);
        // codepage:1252 → SheetJS decodifica corretamente strings Windows-1252
        var wb=XLSX.read(arr,{
          type:'array',
          raw:false,
          cellText:true,
          cellDates:true,
          codepage:1252
        });
        _processarWB(wb);
      }catch(err){
        _impProcessando=false;
        console.error('[IMPORT v3]',err);
        _showToast('❌ Erro ao ler: '+err.message,'var(--red)');
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

/* ── Importar via Google Sheets ─────────────────────────────── */
async function impImportarSheets(){
  if(window.location.protocol==='file:'){
    _showToast('⚠️ Google Sheets não disponível ao abrir o arquivo localmente. Use um servidor web ou importe via arquivo .xlsx/.csv.','var(--amber)');
    return;
  }
  var link=(document.getElementById('importSheetInput').value||'').trim();
  if(!link){ _showToast('⚠️ Cole o link do Google Sheets.','var(--amber)'); return; }
  var match=link.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if(!match){ _showToast('❌ Link inválido. Deve ser do Google Sheets.','var(--red)'); return; }
  var gidMatch=link.match(/[#&?]gid=(\d+)/);
  var url='https://docs.google.com/spreadsheets/d/'+match[1]+'/export?format=csv&gid='+(gidMatch?gidMatch[1]:'0');
  _showToast('🔗 Buscando planilha...','var(--blue)');
  document.getElementById('importModalSub').textContent='Buscando Google Sheets...';
  try{
    var resp=await fetch(url);
    if(!resp.ok) throw new Error(resp.status===401||resp.status===403?'Planilha privada. Defina como pública para visualização.':'HTTP '+resp.status);
    var texto=await resp.text();
    // Verificar se o Google retornou HTML em vez de CSV (planilha privada ou redirect)
    var trimado=texto.trimStart();
    if(trimado.startsWith('<')){
      throw new Error('Planilha privada ou inacessível. Vá em Arquivo → Compartilhar → Publicar na web, escolha formato CSV e use o link gerado.');
    }
    // Camada 2: detectar e corrigir mojibake no CSV do Google Sheets
    if(typeof _temMojibake==='function'&&_temMojibake(texto.slice(0,2000))){
      console.warn('[IMPORT] Mojibake no Google Sheets — aplicando sanitização');
    }
    var wb=XLSX.read(texto,{type:'string',raw:false});
    var ws=wb.Sheets[wb.SheetNames[0]];
    var aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
    var res=impProcessarAOA(aoa);
    if(!res) return;
    impRenderPrevia(res);
    document.getElementById('importModalSub').textContent='Google Sheets importado.';
  }catch(e){
    console.error('[IMPORT v3] Sheets:',e);
    _showToast('❌ '+e.message,'var(--red)');
  }
}

/* ── Abrir modal ─────────────────────────────────────────────── */
function openImportModal(){
  dadosImportacao=[];
  _impUltimoRes=null;
  _impProcessando=false;
  document.getElementById('importQtdSpan').textContent='0';
  document.getElementById('importStats').innerHTML='';
  document.getElementById('importPreviewHead').innerHTML='';
  document.getElementById('importPreviewBody').innerHTML=
    '<tr><td colspan="8" style="padding:32px;text-align:center;color:var(--muted);font-size:13px;">'
    +'Selecione um arquivo para carregar os dados.</td></tr>';
  document.getElementById('importModalSub').textContent='Selecione o arquivo ou cole o link do Google Sheets.';
  document.getElementById('importBtnConfirmar').disabled=true;
  document.getElementById('importBtnConfirmar').style.opacity='.4';
  /* Mostrar botão TCE apenas para turma TCE-BEL */
  var btnTCE=document.getElementById('importBtnTCE');
  if(btnTCE){
    var _ta=window._turmaAtiva||window.turmaAtiva||(typeof _turmaAtiva!=='undefined'?_turmaAtiva:null);
    var isTCE=_ta&&(_ta.codigo||'').toUpperCase()==='TCE-BEL';
    btnTCE.style.display=isTCE?'inline-flex':'none';
  }
  document.getElementById('importModalOverlay').classList.add('open');
  /* Vincular eventos lazy — elementos só existem após o modal abrir */
  setTimeout(_vincularEventosImport, 0);
}

/* ── Fechar modal ────────────────────────────────────────────── */
function closeImportModal(){
  document.getElementById('importModalOverlay').classList.remove('open');
  dadosImportacao=[];
  /* Remove barra de fonte para recriar com estado correto na próxima abertura */
  var sb=document.getElementById('importSourceBar');
  if(sb) sb.remove();
  var sr=document.getElementById('importSheetRow');
  if(sr) sr.remove();
}

/* ── Calcular diff entre planilha nova e turma atual ────────────
   Retorna { inserir:[], manter:[], remover:[] }
   - inserir: objetos novos da planilha (não existem na turma)
   - manter:  clientes já importados que continuam na planilha
   - remover: clientes já importados que SUMIRAM da planilha
   Clientes sem _importado:true (manuais) são ignorados. ────── */
function impSincronizarTurma(novos){
  var importadosNaTurma = (data||[]).filter(function(d){ return d._importado === true; });

  // Indexar existentes por _importKey
  var mapaExistentes = {};
  importadosNaTurma.forEach(function(d){
    var key = d._importKey || impGerarKey(d.cliente);
    // Garante retrocompatibilidade: persiste a key se ainda não tiver
    if(!d._importKey) d._importKey = key;
    mapaExistentes[key] = d;
  });

  // Indexar novos por _importKey
  var mapaNovaplanilha = {};
  novos.forEach(function(n){
    var key = n._importKey || impGerarKey(n.cliente);
    mapaNovaplanilha[key] = n;
  });

  var inserir = [], manter = [], remover = [];

  // Novos que não existem → inserir
  novos.forEach(function(n){
    var key = n._importKey || impGerarKey(n.cliente);
    if(!mapaExistentes[key]) inserir.push(n);
    else {
      var ex=mapaExistentes[key];
      /* Atualizar treinamento se a planilha traz valor novo */
      if(n.treinamento) ex.treinamento=n.treinamento;
      manter.push(ex);
    }
  });

  // Existentes que sumiram da planilha → remover
  importadosNaTurma.forEach(function(d){
    var key = d._importKey || impGerarKey(d.cliente);
    if(!mapaNovaplanilha[key]) remover.push(d);
  });

  return { inserir: inserir, manter: manter, remover: remover };
}

/* ── Modal de confirmação do diff ────────────────────────────── */
function impAbrirModalDiff(diff, criadoPor){
  // Remover modal anterior se existir
  var antigo = document.getElementById('impDiffOverlay');
  if(antigo) antigo.remove();

  var alertaRemocao = diff.remover.length > 0 &&
    diff.remover.length >= Math.ceil((data||[]).filter(function(d){return d._importado;}).length * 0.2);

  var listaRemovidos = diff.remover.slice(0, 50).map(function(d){
    return '<li style="padding:3px 0;font-size:12px;color:var(--text);">• ' +
      d.cliente.replace(/</g,'&lt;') + '</li>';
  }).join('');
  if(diff.remover.length > 50){
    listaRemovidos += '<li style="padding:3px 0;font-size:12px;color:var(--muted);">... e mais '+(diff.remover.length-50)+'</li>';
  }

  var ov = document.createElement('div');
  ov.id = 'impDiffOverlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:1700;display:flex;align-items:center;justify-content:center;';
  ov.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;width:min(520px,94vw);max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="padding:20px 24px 14px;border-bottom:1px solid var(--border);">' +
        '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;">Sincronizar turma com a planilha</div>' +
        '<div style="font-size:12px;color:var(--muted);">Revise as alterações antes de confirmar.</div>' +
      '</div>' +
      '<div style="padding:16px 24px;display:flex;flex-direction:column;gap:10px;flex-shrink:0;">' +
        (diff.inserir.length > 0 ?
          '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:8px;">' +
            '<span style="font-size:18px;">➕</span>' +
            '<div><div style="font-size:13px;font-weight:600;color:#4ade80;">'+diff.inserir.length+' novo'+(diff.inserir.length!==1?'s':'')+' cliente'+(diff.inserir.length!==1?'s':'')+' a adicionar</div>' +
            '<div style="font-size:11px;color:var(--muted);">Não existiam na turma ainda.</div></div>' +
          '</div>' : '') +
        (diff.manter.length > 0 ?
          '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(148,163,184,.06);border:1px solid var(--border);border-radius:8px;">' +
            '<span style="font-size:18px;">✔️</span>' +
            '<div><div style="font-size:13px;font-weight:600;color:var(--muted);">'+diff.manter.length+' cliente'+(diff.manter.length!==1?'s':'')+' sem alteração</div>' +
            '<div style="font-size:11px;color:var(--muted);">Já existem na turma — nada será modificado.</div></div>' +
          '</div>' : '') +
        (diff.remover.length > 0 ?
          '<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:8px;overflow:hidden;">' +
            '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;">' +
              '<span style="font-size:18px;">🗑️</span>' +
              '<div><div style="font-size:13px;font-weight:600;color:#f87171;">'+diff.remover.length+' cliente'+(diff.remover.length!==1?'s':'')+' a remover</div>' +
              '<div style="font-size:11px;color:var(--muted);">Não estão mais na planilha.</div></div>' +
            '</div>' +
            '<ul style="margin:0;padding:4px 14px 10px 14px;list-style:none;max-height:140px;overflow-y:auto;border-top:1px solid rgba(239,68,68,.2);">' +
              listaRemovidos +
            '</ul>' +
          '</div>' : '') +
        (diff.inserir.length === 0 && diff.remover.length === 0 ?
          '<div style="padding:16px;text-align:center;color:var(--muted);font-size:13px;">Nenhuma alteração detectada. A turma já está sincronizada.</div>' : '') +
        (alertaRemocao ?
          '<div style="padding:10px 14px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);border-radius:8px;font-size:12px;color:#fbbf24;">⚠️ <strong>Atenção:</strong> mais de 20% dos clientes importados serão removidos. Confirme apenas se tiver certeza que a planilha está correta.</div>' : '') +
      '</div>' +
      '<div style="padding:12px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;">' +
        '<button id="impDiffCancelar" style="padding:8px 18px;border-radius:var(--radius-sm);border:1px solid var(--border2);background:var(--surface2);color:var(--muted);font-family:\'DM Sans\',sans-serif;font-size:12px;cursor:pointer;">Cancelar</button>' +
        (diff.inserir.length > 0 || diff.remover.length > 0 ?
          '<button id="impDiffConfirmar" style="padding:8px 22px;border-radius:var(--radius-sm);border:none;background:var(--accent);color:#0a0a0a;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:700;cursor:pointer;">Sincronizar</button>' :
          '<button id="impDiffFechar" style="padding:8px 22px;border-radius:var(--radius-sm);border:none;background:var(--accent);color:#0a0a0a;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:700;cursor:pointer;">OK</button>') +
      '</div>' +
    '</div>';

  document.body.appendChild(ov);

  // Botão cancelar
  var btnCancel = document.getElementById('impDiffCancelar');
  if(btnCancel) btnCancel.addEventListener('click', function(){ ov.remove(); });

  // Botão fechar (sem alterações)
  var btnFechar = document.getElementById('impDiffFechar');
  if(btnFechar) btnFechar.addEventListener('click', function(){ ov.remove(); closeImportModal(); });

  // Botão confirmar sync
  var btnConf = document.getElementById('impDiffConfirmar');
  if(btnConf) btnConf.addEventListener('click', function(){
    ov.remove();
    impAplicarSync(diff, criadoPor);
  });
}

/* ── Aplicar sync (inserir + remover) ────────────────────────── */
function impAplicarSync(diff, criadoPor){
  // Remover ausentes
  if(diff.remover.length){
    var keysRemover = {};
    diff.remover.forEach(function(d){ keysRemover[d._importKey || impGerarKey(d.cliente)] = true; });
    data = (data||[]).filter(function(d){
      if(!d._importado) return true;
      var key = d._importKey || impGerarKey(d.cliente);
      return !keysRemover[key];
    });
  }

  // Atualizar treinamento nos clientes existentes (manter)
  var _isTCESync=window._turmaAtiva&&(window._turmaAtiva.codigo||'').toUpperCase()==='TCE-BEL';
  if(_isTCESync&&diff.manter.length){
    var mapaNovoTrein={};
    dadosImportacao.forEach(function(n){
      if(n.treinamento) mapaNovoTrein[n._importKey||impGerarKey(n.cliente)]=n.treinamento;
    });
    (data||[]).forEach(function(d){
      if(!d._importado) return;
      var key=d._importKey||impGerarKey(d.cliente);
      if(mapaNovoTrein[key]) d.treinamento=mapaNovoTrein[key];
    });
  }

  // Inserir novos
  var inseridos = 0;
  if(diff.inserir.length) console.log('[IMP inserir] primeiro item treinamento:', diff.inserir[0].treinamento, '| total:', diff.inserir.length);
  diff.inserir.forEach(function(obj){
    data.push({
      cliente:     obj.cliente     || '',
      treinamento: obj.treinamento || '',
      treinador:   obj.treinador   || '-',
      consultor:   obj.consultor   || '',
      valor:       obj.valor       || 0,
      status:      obj.status      || '-',
      entrada:     obj.entrada     || 0,
      info:        obj.info        || '',
      criadoPor:   criadoPor,
      _importado:  true,
      _importKey:  obj._importKey || impGerarKey(obj.cliente)
    });
    inseridos++;
  });

  // Atualizar consultores novos
  (function(){
    try{
      var novosConsultores = {};
      diff.inserir.forEach(function(obj){
        var nome = (obj.consultor||'').trim().toUpperCase();
        if(!nome||nome==='-'||nome==='—') return;
        novosConsultores[nome] = true;
      });
      var consultoresExistentes = (typeof allConsultors!=='undefined'&&Array.isArray(allConsultors))?allConsultors:[];
      Object.keys(novosConsultores).forEach(function(nome){
        if(!consultoresExistentes.some(function(c){ return (c||'').toUpperCase()===nome; })){
          if(typeof allConsultors!=='undefined'&&Array.isArray(allConsultors)) allConsultors.push(nome);
        }
      });
      if(typeof _buildColors==='function') _buildColors();
      if(typeof buildSelects==='function') buildSelects();
    }catch(e){ console.warn('[IMPORT sync] Erro ao atualizar consultores:',e); }
  })();

  // Atualizar interface
  if(typeof markUnsaved    ==='function') markUnsaved();
  if(typeof saveStorage    ==='function') saveStorage();
  if(typeof buildSelects   ==='function') buildSelects();
  if(typeof buildFilterBtns==='function') buildFilterBtns();
  if(typeof renderAll      ==='function') renderAll();
  if(typeof renderConsultor==='function') renderConsultor();
  if(typeof renderTreinador==='function') renderTreinador();
  if(typeof renderProduto  ==='function') renderProduto();

  closeImportModal();

  var msg = [];
  if(inseridos)         msg.push('➕ '+inseridos+' adicionado'+(inseridos!==1?'s':''));
  if(diff.remover.length) msg.push('🗑️ '+diff.remover.length+' removido'+(diff.remover.length!==1?'s':''));
  if(!msg.length)         msg.push('Turma já estava sincronizada');
  _showToast('✅ Sync concluído — ' + msg.join(' · '), 'var(--accent)');
}

/* ── CONFIRMAR IMPORTAÇÃO (função separada para máxima clareza) ─ */
function confirmarImportacao(){
  // 1. Capturar consultores editados na prévia
  atualizarConsultoresEditados();

  // 2. Validar
  if(!dadosImportacao.length){
    _showToast('⚠️ Nenhum dado para importar.','var(--amber)');
    return;
  }

  // 3. Sessão
  var sessao    = typeof _getSessao==='function' ? _getSessao() : null;
  var criadoPor = sessao ? (sessao.vinculo||sessao.nome||sessao.login||'adm') : 'adm';

  // 4. Calcular diff e abrir modal de confirmação
  var diff = impSincronizarTurma(dadosImportacao);
  impAbrirModalDiff(diff, criadoPor);
}

/* ══════════════════════════════════════════════════════════════
   MODAL LISTA DE CLIENTES v12
   — Edição inline completa
   — Checkbox por linha + selecionar todos + excluir em massa
   — NÃO fecha com ESC nem com backdrop
   — Salvar atualiza data[] e Firebase
══════════════════════════════════════════════════════════════ */
var _lcIndicesFiltrados = []; // índices reais no array data[]

function abrirListaClientes(){
  var overlay = document.getElementById('listaClientesOverlay');
  var input   = document.getElementById('lcSearchInput');
  if(!overlay){ console.error('[abrirListaClientes] listaClientesOverlay não encontrado'); return; }
  if(input) input.value = '';
  try{ lcRenderizar(''); } catch(e){ console.warn('[abrirListaClientes] lcRenderizar:', e); }
  // Botão de redistribuição — só ADM e só quando há sem-consultor
  var btn=document.getElementById('lcBtnDistribuir');
  if(btn){
    var isAdm=typeof _getSessao==='function'&&((_getSessao()||{}).perfil==='adm');
    if(isAdm){
      var arr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
      var sem=arr.filter(function(d){return !d.consultor||!d.consultor.trim();}).length;
      if(sem>0){btn.textContent='⚖ Distribuir sem consultor ('+sem+')';btn.style.display='';}
      else btn.style.display='none';
    } else {
      btn.style.display='none';
    }
  }
  overlay.classList.add('open');
}
function fecharListaClientes(){
  document.getElementById('listaClientesOverlay').classList.remove('open');
}

/* Renderiza tabela com edição inline */
function lcRenderizar(filtro){
  var tbody  = document.getElementById('lcTbody');
  var vazio  = document.getElementById('lcVazio');
  var count  = document.getElementById('lcCount');
  var sub    = document.getElementById('lcSubtitle');
  if(!tbody) return;

  var arr = (typeof data !== 'undefined' && Array.isArray(data)) ? data : [];
  var q   = (filtro || '').toLowerCase().trim();

  // Montar lista de índices filtrados
  _lcIndicesFiltrados = [];
  arr.forEach(function(r, i){
    if(!q){
      _lcIndicesFiltrados.push(i);
    } else if(
      (r.cliente    ||'').toLowerCase().indexOf(q)>=0 ||
      (r.treinamento||'').toLowerCase().indexOf(q)>=0 ||
      (r.consultor  ||'').toLowerCase().indexOf(q)>=0 ||
      (r.treinador  ||'').toLowerCase().indexOf(q)>=0
    ){
      _lcIndicesFiltrados.push(i);
    }
  });

  if(!_lcIndicesFiltrados.length){
    tbody.innerHTML = '';
    vazio.style.display = 'block';
    count.textContent   = '0 clientes';
    if(sub) sub.textContent = arr.length + ' clientes no total — nenhum encontrado.';
    lcAtualizarMassaBar();
    return;
  }

  vazio.style.display = 'none';

  var STATUS_OPTS = [
    {v:'aberto',l:'ABERTO'},{v:'pago',l:'PAGO'},{v:'entrada',l:'ENTRADA'},
    {v:'negociacao',l:'NEGOCIAÇÃO'},{v:'desistiu',l:'DESISTIU'},{v:'estorno',l:'ESTORNO'},{v:'-',l:'—'}
  ];

  // Fontes dos selects: mesmas do modal "Novo cliente"
  var _treinLst = (typeof allTreinamentos!=='undefined'&&Array.isArray(allTreinamentos))?allTreinamentos:[];
  var _trainLst = (typeof allTrainers!=='undefined'&&Array.isArray(allTrainers))?allTrainers:[];
  var _consLst  = (typeof allConsultors!=='undefined'&&Array.isArray(allConsultors))?allConsultors:[];

  var html = '';
  _lcIndicesFiltrados.forEach(function(realIdx){
    var r = arr[realIdx];

    // SELECT treinamento — Fix 7: opção vazia obrigatória, nunca pré-preencher
    var treinOpts = '<option value="">— vazio —</option>'
      + _treinLst.map(function(t){
          return '<option value="'+t+'"'+((r.treinamento||'')=== t?' selected':'')+'>'+t+'</option>';
        }).join('');

    // SELECT treinador (âmbar)
    var trainOpts = '<option value="-"'+((!r.treinador||r.treinador==='-')?' selected':'')+'>—</option>'
      + _trainLst.map(function(t){
          return '<option value="'+t+'"'+(r.treinador===t?' selected':'')+'>'+t.toUpperCase()+'</option>';
        }).join('');

    // SELECT consultor (verde)
    var consOpts = '<option value=""'+(!r.consultor?' selected':'')+'>—</option>'
      + _consLst.map(function(c){
          return '<option value="'+c+'"'+(r.consultor===c?' selected':'')+'>'+c.toUpperCase()+'</option>';
        }).join('');

    // SELECT status
    var selOpts = STATUS_OPTS.map(function(s){
      return '<option value="'+s.v+'"'+((r.status||'aberto')===s.v?' selected':'')+'>'+s.l+'</option>';
    }).join('');

    // Fix 5: formatar valor/entrada como BRL para exibição no input
    var valEdit = r.valor  ? Number(r.valor).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})  : '';
    var entEdit = r.entrada? Number(r.entrada).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
    // Cor de ticket: Low (0-5k)=azul, Middle (5001-10k)=âmbar, High (10k+)=verde
    var ticketCorLC = Number(r.valor||0) >= 10000.01 ? 'var(--green)'
                    : Number(r.valor||0) >= 5001     ? 'var(--amber)'
                    : Number(r.valor||0) > 0         ? 'var(--blue)'
                    : 'var(--muted)';

    html += '<tr data-idx="'+realIdx+'">'
      // Checkbox — Fix 2: mantido no modal Gerenciar
      +'<td style="text-align:center;width:36px;">'
        +'<input type="checkbox" class="lc-row-chk" data-idx="'+realIdx+'" onchange="lcOnChkChange()" style="accent-color:var(--accent);width:14px;height:14px;cursor:pointer;">'
      +'</td>'
      // Cliente — texto fixo (edição via botão "i" no card, só ADM)
      +'<td style="text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">'
        +'<span style="font-size:12px;font-weight:600;color:var(--text);">'+_lcEsc(r.cliente||'')+'</span>'
      +'</td>'
      // Treinamento — SELECT com opção vazia
      +'<td style="text-align:center;vertical-align:middle;">'
        +'<select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="treinamento" onchange="lcCellChange(this)">'+treinOpts+'</select>'
      +'</td>'
      // Treinador — SELECT âmbar
      +'<td class="lc-cell-treinador" style="text-align:center;vertical-align:middle;">'
        +'<select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="treinador" onchange="lcCellChange(this)" style="color:var(--amber);border-color:rgba(255,183,64,.25);">'+trainOpts+'</select>'
      +'</td>'
      // Consultor — SELECT verde
      +'<td class="lc-cell-consultor" style="text-align:center;vertical-align:middle;">'
        +'<select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="consultor" onchange="lcCellChange(this)" style="color:var(--accent);border-color:rgba(200,240,90,.25);">'+consOpts+'</select>'
      +'</td>'
      // Valor — cor por faixa de ticket, alinhamento direita
      +'<td style="text-align:right;vertical-align:middle;min-width:100px;padding:3px 4px;">'
        +'<input type="text" inputmode="numeric" class="lc-cell-input" data-idx="'+realIdx+'" data-campo="valor"'
          +' value="'+valEdit+'" oninput="this.value=lcMoneyMask(this.value)" onchange="lcCellChange(this)" placeholder="0,00"'
          +' style="text-align:right;font-family:\'DM Mono\',monospace;font-variant-numeric:tabular-nums;font-weight:700;color:'+ticketCorLC+';min-width:90px;">'
      +'</td>'
      // Status — SELECT centralizado
      +'<td style="text-align:center;vertical-align:middle;">'
        +'<select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="status" onchange="lcCellChange(this)">'+selOpts+'</select>'
      +'</td>'
      // Entrada — alinhamento direita, azul
      +'<td style="text-align:right;vertical-align:middle;min-width:90px;padding:3px 4px;">'
        +'<input type="text" inputmode="numeric" class="lc-cell-input" data-idx="'+realIdx+'" data-campo="entrada"'
          +' value="'+entEdit+'" oninput="this.value=lcMoneyMask(this.value)" onchange="lcCellChange(this)" placeholder="0,00"'
          +' style="text-align:right;font-family:\'DM Mono\',monospace;font-variant-numeric:tabular-nums;font-weight:600;color:var(--blue);min-width:80px;">'
      +'</td>'
      +'</tr>';
  });

  tbody.innerHTML = html;
  count.textContent = _lcIndicesFiltrados.length + ' cliente' + (_lcIndicesFiltrados.length!==1?'s':'') + (q?' encontrado'+(_lcIndicesFiltrados.length!==1?'s':''):'');
  if(sub) sub.textContent = 'Total no sistema: '+arr.length+' cliente'+(arr.length!==1?'s':'')+'. Edição inline ativada.';
  lcAtualizarMassaBar();
}

function _lcEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* Edição inline do nome do cliente — só ADM */
function lcEditarNomeCliente(btn, idx){
  var td = btn.parentElement;
  var span = td.querySelector('span');
  var nomeAtual = (Array.isArray(data)&&data[idx])?data[idx].cliente||'':'';
  // Substituir conteúdo da célula por input
  td.innerHTML = '<input id="lcNomeEdit_'+idx+'" class="lc-cell-input" value="'+_lcEsc(nomeAtual)+'"'
    +' style="width:100%;min-width:120px;" placeholder="Nome..."'
    +' onblur="lcSalvarNomeCliente(this,'+idx+')" onkeydown="if(event.key===\'Enter\')this.blur();if(event.key===\'Escape\'){lcCancelarNomeCliente(this,'+idx+',\''+_lcEsc(nomeAtual)+'\')}">';
  var inp = document.getElementById('lcNomeEdit_'+idx);
  if(inp){ inp.focus(); inp.select(); }
}

function lcSalvarNomeCliente(inp, idx){
  var novo = inp.value.trim();
  if(novo && Array.isArray(data) && data[idx]){
    data[idx].cliente = novo;
    if(typeof markUnsaved==='function') markUnsaved();
    if(typeof saveStorage==='function') saveStorage();
  }
  lcRenderizar(document.getElementById('lcSearchInput').value||'');
}

function lcCancelarNomeCliente(inp, idx, original){
  lcRenderizar(document.getElementById('lcSearchInput').value||'');
}
function _lcFmtEdit(v){ var n=Number(v)||0; return n?String(n).replace('.',','):''; }
function _lcParseNum(s){ if(!s&&s!==0)return 0; var n=parseFloat(String(s).trim().replace(/R\$\s*/,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; }

/* Atualiza data[] ao mudar uma célula (select ou input) */
/* Fix 5: máscara BRL para inputs do modal Gerenciar */


/* Atualiza data[] ao mudar uma célula (select ou input) */
function lcCellChange(el){
  var idx   = parseInt(el.dataset.idx);
  var campo = el.dataset.campo;
  var val   = el.value;
  if(!Array.isArray(data)||!data[idx]) return;
  if(campo==='valor'||campo==='entrada'){
    // Fix 5: parse BRL correto — remover pontos de milhar, trocar vírgula por ponto decimal
    var raw = val.trim()
      .replace(/R\$\s*/g,'')
      .replace(/\./g,'')
      .replace(',','.');
    data[idx][campo] = parseFloat(raw)||0;
  } else {
    data[idx][campo] = val;
  }
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  // Re-render instantâneo após edição inline no modal Gerenciar Clientes
  if(window._consultorAtivo && document.getElementById('consultorDetail') &&
     document.getElementById('consultorDetail').style.display!=='none'){
    if(typeof _renderConsultorDetail==='function') _renderConsultorDetail(window._consultorAtivo);
  } else {
    if(typeof renderAll==='function') renderAll();
    if(typeof renderConsultor==='function') renderConsultor();
  }
}

/* Toggle checkbox individual */
function lcOnChkChange(){
  lcAtualizarMassaBar();
  document.querySelectorAll('#lcTbody tr').forEach(function(tr){
    var chk = tr.querySelector('.lc-row-chk');
    if(chk) tr.classList.toggle('lc-selected', chk.checked);
  });
  var todos    = document.querySelectorAll('.lc-row-chk');
  var marcados = document.querySelectorAll('.lc-row-chk:checked');
  var chkAll   = document.getElementById('lcChkAll');
  if(chkAll) chkAll.indeterminate = (marcados.length>0 && marcados.length<todos.length);
  if(chkAll) chkAll.checked       = (marcados.length===todos.length && todos.length>0);
}

/* Toggle todos */
function lcToggleAll(checked){
  document.querySelectorAll('.lc-row-chk').forEach(function(c){ c.checked=checked; });
  document.querySelectorAll('#lcTbody tr').forEach(function(tr){ tr.classList.toggle('lc-selected',checked); });
  lcAtualizarMassaBar();
}

function lcDeselecionarTodos(){
  lcToggleAll(false);
  var ca=document.getElementById('lcChkAll');
  if(ca){ca.checked=false;ca.indeterminate=false;}
}

/* Barra de ações em massa */
function lcAtualizarMassaBar(){
  var sels  = document.querySelectorAll('.lc-row-chk:checked').length;
  var total = document.querySelectorAll('.lc-row-chk').length;
  var bar   = document.getElementById('lcMassaBar');
  var cnt   = document.getElementById('lcMassaCount');
  var btn   = document.getElementById('lcBtnExcluirDin');

  if(!bar) return;

  if(sels>0){
    bar.classList.add('visible');
    if(cnt) cnt.textContent = sels+' selecionado'+(sels!==1?'s':(sels===total&&total>0?' (todos)':''));
    if(btn){
      btn.style.display = 'inline-flex';
      btn.innerHTML = sels===total && total>0
        ? '🗑 Remover Todos ('+total+')'
        : '🗑 Remover selecionados ('+sels+')';
    }
    // Popular selects De/Para com listas dinâmicas
    var _consLst  = (typeof allConsultors!=='undefined'&&Array.isArray(allConsultors))?allConsultors:[];
    var _treinLst = (typeof allTreinamentos!=='undefined'&&Array.isArray(allTreinamentos))?allTreinamentos:[];
    function _populatePar(deId, paraId, opts){
      [deId, paraId].forEach(function(id, isP){
        var el = document.getElementById(id);
        if(!el) return;
        var prev = el.value;
        el.innerHTML = '<option value="">'+(isP?'— Para —':'— De —')+'</option>'
          + opts.map(function(o){ return '<option value="'+o.v+'"'+(prev===o.v?' selected':'')+'>'+o.l+'</option>'; }).join('');
      });
    }
    var consOpts  = _consLst.map(function(c){ return {v:c, l:c.toUpperCase()}; });
    var treinOpts = _treinLst.map(function(t){ return {v:t, l:t}; });
    _populatePar('lcMassaConsultorDe',   'lcMassaConsultorPara',   consOpts);
    _populatePar('lcMassaTreinamentoDe', 'lcMassaTreinamentoPara', treinOpts);
  } else {
    bar.classList.remove('visible');
    if(btn) btn.style.display='none';
  }
}

/* Seleciona automaticamente as linhas cujo campo === valor ao escolher "De" */
function lcSelecionarPorDe(campo, valor){
  if(!valor) return; // "— De —" selecionado: não altera seleção
  var arr = (typeof data!=='undefined'&&Array.isArray(data))?data:[];
  document.querySelectorAll('.lc-row-chk').forEach(function(chk){
    var idx = parseInt(chk.dataset.idx);
    var d = arr[idx];
    if(!d) return;
    var match = (d[campo]||'') === valor;
    chk.checked = match;
    var tr = chk.closest('tr');
    if(tr) tr.classList.toggle('lc-selected', match);
  });
  var ca = document.getElementById('lcChkAll');
  var todos = document.querySelectorAll('.lc-row-chk');
  var marcados = document.querySelectorAll('.lc-row-chk:checked');
  if(ca){
    ca.checked = marcados.length === todos.length && todos.length > 0;
    ca.indeterminate = marcados.length > 0 && marcados.length < todos.length;
  }
  lcAtualizarMassaBar();
}

/* Aplicar alterações em massa com lógica De → Para */
function lcAplicarMassa(){
  var consDe   = (document.getElementById('lcMassaConsultorDe')    ||{}).value || '';
  var consPara = (document.getElementById('lcMassaConsultorPara')   ||{}).value || '';
  var stDe     = (document.getElementById('lcMassaStatusDe')        ||{}).value || '';
  var stPara   = (document.getElementById('lcMassaStatusPara')      ||{}).value || '';
  var treinDe  = (document.getElementById('lcMassaTreinamentoDe')   ||{}).value || '';
  var treinPara= (document.getElementById('lcMassaTreinamentoPara') ||{}).value || '';

  var temAlgo = (consPara) || (stPara) || (treinPara);
  if(!temAlgo){
    if(typeof _showToast==='function') _showToast('Preencha ao menos um campo "Para".','var(--amber)');
    return;
  }

  var indices = Array.from(document.querySelectorAll('.lc-row-chk:checked')).map(function(c){ return parseInt(c.dataset.idx); });
  if(!indices.length) return;

  var alterados = 0;
  indices.forEach(function(idx){
    if(!Array.isArray(data)||!data[idx]) return;
    var d = data[idx];
    var mudou = false;
    if(consPara && (!consDe || d.consultor === consDe)){
      d.consultor = consPara; mudou = true;
    }
    if(stPara && (!stDe || d.status === stDe)){
      d.status = stPara; mudou = true;
    }
    if(treinPara && (!treinDe || d.treinamento === treinDe)){
      d.treinamento = treinPara; mudou = true;
    }
    if(mudou) alterados++;
  });

  if(!alterados){
    if(typeof _showToast==='function') _showToast('Nenhum cliente correspondeu aos critérios "De".','var(--amber)');
    return;
  }

  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();

  // Resetar selects
  ['lcMassaConsultorDe','lcMassaConsultorPara','lcMassaStatusDe','lcMassaStatusPara',
   'lcMassaTreinamentoDe','lcMassaTreinamentoPara'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });

  lcDeselecionarTodos();
  lcRenderizar(document.getElementById('lcSearchInput').value||'');
  if(typeof renderAll==='function') renderAll();
  if(typeof renderConsultor==='function') renderConsultor();

  if(typeof _showToast==='function') _showToast('✅ '+alterados+' cliente'+(alterados!==1?'s':'')+' alterado'+(alterados!==1?'s':'')+'!','var(--accent)');
}

/* Excluir linha individual */
function lcExcluirLinha(idx){
  if(!Array.isArray(data)||!data[idx]) return;
  var nome = data[idx].cliente||'este cliente';
  if(!confirm('Excluir "'+nome+'"? Esta ação não pode ser desfeita.')) return;
  data.splice(idx,1);
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  lcRenderizar(document.getElementById('lcSearchInput').value);
  if(typeof renderAll==='function') renderAll();
}

/* Fix 2: excluir selecionados — confirm obrigatório por spec */
function lcExcluirSelecionados(){
  var sels  = Array.from(document.querySelectorAll('.lc-row-chk:checked')).map(function(c){ return parseInt(c.dataset.idx); });
  var total = document.querySelectorAll('.lc-row-chk').length;
  if(!sels.length) return;
  if(!confirm('Deseja realmente excluir os clientes selecionados?')) return;
  sels.sort(function(a,b){return b-a;});
  sels.forEach(function(idx){ if(Array.isArray(data)&&data[idx]) data.splice(idx,1); });
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  lcRenderizar(document.getElementById('lcSearchInput').value||'');
  if(typeof renderAll==='function') renderAll();
  if(typeof renderConsultor==='function') renderConsultor();
  if(typeof _showToast==='function') _showToast('🗑 '+sels.length+' cliente'+(sels.length!==1?'s':'')+' excluído'+(sels.length!==1?'s':'')+'!','var(--red)');
}

/* Salvar tudo */
function lcSalvarTodos(){
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  if(typeof buildSelects==='function') buildSelects();
  if(typeof buildFilterBtns==='function') buildFilterBtns();
  if(typeof renderAll==='function') renderAll();
  if(typeof renderConsultor==='function') renderConsultor();
  if(typeof renderTreinador==='function') renderTreinador();
  if(typeof renderProduto==='function') renderProduto();
  // Sincronizar com Firebase se disponível
  if(typeof _fbSave==='function' && typeof _turmaAtiva!=='undefined' && _turmaAtiva){
    var _tid=(_turmaAtiva&&_turmaAtiva.id)||_turmaAtiva;
    if(_tid && typeof _tid==='string'){
      _fbSave('turmas/'+_tid+'/clientes', data).catch(function(e){console.warn('[LC] Firebase save:',e);});
    }
  }
  _showToast && _showToast('✅ Alterações salvas!','var(--accent)');
}

function lcFiltrar(){
  var q=document.getElementById('lcSearchInput').value;
  lcRenderizar(q);
}

// Expor globalmente
window.abrirListaClientes  = abrirListaClientes;
window.fecharListaClientes = fecharListaClientes;
window.lcFiltrar           = lcFiltrar;
window.lcRenderizar        = lcRenderizar;
window.lcCellChange        = lcCellChange;
window.lcOnChkChange       = lcOnChkChange;
window.lcToggleAll         = lcToggleAll;
window.lcDeselecionarTodos = lcDeselecionarTodos;
window.lcExcluirLinha      = lcExcluirLinha;
window.lcExcluirSelecionados = lcExcluirSelecionados;
window.lcSalvarTodos       = lcSalvarTodos;
window.lcAplicarMassa      = lcAplicarMassa;
window.lcSelecionarPorDe   = lcSelecionarPorDe;
window.lcEditarNomeCliente  = lcEditarNomeCliente;
window.lcSalvarNomeCliente  = lcSalvarNomeCliente;
window.lcCancelarNomeCliente= lcCancelarNomeCliente;

// BLOQUEIOS: modal NÃO fecha com ESC nem backdrop
// (backdrop bloqueado via onclick="event.stopPropagation()" no HTML)

/* ══ fim MODAL LISTA DE CLIENTES v12 ══ */

/* ── Vincular eventos (após DOM carregado) ───────────────────── */
function _vincularEventosImport(){
  /* Chamada lazy — só roda DEPOIS que openImportModal renderiza o HTML do modal */

  // Input file (existe estaticamente no HTML)
  var _inp=document.getElementById('_planilhaFileInput');
  if(_inp&&!_inp._bound){_inp.addEventListener('change',impLerArquivo);_inp._bound=true;}

  // Elementos dinâmicos — só existem após openImportModal criar o HTML
  var _btnC=document.getElementById('importBtnCancelar');
  if(_btnC) _btnC.onclick=closeImportModal;
  var _btnOk=document.getElementById('importBtnConfirmar');
  if(_btnOk) _btnOk.onclick=confirmarImportacao;

  // Barra de fonte (só inserir uma vez)
  var modalBody=document.querySelector('#importModalOverlay .modal');
  if(modalBody&&!document.getElementById('importSourceBar')){
    var _ta=window._turmaAtiva||(typeof _turmaAtiva!=='undefined'?_turmaAtiva:null);
    var fBar=document.createElement('div');
    fBar.id='importSourceBar';
    fBar.style.cssText='display:flex;gap:8px;padding:10px 24px;border-bottom:1px solid var(--border);background:var(--surface2);align-items:center;flex-shrink:0;flex-wrap:wrap;';
    fBar.innerHTML=
      '<button onclick="document.getElementById(\'_planilhaFileInput\').click()" '
        +'style="padding:6px 14px;border-radius:var(--radius-sm);border:1px solid var(--border2);background:var(--surface);color:var(--accent);font-family:\'DM Sans\',sans-serif;font-size:12px;font-weight:600;cursor:pointer;">'
        +'📂 Escolher arquivo (.xlsx / .csv / .pdf)</button>'
      +'<button id="impBtnToggleSheets" onclick="impToggleSheets()" '
        +'style="padding:6px 14px;border-radius:var(--radius-sm);border:1px solid var(--border2);background:var(--surface);color:var(--muted);font-family:\'DM Sans\',sans-serif;font-size:12px;cursor:pointer;">'
        +'🔗 Google Sheets</button>'
      +((_ta&&(_ta.codigo||'').toUpperCase()==='TCE-BEL')
        ?'<button onclick="document.getElementById(\'_planilhaFileInput\').click()" '
          +'style="padding:6px 14px;border-radius:var(--radius-sm);border:1px solid rgba(251,191,36,.35);background:rgba(251,191,36,.08);color:#fbbf24;font-family:\'DM Sans\',sans-serif;font-size:12px;font-weight:600;cursor:pointer;">'
          +'⬆ Importar TCE</button>'
        :'')
      +'<span id="impFileNome" style="font-size:11px;color:var(--muted);font-family:monospace;"></span>';
    modalBody.insertBefore(fBar,modalBody.children[1]);
    var sr=document.createElement('div');
    sr.id='importSheetRow';
    sr.style.cssText='display:none;padding:8px 24px;gap:8px;border-bottom:1px solid var(--border);background:var(--surface2);align-items:center;flex-wrap:wrap;flex-shrink:0;';
    sr.innerHTML='<input id="importSheetInput" type="text" style="flex:1;min-width:200px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;color:var(--text);font-size:12px;outline:none;" placeholder="https://docs.google.com/spreadsheets/d/..." onkeydown="if(event.key===\'Enter\')impImportarSheets()">'
      +'<button onclick="impImportarSheets()" style="padding:7px 16px;border-radius:6px;background:var(--accent);color:#0f0f0f;border:none;font-weight:700;font-size:12px;cursor:pointer;">Importar</button>';
    modalBody.insertBefore(sr,modalBody.children[2]);
  }

  // backdrop e ESC — null-safe
  var _ov=document.getElementById('importModalOverlay');
  if(_ov&&!_ov._bound){
    _ov.addEventListener('click',function(e){e.stopPropagation();});
    _ov._bound=true;
  }
  if(!window._impEscBound){
    window._impEscBound=true;
    document.addEventListener('keydown',function(e){
      var ov=document.getElementById('importModalOverlay');
      if(e.key==='Escape'&&ov&&ov.classList.contains('open')){
        e.stopPropagation();e.preventDefault();
      }
    },{capture:true,once:false});
  }

  // Opções — null-safe
  ['importOptMaiusculo'].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&!el._bound){
      el.addEventListener('change',function(){
        if(_impUltimoRes) impRenderPrevia(_impUltimoRes);
      });
      el._bound=true;
    }
  });

  /* debug log removido */
}

/* _planilhaFileInput vinculado dentro de _vincularEventosImport() */

/* ── Toggle barra Google Sheets ─────────────────────────────── */
function impToggleSheets(){
  var row=document.getElementById('importSheetRow');
  var btn=document.getElementById('impBtnToggleSheets');
  if(!row) return;
  var vis=row.style.display==='flex';
  row.style.display=vis?'none':'flex';
  if(btn) btn.style.color=vis?'var(--muted)':'var(--accent)';
}

/* ── Expor no window para onclick inline ─────────────────────── */
window.openImportModal       = openImportModal;
window.closeImportModal      = closeImportModal;
window.confirmarImportacao   = confirmarImportacao;
window.atualizarConsultoresEditados = atualizarConsultoresEditados;
window.impImportarSheets     = impImportarSheets;
window.impToggleSheets       = impToggleSheets;
window.impLerArquivo         = impLerArquivo;
window.importarPlanilha      = impLerArquivo;
window.fecharImportModal     = closeImportModal;
