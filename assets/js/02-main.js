/* ═══════════════════════════════════════════
   ESTADO GLOBAL
═══════════════════════════════════════════ */
const STORAGE_KEY='ci_dashboard_v1',BACKUP_KEY='ci_dashboard_backup',TURMAS_KEY='ci_turmas_index',TURMA_ATIVA_KEY='ci_turma_ativa';
/* === NOVO NÓ UNIFICADO === */
const TURMAS_NODE='turmas'; // turmas/{id} = metadados + clientes
let _turmaAtiva=null,_periodText='',_periodStart='',_periodEnd='';
let _turmaGlobalAtiva=null;
/* Rastreia quais campos foram alterados desde o último save granular */
var _dashDirty={clientes:false,titulo:false,info:false,period:false,equipe:false};
function _resetDirty(){_dashDirty={clientes:false,titulo:false,info:false,period:false,equipe:false};}
function _buildPatch(){
  var titulo=document.getElementById('dashTitle')?document.getElementById('dashTitle').textContent:'';
  var info=document.getElementById('infoBarText')?document.getElementById('infoBarText').textContent:'';
  var patch={updatedAt:Date.now()};
  if(_dashDirty.clientes) patch.clientes=data;
  if(_dashDirty.titulo)   patch.titulo=titulo;
  if(_dashDirty.info)     patch.info=info;
  if(_dashDirty.period){  patch.periodStart=_periodStart;patch.periodEnd=_periodEnd;patch.periodText=_periodText; }
  if(_dashDirty.equipe){
    if(typeof allConsultors!=='undefined') patch.consultores=allConsultors;
    if(typeof allTrainers!=='undefined')   patch.treinadores=allTrainers;
  }
  /* Se nada marcado (save manual sem flag), enviar tudo como segurança */
  var algum=Object.values(_dashDirty).some(Boolean);
  if(!algum){
    patch.clientes=data;patch.titulo=titulo;patch.info=info;
    patch.periodStart=_periodStart;patch.periodEnd=_periodEnd;patch.periodText=_periodText;
    if(typeof allConsultors!=='undefined') patch.consultores=allConsultors;
    if(typeof allTrainers!=='undefined')   patch.treinadores=allTrainers;
  }
  return patch;
}

function definirTurmaAtiva(id){
  if(_turmaGlobalAtiva===id){
    // Desativar
    _turmaGlobalAtiva=null;
    localStorage.removeItem('ci_turma_global_ativa');
    if(window._fbSave){
      window._fbSave('config/turma_global_ativa',null).then(function(){
        _showToast('⛔ Turma desativada.','var(--amber)');
      }).catch(function(){
        _showToast('⚠️ Desativado localmente.','var(--amber)');
      });
    }
  } else {
    // Ativar
    _turmaGlobalAtiva=id;
    localStorage.setItem('ci_turma_global_ativa',id);
    if(window._fbSave){
      window._fbSave('config/turma_global_ativa',id).then(function(){
        _showToast('✅ Turma ativa definida para todos os usuários!','var(--accent)');
      }).catch(function(){
        _showToast('⚠️ Salvo localmente. Sincronize para atualizar no Firebase.','var(--amber)');
      });
    }
  }
  renderTurmasGrid();
}

function _carregarTurmaGlobalAtiva(cb){
  const local=localStorage.getItem('ci_turma_global_ativa');
  if(local) _turmaGlobalAtiva=local;
  if(window._fbGet){
    var _cbChamado=false;
    var _timeout=setTimeout(function(){
      if(!_cbChamado){_cbChamado=true;if(cb)cb();}
    },2000);
    window._fbGet('config/turma_global_ativa').then(function(v){
      if(v){_turmaGlobalAtiva=v;localStorage.setItem('ci_turma_global_ativa',v);}
      if(!_cbChamado){_cbChamado=true;clearTimeout(_timeout);if(cb)cb();}
    }).catch(function(){
      if(!_cbChamado){_cbChamado=true;clearTimeout(_timeout);if(cb)cb();}
    });
  } else {
    if(cb)cb();
  }
}
let META=0,editIdx=null,confirmIdx=null;
let activeTrainer=null,activeConsultor=null,activeStatus=null,activeCliente=null;
let activeConsultorStatus=null,activeTreinadorStatus=null;
let sortCol=null,sortDir=1,entradaRealizada=false,addEntradaRealizada=false;
let savedData='[]',data=[];
let allTrainers=[],allConsultors=[];

/* ═══════════════════════════════════════════
   PERMISSÕES PADRÃO POR PERFIL
═══════════════════════════════════════════ */
const PERMS_PADRAO={
  adm:       {verGeral:true, verConsultor:true, verTreinador:true, verProduto:true, verValores:true, editar:true, exportar:true,  gerenciarUsuarios:true,  configuracoes:true },
  ministrante:{verGeral:true, verConsultor:true, verTreinador:true, verProduto:false,verValores:true, editar:false,exportar:false, gerenciarUsuarios:false, configuracoes:false},
  consultor:  {verGeral:false,verConsultor:true, verTreinador:false,verProduto:true, verValores:true, editar:false,exportar:false, gerenciarUsuarios:false, configuracoes:false},
  treinador:  {verGeral:false,verConsultor:false,verTreinador:true, verProduto:false,verValores:true, editar:false,exportar:false, gerenciarUsuarios:false, configuracoes:false}
};

function _getPermsUsuario(perfil, permissoesSalvas){
  var padrao=PERMS_PADRAO[perfil]||PERMS_PADRAO.consultor;
  if(!permissoesSalvas) return Object.assign({},padrao);
  var merged=Object.assign({},padrao,permissoesSalvas);
  // Permissões que o perfil garante por padrão não podem ser removidas por
  // registros antigos no Firebase (ex: consultor sempre tem verProduto).
  Object.keys(padrao).forEach(function(k){ if(padrao[k]===true) merged[k]=true; });
  return merged;
}
// ── Constantes centralizadas (Fase 1.A — fonte única) ──
window.APP_CONST = {
  MESES_CURTO: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  MESES_FULL:  ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  PALETTE_T:   ['#60a5fa','#34d399','#ffb740','#f472b6','#a78bfa','#fb923c','#38bdf8'],
  PALETTE_C:   ['#c084fc','#38bdf8','#fb923c','#34d399','#f472b6','#ffb740','#60a5fa'],
  PALETTE_SWIM:    ['var(--blue)','var(--accent)','#a78bfa','var(--red)','var(--amber)','var(--green)','#f472b6','#fb923c','#38bdf8','#e879f9'],
  PALETTE_SWIM_BG: ['rgba(96,165,250,.15)','rgba(200,240,90,.15)','rgba(167,139,250,.18)','rgba(255,95,87,.15)','rgba(255,183,64,.15)','rgba(52,211,153,.15)','rgba(244,114,182,.15)','rgba(251,146,60,.15)','rgba(56,189,248,.15)','rgba(232,121,249,.15)'],
  NB_CLS: ['nb-blue','nb-green','nb-amber','nb-pink','nb-purple','nb-orange'],
  TREINAMENTOS: ['BHP','CEOP','CI','CIS','CIS-GL','FCIS','FGPC','IF','MAESTRIA','MASTER COACHING','ML5','TAV','TOUR BLACK BEL','TOUR BRONZE BEL','TOUR OURO BEL'],
};

// Aliases preservando 100% da API existente
const allTreinamentos = APP_CONST.TREINAMENTOS;
const PALETTE_T = APP_CONST.PALETTE_T;
const PALETTE_C = APP_CONST.PALETTE_C;
const NB_CLS = APP_CONST.NB_CLS;

function _normalizeUid(str){
  return str.toLowerCase()
    .replace(/[áàâãäå]/g,'a').replace(/[éèêë]/g,'e')
    .replace(/[íìîï]/g,'i').replace(/[óòôõö]/g,'o')
    .replace(/[úùûü]/g,'u').replace(/ç/g,'c').replace(/ñ/g,'n')
    .replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
}
let tColors={},tBorder={},tBg={},cColors={},cBg={};

function _buildColors(){
  tColors={};tBorder={};tBg={};
  allTrainers.forEach((t,i)=>{const c=PALETTE_T[i%PALETTE_T.length];tColors[t]=c;tBorder[t]=c;const h=c.slice(1);tBg[t]='rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+',.1)';});
  cColors={};cBg={};
  allConsultors.forEach((c,i)=>{const cor=PALETTE_C[i%PALETTE_C.length];cColors[c]=cor;const h=cor.slice(1);cBg[c]='rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+',.1)';});
}

/* ═══════════════════════════════════════════
   FORMATAÇÃO
═══════════════════════════════════════════ */
function hexToRgba(hex,a){var h=hex.replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')';}

/* ─── fmtMoney — fonte canônica de formatação BRL (Fase 1.C) ───
   Modos:
     'display'         number → 'R$ 1.234,56'   (default, com prefixo)
     'displayNoSymbol' number → '1.234,56'       (sem prefixo)
     'parse'           string → number           ('R$ 1.234,56' → 1234.56)
     'inputMask'       string → '1.234,56' ou '' (para input em tempo real, base centavos)
*/
window.fmtMoney = function(input, mode){
  mode = mode || 'display';
  if(mode === 'display')         return 'R$ ' + Number(input||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(mode === 'displayNoSymbol') return Number(input||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(mode === 'parse'){
    if(!input) return 0;
    return parseFloat(String(input).trim().replace(/R\$\s*/,'').replace(/\./g,'').replace(',','.')) || 0;
  }
  if(mode === 'inputMask'){
    if(!input && input !== 0) return '';
    var raw = String(input).replace(/\D/g,'');
    if(!raw) return '';
    return (parseInt(raw,10)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  return String(input||'');
};

function formatVal(v){return fmtMoney(v, 'display');}
function parseVal(s){return fmtMoney(s, 'parse');}
function formatDate(d){if(!d)return '';const[y,m,dd]=d.split('-');return dd+'/'+m+'/'+y;}

/* ─── Helpers de modal (Fase 1.B — uso opcional, padroniza abrir/fechar) ───
   Padrão atual: classList.add('open') / classList.remove('open') em #xxxOverlay.
   Aceita id (string) ou o próprio elemento. Retorna o elemento ou null. */
window.modalOpen  = function(idOrEl){var el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl; if(el) el.classList.add('open'); return el || null;};
window.modalClose = function(idOrEl){var el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl; if(el) el.classList.remove('open'); return el || null;};

/* ═══════════════════════════════════════════
   SISTEMA DE TURMAS
═══════════════════════════════════════════ */
const IF15_DATA=[
  {cliente:'LAILA',consultor:'LARISSA',entrada:0,info:'FILHA DA LEILA - COMPROU O CI COM O RAFAEL SIMÕES',status:'pago',treinador:'RAFAEL SIMÕES',treinamento:'CI',valor:70000},
  {cliente:'GIOVANNI',consultor:'LARISSA',entrada:0,status:'pago',treinador:'-',treinamento:'BHP',valor:5996.46},
  {cliente:'LEILA',consultor:'LARISSA',entrada:0,status:'aberto',treinador:'RAFAEL SIMÕES',treinamento:'CI',valor:70000},
  {cliente:'MARIA BEATRIZ',consultor:'LARISSA',entrada:0,status:'pago',treinador:'JOSIANE BORGES',treinamento:'CI',valor:30000},
  {cliente:'MARIA BEATRIZ',consultor:'LARISSA',entrada:0,info:'COMPROU O CIS PARA A MARIA LUIZA',status:'pago',treinador:'-',treinamento:'CIS-GL',valor:2396.41},
  {cliente:'MARIA LUIZA',consultor:'LARISSA',entrada:0,status:'aberto',treinador:'JOSIANE BORGES',treinamento:'CI',valor:30000},
  {cliente:'RUAN SERGE',consultor:'DARLEY',entrada:0,status:'aberto',treinador:'THIAGO PINHEIRO',treinamento:'CI',valor:30000},
  {cliente:'RUAN SERGE',consultor:'DARLEY',entrada:0,status:'pago',treinador:'-',treinamento:'CEOP',valor:5996.46},
  {cliente:'TATHIANE',consultor:'DANIEL',entrada:0,status:'aberto',treinador:'THIAGO PINHEIRO',treinamento:'CI',valor:30000},
  {cliente:'DENIZE',consultor:'DARLEY',entrada:0,status:'aberto',treinador:'THIAGO PINHEIRO',treinamento:'CI',valor:30000},
  {cliente:'JOAQUIM',consultor:'DARLEY',entrada:5000,info:'FICOU DE PAGAR O CI DIA 01/04/2026',status:'aberto',treinador:'THIAGO PINHEIRO',treinamento:'CI',valor:30000},
  {cliente:'CRISTIANNE BARBOSA',consultor:'DANIEL',entrada:0,info:'COMPROU NO PITCH DO IF15 PARA O MARIDO\nNOME: JODSON CASTRO\nTREINAMENTOS: \nIF, TCE BLACK E DP',status:'pago',treinador:'-',treinamento:'IF',valor:5996.46},
  {cliente:'JOAQUIM',consultor:'DARLEY',entrada:0,status:'pago',treinador:'-',treinamento:'TAV',valor:2997},
  {cliente:'JOAQUIM',consultor:'DARLEY',entrada:0,status:'pago',treinador:'-',treinamento:'MASTER COACHING',valor:6896},
  {cliente:'JOAQUIM',consultor:'DARLEY',entrada:0,status:'pago',treinador:'-',treinamento:'TOUR BLACK BEL',valor:1497},
  {cliente:'FERNANDA',consultor:'DANIEL',entrada:0,status:'aberto',treinador:'JOSIANE BORGES',treinamento:'CI',valor:30000},
];

/* ── Helpers de turma — tudo vai para turmas/{id} no Firebase ── */
function _getTurmas(){try{return JSON.parse(localStorage.getItem(TURMAS_KEY))||[];}catch(e){return[];}}
function _getTurmaData(id){try{return JSON.parse(localStorage.getItem('ci_turma_'+id))||null;}catch(e){return null;}}

function _migrarIF15(){/* desativado */}

/* Salva turma inteira (meta + clientes) em turmas/{id} */
function _saveTurmaData(id,state){
  if(window._fbSave){
    window._fbSave(TURMAS_NODE+'/'+id,state).catch(function(e){console.error('[FB] save turma erro:',e);});
  }
}

/* Salva apenas metadados (sem clientes) em turmas/{id}/{campo} */
function _saveTurmaMeta(id,campo,valor){
  if(window._fbSave){
    window._fbSave(TURMAS_NODE+'/'+id+'/'+campo,valor).catch(function(e){console.error('[FB] save meta erro:',e);});
  }
}

function _saveTurmas(l){
  // Legacy — apenas para compatibilidade. Preferir _saveTurmaMeta.
  if(window._fbSave){
    // Atualizar ministrante em cada turma individualmente
    if(Array.isArray(l)){
      l.forEach(function(t){
        if(t&&t.id) window._fbSave(TURMAS_NODE+'/'+t.id+'/ministrante',t.ministrante||null).catch(function(){});
      });
    }
  }
}


// ── Navegação centralizada: oculta todas as telas, mostra apenas a pedida ──
var _TELAS=['loginScreen','turmasScreen','telaTurmasScreen','mapeamentoScreen','dashboard','propostaComercialScreen','turmaInativaScreen','novaPipelineScreen'];
function _mostrarTela(id,useFlex){
  _TELAS.forEach(function(t){
    var el=document.getElementById(t);if(el)el.style.display='none';
  });
  var alvo=document.getElementById(id);
  if(alvo)alvo.style.display=useFlex?'flex':'block';
}

function entrarTurma(id){
  // Memorizar de qual tela veio para poder voltar corretamente
  var _TELAS_NAV=['telaTurmasScreen','turmasScreen','propostaComercialScreen'];
  window._telaOrigem='turmasScreen';
  for(var _ti=0;_ti<_TELAS_NAV.length;_ti++){
    var _el=document.getElementById(_TELAS_NAV[_ti]);
    if(_el&&_el.style.display&&_el.style.display!=='none'){window._telaOrigem=_TELAS_NAV[_ti];break;}
  }
  // Buscar metadados da turma do Firebase (índice)
  function _doEntrar(turmaObj,dadosJaCarregados){
    _turmaAtiva=turmaObj;
    window._turmaAtiva=_turmaAtiva;
    if(!_turmaAtiva){_showToast('❌ Turma não encontrada.','var(--red)');return;}
  _periodText='';_periodStart='';_periodEnd='';
  document.getElementById('periodBarInner').style.display='none';
  document.getElementById('periodBarText').textContent='';
  document.getElementById('infoBar').style.display='none';
  document.getElementById('infoBarText').textContent='';
  META=(_turmaAtiva.meta!=null&&_turmaAtiva.meta!==undefined)?_turmaAtiva.meta:0;
  if(!allTrainers.length&&_turmaAtiva.treinadores&&_turmaAtiva.treinadores.length){allTrainers=_turmaAtiva.treinadores.slice();}
  if(!allConsultors.length&&_turmaAtiva.consultores&&_turmaAtiva.consultores.length){allConsultors=_turmaAtiva.consultores.slice();}
  _buildColors();
  document.getElementById('turmaAtivaLabel').textContent=_turmaAtiva.codigo;
  document.getElementById('turmaMetaLabel').innerHTML='META: <strong style="color:var(--text);">'+formatVal(META)+'</strong>';
  document.getElementById('metaValLabel').textContent=formatVal(META);
  _mostrarTela('dashboard');
  // P1: botão ← Turmas visível apenas para ADM
  var _sessBtn=_getSessao?_getSessao():null;
  var _perfilBtn=_sessBtn?_sessBtn.perfil:'adm';
  var _bvt=document.getElementById('btnVoltarTurmas');
  if(_bvt) _bvt.style.display=(_perfilBtn==='adm')?'':'none';

  function _aplicarDados(td){
    data=td&&td.data&&td.data.length?td.data:[];
    document.getElementById('dashTitle').textContent=(td&&td.titulo)||(_turmaAtiva.nome+' — '+_turmaAtiva.codigo);
    if(td&&td.info){document.getElementById('infoBarText').textContent=td.info;document.getElementById('infoBar').style.display='block';}

    // Período fixo — prioridade: turma > dados
    const ps=_turmaAtiva.periodStart||(td&&td.periodStart)||'';
    const pe=_turmaAtiva.periodEnd||(td&&td.periodEnd)||'';
    const pt=_turmaAtiva.periodText||(td&&td.periodText)||'';
    if(ps&&pe){
      _periodStart=ps;_periodEnd=pe;
      _periodText=pt||formatDate(ps)+'  →  '+formatDate(pe);
      document.getElementById('periodBarText').textContent=_periodText;
      document.getElementById('periodBarInner').style.display='flex';
      const psi=document.getElementById('periodStart');if(psi)psi.value=_periodStart;
      const pei=document.getElementById('periodEnd');if(pei)pei.value=_periodEnd;
    }

    // Controle de acesso por perfil
    var sess=_getSessao?_getSessao():null;
    var perfil=sess?sess.perfil:'adm';
    var isAdm=perfil==='adm';

    // Abas visíveis por perfil — lê permissões salvas do usuário se disponível
    var _userPerms=null;
    if(sess&&sess.uid){
      var _localU=_getUsuariosLocal();
      var _uObj=_localU[sess.uid]||null;
      if(_uObj&&_uObj.permissoes) _userPerms=_getPermsUsuario(perfil,_uObj.permissoes);
    }
    if(!_userPerms) _userPerms=_getPermsUsuario(perfil,null);

    // Modo leitura: apenas para perfis sem edição
    if(_userPerms.editar){document.body.classList.remove('modo-leitura');}
    else{document.body.classList.add('modo-leitura');}

    // Proposta: visível para ADM e consultor
    var _btnProp=document.getElementById('btnProposta');
    if(_btnProp)_btnProp.style.display=(isAdm||perfil==='consultor')?'':'none';

    // Botões de período/membros: só ADM
    var _btnPM=document.getElementById('btnPeriodModal');
    if(_btnPM) _btnPM.style.display=isAdm?'':'none';
    ['btnEditarTreinadores','btnEditarConsultores'].forEach(function(bid){
      var b=document.getElementById(bid);if(b)b.style.display=isAdm?'':'none';
    });

    // Exportar: permissão individual
    var _btnExp=document.getElementById('btnExportar');
    if(_btnExp) _btnExp.style.display=(_userPerms&&_userPerms.exportar)?'':'none';

    // Gerenciar turmas: só ADM
    var _btnGT=document.getElementById('btnGerenciarTurmas');
    if(_btnGT) _btnGT.style.display=isAdm?'':'none';

    // Gerenciar usuários: só ADM
    var _btnGU=document.querySelector('[onclick*="abrirPainelUsuarios"]');
    if(_btnGU) _btnGU.style.display=isAdm?'':'none';

    // Configurações críticas: só ADM
    document.querySelectorAll('.title-edit-btn').forEach(function(b){
      var txt=b.textContent||'';
      var bid=b.id||'';
      if(bid==='btnEditarTreinadores'||bid==='btnEditarConsultores'||bid==='btnExportarUsuarios'||bid==='btnPdfConsultor'||bid==='btnProposta') return;
      var isActionBtn=txt.includes('Salvar')||txt.includes('Sincronizar')||
        txt.includes('Desfazer')||txt.includes('Importar')||
        txt.includes('Usuários')||
        b.getAttribute('onclick')==='openInfoModal()'||
        b.getAttribute('onclick')==='openTitleModal()';
      if(isActionBtn) b.style.display=(_userPerms&&_userPerms.configuracoes)?'':'none';
    });

    var _abaMap={geral:'verGeral',consultor:'verConsultor',treinador:'verTreinador',produto:'verProduto'};
    document.querySelectorAll('.tab').forEach(function(b){
      var tab=b.getAttribute('onclick')?b.getAttribute('onclick').match(/switchTab\('(\w+)'\)/):null;
      if(!tab)return;
      var aba=tab[1];
      var visivel=isAdm||((_abaMap[aba]&&_userPerms[_abaMap[aba]])||false);
      b.style.display=visivel?'':'none';
    });

    // Aba inicial por perfil
    var abaInicial={
      'adm':'geral','ministrante':'treinador','consultor':'consultor','treinador':'treinador'
    }[perfil]||'geral';

    // Limpar ministrante residual se não existir na lista de treinadores
    if(_turmaAtiva&&_turmaAtiva.ministrante&&allTrainers.indexOf(_turmaAtiva.ministrante)===-1){
      var _tls=_getTurmas();
      var _tli=_tls.findIndex(function(t){return t.id===_turmaAtiva.id;});
      if(_tli!==-1){_tls[_tli].ministrante=null;_saveTurmas(_tls);_turmaAtiva=_tls[_tli];}
    }

    savedData=JSON.stringify(data);

    // allConsultors e allTrainers já populados pelo entrarTurma (usuarios/ + clientes)
    buildSelects();buildFilterBtns();renderAll();
    switchTab(abaInicial);
    startRealtimeSync();
  }

  // Usar dados já carregados pelo chamador
  document.getElementById('dashTitle').textContent=_turmaAtiva.nome+' — '+_turmaAtiva.codigo;
  if(dadosJaCarregados&&dadosJaCarregados.data&&dadosJaCarregados.data.length){
    _showToast('✅ '+dadosJaCarregados.data.length+' clientes carregados!','var(--accent)');
    _aplicarDados(dadosJaCarregados);
  } else {
    _showToast('⚠️ Nenhum dado encontrado no Firebase para esta turma.','var(--amber)');
    _aplicarDados(dadosJaCarregados||null);
  }
  } // end _doEntrar

  // Firebase: lê nó unificado turmas/{id} + usuarios/ em paralelo
  if(window._fbGet){
    Promise.all([
      window._fbGet(TURMAS_NODE+'/'+id).catch(function(){return null;}),
      window._fbGet('turma_dados/'+id).catch(function(){return null;}),
      window._fbGet('usuarios').catch(function(){return null;})
    ]).then(function(results){
      var fbTurma=results[0];    // novo nó unificado
      var fbDadosAntigo=results[1]; // fallback estrutura antiga
      var fbUsuarios=results[2]; // nó usuarios/

      var consultoresDB=[];
      var treinadoresDB=[];

      // ── Construir turmaObj e dadosFinais ──
      var turmaObj=null;
      var dadosFinais=null;

      if(fbTurma&&typeof fbTurma==='object'){
        // ── Novo nó turmas/{id} ──
        var clientes=fbTurma.clientes;
        if(clientes&&!Array.isArray(clientes)&&typeof clientes==='object'){
          clientes=Object.values(clientes).filter(Boolean);
        }
        clientes=clientes||[];
        // FIX: se clientes vazio no novo nó, tentar fallback para estrutura antiga turma_dados/
        // (idêntico ao que _executarPuxar já faz corretamente)
        if(clientes.length===0&&fbDadosAntigo){
          var _d=fbDadosAntigo.data||fbDadosAntigo;
          if(!Array.isArray(_d)&&typeof _d==='object'){
            _d=Object.values(_d).filter(function(v){return v&&v.cliente;});
          }
          if(Array.isArray(_d)&&_d.length>0) clientes=_d;
        }
        turmaObj={
          id:id, nome:fbTurma.nome||fbTurma.titulo||id,
          codigo:fbTurma.codigo||(id.replace(/^turma_/,'').split('_')[0].toUpperCase()),
          meta:fbTurma.meta||0, ministrante:fbTurma.ministrante||null,
          ordem:fbTurma.ordem||0, criadoEm:fbTurma.criadoEm||'',
          periodStart:fbTurma.periodStart||'', periodEnd:fbTurma.periodEnd||'',
          periodText:fbTurma.periodText||'',
          treinadores:Array.isArray(fbTurma.treinadores)?fbTurma.treinadores:(fbTurma.treinadores?Object.values(fbTurma.treinadores):[]),
          consultores:Array.isArray(fbTurma.consultores)?fbTurma.consultores:(fbTurma.consultores?Object.values(fbTurma.consultores):[])
        };
        dadosFinais={
          data:clientes, titulo:fbTurma.titulo||fbTurma.nome||'',
          info:fbTurma.info||'', periodStart:fbTurma.periodStart||'',
          periodEnd:fbTurma.periodEnd||'', periodText:fbTurma.periodText||''
        };
      } else if(fbDadosAntigo){
        // ── Fallback: estrutura antiga turma_dados/{id} ──
        var d=fbDadosAntigo.data||fbDadosAntigo;
        if(!Array.isArray(d)&&typeof d==='object'){
          d=Object.values(d).filter(function(v){return v&&v.cliente;});
        }
        turmaObj={
          id:id, nome:fbDadosAntigo.titulo||id,
          codigo:(id.replace(/^turma_/,'').split('_')[0].toUpperCase()),
          meta:fbDadosAntigo.meta||0, ministrante:fbDadosAntigo.ministrante||null,
          periodStart:fbDadosAntigo.periodStart||'', periodEnd:fbDadosAntigo.periodEnd||'',
          periodText:fbDadosAntigo.periodText||'',
          treinadores:Array.isArray(fbDadosAntigo.treinadores)?fbDadosAntigo.treinadores:(fbDadosAntigo.treinadores?Object.values(fbDadosAntigo.treinadores):[]),
          consultores:Array.isArray(fbDadosAntigo.consultores)?fbDadosAntigo.consultores:(fbDadosAntigo.consultores?Object.values(fbDadosAntigo.consultores):[])
        };
        dadosFinais={
          data:Array.isArray(d)?d:[], titulo:fbDadosAntigo.titulo||'',
          info:fbDadosAntigo.info||'', periodStart:fbDadosAntigo.periodStart||'',
          periodEnd:fbDadosAntigo.periodEnd||'', periodText:fbDadosAntigo.periodText||''
        };
        // Migração automática removida — sistema só lê, nunca escreve sem ação do usuário
      } else {
        turmaObj={id:id,nome:id,codigo:id.toUpperCase(),meta:0,ministrante:null};
        dadosFinais={data:[]};
      }

      if(dadosFinais.data&&dadosFinais.data.length){
        dadosFinais.data.forEach(function(c){
          if(c.consultor&&c.consultor.trim()&&!consultoresDB.includes(c.consultor)) consultoresDB.push(c.consultor);
          if(c.treinador&&c.treinador.trim()&&c.treinador!=='-'&&!treinadoresDB.includes(c.treinador)) treinadoresDB.push(c.treinador);
        });
      }
      // FIX: incluir consultores/treinadores salvos na turma (campo direto do Firebase)
      // Garante que usuários adicionados sem clientes vinculados persistem
      if(turmaObj&&Array.isArray(turmaObj.consultores)){
        turmaObj.consultores.forEach(function(n){
          if(n&&n.trim()&&!consultoresDB.includes(n)) consultoresDB.push(n);
        });
      }
      if(turmaObj&&Array.isArray(turmaObj.treinadores)){
        turmaObj.treinadores.forEach(function(n){
          if(n&&n.trim()&&n!=='-'&&!treinadoresDB.includes(n)) treinadoresDB.push(n);
        });
      }
      consultoresDB.sort(function(a,b){return a.localeCompare(b,'pt-BR');});
      treinadoresDB.sort(function(a,b){return a.localeCompare(b,'pt-BR');});
      allConsultors=consultoresDB;
      allTrainers=treinadoresDB;

      // Carregar treinamentos customizados salvos na turma
      var _fbTreinList=(fbTurma&&Array.isArray(fbTurma.treinamentos))?fbTurma.treinamentos
        :(fbDadosAntigo&&Array.isArray(fbDadosAntigo.treinamentos))?fbDadosAntigo.treinamentos
        :null;
      if(_fbTreinList&&_fbTreinList.length){
        allTreinamentos.length=0;
        _fbTreinList.forEach(function(t){allTreinamentos.push(t);});
      }

      _doEntrar(turmaObj,dadosFinais);
    }).catch(function(e){
      _showToast('❌ Erro ao carregar turma: '+(e&&e.message?e.message:e),'var(--red)');
    });
  } else {
    _doEntrar({id:id,nome:id,codigo:id.toUpperCase(),meta:0,ministrante:null},null);
  }
}

// Navegação de "voltar" sempre respeita o perfil
// ADM/ministrante → turmasScreen | outros → logout
function _voltarParaHome(){
  var _s=_getSessao?_getSessao():null;
  var _p=_s?_s.perfil:'adm';
  if(_p==='adm'||_p==='ministrante'){
    var _destino=window._telaOrigem||'turmasScreen';
    _mostrarTela(_destino);
    renderTurmasGrid();
  } else {
    logout();
  }
}

function voltarTurmas(){
  if(_turmaAtiva&&(window._fbUpdate||window._fbSave)){
    var patch=_buildPatch();
    var op=window._fbUpdate
      ? window._fbUpdate(TURMAS_NODE+'/'+_turmaAtiva.id, patch)
      : window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id, patch);
    op.catch(function(e){console.error('[FB] voltarTurmas save erro:',e);});
  }
  _resetDirty();
  _turmaAtiva=null;
  _voltarParaHome();
}

function excluirTurma(id,nome){
  if(!confirm('Excluir "'+nome+'" do Firebase?\nEsta ação é permanente e afeta todos os usuários.'))return;
  _showToast('🗑️ Excluindo turma...','var(--muted)');
  if(!window._fbSave){_showToast('❌ Firebase não disponível.','var(--red)');return;}
  // Apagar nó unificado + legados
  Promise.all([
    window._fbSave(TURMAS_NODE+'/'+id, null),
    window._fbSave('turma_dados/'+id, null)
  ]).then(function(){
    if(typeof window._audit==='function') window._audit('turma.delete',{type:'turma',id:id},{nome:nome});
    _showToast('✅ Turma "'+nome+'" excluída!','var(--accent)');
    fecharGerenciarTurmas();
    renderTurmasGrid();
  }).catch(function(e){
    _showToast('❌ Erro: '+(e&&e.message?e.message:e),'var(--red)');
  });
}

let _ntTreinadores=[],_ntConsultores=[];

/* Popula o select de Mês na Pipeline com 6 meses passados + atual + 6 futuros */
function _ntPopularMesMeta(valorAtual){
  var sel=document.getElementById('ntMesMeta');
  if(!sel) return;
  var hoje=new Date();
  var opts=['<option value="">— Automático (mesmo mês do início) —</option>'];
  for(var d=-6;d<=6;d++){
    var dt=new Date(hoje.getFullYear(),hoje.getMonth()+d,1);
    var yr=dt.getFullYear();
    var mo=String(dt.getMonth()+1).padStart(2,'0');
    var key=yr+'-'+mo;
    var M=['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
           'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var lbl=M[dt.getMonth()]+' / '+yr;
    opts.push('<option value="'+key+'"'+(key===valorAtual?' selected':'')+'>'+lbl+'</option>');
  }
  sel.innerHTML=opts.join('');
}

/* Sincroniza o select quando o usuário escolhe a data de início */
function _ntSincronizarMesMeta(){
  var ps=document.getElementById('ntPeriodStart').value;
  var sel=document.getElementById('ntMesMeta');
  if(!sel) return;
  /* Só auto-seleciona se o select ainda está em "Automático" */
  if(!sel.value && ps) {
    var mk=ps.slice(0,7);
    if(sel.querySelector('option[value="'+mk+'"]'))
      sel.value=mk;
  }
}

function abrirNovaTurma(){
  _ntTreinadores=[];_ntConsultores=[];
  ['ntNome','ntCodigo','ntMeta','ntTreinadorInput','ntConsultorInput'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ntPeriodStart').value='';
  document.getElementById('ntPeriodEnd').value='';
  _ntPopularMesMeta('');
  _renderTags();
  _ntCarregarUsuariosFirebase();
  document.getElementById('novaTurmaOverlay').classList.add('open');
  setTimeout(function(){document.getElementById('ntNome').focus();},100);
}

function _ntCarregarUsuariosFirebase(){
  var elT=document.getElementById('ntTreinadorChips');
  var elC=document.getElementById('ntConsultorChips');
  if(!elT||!elC) return;
  elT.innerHTML='<span style="font-size:11px;color:var(--muted);">Carregando...</span>';
  elC.innerHTML='<span style="font-size:11px;color:var(--muted);">Carregando...</span>';
  if(!window._fbGet){elT.innerHTML='';elC.innerHTML='';return;}
  window._fbGet('usuarios').then(function(usuarios){
    var treinadores=[],consultores=[];
    if(usuarios&&typeof usuarios==='object'){
      Object.values(usuarios).forEach(function(u){
        if(!u||!u.nome||u.ativo===false) return;
        var p=u.perfil||'';
        if(p==='treinador'||p==='ministrante') treinadores.push(u.nome.toUpperCase());
        if(p==='consultor') consultores.push(u.nome.toUpperCase());
      });
    }
    treinadores.sort(); consultores.sort();
    window._ntTreinadoresDB=treinadores;
    window._ntConsultoresDB=consultores;
    _renderChips();
  }).catch(function(){
    if(elT) elT.innerHTML='<span style="font-size:11px;color:var(--muted);">Erro ao carregar.</span>';
    if(elC) elC.innerHTML='<span style="font-size:11px;color:var(--muted);">Erro ao carregar.</span>';
  });
}
function _renderChips(){
  var elT=document.getElementById('ntTreinadorChips');
  var elC=document.getElementById('ntConsultorChips');
  var dbT=window._ntTreinadoresDB||[];
  var dbC=window._ntConsultoresDB||[];
  if(elT){
    if(!dbT.length){elT.innerHTML='<span style="font-size:11px;color:var(--muted);">Nenhum treinador no BD.</span>';}
    else{elT.innerHTML=dbT.map(function(n){
      var sel=_ntTreinadores.includes(n);
      return '<button class="fbtn'+(sel?' active':'')+'" onclick="_ntToggleChip(\'treinador\',\''+n+'\')" type="button">'+n+'</button>';
    }).join('');}
  }
  if(elC){
    if(!dbC.length){elC.innerHTML='<span style="font-size:11px;color:var(--muted);">Nenhum consultor no BD.</span>';}
    else{elC.innerHTML=dbC.map(function(n){
      var sel=_ntConsultores.includes(n);
      return '<button class="fbtn'+(sel?' active':'')+'" onclick="_ntToggleChip(\'consultor\',\''+n+'\')" type="button">'+n+'</button>';
    }).join('');}
  }
}
function _ntToggleChip(tipo,nome){
  var arr=tipo==='treinador'?_ntTreinadores:_ntConsultores;
  var idx=arr.indexOf(nome);
  if(idx===-1) arr.push(nome);
  else arr.splice(idx,1);
  _renderTags();
  _renderChips();
}
function fecharNovaTurma(){document.getElementById('novaTurmaOverlay').classList.remove('open');}
function addTag(tipo){
  const inp=document.getElementById('nt'+(tipo==='treinador'?'Treinador':'Consultor')+'Input');
  const val=inp.value.trim().toUpperCase();if(!val)return;
  if(tipo==='treinador'&&!_ntTreinadores.includes(val))_ntTreinadores.push(val);
  if(tipo==='consultor'&&!_ntConsultores.includes(val))_ntConsultores.push(val);
  inp.value='';_renderTags();
}
function removeTag(tipo,val){
  if(tipo==='treinador')_ntTreinadores=_ntTreinadores.filter(t=>t!==val);
  else _ntConsultores=_ntConsultores.filter(c=>c!==val);
  _renderTags();
}
function _renderTags(){
  document.getElementById('ntTreinadorList').innerHTML=_ntTreinadores.map(t=>`<span class="tag-item">${t}<button class="tag-remove" onclick="removeTag('treinador','${t}')">✕</button></span>`).join('');
  document.getElementById('ntConsultorList').innerHTML=_ntConsultores.map(c=>`<span class="tag-item">${c}<button class="tag-remove" onclick="removeTag('consultor','${c}')">✕</button></span>`).join('');
  _renderChips();
}
function salvarNovaTurma(){
  const nome=document.getElementById('ntNome').value.trim();
  const codigo=document.getElementById('ntCodigo').value.trim().toUpperCase();
  const meta=parseFloat(document.getElementById('ntMeta').value)||0;
  const periodStart=document.getElementById('ntPeriodStart').value;
  const periodEnd=document.getElementById('ntPeriodEnd').value;
  if(!nome){alert('Informe o nome.');return;}
  if(!codigo){alert('Informe o código.');return;}
  // meta é opcional — 0 é valor válido
  if(!periodStart){alert('Informe a data de início do período.');return;}
  if(!periodEnd){alert('Informe a data de fim do período.');return;}
  if(periodEnd<periodStart){alert('A data de fim deve ser após a data de início.');return;}
  // Treinadores são opcionais — apenas consultores são obrigatórios
  if(!_ntConsultores.length){alert('Adicione ao menos um consultor.');return;}
  const periodText=formatDate(periodStart)+'  →  '+formatDate(periodEnd);
  var id='turma_'+codigo.toLowerCase()+'_'+Date.now();
  var ordemAtual=0; // será ajustado na lista
  /* mesMeta: explícito se selecionado, senão fallback para mês de início */
  var mesMeta=(document.getElementById('ntMesMeta')||{value:''}).value||periodStart.slice(0,7);
  var novaTurmaObj={
    id:id, nome:nome, codigo:codigo, meta:meta,
    titulo:nome+' — '+codigo, info:'',
    periodStart:periodStart, periodEnd:periodEnd, periodText:periodText,
    mesMeta:mesMeta,
    criadoEm:new Date().toLocaleDateString('pt-BR'),
    ministrante:null, ordem:Date.now(),
    treinadores:_ntTreinadores.slice(),
    consultores:_ntConsultores.slice(),
    clientes:[]
  };
  if(window._fbSave){
    window._fbSave(TURMAS_NODE+'/'+id, novaTurmaObj).then(function(){
      if(typeof window._audit==='function') window._audit('turma.create',{type:'turma',id:id},{nome:nome,codigo:codigo});
      fecharNovaTurma();renderTurmasGrid();
      _showToast('✅ Turma "'+nome+'" criada!','var(--accent)');
    }).catch(function(e){
      _showToast('❌ Erro ao criar turma: '+(e&&e.message?e.message:e),'var(--red)');
    });
  } else {
    _showToast('❌ Firebase não disponível.','var(--red)');
  }
  if(typeof _addPendLog==='function')_addPendLog('Nova turma criada',nome+' ('+codigo+')','🏫');
}

/* ═══════════════════════════════════════════
   PERSISTÊNCIA
═══════════════════════════════════════════ */
function saveStorage(){
  if(_turmaAtiva&&(window._fbUpdate||window._fbSave)){
    var patch=_buildPatch();
    var op=window._fbUpdate
      ? window._fbUpdate(TURMAS_NODE+'/'+_turmaAtiva.id, patch)
      : window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id, patch);
    op.catch(function(e){ console.error('[FB] saveStorage erro:',e); });
  }
  try{window._bc.postMessage({data,_turmaId:_turmaAtiva?_turmaAtiva.id:null});}catch(e){}
}
function applyState(s){
  if(!s)return;
  if(s.data&&s.data.length)data=s.data;
  if(s.titulo){const el=document.getElementById('dashTitle');if(el)el.textContent=s.titulo;}
  if(s.info&&document.getElementById('infoBarText')){document.getElementById('infoBarText').textContent=s.info;document.getElementById('infoBar').style.display='block';}
  if(s.periodText){
    _periodText=s.periodText;_periodStart=s.periodStart||'';_periodEnd=s.periodEnd||'';
    const el=document.getElementById('periodBarText');if(el)el.textContent=s.periodText;
    const bar=document.getElementById('periodBarInner');if(bar)bar.style.display='flex';
    const ps=document.getElementById('periodStart');if(ps)ps.value=_periodStart;
    const pe=document.getElementById('periodEnd');if(pe)pe.value=_periodEnd;
  }
}
function startRealtimeSync(){
  try{window._bc=new BroadcastChannel(STORAGE_KEY);window._bc.onmessage=function(e){if(document.getElementById('dashboard').style.display==='none')return;applyState(e.data);renderAll();const a=document.querySelector('.tab.active');if(a){const t=a.textContent.toLowerCase();if(t==='consultor')renderConsultor();if(t==='treinador')renderTreinador();}};}catch(e){}
  window.addEventListener('storage',function(e){
    if(e.key!==STORAGE_KEY) return;
    if(document.getElementById('dashboard').style.display==='none') return;
    try{
      var newState=JSON.parse(e.newValue);
      /* Se outra aba está numa turma diferente, ignorar para evitar dados cruzados */
      var turmaAtivaId=(typeof _turmaAtiva!=='undefined' && _turmaAtiva && _turmaAtiva.id) ? _turmaAtiva.id : null;
      if(newState && newState.turmaId && turmaAtivaId && newState.turmaId !== turmaAtivaId) return;
      applyState(newState);
      renderAll();
    }catch(er){}
  });
}

/* ═══════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════ */

function _getSessao(){try{return JSON.parse(sessionStorage.getItem('ci_sessao'));}catch(e){return null;}}
function _setSessao(s){sessionStorage.setItem('ci_sessao',JSON.stringify(s));}
function _clearSessao(){sessionStorage.removeItem('ci_sessao');}

function _entrarDashboardEquipe(user){
  _mostrarTela('dashboard'); // oculta tudo imediatamente enquanto carrega
  _carregarTurmaGlobalAtiva(function(){
    if(!_turmaGlobalAtiva){
      _mostrarPropostaComercial();
      return;
    }
    entrarTurma(_turmaGlobalAtiva);
  });
}

/* Converte login (ex: "larissa") em email sintético para Firebase Auth */
function _loginToEmail(login){
  return (login||'').toLowerCase().replace(/[^a-z0-9_.\-]/g,'_')+'@febracis-internal.local';
}

/* Finaliza o login após identificar o usuário (Auth ou legado) */
function _concluirLogin(uid,user,loginStr,manter){
  var sessao=JSON.stringify({login:loginStr,perfil:user.perfil,nome:user.nome,uid:uid,vinculo:user.vinculo||user.nome});
  sessionStorage.setItem('ci_sessao',sessao);
  if(manter) localStorage.setItem('ci_sessao_persistente',sessao);
  else localStorage.removeItem('ci_sessao_persistente');
  if(user.primeiroAcesso){
    _abrirModalPrimeiroAcesso(uid,user.nome);
    return;
  }
  if(user.primeiroAcesso!==false){
    var _localU=_getUsuariosLocal();
    if(_localU[uid]){_localU[uid].primeiroAcesso=false;_saveUsuariosLocal(_localU);}
    if(window._fbUpdate){
      window._fbUpdate('usuarios/'+uid,{primeiroAcesso:false,lastLogin:Date.now()})
        .catch(function(e){console.warn('[login] primeiroAcesso update:',e);});
    }
  }
  _addUsuarioRecente(uid, user.nome, user.perfil);

  /* Migração silenciosa: se usuário tem senha em texto plano e ainda não tem authUid,
     cria conta Firebase Auth e apaga a senha do RTDB */
  if(user.senha && !user.authUid && window._fbAuthCreate && window._fbUpdate){
    var _emailMigr = _loginToEmail(loginStr);
    var _senhaMigr = user.senha;
    window._fbAuthCreate(_emailMigr, _senhaMigr).then(function(cred){
      var updates = {authUid: cred.user.uid, lastLogin: Date.now()};
      updates['senha'] = null; /* apaga senha em texto plano */
      window._fbUpdate('usuarios/'+uid, updates).catch(function(){});
      console.info('[auth] Usuário migrado para Firebase Auth:', loginStr);
    }).catch(function(e){
      /* conta pode já existir — apenas remove a senha local do RTDB */
      if(e.code === 'auth/email-already-in-use'){
        window._fbUpdate('usuarios/'+uid, {senha: null, lastLogin: Date.now()}).catch(function(){});
      }
    });
  } else if(window._fbUpdate){
    window._fbUpdate('usuarios/'+uid, {lastLogin: Date.now()}).catch(function(){});
  }

  _mostrarTela('dashboard');
  _entrarDashboardEquipe(user);
  if(typeof window._audit==='function') window._audit('auth.login',null,{perfil:user.perfil||'—'});
  if(typeof window._notifListen==='function') window._notifListen();
}

function doLogin(){
  var u=document.getElementById('loginUser').value.trim();
  var p=document.getElementById('loginPass').value.trim();
  var manter=document.getElementById('manterConectado').checked;
  document.getElementById('loginErr').style.display='none';
  if(!u||!p){document.getElementById('loginErr').style.display='block';return;}
  if(u==='adm'){
    var senhaAdm=localStorage.getItem('ci_adm_senha')||'adm123';
    if(p===senhaAdm){
      var sessao=JSON.stringify({login:'adm',perfil:'adm',nome:'ADM'});
      sessionStorage.setItem('ci_sessao',sessao);
      if(manter) localStorage.setItem('ci_sessao_persistente',sessao);
      else localStorage.removeItem('ci_sessao_persistente');
      _mostrarTela('turmasScreen');
      _mostrarTurmas();
    } else {
      document.getElementById('loginErr').style.display='block';
    }
    return;
  }

  var _loginErr=function(){document.getElementById('loginErr').style.display='block';};
  var _authDisponivel=typeof window._fbAuthLogin==='function';

  /* Caminho legado: buscar senha no RTDB */
  function _loginLegado(migrarAuthEmBackground){
    window._fbGet('usuarios').then(function(usuarios){
      if(!usuarios){_loginErr();return;}
      var entry=Object.entries(usuarios).find(function(e){return e[1].login===u&&e[1].senha===p&&e[1].ativo!==false;});
      if(!entry){_loginErr();return;}
      var uid=entry[0],user=entry[1];
      /* Tentar migrar para Auth em background sem bloquear o fluxo */
      if(migrarAuthEmBackground&&_authDisponivel){
        window._fbAuthCreate(_loginToEmail(u),p).then(function(cred2){
          window._fbUpdate('usuarios/'+uid,{authUid:cred2.user.uid}).catch(function(){});
        }).catch(function(){/* conta pode já existir */});
      }
      _concluirLogin(uid,user,u,manter);
    }).catch(_loginErr);
  }

  if(!_authDisponivel){
    /* Auth ainda não carregado — usar legado direto */
    _loginLegado(false);
    return;
  }

  /* Tentativa Auth-first */
  window._fbAuthLogin(_loginToEmail(u),p).then(function(cred){
    /* Auth ok — localizar dados do usuário no RTDB pelo login */
    return window._fbGet('usuarios').then(function(usuarios){
      var entry=null;
      if(usuarios) entry=Object.entries(usuarios).find(function(e){return e[1].login===u&&e[1].ativo!==false;});
      if(!entry){_loginErr();return;}
      var uid=entry[0],user=entry[1];
      /* Vincular authUid se ainda não estiver salvo */
      if(!user.authUid){
        window._fbUpdate('usuarios/'+uid,{authUid:cred.user.uid}).catch(function(){});
      }
      _concluirLogin(uid,user,u,manter);
    });
  }).catch(function(authErr){
    /* Auth falhou — verificar feature flag antes de tentar legado */
    window._fbGet('config/featureFlags/authObrigatorio').then(function(obrigatorio){
      if(obrigatorio){
        /* Auth obrigatório ativado — não usar fallback */
        _loginErr();
      } else {
        /* Fallback legado com migração em background */
        _loginLegado(true);
      }
    }).catch(function(){
      /* Sem acesso ao nó de config — usar legado como segurança */
      _loginLegado(true);
    });
  });
}
/* ── Fix 2: Primeiro acesso e reset de senha ── */
function _abrirModalPrimeiroAcesso(uid,nome){
  var el=document.getElementById('primeiroAcessoOverlay');
  if(!el){
    var div=document.createElement('div');
    div.className='modal-overlay';
    div.id='primeiroAcessoOverlay';
    // Construção via DOM para evitar problema de aspas em onkeydown
    var modalDiv=document.createElement('div');
    modalDiv.className='modal';
    modalDiv.style.cssText='width:min(380px,92vw);max-height:90vh;overflow-y:auto;';
    modalDiv.innerHTML=[
      '<div class="modal-title">&#128272; Redefinir senha</div>',
      '<div class="modal-subtitle">Este é seu primeiro acesso. Por favor, defina uma nova senha.</div>',
      '<input type="hidden" id="paTmpUid">',
      '<div class="modal-field"><label class="modal-label">Nova senha</label>',
      '<input class="modal-input" type="password" id="paNovaSenha" placeholder="Mínimo 4 caracteres"></div>',
      '<div class="modal-field"><label class="modal-label">Confirmar senha</label>',
      '<input class="modal-input" type="password" id="paConfirmarSenha" placeholder="Repetir senha"></div>',
      '<div class="modal-actions">',
      '<button class="modal-save" onclick="_confirmarPrimeiroAcesso()">Salvar nova senha</button>',
      '</div>'
    ].join('');
    div.appendChild(modalDiv);
    document.body.appendChild(div);
    // Adicionar listener de Enter após inserir no DOM
    setTimeout(function(){
      ['paNovaSenha','paConfirmarSenha'].forEach(function(id){
        var inp=document.getElementById(id);
        if(inp) inp.addEventListener('keydown',function(e){
          if(e.key==='Enter') _confirmarPrimeiroAcesso();
        });
      });
    },50);
  }
  document.getElementById('paTmpUid').value=uid;
  document.getElementById('primeiroAcessoOverlay').classList.add('open');
  setTimeout(function(){var inp=document.getElementById('paNovaSenha');if(inp)inp.focus();},100);
}

function _confirmarPrimeiroAcesso(){
  var uid=document.getElementById('paTmpUid').value;
  var nova=(document.getElementById('paNovaSenha')||{value:''}).value.trim();
  var conf=(document.getElementById('paConfirmarSenha')||{value:''}).value.trim();
  if(!nova||nova.length<4){_showToast('❌ Senha deve ter pelo menos 4 caracteres.','var(--red)');return;}
  if(nova!==conf){_showToast('❌ Senhas não conferem.','var(--red)');return;}
  // Atualizar local e Firebase
  var local=_getUsuariosLocal();
  if(local[uid]){local[uid].senha=nova;local[uid].primeiroAcesso=false;_saveUsuariosLocal(local);}
  // FIX: usar _fbUpdate (merge) em vez de _fbSave (set/replace) para não apagar o resto do usuário
  if(window._fbUpdate){
    window._fbUpdate('usuarios/'+uid,{senha:nova,primeiroAcesso:false,updatedAt:Date.now()})
      .catch(function(e){console.error('[primeiroAcesso]',e);});
  } else if(window._fbSave){
    window._fbSave('usuarios/'+uid+'/senha',nova).catch(function(e){console.error('[primeiroAcesso senha]',e);});
    window._fbSave('usuarios/'+uid+'/primeiroAcesso',false);
    window._fbSave('usuarios/'+uid+'/updatedAt',Date.now());
  }
  // Atualizar senha no Firebase Auth (se o usuário estiver autenticado via Auth)
  if(typeof window._fbAuthUpdatePass==='function'){
    window._fbAuthUpdatePass(nova).catch(function(e){
      console.warn('[primeiroAcesso] Auth updatePassword:',e.code||e.message);
    });
  }
  document.getElementById('primeiroAcessoOverlay').classList.remove('open');
  _showToast('✅ Senha redefinida! Bem-vindo!','var(--accent)');
  // Continuar para o dashboard
  var sess=_getSessao?_getSessao():null;
  if(sess){
    var user={perfil:sess.perfil,nome:sess.nome,vinculo:sess.vinculo};
    _mostrarTela('dashboard');
    _entrarDashboardEquipe(user);
  }
}

/* Resetar senha — ADM pode usar em qualquer usuário */
function resetarSenhaUsuario(uid,nome){
  if(!confirm('Resetar senha de '+nome+'?\nA nova senha será o nome do usuário.')) return;
  var novaSenha=(nome||'').toLowerCase().replace(/\s+/g,'');
  var local=_getUsuariosLocal();
  if(local[uid]){local[uid].senha=novaSenha;local[uid].primeiroAcesso=true;_saveUsuariosLocal(local);}
  if(window._fbSave){
    if(window._fbUpdate){
      window._fbUpdate('usuarios/'+uid,{senha:novaSenha,primeiroAcesso:true,updatedAt:Date.now()})
        .then(function(){_showToast('✅ Senha de '+nome+' resetada!','var(--accent)');})
        .catch(function(e){_showToast('⚠️ Salvo localmente.','var(--amber)');console.error(e);});
    } else {
      window._fbSave('usuarios/'+uid+'/senha',novaSenha);
      window._fbSave('usuarios/'+uid+'/primeiroAcesso',true);
      _showToast('✅ Senha de '+nome+' resetada!','var(--accent)');
    }
  } else {
    _showToast('✅ Senha resetada localmente.','var(--accent)');
  }
  _renderUsuariosGrid();
}
window.resetarSenhaUsuario=resetarSenhaUsuario;


function _mostrarTurmas(){
  _mostrarTela('turmasScreen');
  var sess=_getSessao?_getSessao():null;
  var isAdm=!sess||sess.perfil==='adm';
  var isAdmOuMin=isAdm||(sess&&sess.perfil==='ministrante');
  // Card TURMAS: ADM e ministrante
  var btnCardT=document.getElementById('btnCardTurmas');
  if(btnCardT) btnCardT.style.display=isAdmOuMin?'':'none';
  // Card MAPEAMENTO: só ADM
  var btnMap=document.getElementById('btnMapHome');
  if(btnMap) btnMap.style.display=isAdm?'':'none';
  renderTurmasGrid();
}
// Auto-login: verificar sessão persistente no localStorage
(function(){
  try{
    var s=localStorage.getItem('ci_sessao_persistente');
    if(s){
      var sessao=JSON.parse(s);
      sessionStorage.setItem('ci_sessao',s);
      window.addEventListener('DOMContentLoaded',function(){
        if(sessao.perfil==='adm') _mostrarTurmas();
        else _entrarDashboardEquipe(sessao);
      });
    }
  }catch(e){}
})();
function logout(){
  if(typeof window._notifUnlisten==='function') window._notifUnlisten();
  if(typeof window._fbAuthLogout==='function') window._fbAuthLogout().catch(function(){});
  sessionStorage.removeItem('adm_logged');
  sessionStorage.removeItem('ci_sessao');
  localStorage.removeItem('ci_sessao_persistente');
  _mostrarTela('loginScreen',true);
  document.getElementById('loginUser').value='';document.getElementById('loginPass').value='';
  _turmaAtiva=null;
}

/* Migração única: cria contas Auth para todos os usuários do RTDB que ainda não têm.
   Chamar via console: _migrarUsuariosParaAuth()
   Senha padrão usada: o campo "senha" do RTDB (ou "Febracis@2024" se ausente). */
async function _migrarUsuariosParaAuth(){
  if(typeof window._fbAuthCreate!=='function'||typeof window._fbGet!=='function'){
    console.warn('[migração] Auth ou RTDB indisponíveis.');return;
  }
  var usuarios=await window._fbGet('usuarios');
  if(!usuarios){console.warn('[migração] Nenhum usuário no RTDB.');return;}
  var total=0,ok=0,skip=0,erros=0;
  for(var _entry of Object.entries(usuarios)){
    var _uid=_entry[0],_u=_entry[1];
    total++;
    if(_u.authUid){skip++;continue;}
    var _email=_loginToEmail(_u.login||_uid);
    var _senha=_u.senha||'Febracis@2024';
    try{
      var _cred=await window._fbAuthCreate(_email,_senha);
      await window._fbUpdate('usuarios/'+_uid,{authUid:_cred.user.uid});
      ok++;console.log('[migração] ✅',_u.nome,'→',_email);
    }catch(_e){
      if(_e.code==='auth/email-already-in-use'){skip++;console.log('[migração] ⚠️ já existe:',_email);}
      else{erros++;console.error('[migração] ❌',_u.nome,_e.code||_e.message);}
    }
  }
  var _msg='[migração] Concluída: '+total+' usuários | '+ok+' migrados | '+skip+' pulados | '+erros+' erros.';
  console.log(_msg);
  if(typeof _showToast==='function') _showToast('✅ Migração: '+ok+' de '+total+' migrados','var(--accent)');
}
window._migrarUsuariosParaAuth=_migrarUsuariosParaAuth;

/* Migração opt-in: define mesMeta=periodEnd para turmas legadas sem vínculo explícito.
   Usar dryRun:true (padrão) para prévia sem gravar. Confirmar e executar com dryRun:false.
   Chamar via console: await _migrarMesMetaLegado()  ou  await _migrarMesMetaLegado({dryRun:false}) */
async function _migrarMesMetaLegado({dryRun=true}={}){
  if(typeof window._fbGet!=='function'||typeof window._fbUpdate!=='function'){
    console.warn('[migração mesMeta] Firebase indisponível.');return[];
  }
  var turmas=await window._fbGet('turmas');
  if(!turmas){console.warn('[migração mesMeta] Nenhuma turma.');return[];}
  var preview=[],total=0,skip=0;
  for(var _e of Object.entries(turmas)){
    var _id=_e[0],_t=_e[1];
    if(_t.mesMeta){skip++;continue;}
    var _anchor=(_t.periodEnd||_t.periodStart||'').slice(0,7);
    if(!_anchor){console.warn('[migração mesMeta] Turma sem período:',_id,_t.nome);skip++;continue;}
    preview.push({id:_id,nome:_t.nome||_id,mesMeta:_anchor,origem:'periodEnd'});
    total++;
    if(!dryRun){
      await window._fbUpdate('turmas/'+_id,{mesMeta:_anchor,mesMetaOrigem:'migracao-auto-periodEnd'});
    }
  }
  var msg='[migração mesMeta] '+(dryRun?'PRÉVIA':'CONCLUÍDA')+': '+total+' turmas | '+skip+' puladas (já têm mesMeta)';
  console.log(msg);
  console.table(preview);
  if(!dryRun&&typeof _showToast==='function')
    _showToast('✅ mesMeta migrado: '+total+' turmas atualizadas','var(--accent)');
  return preview;
}
window._migrarMesMetaLegado=_migrarMesMetaLegado;

/* ═══════════════════════════════════════════
   SAVE / DISCARD
═══════════════════════════════════════════ */
function markUnsaved(categoria){
  document.getElementById('saveBar').classList.add('visible');
  if(categoria&&_dashDirty.hasOwnProperty(categoria)) _dashDirty[categoria]=true;
  else _dashDirty.clientes=true; // padrão: edição de dados de cliente
}
function confirmSave(){
  if(_turmaAtiva&&(window._fbUpdate||window._fbSave)){
    var patch=_buildPatch();
    var _before=_snapshotBefore();
    _setSaveStatus('saving');
    var op=window._fbUpdate
      ? window._fbUpdate(TURMAS_NODE+'/'+_turmaAtiva.id, patch)
      : window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id, patch);
    op.then(function(){
      savedData=JSON.stringify(data);
      document.getElementById('saveBar').classList.remove('visible');
      _resetDirty();
      _setSaveStatus('saved');
      if(typeof window._audit==='function') window._audit('turma.update',{type:'turma',id:_turmaAtiva.id},_buildAuditDiff(_before,patch));
      _showToast('🔥 Salvo no Firebase!','success');
    }).catch(function(e){
      _setSaveStatus('error');
      _showToast('❌ Erro ao salvar: '+(e&&e.message?e.message:e),'error');
    });
  } else {
    saveStorage();
    savedData=JSON.stringify(data);
    document.getElementById('saveBar').classList.remove('visible');
    _resetDirty();
    _setSaveStatus('saved');
    _showToast('💾 Salvo localmente!','success');
  }
}
// ═══════════════════════════════════════════════════════════
// MÓDULO MAPEAMENTO — Análise consolidada cross-turmas
// ═══════════════════════════════════════════════════════════
var _mapDados = null;       // cache de dados do Firebase
var _mapAnoSel = 0;         // ano selecionado (0 = todos)
var _mapMesesSel = [];      // [] = todos os meses

function abrirTelaTurmas(){
  var _sT=_getSessao?_getSessao():null;
  var _pT=_sT?_sT.perfil:'adm';
  if(_pT!=='adm'&&_pT!=='ministrante'){_showToast('❌ Acesso restrito.','var(--red)');return;}
  _mostrarTela('telaTurmasScreen');
  renderTurmasGrid();
  // Restaurar layout persistido após renderizar
  if(_tturmasView!=='cards') setTimeout(function(){_tturmasSetView(_tturmasView);},50);
}
function fecharTelaTurmas(){
  _mostrarTela('turmasScreen');
  renderTurmasGrid();
}

function abrirMapeamento(){
  var _sM=_getSessao?_getSessao():null;
  var _pM=_sM?_sM.perfil:'adm';
  if(_pM!=='adm'){_showToast('❌ Acesso restrito ao ADM.','var(--red)');return;}
  _mostrarTela('mapeamentoScreen');
  _mapCarregar(false);
}
function fecharMapeamento(){
  _mostrarTela('turmasScreen');
}


function _mapCarregar(forcar) {
  if (!window._fbGet) { _showToast('❌ Firebase não disponível.', 'var(--red)'); return; }
  // Se já tem cache e não está forçando atualização, apenas filtra
  if (_mapDados && !forcar) { _mapFiltrar(); return; }

  var loading = document.getElementById('mapLoading');
  var vazio   = document.getElementById('mapVazio');
  if (loading) loading.style.display = 'block';
  if (vazio)   vazio.style.display   = 'none';
  _mapLimparUI();

  window._fbGet(TURMAS_NODE).then(function(fbTurmas) {
    if (loading) loading.style.display = 'none';
    if (!fbTurmas || !Object.keys(fbTurmas).length) {
      if (vazio) vazio.style.display = 'block';
      return;
    }

    // Consolidar todos os clientes pagos de todas as turmas
    var registros = []; // { consultor, treinamento, valor, ano, mes, turmaId }
    var anosSet   = new Set();

    Object.keys(fbTurmas).forEach(function(tid) {
      var t = fbTurmas[tid];
      if (!t) return;
      var periodStart = t.periodStart || '';
      var ano = 0, mes = 0;
      if (periodStart) {
        var partes = periodStart.split('-');
        ano = parseInt(partes[0]) || 0;
        mes = parseInt(partes[1]) || 0;
      }
      if (ano > 0) anosSet.add(ano);

      var clientes = t.clientes;
      if (clientes && !Array.isArray(clientes) && typeof clientes === 'object')
        clientes = Object.values(clientes).filter(Boolean);
      clientes = clientes || [];

      clientes.forEach(function(c) {
        if (!c || c.status !== 'pago') return; // apenas PAGO
        registros.push({
          consultor:   (c.consultor   || '—').trim().toUpperCase(),
          treinamento: (c.treinamento || '').trim().toUpperCase(),
          valor:       c.valor || 0,
          ano:         ano,
          mes:         mes,
          turmaId:     tid
        });
      });
    });

    _mapDados = registros;

    // Popular select de anos (2026 em diante)
    var anos = Array.from(anosSet).filter(function(a) { return a >= 2026; }).sort();
    if (anos.length === 0) anos = [new Date().getFullYear()];
    var sel = document.getElementById('mapAno');
    if (sel) {
      sel.innerHTML = '<option value="0">Todos</option>' +
        anos.map(function(a) { return '<option value="' + a + '">' + a + '</option>'; }).join('');
      // Selecionar o ano mais recente por padrão
      sel.value = anos[anos.length - 1];
      _mapAnoSel = anos[anos.length - 1];
    }
    _mapMesesSel = []; // todos os meses

    _mapFiltrar();
  }).catch(function(e) {
    if (loading) loading.style.display = 'none';
    _showToast('❌ Erro ao carregar: ' + (e && e.message ? e.message : e), 'var(--red)');
  });
}

function _mapFiltrar() {
  if (!_mapDados) return;
  var sel = document.getElementById('mapAno');
  _mapAnoSel = sel ? parseInt(sel.value) || 0 : 0;

  // Filtrar registros pelo período
  var registros = _mapDados.filter(function(r) {
    if (_mapAnoSel > 0 && r.ano !== _mapAnoSel) return false;
    if (_mapMesesSel.length > 0 && !_mapMesesSel.includes(r.mes)) return false;
    return true;
  });

  _mapRenderKpis(registros);
  _mapRenderConsultores(registros);
  _mapRenderCorrelacao(registros);
  _mapRenderTreinamentos(registros);

  // Atualizar label de período
  var el = document.getElementById('mapFatPeriodo');
  if (el) {
    var label = _mapAnoSel > 0 ? String(_mapAnoSel) : 'Todos os anos';
    if (_mapMesesSel.length > 0) {
      var nomes = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      label += ' · ' + _mapMesesSel.map(function(m) { return nomes[m]; }).join(', ');
    }
    el.textContent = label;
  }

  var vazio = document.getElementById('mapVazio');
  if (vazio) vazio.style.display = registros.length === 0 ? 'block' : 'none';
}

function _mapToggleMes(m) {
  var idx = _mapMesesSel.indexOf(m);
  if (idx >= 0) _mapMesesSel.splice(idx, 1);
  else          _mapMesesSel.push(m);
  _mapAtualizarBotoesMes();
  _mapFiltrar();
}

function _mapToggleMesTodos() {
  _mapMesesSel = [];
  _mapAtualizarBotoesMes();
  _mapFiltrar();
}

function _mapAtualizarBotoesMes() {
  var todos = document.getElementById('mapMTodos');
  if (todos) todos.className = 'fbtn' + (_mapMesesSel.length === 0 ? ' active' : '');
  for (var m = 1; m <= 12; m++) {
    var btn = document.getElementById('mapM' + m);
    if (btn) btn.className = 'fbtn' + (_mapMesesSel.includes(m) ? ' active' : '');
  }
}

function _mapLimparUI() {
  ['mapKpis','mapConsultorRows','mapTreinamentoRows'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  var t = document.getElementById('mapCorrelacaoTable'); if (t) t.innerHTML = '';
}

function _mapRenderKpis(registros) {
  var totalFat   = registros.reduce(function(a, r) { return a + r.valor; }, 0);
  var consultores = [...new Set(registros.map(function(r) { return r.consultor; }))];
  var treinamentos = [...new Set(registros.map(function(r) { return r.treinamento; }))];
  var melhor = '';
  var melhorVal = 0;
  consultores.forEach(function(c) {
    var v = registros.filter(function(r) { return r.consultor === c; }).reduce(function(a, r) { return a + r.valor; }, 0);
    if (v > melhorVal) { melhorVal = v; melhor = c; }
  });

  var kpis = [
    { label: 'Faturamento Total', val: formatVal(totalFat), cor: 'var(--accent)' },
    { label: 'Clientes Pagos',    val: registros.length,    cor: 'var(--blue)'   },
    { label: 'Consultores',       val: consultores.length,  cor: 'var(--green)'  },
    { label: 'Treinamentos',      val: treinamentos.length, cor: 'var(--amber)'  },
    { label: 'Maior Performance', val: melhor || '—',       cor: '#c8f05a'       },
  ];

  var el = document.getElementById('mapKpis');
  if (!el) return;
  el.innerHTML = kpis.map(function(k) {
    return '<div class="tpanel" style="padding:16px 18px;">'
      + '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">' + k.label + '</div>'
      + '<div style="font-size:20px;font-weight:800;color:' + k.cor + ';line-height:1.1;">' + k.val + '</div>'
      + '</div>';
  }).join('');
}

function _mapRenderConsultores(registros) {
  var totalGeral = registros.reduce(function(a, r) { return a + r.valor; }, 0);
  var map = {};
  registros.forEach(function(r) {
    if (!map[r.consultor]) map[r.consultor] = { total: 0, qtd: 0 };
    map[r.consultor].total += r.valor;
    map[r.consultor].qtd++;
  });
  var lista = Object.keys(map).map(function(c) {
    return { nome: c, total: map[c].total, qtd: map[c].qtd };
  }).sort(function(a, b) { return b.total - a.total; });

  var el = document.getElementById('mapConsultorRows');
  if (!el) return;
  if (!lista.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px;">Nenhum dado no período.</div>'; return; }

  var maxVal = lista[0].total || 1;
  var medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = lista.map(function(c, i) {
    var pct = totalGeral > 0 ? ((c.total / totalGeral) * 100).toFixed(1) : '0.0';
    var bw  = Math.round((c.total / maxVal) * 100);
    var cor = i === 0 ? '#c8f05a' : i === 1 ? 'var(--blue)' : i === 2 ? 'var(--amber)' : 'var(--muted)';
    return '<div style="padding:12px 14px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border2);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
      + '<div style="display:flex;align-items:center;gap:8px;">'
      + '<span style="font-size:16px;">' + (medals[i] || (i + 1) + 'º') + '</span>'
      + '<span style="font-weight:700;font-size:13px;color:var(--text);">' + c.nome + '</span>'
      + '<span style="font-size:11px;color:var(--muted);">' + c.qtd + ' cliente' + (c.qtd !== 1 ? 's' : '') + '</span>'
      + '</div>'
      + '<div style="text-align:right;">'
      + '<div style="font-size:15px;font-weight:800;color:' + cor + ';">' + formatVal(c.total) + '</div>'
      + '<div style="font-size:10px;color:var(--muted);">' + pct + '% do total</div>'
      + '</div></div>'
      + '<div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;">'
      + '<div style="height:100%;width:' + bw + '%;background:' + cor + ';border-radius:3px;transition:width .4s;"></div>'
      + '</div></div>';
  }).join('');
}

function _mapRenderCorrelacao(registros) {
  var consultores  = [...new Set(registros.map(function(r) { return r.consultor; }))].sort();
  var treinamentos = [...new Set(registros.map(function(r) { return r.treinamento; }))].sort();
  var el = document.getElementById('mapCorrelacaoTable');
  if (!el) return;
  if (!registros.length) { el.innerHTML = ''; return; }

  var html = '<thead><tr><th style="text-align:left;min-width:120px;">Consultor</th>';
  treinamentos.forEach(function(p) {
    html += '<th style="text-align:center;white-space:nowrap;">' + p + '</th>';
  });
  html += '<th style="text-align:center;white-space:nowrap;">Total</th></tr></thead><tbody>';

  consultores.forEach(function(c) {
    var linhaTotal = registros.filter(function(r) { return r.consultor === c; }).reduce(function(a, r) { return a + r.valor; }, 0);
    if (linhaTotal === 0) return;
    html += '<tr><td style="font-weight:600;text-align:left;text-transform:uppercase;">' + c + '</td>';
    treinamentos.forEach(function(p) {
      var rows = registros.filter(function(r) { return r.consultor === c && r.treinamento === p; });
      if (rows.length > 0) {
        var v = rows.reduce(function(a, r) { return a + r.valor; }, 0);
        html += '<td style="text-align:center;">'
          + '<span style="font-size:13px;font-weight:700;color:var(--accent);">' + rows.length + '</span>'
          + '<br><span style="font-size:11px;color:var(--muted);white-space:nowrap;">' + formatVal(v) + '</span>'
          + '</td>';
      } else {
        html += '<td style="text-align:center;color:var(--border2);">—</td>';
      }
    });
    html += '<td style="text-align:center;font-weight:700;color:var(--accent);white-space:nowrap;">' + formatVal(linhaTotal) + '</td></tr>';
  });

  // Linha totais
  html += '<tr style="border-top:2px solid var(--border2);background:var(--surface2);">'
    + '<td style="font-weight:700;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);">Total</td>';
  treinamentos.forEach(function(p) {
    var rows = registros.filter(function(r) { return r.treinamento === p; });
    if (rows.length > 0) {
      var v = rows.reduce(function(a, r) { return a + r.valor; }, 0);
      html += '<td style="text-align:center;font-weight:700;">'
        + '<span style="font-size:12px;color:var(--accent);">' + rows.length + '</span>'
        + '<br><span style="font-size:11px;color:var(--muted);">' + formatVal(v) + '</span>'
        + '</td>';
    } else {
      html += '<td style="text-align:center;color:var(--border2);">—</td>';
    }
  });
  var totalGeral = registros.reduce(function(a, r) { return a + r.valor; }, 0);
  html += '<td style="text-align:center;font-weight:700;color:var(--accent);">' + formatVal(totalGeral) + '</td></tr>';
  html += '</tbody>';
  el.innerHTML = html;
}

function _mapRenderTreinamentos(registros) {
  var map = {};
  registros.forEach(function(r) {
    if (!map[r.treinamento]) map[r.treinamento] = { total: 0, qtd: 0 };
    map[r.treinamento].total += r.valor;
    map[r.treinamento].qtd++;
  });
  var lista = Object.keys(map).map(function(t) {
    return { nome: t, total: map[t].total, qtd: map[t].qtd };
  }).sort(function(a, b) { return b.total - a.total; });

  var el = document.getElementById('mapTreinamentoRows');
  if (!el) return;
  if (!lista.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px;">Nenhum dado no período.</div>'; return; }

  var totalGeral = lista.reduce(function(a, t) { return a + t.total; }, 0);
  var maxVal = lista[0].total || 1;
  el.innerHTML = lista.map(function(t, i) {
    var pct = totalGeral > 0 ? ((t.total / totalGeral) * 100).toFixed(1) : '0.0';
    var bw  = Math.round((t.total / maxVal) * 100);
    var cor = i === 0 ? '#c8f05a' : 'var(--blue)';
    return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border2);">'
      + '<div style="font-size:13px;font-weight:700;color:var(--muted);width:24px;text-align:center;">' + (i + 1) + '</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;">'
      + '<span style="font-size:13px;font-weight:700;color:var(--text);">' + t.nome + '</span>'
      + '<span style="font-size:12px;font-weight:700;color:' + cor + ';">' + formatVal(t.total) + '</span>'
      + '</div>'
      + '<div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;">'
      + '<div style="height:100%;width:' + bw + '%;background:' + cor + ';border-radius:2px;"></div>'
      + '</div>'
      + '</div>'
      + '<div style="text-align:right;flex-shrink:0;">'
      + '<div style="font-size:12px;font-weight:600;color:var(--text);">' + t.qtd + ' venda' + (t.qtd !== 1 ? 's' : '') + '</div>'
      + '<div style="font-size:10px;color:var(--muted);">' + pct + '%</div>'
      + '</div></div>';
  }).join('');
}

function abrirSalvarTreinamentos(){
  document.getElementById('salvarTreinamentosOverlay').classList.add('open');
}
function fecharSalvarTreinamentos(){
  document.getElementById('salvarTreinamentosOverlay').classList.remove('open');
}

function salvarTodasTurmas(){
  if(!window._fbGet||!window._fbSave){_showToast('❌ Firebase não disponível.','var(--red)');return;}
  _showToast('🔄 Salvando treinamentos...','var(--muted)');
  window._fbGet(TURMAS_NODE).then(function(fbTurmas){
    if(!fbTurmas||!Object.keys(fbTurmas).length){_showToast('⚠️ Nenhum treinamento encontrado.','var(--amber)');return;}
    var ids=Object.keys(fbTurmas);
    var salvos=0,erros=0;
    var promises=ids.map(function(id){
      var t=fbTurmas[id];if(!t) return Promise.resolve();
      var clientes=t.clientes;
      if(clientes&&!Array.isArray(clientes)&&typeof clientes==='object') clientes=Object.values(clientes).filter(Boolean);
      var turmaCompleta=Object.assign({},t,{
        id:id,
        clientes:clientes||[],
        consultores:Array.isArray(t.consultores)?t.consultores:(t.consultores?Object.values(t.consultores):[]),
        treinadores:Array.isArray(t.treinadores)?t.treinadores:(t.treinadores?Object.values(t.treinadores):[])
      });
      return window._fbSave(TURMAS_NODE+'/'+id,turmaCompleta)
        .then(function(){salvos++;})
        .catch(function(e){erros++;console.error('[salvarTodasTurmas] erro '+id,e);});
    });
    return Promise.all(promises).then(function(){
      if(erros===0) _showToast('🔥 '+salvos+' treinamento'+(salvos!==1?'s':'')+ ' salvo'+(salvos!==1?'s':'')+ ' no Firebase!','var(--accent)');
      else _showToast('⚠️ '+salvos+' salvos, '+erros+' com erro.','var(--amber)');
    });
  }).catch(function(e){_showToast('❌ Erro: '+(e&&e.message?e.message:e),'var(--red)');});
}

function salvarTodasTurmasLocal(){
  if(!window._fbGet){_showToast('❌ Firebase não disponível.','var(--red)');return;}
  _showToast('🔄 Preparando backup...','var(--muted)');
  window._fbGet(TURMAS_NODE).then(function(fbTurmas){
    if(!fbTurmas||!Object.keys(fbTurmas).length){_showToast('⚠️ Nenhum treinamento encontrado.','var(--amber)');return;}
    var exportObj={};
    Object.keys(fbTurmas).forEach(function(id){
      var t=fbTurmas[id];if(!t) return;
      var clientes=t.clientes;
      if(clientes&&!Array.isArray(clientes)&&typeof clientes==='object') clientes=Object.values(clientes).filter(Boolean);
      exportObj[id]=Object.assign({},t,{
        clientes:clientes||[],
        consultores:Array.isArray(t.consultores)?t.consultores:(t.consultores?Object.values(t.consultores):[]),
        treinadores:Array.isArray(t.treinadores)?t.treinadores:(t.treinadores?Object.values(t.treinadores):[])
      });
    });
    var blob=new Blob([JSON.stringify(exportObj,null,2)],{type:'application/json'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='treinamentos_backup_'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    _showToast('💾 Backup baixado com sucesso!','var(--accent)');
  }).catch(function(e){_showToast('❌ Erro: '+(e&&e.message?e.message:e),'var(--red)');});
}

function atualizarDados(){
  if(!_turmaAtiva){_showToast('❌ Nenhuma turma ativa.','var(--red)');return;}
  var id=_turmaAtiva.id;
  _showToast('🔄 Buscando dados do Firebase...','var(--muted)');
  if(window._fbGet){
    window._fbGet('turma_dados/'+id).then(function(fbData){
      if(!fbData){
        _showToast('⚠️ Nenhum dado encontrado no Firebase para esta turma.','var(--amber)');
        return;
      }
      // Firebase pode retornar data como objeto {0:{...},1:{...}} em vez de array
      var fbArray=fbData.data;
      if(fbArray&&!Array.isArray(fbArray)){
        fbArray=Object.values(fbArray);
      }
      if(!fbArray||!fbArray.length){
        _showToast('⚠️ Firebase retornou estrutura vazia. Verifique o caminho: turma_dados/'+id,'var(--amber)');
        return;
      }
      // Salvar e aplicar
      fbData.data=fbArray;
      localStorage.setItem('ci_turma_'+id,JSON.stringify(fbData));
      data=fbArray;
      if(fbData.titulo) document.getElementById('dashTitle').textContent=fbData.titulo;
      if(fbData.periodText){
        _periodText=fbData.periodText;_periodStart=fbData.periodStart||'';_periodEnd=fbData.periodEnd||'';
        document.getElementById('periodBarText').textContent=fbData.periodText;
        document.getElementById('periodBarInner').style.display='flex';
      }
      savedData=JSON.stringify(data);
      buildSelects();buildFilterBtns();renderAll();renderConsultor();renderTreinador();renderProduto();
      /* Recarregar pipeline comercial (vendas + goals do mês) */
      if(typeof window._npColetarVendasTurma==='function') window._npColetarVendasTurma();
      else if(typeof window._npRenderTudo==='function') window._npRenderTudo();
      _showToast('✅ '+fbArray.length+' clientes carregados do Firebase!','var(--accent)');
    }).catch(function(e){
      _showToast('❌ Erro ao buscar: '+(e&&e.message?e.message:String(e)),'var(--red)');
    });
  } else {
    buildSelects();buildFilterBtns();renderAll();renderConsultor();renderTreinador();renderProduto();
    _showToast('✅ Tela atualizada!','var(--accent)');
  }
}
function fecharSyncModal(){document.getElementById('syncModalOverlay').classList.remove('open');}

/* ── P1: atualização leve da UI de turmas ──────────────────────────────────
   Chama renderTurmasGrid (a função real do sistema) se disponível.
   Pode ser invocada após qualquer alteração nos dados sem risco.
─────────────────────────────────────────────────────────────────────────── */
function atualizarTurmasUI(){
  try{
    if(typeof renderTurmasGrid==='function') renderTurmasGrid();
  }catch(e){ console.warn('[atualizarTurmasUI]',e); }
}

/* ── P2: atualização completa do sistema ───────────────────────────────────
   Wrapper seguro que chama as funções de render existentes.
   O botão "↻ Atualizar" já usa atualizarDados() que faz o fetch do Firebase.
   atualizarSistema() complementa com re-render das camadas visuais.
─────────────────────────────────────────────────────────────────────────── */
function atualizarSistema(){
  try{
    // Se está na tela de turmas — atualizar o grid de turmas
    if(typeof renderTurmasGrid==='function') renderTurmasGrid();
    // Se está no dashboard — re-renderizar tudo
    if(typeof buildSelects==='function')    buildSelects();
    if(typeof buildFilterBtns==='function') buildFilterBtns();
    if(typeof renderAll==='function')       renderAll();
    if(typeof renderConsultor==='function') renderConsultor();
    if(typeof renderTreinador==='function') renderTreinador();
    if(typeof renderProduto==='function')   renderProduto();
    if(typeof _showToast==='function')      _showToast('✅ Sistema atualizado!','var(--accent)');
  }catch(e){
    console.error('[atualizarSistema]',e);
    if(typeof _showToast==='function') _showToast('⚠️ Erro ao atualizar: '+e.message,'var(--amber)');
  }
}

function sincronizar(){
  if(!_turmaAtiva){_showToast('❌ Nenhuma turma ativa.','var(--red)');return;}
  saveStorage();
  savedData=JSON.stringify(data);
  document.getElementById('saveBar').classList.remove('visible');

  if(!window._fbGet){
    _showToast('❌ Firebase não disponível.','var(--red)');return;
  }

  // Abrir modal e mostrar carregando
  document.getElementById('syncModalOverlay').classList.add('open');
  document.getElementById('syncModalSub').textContent='Comparando dados locais com Firebase...';
  document.getElementById('syncModalBody').innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Buscando dados do Firebase...</div>';
  document.getElementById('syncModalActions').innerHTML='<button class="modal-cancel" onclick="fecharSyncModal()">Cancelar</button>';

  // Buscar dados do Firebase para comparar
  var fbDados=null;
  var fbTurmas=null;
  var fbUsuarios=null;

  Promise.all([
    window._fbGet(TURMAS_NODE+'/'+_turmaAtiva.id).catch(function(){return null;}),
    window._fbGet('turma_dados/'+_turmaAtiva.id).catch(function(){return null;}),
    window._fbGet('usuarios').catch(function(){return null;})
  ]).then(function(results){
    // Usar nó unificado se disponível, senão fallback
    var fbTurmaUnif=results[0];
    var fbDadosAntigo=results[1];
    fbUsuarios=results[2]||{};

    if(fbTurmaUnif&&fbTurmaUnif.clientes){
      var c=fbTurmaUnif.clientes;
      if(!Array.isArray(c)&&typeof c==='object') c=Object.values(c).filter(Boolean);
      fbDados={data:c,titulo:fbTurmaUnif.titulo||'',meta:fbTurmaUnif.meta||0};
    } else {
      fbDados=fbDadosAntigo;
    }
    fbTurmas=null; // já não usamos índice separado
    _exibirComparacao(fbDados,fbTurmas,fbUsuarios);
  }).catch(function(e){
    document.getElementById('syncModalBody').innerHTML='<div style="color:var(--red);font-size:13px;text-align:center;padding:20px;">❌ Erro ao buscar dados do Firebase.</div>';
  });
}

function _exibirComparacao(fbDados,fbTurmas,fbUsuarios){
  var localClientes=data.length;
  var fbClientesArr=fbDados&&fbDados.data?fbDados.data:[];
  var fbClientes=fbClientesArr.length;
  var diffClientes=localClientes-fbClientes;

  // Derivar consultores/treinadores dos clientes do Firebase (não de campo separado)
  var localConsultores=allConsultors.length;
  var fbConsultoresSet=new Set(fbClientesArr.map(function(c){return c&&c.consultor;}).filter(Boolean));
  var fbConsultores=fbConsultoresSet.size;
  var diffConsultores=localConsultores-fbConsultores;

  var localTreinadores=allTrainers.length;
  var fbTreinadoresSet=new Set(fbClientesArr.map(function(c){return c&&c.treinador;}).filter(function(t){return t&&t!=='-';}));
  var fbTreinadores=fbTreinadoresSet.size;
  var diffTreinadores=localTreinadores-fbTreinadores;

  var localUsuarios=Object.keys(_getUsuariosLocal()).length;
  var fbUsuariosCount=Object.keys(fbUsuarios||{}).length;
  var diffUsuarios=localUsuarios-fbUsuariosCount;

  var temDiff=diffClientes!==0||diffTreinadores!==0||diffUsuarios!==0;

  function _row(label,local,fb,diff){
    var cor=diff>0?'var(--accent)':diff<0?'var(--red)':'var(--muted)';
    var sinal=diff>0?'+':'';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border2);">'
      +'<span style="font-size:13px;font-weight:600;color:var(--text);">'+label+'</span>'
      +'<div style="display:flex;align-items:center;gap:16px;">'
      +'<span style="font-size:12px;color:var(--muted);">Local: <strong style="color:var(--text);">'+local+'</strong></span>'
      +'<span style="font-size:12px;color:var(--muted);">Firebase: <strong style="color:var(--text);">'+fb+'</strong></span>'
      +'<span style="font-size:12px;font-weight:700;color:'+cor+';">'+( diff!==0?sinal+diff:'✓ igual')+'</span>'
      +'</div>'
      +'</div>';
  }

  var sub=temDiff?'Foram encontradas diferenças entre local e Firebase:':'Dados locais e Firebase estão iguais.';
  document.getElementById('syncModalSub').textContent=sub;
  document.getElementById('syncModalBody').innerHTML=
    _row('Clientes',localClientes,fbClientes,diffClientes)+
    _row('Consultores',localConsultores,fbConsultores,diffConsultores)+
    _row('Treinadores',localTreinadores,fbTreinadores,diffTreinadores)+
    _row('Usuários',localUsuarios,fbUsuariosCount,diffUsuarios);

  document.getElementById('syncModalActions').innerHTML=
    '<button class="modal-cancel" onclick="fecharSyncModal()">Cancelar</button>'
    +'<button class="modal-save" style="background:var(--blue);border-color:var(--blue);flex:1;" onclick="fecharSyncModal();_executarPuxar()">⬇ Puxar Firebase → Local</button>'
    +'<button class="modal-save" style="flex:1;" onclick="fecharSyncModal();_executarEnviar()">⬆ Enviar Local → Firebase</button>';
}

function _executarEnviar(){
  if(!_turmaAtiva||(!window._fbUpdate&&!window._fbSave)){
    _showToast('❌ Firebase não disponível.','var(--red)');return;
  }
  _showToast('🔄 Enviando para Firebase...','var(--blue)');
  /* Envio completo: marcar tudo dirty para garantir que o patch inclua todos os campos */
  Object.keys(_dashDirty).forEach(function(k){_dashDirty[k]=true;});
  var patch=_buildPatch();
  var op=window._fbUpdate
    ? window._fbUpdate(TURMAS_NODE+'/'+_turmaAtiva.id, patch)
    : window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id, patch);
  var _t=setTimeout(function(){_showToast('❌ Firebase não respondeu.','var(--red)');},8000);
  op.then(function(){
    clearTimeout(_t);
    savedData=JSON.stringify(data);
    document.getElementById('saveBar').classList.remove('visible');
    _resetDirty();
    _showToast('✅ '+data.length+' clientes enviados ao Firebase!','var(--accent)');
  }).catch(function(e){
    clearTimeout(_t);
    _showToast('❌ Erro ao enviar: '+(e&&e.message?e.message:e),'var(--red)');
  });
}

function _executarPuxar(){
  if(!_turmaAtiva||!window._fbGet){
    _showToast('❌ Firebase não disponível.','var(--red)');return;
  }
  _showToast('🔄 Puxando do Firebase...','var(--blue)');
  var _t=setTimeout(function(){_showToast('❌ Firebase não respondeu.','var(--red)');},8000);

  // Lê nó unificado turmas/{id} + usuarios/ em paralelo
  Promise.all([
    window._fbGet(TURMAS_NODE+'/'+_turmaAtiva.id).catch(function(){return null;}),
    window._fbGet('turma_dados/'+_turmaAtiva.id).catch(function(){return null;}),
    window._fbGet('usuarios').catch(function(){return null;})
  ]).then(function(results){
    var fbTurma=results[0];
    var fbDadosAntigo=results[1];
    var fbUsuarios=results[2]||{};

    // ── Extrair clientes ──
    var clientes=[];
    if(fbTurma&&fbTurma.clientes){
      clientes=fbTurma.clientes;
      if(!Array.isArray(clientes)&&typeof clientes==='object'){
        clientes=Object.values(clientes).filter(Boolean);
      }
    } else if(fbDadosAntigo&&fbDadosAntigo.data){
      clientes=fbDadosAntigo.data;
      if(!Array.isArray(clientes)&&typeof clientes==='object'){
        clientes=Object.values(clientes).filter(Boolean);
      }
    }

    // ── Atualizar dados em memória ──
    data=clientes;
    savedData=JSON.stringify(data);

    // ── Atualizar metadados da turma ──
    if(fbTurma){
      var _treinadoresFB=Array.isArray(fbTurma.treinadores)?fbTurma.treinadores:(fbTurma.treinadores?Object.values(fbTurma.treinadores):[]);
      var _consultoresFB=Array.isArray(fbTurma.consultores)?fbTurma.consultores:(fbTurma.consultores?Object.values(fbTurma.consultores):[]);
      _turmaAtiva=Object.assign({},_turmaAtiva,{
        nome:fbTurma.nome||fbTurma.titulo||_turmaAtiva.nome,
        meta:fbTurma.meta||_turmaAtiva.meta,
        ministrante:fbTurma.ministrante||_turmaAtiva.ministrante,
        periodStart:fbTurma.periodStart||_turmaAtiva.periodStart,
        periodEnd:fbTurma.periodEnd||_turmaAtiva.periodEnd,
        periodText:fbTurma.periodText||_turmaAtiva.periodText,
        treinadores:_treinadoresFB.length?_treinadoresFB:_turmaAtiva.treinadores||[],
        consultores:_consultoresFB.length?_consultoresFB:_turmaAtiva.consultores||[]
      });
      META=(_turmaAtiva.meta!=null&&_turmaAtiva.meta!==undefined)?_turmaAtiva.meta:0;
      document.getElementById('turmaMetaLabel').innerHTML='META: <strong style="color:var(--text);">'+formatVal(META)+'</strong>';
      document.getElementById('metaValLabel').textContent=formatVal(META);
      if(_turmaAtiva.periodText){
        _periodText=_turmaAtiva.periodText;
        _periodStart=_turmaAtiva.periodStart||'';
        _periodEnd=_turmaAtiva.periodEnd||'';
        document.getElementById('periodBarText').textContent=_periodText;
        document.getElementById('periodBarInner').style.display='flex';
      }
      var titulo=fbTurma.titulo||fbTurma.nome||'';
      if(titulo) document.getElementById('dashTitle').textContent=titulo;
    }

    // ── Repopular consultores/treinadores do nó usuarios/ ──
    var consultoresDB=[];
    var treinadoresDB=[];
    if(fbUsuarios&&typeof fbUsuarios==='object'){
      Object.values(fbUsuarios).forEach(function(u){
        if(!u||!u.nome||!u.ativo) return;
        var p=u.perfil||'';
        if(p==='consultor'&&!consultoresDB.includes(u.nome)) consultoresDB.push(u.nome);
        if((p==='treinador'||p==='ministrante')&&!treinadoresDB.includes(u.nome)) treinadoresDB.push(u.nome);
      });
    }
    // Complementar com dados dos clientes
    data.forEach(function(c){
      if(c.consultor&&!consultoresDB.includes(c.consultor)) consultoresDB.push(c.consultor);
      if(c.treinador&&c.treinador!=='-'&&!treinadoresDB.includes(c.treinador)) treinadoresDB.push(c.treinador);
    });
    allConsultors=consultoresDB.sort();
    allTrainers=treinadoresDB.sort();
    _buildColors();

    clearTimeout(_t);
    document.getElementById('saveBar').classList.remove('visible');
    buildSelects();buildFilterBtns();renderAll();renderConsultor();renderTreinador();renderProduto();
    _showToast('✅ '+data.length+' clientes puxados do Firebase!','var(--accent)');
  }).catch(function(e){
    clearTimeout(_t);
    _showToast('❌ Erro ao puxar: '+(e&&e.message?e.message:e),'var(--red)');
  });
}
function _showToast(msg,corOuTipo,ms){
  var _map={'var(--red)':'error','var(--accent)':'success','var(--green)':'success',
            'var(--amber)':'warn','var(--blue)':'info','var(--muted)':'info'};
  var tipo=/^(error|warn|success|info)$/.test(corOuTipo)?corOuTipo:(_map[corOuTipo]||'info');
  ms=ms||2800;
  var c=document.getElementById('toastContainer');
  if(!c){c=document.createElement('div');c.id='toastContainer';document.body.appendChild(c);}
  var t=document.createElement('div');
  t.className='toast '+tipo;
  t.textContent=msg;
  t.onclick=function(){_toastDismiss(t);};
  c.appendChild(t);
  setTimeout(function(){_toastDismiss(t);},ms);
}
function _toastDismiss(t){
  if(!t||t._leaving)return;
  t._leaving=true;t.classList.add('leaving');
  setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},220);
}
/* ── Skeleton helpers ── */
function _skelOn(el,template){
  if(typeof el==='string')el=document.getElementById(el);
  if(!el)return;
  el._skelPrev=el.innerHTML;
  el.innerHTML=template||'<div class="skeleton sk-line"></div><div class="skeleton sk-line" style="width:80%"></div><div class="skeleton sk-line-sm"></div>';
}
function _skelOff(el){
  if(typeof el==='string')el=document.getElementById(el);
  if(!el||el._skelPrev===undefined)return;
  el.innerHTML=el._skelPrev;delete el._skelPrev;
}
function _skelCards(n){
  var s='';for(var i=0;i<(n||3);i++)s+='<div class="skeleton sk-card"></div>';return s;
}
/* ── Btn loading ── */
function _withBtnLoading(btn,fn){
  if(typeof btn==='string')btn=document.getElementById(btn);
  if(!btn)return fn();
  btn.classList.add('btn-loading');btn.disabled=true;
  var p;
  try{p=fn();}catch(e){btn.classList.remove('btn-loading');btn.disabled=false;throw e;}
  if(p&&typeof p.then==='function'){
    return p.then(function(r){btn.classList.remove('btn-loading');btn.disabled=false;return r;},
                  function(e){btn.classList.remove('btn-loading');btn.disabled=false;throw e;});
  }
  btn.classList.remove('btn-loading');btn.disabled=false;return p;
}
/* ── Save indicator ── */
var _saveIndTimer;
function _setSaveStatus(state,msg){
  var el=document.getElementById('saveIndicator');
  if(!el){el=document.createElement('div');el.id='saveIndicator';document.body.appendChild(el);}
  el.className='visible '+state;
  el.textContent=msg||(state==='saving'?'Salvando…':state==='saved'?'Salvo':'Erro ao salvar');
  clearTimeout(_saveIndTimer);
  if(state==='saved'||state==='error'){
    _saveIndTimer=setTimeout(function(){el.classList.remove('visible');},2000);
  }
}
/* ── Empty state helper ── */
function _renderEmpty(el,opts){
  opts=opts||{};
  var html='<div class="empty-state">'
    +(opts.icon?'<div class="empty-state-icon">'+opts.icon+'</div>':'')
    +(opts.title?'<div class="empty-state-title">'+opts.title+'</div>':'')
    +(opts.msg?'<div>'+opts.msg+'</div>':'')
    +(opts.actionLabel&&opts.actionFn?'<button class="btn empty-state-action" onclick="'+opts.actionFn+'()">'+opts.actionLabel+'</button>':'')
    +'</div>';
  if(typeof el==='string')el=document.getElementById(el);
  if(el)el.innerHTML=html;
}
/* ═══ AUDIT LOG — helpers ═══════════════════════════════ */
function _snapshotBefore(){
  if(!_turmaAtiva) return {};
  var clientesBefore=0;
  try{clientesBefore=JSON.parse(savedData||'[]').length;}catch(_){}
  return{titulo:_turmaAtiva.titulo||'',info:_turmaAtiva.info||'',
    periodStart:_turmaAtiva.periodStart||'',periodEnd:_turmaAtiva.periodEnd||'',
    _clientCount:clientesBefore};
}
function _buildAuditDiff(before,patch){
  var d={};
  ['titulo','info','periodStart','periodEnd'].forEach(function(k){
    if(k in patch&&JSON.stringify(before[k])!==JSON.stringify(patch[k])){
      d[k]=[_truncarAudit(before[k]),_truncarAudit(patch[k])];
    }
  });
  if('clientes' in patch){
    var depois=Array.isArray(patch.clientes)?patch.clientes.length:0;
    d.clientes=[before._clientCount+' reg.',depois+' reg.'];
  }
  return d;
}
function _truncarAudit(v){
  if(typeof v==='string'&&v.length>200) return v.slice(0,200)+'…';
  return v;
}
function abrirHistoricoTurma(){
  if(!_turmaAtiva||!window._fbGet) return;
  /* Helper local: _esc só está disponível dentro de IIFEs específicas. */
  function _esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  var id=_turmaAtiva.id;
  var modal=document.getElementById('auditModal');
  var body=document.getElementById('auditModalBody');
  if(!modal||!body) return;
  modal.style.display='flex';
  body.innerHTML=_skelCards(4);
  window._fbGet('audit_log_index/byTurma/'+id).then(function(idx){
    var keys=Object.keys(idx||{}).sort().reverse().slice(0,50);
    if(!keys.length){body.innerHTML='<div class="empty-state"><div class="empty-state-title">Nenhum registro ainda.</div></div>';return;}
    return Promise.all(keys.map(function(k){return window._fbGet('audit_log/'+k);})).then(function(eventos){
      body.innerHTML=eventos.filter(Boolean).map(function(ev){
        var d=new Date(ev.ts);
        var dt=d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        var diffHtml='';
        if(ev.diff){
          diffHtml='<div class="audit-diff">'+Object.entries(ev.diff).map(function(e){
            var v=e[1];
            return '<span class="audit-field">'+e[0]+':</span> '+
              (Array.isArray(v)?'<s>'+_esc(String(v[0]))+'</s> → <b>'+_esc(String(v[1]))+'</b>':_esc(String(v)));
          }).join(' &nbsp;·&nbsp; ')+'</div>';
        }
        return '<div class="audit-row">'
          +'<div class="audit-meta"><span class="audit-user">'+_esc(ev.user||'—')+'</span><span class="audit-time">'+dt+'</span></div>'
          +'<div class="audit-action">'+_esc(ev.action||'—')+'</div>'
          +diffHtml+'</div>';
      }).join('');
    });
  }).catch(function(){body.innerHTML='<div class="empty-state"><div class="empty-state-title">Erro ao carregar histórico.</div></div>';});
}
function fecharAuditModal(){
  var m=document.getElementById('auditModal');if(m)m.style.display='none';
}
/* ═══════════════════════════════════════════════════════ */
function forcarSincFirebase(){
  if(!_turmaAtiva){_showToast('❌ Nenhuma turma ativa.','var(--red)');return;}
  if(!confirm('Isso vai limpar os dados locais e recarregar tudo do Firebase.\nContinuar?'))return;
  _showToast('🔄 Sincronizando com Firebase...','var(--blue)');
  var id=_turmaAtiva.id;
  localStorage.removeItem('ci_turma_'+id);
  window._fbGet('turma_dados/'+id).then(function(fbData){
    if(fbData&&fbData.data&&fbData.data.length){
      localStorage.setItem('ci_turma_'+id,JSON.stringify(fbData));
      data=fbData.data;
      if(fbData.titulo){document.getElementById('dashTitle').textContent=fbData.titulo;}
      if(fbData.info){document.getElementById('infoBarText').textContent=fbData.info;document.getElementById('infoBar').style.display='block';}
      if(fbData.periodText){
        _periodText=fbData.periodText;_periodStart=fbData.periodStart||'';_periodEnd=fbData.periodEnd||'';
        document.getElementById('periodBarText').textContent=fbData.periodText;
        document.getElementById('periodBarInner').style.display='flex';
      }
      savedData=JSON.stringify(data);
      buildSelects();buildFilterBtns();renderAll();
      _showToast('✅ Sincronizado! '+data.length+' clientes carregados.','var(--accent)');
      if(typeof _addPendLog==='function')_addPendLog('Força-sinc Firebase',''+data.length+' clientes','🔄');
    } else {
      _showToast('⚠️ Firebase vazio para esta turma. Faça um Salvar primeiro.','var(--amber)');
    }
  }).catch(function(e){
    _showToast('❌ Erro ao conectar ao Firebase: '+(e&&e.message?e.message:e),'var(--red)');
  });
}
function discardChanges(){try{data=JSON.parse(savedData);}catch(e){}document.getElementById('saveBar').classList.remove('visible');renderAll();}
function desfazerUltimo(){
  const b=localStorage.getItem(BACKUP_KEY);if(!b){alert('Nenhum backup disponível.');return;}
  if(!confirm('Desfazer último save?'))return;
  try{const s=JSON.parse(b);localStorage.setItem(STORAGE_KEY,b);if(s.data&&s.data.length)data=s.data;applyState(s);savedData=JSON.stringify(data);renderAll();alert('✅ Restaurado!');}catch(e){alert('Erro: '+e.message);}
}
function exportarUsuarios(){
  var local=_getUsuariosLocal();
  if(!local||Object.keys(local).length===0){
    var membros=_getMembros();
    var _ministrante=_getTurmaMinistante();
    membros.consultores.forEach(function(nome){
      var uid='consultor_'+_normalizeUid(nome);
      local[uid]={nome:nome,perfil:'consultor',login:'',senha:'',ativo:true};
    });
    membros.treinadores.forEach(function(nome){
      var uid='treinador_'+_normalizeUid(nome);
      var perfil=(_ministrante&&_ministrante.toUpperCase()===nome.toUpperCase())?'ministrante':'treinador';
      local[uid]={nome:nome,perfil:perfil,login:'',senha:'',ativo:true};
    });
  }
  var json=JSON.stringify(local,null,2);
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML='<div style="background:var(--surface);border-radius:12px;padding:24px;width:90%;max-width:600px;display:flex;flex-direction:column;gap:12px;">'
    +'<div style="font-size:14px;font-weight:700;color:var(--text);">Copie o JSON e envie para o Claude:</div>'
    +'<textarea id="_exportTA" style="height:300px;background:var(--surface2);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:12px;font-size:11px;font-family:monospace;resize:none;width:100%;box-sizing:border-box;">'+json+'</textarea>'
    +'<div style="display:flex;gap:8px;">'
    +'<button onclick="document.getElementById(\'_exportTA\').select();document.execCommand(\'copy\');this.textContent=\'✅ Copiado!\';" style="flex:1;padding:10px;background:var(--accent);color:#0f0f0f;border:none;border-radius:8px;font-weight:700;cursor:pointer;">📋 Copiar tudo</button>'
    +'<button onclick="this.closest(\'div\').parentElement.parentElement.remove()" style="flex:1;padding:10px;background:var(--surface2);color:var(--text);border:1px solid var(--border2);border-radius:8px;font-weight:700;cursor:pointer;">Fechar</button>'
    +'</div>'
    +'</div>';
  document.body.appendChild(overlay);
}
function exportarBackup(){
  const state={data,titulo:document.getElementById('dashTitle').textContent,info:document.getElementById('infoBarText').textContent,periodStart:_periodStart,periodEnd:_periodEnd,periodText:_periodText,exportadoEm:new Date().toLocaleString('pt-BR')};
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);
}
function importarBackup(ev){
  const file=ev.target.files[0];if(!file)return;
  const r=new FileReader();r.onload=function(e){
    try{
      const s=JSON.parse(e.target.result);
      if(!s.data||!Array.isArray(s.data))throw new Error('Arquivo inválido — campo "data" ausente.');
      data=s.data;
      savedData=JSON.stringify(data);
      applyState(s);
      if(s.titulo){
        allTrainers=[...new Set(data.map(d=>d.treinador).filter(t=>t&&t!=='-'))];
        allConsultors=[...new Set(data.map(d=>d.consultor).filter(Boolean))];
      }
      _buildColors();buildSelects();buildFilterBtns();
      renderAll();renderConsultor();renderTreinador();renderProduto();
      try{saveStorage();}catch(err){}
      // Fix 7+8: criar usuários no Firebase sem duplicar
      _sincronizarUsuariosImportacao(allConsultors,allTrainers);
      _showToast('\u2705 '+s.data.length+' clientes importados!','var(--accent)');
    }catch(err){
      _showToast('\u274c Erro ao importar: '+err.message,'var(--red)');
    }
    ev.target.value='';
  };r.readAsText(file);
}

/* Fix 7+8: Sincronizar consultores e treinadores no Firebase — sem duplicar */
function _sincronizarUsuariosImportacao(consultores,treinadores){
  if(!window._fbGet||!window._fbSave) return;
  window._fbGet('usuarios').then(function(existentes){
    var mapa={}; // nome.upper → uid
    if(existentes&&typeof existentes==='object'){
      Object.entries(existentes).forEach(function(e){
        var nome=(e[1].nome||'').toUpperCase();
        if(nome) mapa[nome]=e[0];
      });
    }
    var promessas=[];

    function _criarSeNaoExiste(nome,perfil){
      if(!nome||nome==='-') return;
      var nomeU=nome.toUpperCase();
      if(mapa[nomeU]) return; // já existe — não duplicar
      var uid=perfil+'_'+nomeU.toLowerCase().replace(/[^a-z0-9]/g,'_');
      var loginBase=nomeU.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
      var dados={
        nome:nomeU,login:loginBase,senha:loginBase,
        perfil:perfil,ativo:true,vinculo:nomeU,
        primeiroAcesso:true,createdAt:Date.now()
      };
      mapa[nomeU]=uid; // evitar duplicar na mesma importação
      // Salvar localmente
      var local=_getUsuariosLocal();
      if(!local[uid]){local[uid]=dados;_saveUsuariosLocal(local);}
      // Salvar no Firebase
      if(window._fbSave){
        promessas.push(
          window._fbSave('usuarios/'+uid,dados)
            .catch(function(e){console.warn('[import usuario]',e);})
        );
      }
    }

    (consultores||[]).forEach(function(n){_criarSeNaoExiste(n,'consultor');});
    (treinadores||[]).forEach(function(n){_criarSeNaoExiste(n,'treinador');});

    if(promessas.length>0){
      Promise.all(promessas).then(function(){
        _showToast('✅ '+promessas.length+' usuário(s) criado(s) no Firebase!','var(--accent)');
        _renderUsuariosGrid && _renderUsuariosGrid();
      });
    }
  }).catch(function(e){
    console.warn('[_sincronizarUsuariosImportacao]',e);
  });
}
window._sincronizarUsuariosImportacao=_sincronizarUsuariosImportacao;

/* ═══════════════════════════════════════════
   IMPORT / EXPORT TURMAS
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   GERENCIAR TURMAS (ADM)
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   SALVAR COMO
═══════════════════════════════════════════ */
function abrirSalvarComo(){
  document.getElementById('salvarComoOverlay').classList.add('open');
}
function fecharSalvarComo(){
  document.getElementById('salvarComoOverlay').classList.remove('open');
}
function salvarArquivoLocal(){
  var titulo=document.getElementById('dashTitle')?document.getElementById('dashTitle').textContent:'turma';
  var info=document.getElementById('infoBarText')?document.getElementById('infoBarText').textContent:'';
  var state={
    data:data,titulo:titulo,info:info,
    periodStart:_periodStart,periodEnd:_periodEnd,periodText:_periodText,
    turmaId:_turmaAtiva?_turmaAtiva.id:'',turma:_turmaAtiva||null,
    exportadoEm:new Date().toLocaleString('pt-BR')
  };
  var sugestao='backup-'+((_turmaAtiva&&_turmaAtiva.codigo)||'turma').toLowerCase()+'-'+new Date().toISOString().slice(0,10);
  var nomeArquivo=window.prompt('Nome do arquivo (sem .json):',sugestao);
  if(nomeArquivo===null) return; // cancelou
  nomeArquivo=(nomeArquivo.trim()||sugestao).replace(/[^a-zA-Z0-9_\-\.]/g,'_');
  var blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=nomeArquivo+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  _showToast('✅ Arquivo "'+nomeArquivo+'.json" salvo!','var(--accent)');
}

var _gerenciarTurmasList=[]; // cache das turmas no modal

function abrirGerenciarTurmas(){
  var lista=document.getElementById('gerenciarTurmasLista');
  lista.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:16px;">Carregando do Firebase...</div>';
  document.getElementById('gerenciarTurmasOverlay').classList.add('open');
  if(!window._fbGet){
    lista.innerHTML='<div style="color:var(--red);font-size:13px;text-align:center;padding:16px;">Firebase não disponível.</div>';
    return;
  }
  // Lê nó unificado turmas/
  window._fbGet(TURMAS_NODE).then(function(fb){
    var turmas=[];
    if(fb&&typeof fb==='object'){
      Object.keys(fb).forEach(function(rid){
        var t=fb[rid];
        if(t) turmas.push(Object.assign({},t,{id:rid}));
      });
    }
    // Fallback: turma_dados/
    if(!turmas.length) return window._fbGet('turma_dados').then(function(fd){
      if(fd&&typeof fd==='object') Object.keys(fd).forEach(function(rid){
        var d=fd[rid];if(d) turmas.push({id:rid,nome:d.titulo||rid,meta:d.meta||0,periodText:d.periodText||'',ordem:0});
      });
      return turmas;
    });
    return turmas;
  }).then(function(turmas){
    turmas.sort(function(a,b){return (a.ordem||0)-(b.ordem||0);});
    _gerenciarTurmasList=turmas;
    _renderGerenciarLista();
  }).catch(function(e){
    document.getElementById('gerenciarTurmasLista').innerHTML='<div style="color:var(--red);font-size:13px;text-align:center;padding:16px;">Erro: '+(e&&e.message?e.message:e)+'</div>';
  });
}

var _gtAnoAtual=new Date().getFullYear();
var _gtAnosDisponiveis=[];

function _gtExtrairAno(t){
  if(t.periodStart){var y=parseInt((t.periodStart||'').slice(0,4));if(y>=2020) return y;}
  if(t.periodText){var m=t.periodText.match(/\b(20\d{2})\b/);if(m) return parseInt(m[1]);}
  return new Date().getFullYear();
}
function _gtExtrairMes(t){
  if(t.periodStart){var m=parseInt((t.periodStart||'').slice(5,7));if(m>=1&&m<=12) return m;}
  return 0;
}
function _gtExtrairTipo(t){
  var cod=(t.codigo||t.id||'').toUpperCase();
  var tipos=['MASTER','MAESTRIA','FCIS','FGPC','CIS','BHP','TAV','ML','CI','IF','CEOP','TOUR'];
  for(var i=0;i<tipos.length;i++){if(cod.indexOf(tipos[i])===0||cod.indexOf(tipos[i])!==-1) return tipos[i];}
  return cod.slice(0,3)||'?';
}

function _gtRenderYearBar(){
  var bar=document.getElementById('gtYearBar');
  if(!bar) return;
  // Coletar anos das turmas
  var anosSet={};
  (_gerenciarTurmasList||[]).forEach(function(t){anosSet[_gtExtrairAno(t)]=true;});
  var anos=Object.keys(anosSet).map(Number).sort();
  if(!anos.length) anos=[new Date().getFullYear()];
  // Garantir que _gtAnosDisponiveis tem esses anos
  anos.forEach(function(a){if(_gtAnosDisponiveis.indexOf(a)===-1) _gtAnosDisponiveis.push(a);});
  _gtAnosDisponiveis.sort();
  if(_gtAnosDisponiveis.indexOf(_gtAnoAtual)===-1) _gtAnoAtual=_gtAnosDisponiveis[0];
  bar.innerHTML='<span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-right:4px;">Ano</span>';
  _gtAnosDisponiveis.forEach(function(a){
    var btn=document.createElement('button');
    btn.textContent=a;
    btn.style.cssText='padding:4px 12px;border-radius:20px;border:1px solid var(--border2);background:none;color:var(--muted);font-family:"DM Sans",sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;';
    if(a===_gtAnoAtual){btn.style.background='linear-gradient(180deg,#d4f565,#c8f05a)';btn.style.color='#0f0f0f';btn.style.borderColor='transparent';}
    btn.addEventListener('click',function(){_gtAnoAtual=a;_renderGerenciarLista();});
    bar.appendChild(btn);
  });
  // Botão + Ano
  var addBtn=document.createElement('button');
  addBtn.textContent='+ Ano';
  addBtn.style.cssText='padding:4px 12px;border-radius:20px;border:1px dashed rgba(200,240,90,.4);background:none;color:var(--accent);font-family:"DM Sans",sans-serif;font-size:11px;font-weight:700;cursor:pointer;';
  addBtn.addEventListener('click',function(){
    var max=Math.max.apply(null,_gtAnosDisponiveis);
    var novo=max+1;
    _gtAnosDisponiveis.push(novo);
    _gtAnoAtual=novo;
    _renderGerenciarLista();
  });
  bar.appendChild(addBtn);
}

var _gtLayout='lista';

function _gtToggleDropdown(){
  var dd=document.getElementById('gtLayoutDropdown');
  var btn=document.getElementById('gtLayoutPickerBtn');
  if(dd.classList.contains('open')){dd.classList.remove('open');return;}
  // Mover para body para não ser cortado pelo overflow do modal pai
  if(dd.parentNode!==document.body) document.body.appendChild(dd);
  var r=btn.getBoundingClientRect();
  dd.style.top=(r.bottom+4)+'px';
  dd.style.left=r.left+'px';
  dd.style.right='auto';
  dd.classList.add('open');
  // Ajuste se sair da tela pela direita
  var ddR=dd.getBoundingClientRect();
  if(ddR.right>window.innerWidth-8){
    dd.style.left='auto';
    dd.style.right=(window.innerWidth-r.right)+'px';
  }
  setTimeout(function(){
    document.addEventListener('click',function _close(e){
      if(!btn.contains(e.target)&&!dd.contains(e.target)){
        dd.classList.remove('open');document.removeEventListener('click',_close);
      }
    });
  },10);
}
function _gtSetLayout(v){
  _gtLayout=v;
  var info={lista:['≡','Lista'],A:['A','Timeline'],B:['B','Grade meses'],C:['C','Lista detalhada'],D:['D','Linha do tempo'],E:['E','Kanban'],F:['F','Mapa de calor'],G:['G','Semestres'],H:['H','Swimlane']};
  var lbl=info[v]||info['lista'];
  document.getElementById('gtLayoutLetter').textContent=lbl[0];
  document.getElementById('gtLayoutLabel').textContent=lbl[1];
  document.querySelectorAll('#gtLayoutDropdown .layout-opt').forEach(function(b){
    b.classList.toggle('on',b.getAttribute('onclick').indexOf("'"+v+"'")!==-1);
  });
  document.getElementById('gtLayoutDropdown').classList.remove('open');
  // Ano só aparece nos layouts visuais
  var gtYB=document.getElementById('gtYearBar');
  if(gtYB) gtYB.style.display=(v==='lista')?'none':'flex';
  _renderGerenciarLista();
}

function _gtFmtDate(d){
  if(!d) return '';
  var p=d.split('-');if(p.length===3) return p[2]+'/'+p[1]+'/'+p[0];
  return d;
}

function _renderGerenciarLista(){
  var el=document.getElementById('gerenciarTurmasLista');
  if(!el) return;
  _gtRenderYearBar();
  // YearBar sempre visível — filtra em todos os layouts incluindo lista
  var gtYB=document.getElementById('gtYearBar');
  if(gtYB) gtYB.style.display='flex';
  if(!_gerenciarTurmasList||!_gerenciarTurmasList.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:24px;">Nenhuma turma no Firebase.</div>';
    return;
  }
  if(_gtLayout==='lista') _gtRenderLista(el);
  else if(_gtLayout==='A') _gtRenderA(el);
  else if(_gtLayout==='B') _gtRenderB(el);
  else if(_gtLayout==='C') _gtRenderC(el);
  else if(_gtLayout==='D') _gtRenderD(el);
  else if(_gtLayout==='E') _gtRenderE(el);
  else if(_gtLayout==='F') _gtRenderF(el);
  else if(_gtLayout==='G') _gtRenderG(el);
  else if(_gtLayout==='H') _gtRenderH(el);
}

// ── Layout Lista (padrão) — com ações de edição ──
function _gtRenderLista(el){
  el.innerHTML='';
  // Filtrar por ano selecionado
  var _listaFiltrada=_gerenciarTurmasList.filter(function(t){return _gtExtrairAno(t)===_gtAnoAtual;});
  if(!_listaFiltrada.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:24px;">Nenhuma turma em '+_gtAnoAtual+'.</div>';
    return;
  }
  _listaFiltrada.forEach(function(t,i){
    var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
    var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
    var div=document.createElement('div');
    div.style.cssText='display:flex;flex-direction:column;gap:10px;padding:14px 16px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);margin-bottom:8px;';
    var topRow=document.createElement('div');topRow.style.cssText='display:flex;align-items:center;gap:8px;';
    var btns=document.createElement('div');btns.style.cssText='display:flex;flex-direction:column;gap:2px;flex-shrink:0;';
    var bUp=document.createElement('button');bUp.textContent='↑';bUp.style.cssText='background:var(--surface);border:1px solid var(--border2);border-radius:4px;width:32px;height:32px;min-width:32px;min-height:32px;cursor:pointer;color:var(--muted);font-size:13px;display:flex;align-items:center;justify-content:center;';bUp.disabled=(i===0);if(i===0)bUp.style.opacity='0.3';
    bUp.addEventListener('click',function(){_moverTurma(i,-1);});
    var bDown=document.createElement('button');bDown.textContent='↓';bDown.style.cssText='background:var(--surface);border:1px solid var(--border2);border-radius:4px;width:32px;height:32px;min-width:32px;min-height:32px;cursor:pointer;color:var(--muted);font-size:13px;display:flex;align-items:center;justify-content:center;';bDown.disabled=(i===_gerenciarTurmasList.length-1);if(i===_gerenciarTurmasList.length-1)bDown.style.opacity='0.3';
    bDown.addEventListener('click',function(){_moverTurma(i,1);});
    btns.appendChild(bUp);btns.appendChild(bDown);
    var info=document.createElement('div');info.style.cssText='flex:1;min-width:0;';
    info.innerHTML='<div id="gt_nome_'+i+'" style="font-size:13px;font-weight:700;color:var(--text);">'+t.nome+'</div>'
      +'<div style="font-size:10px;color:var(--muted);font-family:monospace;margin-top:1px;">'+t.id+'</div>';
    topRow.appendChild(btns);topRow.appendChild(info);div.appendChild(topRow);
    var actRow=document.createElement('div');actRow.style.cssText='display:flex;align-items:center;gap:6px;';
    var metaInp=document.createElement('input');metaInp.type='text';metaInp.value=formatVal(t.meta||0);metaInp.placeholder='Meta (R$)';
    metaInp.style.cssText='flex:1;min-width:0;background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;color:var(--text);font-family:"DM Mono",monospace;font-size:12px;text-align:right;height:34px;box-sizing:border-box;';
    metaInp.addEventListener('focus',function(){this.value=(t.meta||0).toString().replace('.',',');});
    metaInp.addEventListener('blur',function(){this.value=formatVal(parseVal(this.value)||t.meta||0);});
    var metaBtn=document.createElement('button');metaBtn.innerHTML='💾 Meta';metaBtn.style.cssText='height:34px;padding:0 12px;background:var(--accent-dim);color:var(--accent);border:1px solid rgba(200,240,90,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:"DM Sans",sans-serif;';
    (function(turma,inp){metaBtn.addEventListener('click',function(){var v=parseVal(inp.value);turma.meta=v;window._fbSave&&window._fbSave(TURMAS_NODE+'/'+turma.id+'/meta',v).then(function(){_showToast('✅ Meta atualizada!','var(--accent)');inp.value=formatVal(v);}).catch(function(){_showToast('❌ Erro','var(--red)');});});})(t,metaInp);
    var editBtn=document.createElement('button');editBtn.innerHTML='✏ Nome';editBtn.style.cssText='height:34px;padding:0 12px;background:var(--blue-bg);color:var(--blue);border:1px solid rgba(96,165,250,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:"DM Sans",sans-serif;';
    (function(turma,idx){editBtn.addEventListener('click',function(){_gtEditarNome(idx);});})(t,i);
    var delBtn=document.createElement('button');delBtn.innerHTML='🗑 Excluir';delBtn.style.cssText='height:34px;padding:0 12px;background:var(--red-bg);color:var(--red);border:1px solid rgba(255,95,87,.3);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:"DM Sans",sans-serif;';
    delBtn.addEventListener('click',function(){excluirTurma(t.id,t.nome);});
    actRow.appendChild(metaInp);actRow.appendChild(metaBtn);actRow.appendChild(editBtn);actRow.appendChild(delBtn);
    div.appendChild(actRow);
    // ── Linha de datas ──
    var dateRow=document.createElement('div');
    dateRow.style.cssText='display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
    var lbStart=document.createElement('span');
    lbStart.textContent='Início:';
    lbStart.style.cssText='font-size:11px;color:var(--muted);font-weight:600;flex-shrink:0;';
    var inpStart=document.createElement('input');
    inpStart.type='date';
    inpStart.value=t.periodStart||'';
    inpStart.style.cssText='background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:5px 8px;color:var(--text);font-family:"DM Sans",sans-serif;font-size:12px;height:32px;box-sizing:border-box;flex:1;min-width:120px;color-scheme:dark;';
    var lbEnd=document.createElement('span');
    lbEnd.textContent='Fim:';
    lbEnd.style.cssText='font-size:11px;color:var(--muted);font-weight:600;flex-shrink:0;';
    var inpEnd=document.createElement('input');
    inpEnd.type='date';
    inpEnd.value=t.periodEnd||'';
    inpEnd.style.cssText='background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:5px 8px;color:var(--text);font-family:"DM Sans",sans-serif;font-size:12px;height:32px;box-sizing:border-box;flex:1;min-width:120px;color-scheme:dark;';
    var savePerBtn=document.createElement('button');
    savePerBtn.innerHTML='📅 Período';
    savePerBtn.style.cssText='height:32px;padding:0 12px;background:rgba(96,165,250,.15);color:var(--blue);border:1px solid rgba(96,165,250,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:"DM Sans",sans-serif;flex-shrink:0;';
    (function(turma,is,ie){
      savePerBtn.addEventListener('click',function(){
        var ps=is.value,pe=ie.value;
        if(!ps||!pe){_showToast('⚠️ Informe início e fim.','var(--amber)');return;}
        if(pe<ps){_showToast('⚠️ Fim deve ser após o início.','var(--amber)');return;}
        var fmt=function(d){var p=d.split('-');return p[2]+'/'+p[1]+'/'+p[0];};
        var pt=fmt(ps)+'  →  '+fmt(pe);
        turma.periodStart=ps;turma.periodEnd=pe;turma.periodText=pt;
        if(window._fbSave){
          window._fbSave(TURMAS_NODE+'/'+turma.id+'/periodStart',ps);
          window._fbSave(TURMAS_NODE+'/'+turma.id+'/periodEnd',pe);
          window._fbSave(TURMAS_NODE+'/'+turma.id+'/periodText',pt)
            .then(function(){_showToast('✅ Período salvo!','var(--accent)');})
            .catch(function(){_showToast('❌ Erro ao salvar.','var(--red)');});
        }
      });
    })(t,inpStart,inpEnd);
    dateRow.appendChild(lbStart);dateRow.appendChild(inpStart);
    dateRow.appendChild(lbEnd);dateRow.appendChild(inpEnd);
    dateRow.appendChild(savePerBtn);
    div.appendChild(dateRow);
    el.appendChild(div);
  });
}

// ── Helpers compartilhados pelos layouts visuais ──
var _gtMeses     = APP_CONST.MESES_CURTO;
var _gtMesesFull = APP_CONST.MESES_FULL;
var _gtCores     = APP_CONST.PALETTE_SWIM;
var _gtBgs       = APP_CONST.PALETTE_SWIM_BG;

function _gtMesMap(){
  var turmasAno=_gerenciarTurmasList.filter(function(t){return _gtExtrairAno(t)===_gtAnoAtual;});
  var map={};for(var m=1;m<=12;m++)map[m]=[];
  turmasAno.forEach(function(t){var m=_gtExtrairMes(t);if(m>=1&&m<=12)map[m].push(t);else map[1].push(t);});
  return {map:map,turmasAno:turmasAno};
}
function _gtChip(t,ti){
  var cor=_gtCores[ti%_gtCores.length];
  var bg=_gtBgs[ti%_gtBgs.length];
  var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
  var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
  var tip=t.nome+(periodo?' · '+periodo:'');
  var idx=_gerenciarTurmasList.indexOf(t);
  return '<div onclick="_gtAbrirEditar('+idx+')" title="'+tip+'" style="border-radius:5px;padding:6px 8px;font-size:10px;font-weight:700;text-align:center;cursor:pointer;background:'+bg+';border:1px solid '+cor+'55;color:'+cor+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px;">'+(t.codigo||t.id)+(periodo?'<div style="font-size:9px;color:'+cor+';opacity:.8;margin-top:2px;">'+periodo+'</div>':'')+'</div>';
}

// ── A: Timeline ──
function _gtRenderA(el){
  var d=_gtMesMap();if(!d.turmasAno.length){el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';return;}
  var html='<div style="overflow-x:auto;"><div style="display:grid;grid-template-columns:repeat(12,minmax(68px,1fr));gap:5px;min-width:660px;">';
  for(var m=1;m<=12;m++){
    html+='<div><div style="font-size:10px;font-weight:700;color:var(--muted);text-align:center;padding:4px 0;border-bottom:1px solid var(--border);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;">'+_gtMeses[m-1]+'</div>';
    var list=d.map[m];
    if(!list.length) html+='<div style="height:28px;"></div>';
    else list.forEach(function(t,ti){html+=_gtChip(t,ti);});
    html+='</div>';
  }
  html+='</div></div>';el.innerHTML=html;
}
// ── B: Grade meses ──
function _gtRenderB(el){
  var d=_gtMesMap();
  var html='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">';
  for(var m=1;m<=12;m++){
    var list=d.map[m];
    html+='<div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);padding:12px;">';
    html+='<div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">'+_gtMesesFull[m-1]+'</div>';
    if(!list.length){html+='<div style="font-size:11px;color:rgba(255,255,255,.15);text-align:center;padding:6px 0;">—</div>';}
    else list.forEach(function(t,ti){html+=_gtChip(t,ti);});
    html+='</div>';
  }
  html+='</div>';el.innerHTML=html;
}
// ── C: Lista detalhada ──
function _gtRenderC(el){
  var d=_gtMesMap();var html='';
  for(var m=1;m<=12;m++){
    var list=d.map[m];if(!list.length) continue;
    html+='<div style="margin-bottom:18px;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border);"><span style="font-size:14px;font-weight:700;">'+_gtMesesFull[m-1]+'</span><span style="font-size:11px;color:var(--muted);background:var(--surface2);padding:2px 8px;border-radius:20px;">'+list.length+' turma'+(list.length!==1?'s':'')+'</span></div><div style="display:flex;flex-wrap:wrap;gap:8px;">';
    list.forEach(function(t,ti){
      var cor=_gtCores[ti%_gtCores.length];
      var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
      var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
      var idx=_gerenciarTurmasList.indexOf(t);
      html+='<div onclick="_gtAbrirEditar('+idx+')" style="background:var(--surface);border:1px solid var(--border2);border-top:2px solid '+cor+';border-radius:var(--radius-sm);padding:10px 14px;cursor:pointer;min-width:150px;">'
        +'<div style="font-size:10px;font-weight:700;color:'+cor+';margin-bottom:3px;">'+(t.codigo||t.id)+'</div>'
        +'<div style="font-size:12px;font-weight:600;color:var(--text);">'+t.nome+'</div>'
        +(periodo?'<div style="font-size:10px;color:var(--accent);margin-top:3px;">'+periodo+'</div>':'')
        +'</div>';
    });
    html+='</div></div>';
  }
  if(!html) html='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';
  el.innerHTML=html;
}
// ── D: Linha do tempo ──
function _gtRenderD(el){
  var d=_gtMesMap();var html='<div style="padding-left:70px;">';
  for(var m=1;m<=12;m++){
    var list=d.map[m];if(!list.length) continue;
    html+='<div style="display:flex;margin-bottom:18px;position:relative;">'
      +'<div style="position:absolute;left:-70px;top:8px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;width:52px;text-align:right;">'+_gtMeses[m-1]+'</div>'
      +'<div style="position:absolute;left:-18px;top:10px;width:8px;height:8px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);"></div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    list.forEach(function(t,ti){
      var cor=_gtCores[ti%_gtCores.length];
      var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
      var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
      var idx=_gerenciarTurmasList.indexOf(t);
      html+='<div onclick="_gtAbrirEditar('+idx+')" style="display:inline-flex;flex-direction:column;align-items:flex-start;background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:7px 12px;cursor:pointer;">'
        +'<span style="font-size:12px;font-weight:700;color:'+cor+';">'+(t.codigo||t.id)+' — '+t.nome+'</span>'
        +(periodo?'<span style="font-size:10px;color:var(--accent);margin-top:2px;">'+periodo+'</span>':'')
        +'</div>';
    });
    html+='</div></div>';
  }
  html+='</div>';
  if(!d.turmasAno.length) html='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';
  el.innerHTML=html;
}
// ── E: Kanban ──
function _gtRenderE(el){
  var d=_gtMesMap();
  var trims=[{l:'Q1 — Jan/Mar',m:[1,2,3]},{l:'Q2 — Abr/Jun',m:[4,5,6]},{l:'Q3 — Jul/Set',m:[7,8,9]},{l:'Q4 — Out/Dez',m:[10,11,12]}];
  var corQ=['var(--blue)','var(--accent)','#a78bfa','var(--red)'];
  var html='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">';
  trims.forEach(function(q,qi){
    var lista=[];q.m.forEach(function(m){d.map[m].forEach(function(t){lista.push({t:t,m:m});});});
    html+='<div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden;">'
      +'<div style="padding:10px 12px;font-size:11px;font-weight:700;color:'+corQ[qi]+';border-bottom:1px solid '+corQ[qi]+'33;">'+q.l+'<br><span style="font-size:10px;color:var(--muted);font-weight:400;">'+lista.length+' turma'+(lista.length!==1?'s':'')+'</span></div>'
      +'<div style="padding:10px;display:flex;flex-direction:column;gap:7px;">';
    if(!lista.length) html+='<div style="font-size:11px;color:var(--muted);text-align:center;padding:8px;">sem turmas</div>';
    else lista.forEach(function(x,ti){
      var cor=_gtCores[ti%_gtCores.length];
      var ps=_gtFmtDate(x.t.periodStart),pe=_gtFmtDate(x.t.periodEnd);
      var periodo=ps&&pe?ps+' → '+pe:(x.t.periodText||'');
      var idx=_gerenciarTurmasList.indexOf(x.t);
      html+='<div onclick="_gtAbrirEditar('+idx+')" style="background:var(--surface2);border-radius:var(--radius-sm);padding:9px 11px;cursor:pointer;border-left:3px solid '+cor+';">'
        +'<div style="font-size:10px;color:var(--muted);margin-bottom:2px;">'+_gtMesesFull[x.m-1]+'</div>'
        +'<div style="font-size:11px;font-weight:700;color:'+cor+';">'+(x.t.codigo||x.t.id)+'</div>'
        +'<div style="font-size:12px;color:var(--text);">'+x.t.nome+'</div>'
        +(periodo?'<div style="font-size:9px;color:var(--accent);margin-top:2px;">'+periodo+'</div>':'')
        +'</div>';
    });
    html+='</div></div>';
  });
  html+='</div>';el.innerHTML=html;
}
// ── F: Mapa de calor ──
function _gtRenderF(el){
  var d=_gtMesMap();
  var tiposSet={};d.turmasAno.forEach(function(t){tiposSet[_gtExtrairTipo(t)]=true;});
  var tipos=Object.keys(tiposSet).sort();
  if(!tipos.length){el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';return;}
  var html='<div style="overflow-x:auto;"><div style="display:grid;grid-template-columns:90px repeat(12,1fr);gap:3px;min-width:620px;">';
  html+='<div></div>';
  _gtMeses.forEach(function(m){html+='<div style="font-size:10px;font-weight:700;color:var(--muted);text-align:center;padding:3px 0;text-transform:uppercase;letter-spacing:.04em;">'+m+'</div>';});
  tipos.forEach(function(tipo,ti){
    var cor=_gtCores[ti%_gtCores.length];var bg=_gtBgs[ti%_gtBgs.length];
    html+='<div style="font-size:11px;font-weight:700;color:'+cor+';display:flex;align-items:center;padding-right:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+tipo+'</div>';
    for(var m=1;m<=12;m++){
      var list=d.map[m].filter(function(t){return _gtExtrairTipo(t)===tipo;});
      if(!list.length){html+='<div style="height:34px;border-radius:4px;background:var(--surface2);opacity:.3;"></div>';}
      else{
        var idx=_gerenciarTurmasList.indexOf(list[0]);
        var ps=_gtFmtDate(list[0].periodStart),pe=_gtFmtDate(list[0].periodEnd);
        var periodo=ps&&pe?ps+' → '+pe:(list[0].periodText||'');
        var tip=list[0].nome+(periodo?' · '+periodo:'');
        html+='<div onclick="_gtAbrirEditar('+idx+')" title="'+tip+'" style="height:34px;border-radius:4px;background:'+bg+';border:1px solid '+cor+'55;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:'+cor+';cursor:pointer;overflow:hidden;padding:0 3px;white-space:nowrap;">'+list.length+'</div>';
      }
    }
  });
  html+='</div></div>';el.innerHTML=html;
}
// ── G: Semestres ──
function _gtRenderG(el){
  var d=_gtMesMap();
  var sems=[{l:'1º Semestre — Jan a Jun',m:[1,2,3,4,5,6]},{l:'2º Semestre — Jul a Dez',m:[7,8,9,10,11,12]}];
  var html='';
  sems.forEach(function(s){
    var lista=[];s.m.forEach(function(m){d.map[m].forEach(function(t){lista.push({t:t,m:m});});});
    html+='<div style="margin-bottom:12px;border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);"><span style="font-size:13px;font-weight:700;">'+s.l+'</span><span style="font-size:11px;color:var(--muted);background:var(--surface2);padding:2px 8px;border-radius:20px;">'+lista.length+' turma'+(lista.length!==1?'s':'')+'</span></div>';
    if(lista.length){
      html+='<div style="padding:12px;display:flex;flex-wrap:wrap;gap:8px;">';
      lista.forEach(function(x,ti){
        var cor=_gtCores[ti%_gtCores.length];
        var ps=_gtFmtDate(x.t.periodStart),pe=_gtFmtDate(x.t.periodEnd);
        var periodo=ps&&pe?ps+' → '+pe:(x.t.periodText||'');
        var idx=_gerenciarTurmasList.indexOf(x.t);
        html+='<div onclick="_gtAbrirEditar('+idx+')" style="background:var(--surface2);border-radius:var(--radius-sm);padding:9px 12px;cursor:pointer;border-top:2px solid '+cor+';">'
          +'<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">'+_gtMesesFull[x.m-1]+'</div>'
          +'<div style="font-size:11px;font-weight:700;color:'+cor+';">'+(x.t.codigo||x.t.id)+'</div>'
          +'<div style="font-size:12px;color:var(--text);">'+x.t.nome+'</div>'
          +(periodo?'<div style="font-size:9px;color:var(--accent);margin-top:2px;">'+periodo+'</div>':'')
          +'</div>';
      });
      html+='</div>';
    } else {html+='<div style="padding:12px;font-size:11px;color:var(--muted);">Nenhuma turma neste semestre.</div>';}
    html+='</div>';
  });
  el.innerHTML=html;
}
// ── H: Swimlane ──
function _gtRenderH(el){
  var d=_gtMesMap();
  var tiposSet={};d.turmasAno.forEach(function(t){tiposSet[_gtExtrairTipo(t)]=true;});
  var tipos=Object.keys(tiposSet).sort();
  if(!tipos.length){el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';return;}
  var html='<div style="overflow-x:auto;"><div style="display:grid;grid-template-columns:110px repeat(12,1fr);gap:3px;min-width:680px;">';
  html+='<div></div>';
  _gtMeses.forEach(function(m){html+='<div style="font-size:10px;font-weight:700;color:var(--muted);text-align:center;padding:4px 0;text-transform:uppercase;letter-spacing:.04em;">'+m+'</div>';});
  tipos.forEach(function(tipo,ti){
    var cor=_gtCores[ti%_gtCores.length];var bg=_gtBgs[ti%_gtBgs.length];
    html+='<div style="font-size:11px;font-weight:700;color:'+cor+';display:flex;align-items:center;padding-right:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+tipo+'</div>';
    for(var m=1;m<=12;m++){
      var list=d.map[m].filter(function(t){return _gtExtrairTipo(t)===tipo;});
      if(!list.length){html+='<div style="height:44px;border-radius:4px;background:var(--surface2);opacity:.3;"></div>';}
      else{
        var t=list[0];
        var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
        var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
        var idx=_gerenciarTurmasList.indexOf(t);
        html+='<div onclick="_gtAbrirEditar('+idx+')" title="'+t.nome+(periodo?' · '+periodo:'')+'" style="height:44px;border-radius:4px;background:'+bg+';border:1px solid '+cor+'55;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:'+cor+';cursor:pointer;overflow:hidden;padding:0 3px;text-align:center;">'
          +(t.codigo||t.id)
          +(periodo?'<span style="font-size:8px;opacity:.8;margin-top:2px;overflow:hidden;max-width:100%;text-overflow:ellipsis;white-space:nowrap;">'+periodo+'</span>':'')
          +'</div>';
      }
    }
  });
  html+='</div></div>';el.innerHTML=html;
}


function _gtAbrirEditar(idx){
  var t=_gerenciarTurmasList[idx];
  if(!t) return;
  // Painel de edição inline abaixo do swimlane
  var existing=document.getElementById('gtEditPanel');
  if(existing) existing.remove();
  var panel=document.createElement('div');
  panel.id='gtEditPanel';
  panel.style.cssText='margin-top:12px;padding:14px 16px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);display:flex;flex-direction:column;gap:10px;';
  panel.innerHTML=
    '<div style="font-size:12px;font-weight:700;color:var(--text);">'+t.nome+' <span style="color:var(--muted);font-weight:400;font-size:11px;">'+t.id+'</span></div>'+
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'+
      '<input id="gtEditMeta" type="text" value="'+formatVal(t.meta||0)+'" placeholder="Meta (R$)" style="flex:1;min-width:120px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:12px;text-align:right;height:34px;box-sizing:border-box;">'+
      '<button onclick="_gtSalvarMeta('+idx+')" style="height:34px;padding:0 12px;background:var(--accent-dim);color:var(--accent);border:1px solid rgba(200,240,90,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;white-space:nowrap;">💾 Meta</button>'+
      '<button onclick="_gtEditarNome('+idx+')" style="height:34px;padding:0 12px;background:var(--blue-bg);color:var(--blue);border:1px solid rgba(96,165,250,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;white-space:nowrap;">✏ Nome</button>'+
      '<button onclick="excluirTurma(\''+t.id+'\',\''+t.nome.replace(/'/g,"\\'")+'\')" style="height:34px;padding:0 12px;background:var(--red-bg);color:var(--red);border:1px solid rgba(255,95,87,.3);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;white-space:nowrap;">🗑 Excluir</button>'+
      '<button onclick="document.getElementById(\'gtEditPanel\').remove()" style="height:34px;padding:0 10px;background:none;color:var(--muted);border:1px solid var(--border2);border-radius:6px;font-size:12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">✕</button>'+
    '</div>';
  document.getElementById('gerenciarTurmasLista').appendChild(panel);
}
function _gtSalvarMeta(idx){
  var t=_gerenciarTurmasList[idx];
  var val=parseVal(document.getElementById('gtEditMeta').value)||0;
  t.meta=val;
  if(window._fbSave) window._fbSave(TURMAS_NODE+'/'+t.id+'/meta',val).then(function(){_showToast('✅ Meta atualizada!','var(--accent)');}).catch(function(e){_showToast('❌ Erro','var(--red)');});
}
function _gtEditarNome(idx){
  var t=_gerenciarTurmasList[idx];
  var novo=prompt('Novo nome:',t.nome);
  if(!novo||!novo.trim()) return;
  t.nome=novo.trim();
  if(window._fbSave) window._fbSave(TURMAS_NODE+'/'+t.id+'/nome',t.nome).then(function(){_showToast('✅ Nome atualizado!','var(--accent)');renderTurmasGrid();_renderGerenciarLista();}).catch(function(e){_showToast('❌ Erro','var(--red)');});
}
function _moverTurma(idx,dir){
  var novo=idx+dir;
  if(novo<0||novo>=_gerenciarTurmasList.length) return;
  var tmp=_gerenciarTurmasList[idx];
  _gerenciarTurmasList[idx]=_gerenciarTurmasList[novo];
  _gerenciarTurmasList[novo]=tmp;
  // Atualizar campo ordem e salvar no Firebase
  _gerenciarTurmasList.forEach(function(t,i){
    t.ordem=i;
    if(window._fbSave) window._fbSave(TURMAS_NODE+'/'+t.id+'/ordem',i).catch(function(){});
  });
  _renderGerenciarLista();
}

function fecharGerenciarTurmas(){document.getElementById('gerenciarTurmasOverlay').classList.remove('open');}

function _abrirNovaTurmaDoGerenciar(){
  fecharGerenciarTurmas();
  abrirNovaTurma();
}


function getCol(pct){
  if(pct>=100)return{bar:'#c8f05a',grad:'#c8f05a',text:'#c8f05a',cls:'c100',badge:'Meta atingida!'};
  if(pct>=75) return{bar:'#00f0ff',grad:'#00f0ff',text:'#00f0ff',cls:'c75', badge:'Quase lá!'};
  if(pct>=50) return{bar:'#ffe000',grad:'#ffe000',text:'#ffe000',cls:'c50', badge:'Em progresso'};
  if(pct>=25) return{bar:'#ff5500',grad:'#ff5500',text:'#ff5500',cls:'c25', badge:'Atenção'};
  return       {bar:'#ff1744',grad:'#ff1744',text:'#ff1744',cls:'c0',  badge:'Crítico'};
}
function sortBy(col){
  if(sortCol===col)sortDir*=-1;else{sortCol=col;sortDir=1;}
  ['cliente','treinador','treinamento','consultor','valor','status','entrada'].forEach(c=>{const th=document.getElementById('th-'+c);if(th)th.className='sortable'+(sortCol===c?(sortDir===1?' sort-asc':' sort-desc'):'');});
  renderAll();
}
function buildSelects(){
  ['mTreinamento','aTreinamento'].forEach(id=>{const s=document.getElementById(id);if(!s)return;s.innerHTML='<option value="-">—</option>';allTreinamentos.forEach(t=>s.innerHTML+=`<option value="${t}">${t}</option>`);});
  ['mTreinador','aTreinador'].forEach(id=>{const s=document.getElementById(id);if(!s)return;s.innerHTML='<option value="-">—</option>';allTrainers.forEach(t=>s.innerHTML+=`<option value="${t}">${t}</option>`);});
  ['mConsultor','aConsultor'].forEach(id=>{const s=document.getElementById(id);if(!s)return;s.innerHTML='';allConsultors.forEach(c=>s.innerHTML+=`<option value="${c}">${c}</option>`);});
}
function buildFilterBtns(){
  const tb=document.getElementById('trainerFBtns');if(tb){tb.innerHTML='';allTrainers.forEach(t=>{const b=document.createElement('button');b.className='fbtn';b.textContent=t.split(' ')[0];b.id='ft_'+t;b.onclick=()=>toggleTrainer(t);tb.appendChild(b);});}
  const cb=document.getElementById('consultorFBtns');if(cb){cb.innerHTML='';allConsultors.forEach(c=>{const b=document.createElement('button');b.className='fbtn';b.textContent=c;b.id='fc_'+c;b.onclick=()=>toggleConsultor(c);cb.appendChild(b);});}
}
function toggleTrainer(t){activeTrainer=activeTrainer===t?null:t;renderAll();}
function toggleConsultor(c){activeConsultor=activeConsultor===c?null:c;renderAll();}
function setStatus(s){activeStatus=s;renderAll();}
function setStatusDropdown(v){activeStatus=v||null;renderAll();}
function clearAll(){
  activeTrainer=null;activeConsultor=null;activeStatus=null;activeCliente=null;
  var _sf=document.getElementById('statusFilter');if(_sf)_sf.value='';
  renderAll();
}
function toggleCliente(nome){
  if(activeCliente===nome){
    activeCliente=null;activeTrainer=null;activeConsultor=null;
  } else {
    activeCliente=nome;
    const linha=data.find(function(d){return d.cliente===nome&&d.entrada>0;});
    activeTrainer=(linha&&linha.treinador&&linha.treinador.trim())?linha.treinador:null;
    activeConsultor=linha?linha.consultor:null;
  }
  renderAll();
}
function setConsultorStatus(s){
  activeConsultorStatus=s;
  ['fcAll','fcAberto','fcPago','fcEntrada'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  // negociacao vem dos KPI cards — não tem botão dedicado, deixa "Todos" ativo
  const aid=s===null?'fcAll':s==='aberto'?'fcAberto':s==='pago'?'fcPago':s==='negociacao'?'fcAll':'fcEntrada';
  const el=document.getElementById(aid);if(el)el.classList.add('active');
  if(document.getElementById('consultorDetail').style.display!=='none'&&window._consultorAtivo)_renderConsultorDetail(window._consultorAtivo);
  else renderConsultor();
}
function setTreinadorStatus(s){
  activeTreinadorStatus=s;
  ['ftAll','ftAberto','ftPago','ftEntrada'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const aid=s===null?'ftAll':s==='aberto'?'ftAberto':s==='pago'?'ftPago':'ftEntrada';
  const el=document.getElementById(aid);if(el)el.classList.add('active');
  if(document.getElementById('treinadorDetail').style.display!=='none'&&window._treinadorAtivo)_renderTreinadorDetail(window._treinadorAtivo);
  else renderTreinador();
}
function filtered(){
  const q=(document.getElementById('searchInput')?.value||'').toLowerCase().trim();
  let f=data.filter(d=>d&&d.cliente).filter(d=>
    (!activeTrainer||d.treinador===activeTrainer)&&
    (!activeConsultor||d.consultor===activeConsultor)&&
    (!activeCliente||(d.cliente===activeCliente&&d.entrada>0))&&
    (!activeStatus||(activeStatus==='entrada'?d.entrada>0:d.status===activeStatus))&&
    (!q||d.cliente.toLowerCase().includes(q)||(d.treinador||'').toLowerCase().includes(q)||(d.consultor||'').toLowerCase().includes(q)||(d.treinamento||'').toLowerCase().includes(q))
  );
  if(sortCol){f=[...f].sort((a,b)=>{const av=a[sortCol],bv=b[sortCol];if(typeof av==='number')return(av-bv)*sortDir;return String(av).localeCompare(String(bv),'pt-BR')*sortDir;});}
  return f;
}

/* ═══════════════════════════════════════════
   DEDUPLICAÇÃO DE CLIENTES
   Mescla registros com mesmo cliente+consultor
   gerados pelo modelo antigo (1 registro por treinamento)
═══════════════════════════════════════════ */
function _dedupClientesInterno(silencioso){
  // Agrupar por chave cliente+consultor
  var grupos={};
  data.forEach(function(d,i){
    var chave=(d.cliente||'').toUpperCase()+'|'+(d.consultor||'');
    if(!grupos[chave]) grupos[chave]=[];
    grupos[chave].push({d:d,i:i});
  });

  var indicesToRemover=[];
  var houveMesclagem=false;

  Object.keys(grupos).forEach(function(chave){
    var grupo=grupos[chave];
    if(grupo.length<=1) return; // sem duplicata

    // Ordenar: preferir o registro com treinamentos[] mais completo
    grupo.sort(function(a,b){
      var la=(a.d.treinamentos&&a.d.treinamentos.length)||0;
      var lb=(b.d.treinamentos&&b.d.treinamentos.length)||0;
      if(lb!==la) return lb-la; // mais treinamentos primeiro
      return (b.d.valor||0)-(a.d.valor||0); // maior valor primeiro
    });

    var principal=grupo[0].d;

    // Coletar todos os treinamentos únicos de todos os registros do grupo
    var treinsMesclados=[];
    var codsVistos={};
    grupo.forEach(function(g){
      var treins=g.d.treinamentos&&g.d.treinamentos.length
        ? g.d.treinamentos
        : [{cod:g.d.treinamento||'-', valor:g.d.valor||0}];
      treins.forEach(function(t){
        if(t.cod&&t.cod!=='-'&&!codsVistos[t.cod]){
          codsVistos[t.cod]=true;
          treinsMesclados.push({cod:t.cod,valor:t.valor||0});
        }
      });
    });

    // Status: pago > negociacao > aberto > desistiu > estorno > -
    var _prioridade={pago:5,negociacao:4,aberto:3,desistiu:2,estorno:1,'-':0};
    var melhorStatus=grupo.reduce(function(best,g){
      var p=_prioridade[g.d.status]||0;
      return p>(_prioridade[best]||0)?g.d.status:best;
    }, principal.status||'aberto');

    // Aplicar ao registro principal
    principal.treinamentos=treinsMesclados;
    principal.treinamento=treinsMesclados.length?treinsMesclados[0].cod:'-';
    principal.valor=treinsMesclados.reduce(function(a,t){return a+(t.valor||0);},0);
    principal.status=melhorStatus;

    // Marcar índices dos duplicados (todos exceto o principal) para remoção
    for(var k=1;k<grupo.length;k++) indicesToRemover.push(grupo[k].i);
    houveMesclagem=true;
  });

  if(!houveMesclagem) return 0;

  // Remover duplicados (ordem decrescente para não deslocar índices)
  indicesToRemover.sort(function(a,b){return b-a;});
  indicesToRemover.forEach(function(i){ data.splice(i,1); });

  if(!silencioso){
    if(typeof markUnsaved==='function') markUnsaved();
    if(typeof saveStorage==='function') saveStorage();
    if(typeof renderAll==='function') renderAll();
    if(typeof renderConsultor==='function') renderConsultor();
    if(typeof _showToast==='function') _showToast('✅ '+indicesToRemover.length+' registro(s) duplicado(s) removido(s) e mesclados.','var(--accent)');
  }

  return indicesToRemover.length;
}
window._deduplicarClientes=function(){ _dedupClientesInterno(false); };

/* ═══════════════════════════════════════════
   RENDER ALL
═══════════════════════════════════════════ */
function renderAll(){
  const f=filtered();
  // Controle de acesso — ocultar botões de ação para não-ADM
  var _sess=_getSessao?_getSessao():null;
  var _isAdm=!_sess||_sess.perfil==='adm';
  var _perfil=_sess?_sess.perfil:'adm';
  var _vinculo=_sess?(_sess.vinculo||'').toUpperCase():'';
  // Base de dados filtrada por vínculo para consultor
  var _base=(_perfil==='consultor'&&_vinculo)
    ? data.filter(function(d){return d&&d.cliente&&(d.consultor||'').toUpperCase()===_vinculo;})
    : data.filter(function(d){return d&&d.cliente;});
  var _btnNC=document.getElementById('btnNovoCliente');
  if(_btnNC)_btnNC.style.display=_isAdm?'':'none';
  // Atualizar botões filtro
  allTrainers.forEach(t=>{const b=document.getElementById('ft_'+t);if(b)b.className='fbtn'+(activeTrainer===t?' active':'');});
  allConsultors.forEach(c=>{const b=document.getElementById('fc_'+c);if(b)b.className='fbtn'+(activeConsultor===c?' active':'');});
  // Sincronizar dropdown de status
  var _sf=document.getElementById('statusFilter');
  if(_sf)_sf.value=activeStatus||'';

  const totalPago=_base.filter(d=>d.status==='pago').reduce((a,d)=>a+d.valor,0);
  const totalAberto=_base.filter(d=>d.status==='aberto').reduce((a,d)=>a+d.valor,0);
  const clientesEntrada=_base.filter(d=>d.entrada>0);
  const totalEntradas=clientesEntrada.reduce((a,d)=>a+d.entrada,0);
  const pctGeral=Math.round((totalPago/META)*100);
  const colGeral=getCol(pctGeral);
  const ultrapassado=Math.max(totalPago-META,0);
  const faltam=Math.max(META-totalPago,0);
  const barW=Math.min(Math.round((totalPago/(META*1.5))*100),100);
  const needlePct=Math.round((META/(META*1.5))*100);

  document.getElementById('mTotal').textContent=formatVal(totalPago+totalAberto);
  document.getElementById('mTotalSub').textContent=_base.length+' clientes';
  document.getElementById('mAberto').textContent=formatVal(totalAberto);
  document.getElementById('mAbertoSub').textContent=_base.filter(d=>d.status==='aberto').length+' clientes';
  document.getElementById('mPago').textContent=formatVal(totalPago);
  document.getElementById('mPagoSub').textContent=_base.filter(d=>d.status==='pago').length+' pago(s)';
  document.getElementById('mEntradas').textContent=formatVal(totalEntradas);
  document.getElementById('mEntradasSub').textContent=clientesEntrada.length===0?'Nenhuma entrada':clientesEntrada.length+' com entrada';
  document.getElementById('mFaltam').textContent=faltam>0?formatVal(faltam):'META ATINGIDA! 🏆';
  document.getElementById('mFaltam').style.color=faltam>0?'var(--red)':'#c8f05a';
  document.getElementById('mPctSub').innerHTML=pctGeral+'% ATINGIDO'+(ultrapassado>0?' · <span style="color:#c8f05a;font-weight:600;">+'+formatVal(ultrapassado)+' ACIMA</span>':'');
  document.getElementById('geralPct').textContent=pctGeral+'%';document.getElementById('geralPct').style.color=colGeral.text;
  const fill=document.getElementById('geralFill');
  fill.style.width=barW+'%';fill.className='meta-fill '+(pctGeral>=100?'neon-green':pctGeral>=50?'neon-amber':'neon-red');
  document.getElementById('geralNeedle').style.left=needlePct+'%';
  const fc=document.getElementById('fireCanvas');
  if(fc){if(pctGeral>=100){fc.style.display='block';startFireCanvas(needlePct,barW);}else{fc.style.display='none';stopFireCanvas();}}
  document.getElementById('geralFat').textContent='FATURADO: '+formatVal(totalPago);
  const gf=document.getElementById('geralFalta');
  if(faltam>0){gf.textContent='FALTAM: '+formatVal(faltam);gf.style.color='var(--red)';}
  else{gf.textContent='META ATINGIDA! 🏆';gf.style.color='#c8f05a';}

  // Cards treinadores
  const _ministranteGeral=_getTurmaMinistante();
  document.getElementById('trainerMetaRows').innerHTML=allTrainers.map(t=>{
    const tP=data.filter(d=>d&&d.cliente&&d.treinador===t&&d.status==='pago').reduce((a,d)=>a+d.valor,0);
    const tT=data.filter(d=>d&&d.cliente&&d.treinador===t).reduce((a,d)=>a+d.valor,0);
    const tA=data.filter(d=>d&&d.cliente&&d.treinador===t&&d.status==='aberto').reduce((a,d)=>a+d.valor,0);
    const tC=data.filter(d=>d&&d.cliente&&d.treinador===t).length;
    const pct=Math.round((tP/META)*100),bw=Math.min(Math.round((tP/(META*1.5))*100),100);
    const col=getCol(pct),fat=Math.max(META-tP,0),border=tBorder[t]||'#888';
    const isMiniG=_ministranteGeral===t;
    return `<div class="tc" style="border-left-color:${border};">
      <div class="tc-header"><div><div class="tc-name">${t.toUpperCase()}</div><div class="tc-clients">${tC} cliente${tC!==1?'s':''}</div></div><div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">${isMiniG?`<span class="tc-badge" style="background:rgba(96,165,250,.15);color:#60a5fa;border:1px solid rgba(96,165,250,.3);">Ministrante</span>`:''}<span class="tc-badge ${col.cls}">${col.badge}</span></div></div>
      <div class="tc-pct" style="color:${col.text};">${pct}%</div>
      <div class="tc-track"><div class="tc-fill" style="width:${bw}%;background:${col.bar};box-shadow:0 0 15px 10px ${hexToRgba(col.bar,.35)},0 0 10px 10px ${hexToRgba(col.bar,.45)};"></div></div>
      <div class="tc-stats">
        <div class="tc-stat"><span class="tc-stat-label">Faturado</span><span class="tc-stat-val" style="color:var(--green);">${formatVal(tP)}</span></div>
        <div class="tc-stat"><span class="tc-stat-label">Potencial</span><span class="tc-stat-val">${formatVal(tT)}</span></div>
        <div class="tc-stat"><span class="tc-stat-label">Em aberto</span><span class="tc-stat-val" style="color:var(--amber);">${formatVal(tA)}</span></div>
        <div class="tc-stat"><span class="tc-stat-label">Da meta</span><span class="tc-stat-val">${pct}%</span></div>
      </div>
      <div class="tc-faltam"><span class="tc-faltam-label">Faltam para meta</span><span style="color:${fat>0?'var(--red)':'#c8f05a'};">${fat>0?formatVal(fat):'Atingida!'}</span></div>
    </div>`;
  }).join('');

  // ── Tabela de clientes: visualização + edição inline ──
  // Card é somente visualização/edição — sem checkbox, sem coluna Ação
  // Toda seleção/exclusão ocorre no modal Gerenciar Clientes

  document.getElementById('clientTable').innerHTML=f.length===0
    ?'<tr class="empty-row"><td colspan="8" style="text-align:center;">Nenhum cliente para os filtros selecionados.</td></tr>'
    :f.map(d=>{
      const ri=data.indexOf(d), pago=d.status==='pago', hasInfo=!!(d.info&&d.info.trim());
      const statusCls='cs-status-'+(d.status||'aberto');

      // Fix 5: formatar valor/entrada como BRL para exibição no input
      const valEdit = d.valor  ? d.valor.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})  : '';
      const entEdit = d.entrada? d.entrada.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';

      // Fix 7: treinamento — opção vazia obrigatória, NUNCA pré-selecionar
      const treinOpts='<option value="">— vazio —</option>'
        +allTreinamentos.map(t=>`<option value="${t}"${(d.treinamento||'')=== t?' selected':''}>${t}</option>`).join('');

      // Treinador com selected
      const trainOpts=`<option value="-"${(d.treinador||'-')==='-'?' selected':''}>—</option>`
        +allTrainers.map(t=>`<option value="${t}"${d.treinador===t?' selected':''}>${t.toUpperCase()}</option>`).join('');

      // Consultor com selected
      const consOpts=`<option value=""${!d.consultor?' selected':''}>—</option>`
        +allConsultors.map(c=>`<option value="${c}"${d.consultor===c?' selected':''}>${c.toUpperCase()}</option>`).join('');

      // Status com selected
      const statOpts=[
        {v:'aberto',l:'ABERTO'},{v:'pago',l:'PAGO'},{v:'negociacao',l:'NEGOCIAÇÃO'},
        {v:'entrada',l:'ENTRADA'},{v:'desistiu',l:'DESISTIU'},{v:'estorno',l:'ESTORNO'},{v:'-',l:'—'}
      ].map(s=>`<option value="${s.v}"${(d.status||'aberto')===s.v?' selected':''}>${s.l}</option>`).join('');

      // Fix 6: todas as colunas centralizadas; nome do cliente alinhado à esquerda
      // Cor de ticket: Low (0-5k)=azul, Middle (5k-10k)=âmbar, High (10k+)=verde
      const ticketCor = d.valor >= 10000.01 ? 'var(--green)'
                      : d.valor >= 5001     ? 'var(--amber)'
                      : d.valor > 0         ? 'var(--blue)'
                      : 'var(--muted)';

      return `<tr data-ri="${ri}" style="border-left:${pago?'2px solid #39ff14':'2px solid transparent'};">
        <td style="text-align:left;font-weight:600;text-transform:uppercase;white-space:nowrap;${pago?'color:#39ff14;':''}">
          <span style="display:inline-flex;align-items:center;gap:4px;">${d.cliente}<button class="info-btn${hasInfo?' has-info':''}" onclick="openClientInfo(${ri})">i</button></span>
        </td>
        <td style="text-align:center;white-space:nowrap;padding:3px 5px;">
          <select class="card-sel cs-treinador" data-ri="${ri}" data-campo="treinador" onchange="cardCellChange(this)">${trainOpts}</select>
        </td>
        <td style="text-align:center;white-space:nowrap;padding:3px 5px;">
          <select class="card-sel" data-ri="${ri}" data-campo="treinamento" onchange="cardCellChange(this)">${treinOpts}</select>
        </td>
        <td style="text-align:center;white-space:nowrap;padding:3px 5px;">
          <select class="card-sel cs-consultor" data-ri="${ri}" data-campo="consultor" onchange="cardCellChange(this)">${consOpts}</select>
        </td>
        <td style="text-align:center;white-space:nowrap;padding:3px 6px;min-width:100px;vertical-align:middle;">
          <input type="text" inputmode="numeric" class="card-num-input card-num-valor" data-ri="${ri}" data-campo="valor"
            value="${valEdit}" oninput="cardMoneyMask(this)" onchange="cardNumChange(this)" placeholder="0,00"
            style="color:${pago?'#39ff14':d.valor<=5000?'var(--blue)':d.valor<=10000?'var(--amber)':'var(--green)'};font-weight:${pago?'700':'600'};">
        </td>
        <td style="text-align:center;white-space:nowrap;padding:3px 5px;vertical-align:middle;">
          <select class="card-sel ${statusCls}" data-ri="${ri}" data-campo="status" onchange="cardCellChange(this);cardUpdateStatusClass(this)">${statOpts}</select>
        </td>
        <td style="text-align:center;white-space:nowrap;padding:3px 6px;min-width:90px;vertical-align:middle;">
          <input type="text" inputmode="numeric" class="card-num-input card-num-entrada" data-ri="${ri}" data-campo="entrada"
            value="${entEdit}" oninput="cardMoneyMask(this)" onchange="cardNumChange(this)" placeholder="—"
            style="color:var(--blue);font-weight:500;">
        </td>
        <td style="text-align:center;padding:3px 6px;vertical-align:middle;" data-presenca-ri="${ri}">
          ${window._presencaBadgeHtml ? window._presencaBadgeHtml(ri) : '<span style="color:var(--muted);font-size:10px;">—</span>'}
        </td>
      </tr>`;
    }).join('');

  document.getElementById('tableCount').textContent=`${f.length} de ${data.length} cliente${data.length!==1?'s':''}`;
  document.getElementById('tableTotal').innerHTML='Total visível: <span>'+formatVal(f.reduce((a,d)=>a+d.valor,0))+'</span>';

  // Barras por treinador — NEON + PERCENTUAL
  const maxV=Math.max(1,...allTrainers.map(t=>data.filter(d=>d&&d.cliente&&d.treinador===t).reduce((a,d)=>a+d.valor,0)));

  // Permissão: consultor não interage com rankings e barras da aba Geral
  var _sessG=_getSessao?_getSessao():null;
  var _perfilG=_sessG?_sessG.perfil:'adm';
  var _rankClicavel=(_perfilG==='adm'||_perfilG==='ministrante');

  // Correlação cruzada — calculada antes de qualquer renderização dos painéis
  const consultoresDoTreinadorAtivo = activeTrainer
    ? new Set(data.filter(d=>d&&d.cliente&&d.treinador===activeTrainer).map(d=>d.consultor))
    : null;
  const treinadoresDoConsultorAtivo = activeConsultor
    ? new Set(data.filter(d=>d&&d.cliente&&d.consultor===activeConsultor).map(d=>d.treinador))
    : null;
  document.getElementById('trainerBars').innerHTML=allTrainers.map((t,i)=>{
    const tv=data.filter(d=>d&&d.cliente&&d.treinador===t).reduce((a,d)=>a+d.valor,0);
    const tp=data.filter(d=>d&&d.cliente&&d.treinador===t&&d.status==='pago').reduce((a,d)=>a+d.valor,0);
    const bw=Math.round((tv/maxV)*100);
    const pctT=tv>0?Math.round((tp/tv)*100):0;
    const cor=tColors[t]||PALETTE_T[i%PALETTE_T.length];
    const nb=NB_CLS[i%NB_CLS.length];
    var opB=1;
    if(activeTrainer&&activeTrainer!==t) opB=0.3;
    else if(treinadoresDoConsultorAtivo&&!treinadoresDoConsultorAtivo.has(t)) opB=0.3;
    var _attrBar=_rankClicavel?`onclick="toggleTrainer('${t}')"`:`style="pointer-events:none;"`;
    return `<div class="bar-srow" style="opacity:${opB};transition:opacity .15s;" ${_attrBar}>
      <div class="bar-sname">${t.toUpperCase()}</div>
      <div class="bar-sbg">
        <div class="bar-sfill ${nb}" style="width:${bw}%;background:${cor};overflow:visible;">
          ${bw>15?`<span class="bar-pct">${pctT}%</span>`:''}
        </div>
        ${bw<=15&&bw>0?`<span style="position:absolute;left:${bw+2}%;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700;color:${cor};">${pctT}%</span>`:''}
      </div>
      <div class="bar-sval">
        <div>${formatVal(tv)}</div>
        ${tp>0?`<div style="color:var(--green);">✓ ${formatVal(tp)}</div>`:''}
      </div>
    </div>`;
  }).join('');

  // Rankings
  const medals=['gold','silver','bronze'];
  // _rankClicavel já declarado acima no bloco de barras

  const rankT=[...allTrainers].map(t=>({nome:t,total:data.filter(d=>d&&d.cliente&&d.treinador===t).reduce((a,d)=>a+d.valor,0),pago:data.filter(d=>d&&d.cliente&&d.treinador===t&&d.status==='pago').reduce((a,d)=>a+d.valor,0),clientes:data.filter(d=>d&&d.cliente&&d.treinador===t).length})).sort((a,b)=>b.pago-a.pago);
  document.getElementById('rankingTreinador').innerHTML=rankT.map((t,i)=>{
    var opT=1;
    if(activeTrainer&&activeTrainer!==t.nome) opT=0.3;
    else if(treinadoresDoConsultorAtivo&&!treinadoresDoConsultorAtivo.has(t.nome)) opT=0.3;
    var _attrT=_rankClicavel?`onclick="toggleTrainer('${t.nome}')" style="cursor:pointer;opacity:${opT};transition:opacity .15s;" title="Filtrar por ${t.nome}"`:`style="cursor:default;opacity:${opT};transition:opacity .15s;"`;
    return `<div class="rank-row" ${_attrT}><div class="rank-num ${medals[i]||''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div><div class="rank-info"><div class="rank-name">${t.nome.toUpperCase()}</div><div class="rank-detail">${t.clientes} clientes · ${formatVal(t.pago)} faturado</div></div><div class="rank-val">${formatVal(t.pago)}</div></div>`;
  }).join('');

  const rankC=[...allConsultors].map(c=>({nome:c,total:data.filter(d=>d&&d.cliente&&d.consultor===c).reduce((a,d)=>a+d.valor,0),pago:data.filter(d=>d&&d.cliente&&d.consultor===c&&d.status==='pago').reduce((a,d)=>a+d.valor,0),entrada:data.filter(d=>d&&d.cliente&&d.consultor===c).reduce((a,d)=>a+d.entrada,0),clientes:data.filter(d=>d&&d.cliente&&d.consultor===c).length})).sort((a,b)=>b.pago-a.pago);
  document.getElementById('rankingConsultor').innerHTML=rankC.map((c,i)=>{
    var opC=1;
    if(activeConsultor&&activeConsultor!==c.nome) opC=0.3;
    else if(consultoresDoTreinadorAtivo&&!consultoresDoTreinadorAtivo.has(c.nome)) opC=0.3;
    var _attrC=_rankClicavel?`onclick="abrirClientesVinculados('${c.nome}')" style="cursor:pointer;opacity:${opC};transition:opacity .15s;" title="Ver clientes de ${c.nome}"`:`style="cursor:default;opacity:${opC};transition:opacity .15s;"`;
    return `<div class="rank-row" ${_attrC}><div class="rank-num ${medals[i]||''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div><div class="rank-info"><div class="rank-name">${c.nome.toUpperCase()}</div><div class="rank-detail">${c.clientes} clientes · ${formatVal(c.entrada)} entrada</div></div><div class="rank-val">${formatVal(c.pago)}</div></div>`;
  }).join('');
  const ce2=data.filter(d=>d&&d.cliente&&d.entrada>0);
  document.getElementById('entradaRows').innerHTML=ce2.length===0?'<div style="font-size:12px;color:var(--muted);padding:8px 0;">Nenhuma entrada registrada.</div>':ce2.map(d=>`<div class="srow" onclick="toggleCliente('${d.cliente}')" style="cursor:pointer;opacity:${activeCliente&&activeCliente!==d.cliente?0.3:1};transition:opacity .15s;" title="Filtrar por ${d.cliente}"><div><div class="srow-name">${d.cliente}</div><div class="srow-sub">${d.consultor.toUpperCase()} · ${d.treinamento||'—'}</div></div><span class="srow-val" style="color:var(--green);">${formatVal(d.entrada)}</span></div>`).join('');

  // Sync abas abertas
  if(window._consultorAtivo&&document.getElementById('consultorDetail').style.display!=='none')_renderConsultorDetail(window._consultorAtivo);
  if(window._treinadorAtivo&&document.getElementById('treinadorDetail').style.display!=='none')_renderTreinadorDetail(window._treinadorAtivo);

  // Re-renderizar aba ativa
  var _abaAtiva=document.querySelector('.tab.active');
  if(_abaAtiva){
    var _tabTxt=(_abaAtiva.textContent||'').toLowerCase().trim();
    if(_tabTxt==='consultor') renderConsultor();
    if(_tabTxt==='treinador') renderTreinador();
    if(_tabTxt==='produto') renderProduto();
  }
}

/* ═══════════════════════════════════════════
   ABA PRODUTO
═══════════════════════════════════════════ */
var _prodSortCol='total',_prodSortDir=-1;
function _setProdSort(col){
  if(_prodSortCol===col){_prodSortDir*=-1;}else{_prodSortCol=col;_prodSortDir=-1;}
  renderProduto();
}

function renderProduto(){
  // Controle de acesso: consultor só vê Clientes Pagos e Clientes Entrada Realizada
  var _sessP=_getSessao?_getSessao():null;
  var _perfilP=_sessP?_sessP.perfil:'adm';
  var _vinculoP=_sessP?(_sessP.vinculo||''). toUpperCase():'';
  var _isConsultorP=_perfilP==='consultor';
  // Painel Cards Proposta — oculto para consultor
  var _propSection=document.querySelector('#tab-produto > div:nth-child(4)');
  if(_propSection) _propSection.style.display='';
  // P2: aviso de orientação mobile para consultor
  var _rotWarn=document.getElementById('rotateWarning');
  if(_rotWarn){
    var _isMobile=_isConsultorP&&window.innerWidth<768;
    _rotWarn.style.display=_isMobile?'flex':'none';
    // Atualizar ao virar o celular
    if(!window._rotateListenerAdded){
      window._rotateListenerAdded=true;
      window.addEventListener('resize',function(){
        var _s=_getSessao?_getSessao():null;
        var _p=_s?_s.perfil:'adm';
        var rw=document.getElementById('rotateWarning');
        if(rw) rw.style.display=(_p==='consultor'&&window.innerWidth<768)?'flex':'none';
      });
    }
  }
  // Para consultor: filtrar tabela Clientes Pagos apenas pelo próprio vinculo
  _renderProdutoPropCards();
  _renderProdutoCruzadaEntrada();
  var _sessRP=_getSessao?_getSessao():null;
  var _perfilRP=_sessRP?_sessRP.perfil:'adm';
  var _vinculoRP=_sessRP?(_sessRP.vinculo||''). toUpperCase():'';
  var _isConsRP=_perfilRP==='consultor';
  // Consultor só vê os próprios clientes pagos
  const pagos=_isConsRP
    ?data.filter(d=>d&&d.cliente&&d.status==='pago'&&(d.consultor||''). toUpperCase()===_vinculoRP)
    :data.filter(d=>d&&d.cliente&&d.status==='pago');
  const produtos=[...new Set(data.map(d=>d.treinamento||'—'))].sort();
  const consultores=[...new Set(pagos.map(d=>d.consultor))].sort();
  const el=document.getElementById('produtoCruzadaTable');
  if(!el)return;
  if(!pagos.length){el.innerHTML='<tr class="empty-row"><td colspan="2">Nenhum cliente pago cadastrado.</td></tr>';return;}

  function _sortArrow(col){
    if(_prodSortCol!==col) return '<span style="color:var(--border2);font-size:10px;margin-left:3px;">↕</span>';
    return _prodSortDir===-1
      ?'<span style="color:var(--accent);font-size:10px;margin-left:3px;">↓</span>'
      :'<span style="color:var(--accent);font-size:10px;margin-left:3px;">↑</span>';
  }

  let html='<thead><tr><th style="text-align:left;min-width:120px;cursor:pointer;" onclick="_setProdSort(\'consultor\')">Consultor '+_sortArrow('consultor')+'</th>';
  produtos.forEach(p=>{
    var key='prod_'+p;
    html+=`<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdSort('${key}')">${p} ${_sortArrow(key)}</th>`;
  });
  html+=`<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdSort('qtd')">Total trein. ${_sortArrow('qtd')}</th>`;
  html+=`<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdSort('total')">Total pago ${_sortArrow('total')}</th></tr></thead><tbody>`;

  const totaisProd={},totaisQtd={};
  produtos.forEach(p=>{totaisProd[p]=0;totaisQtd[p]=0;});
  let totalGeral=0,totalQtdGeral=0;

  // Calcular dados por consultor para ordenação
  var linhas=consultores.map(c=>{
    const linhaTotal=pagos.filter(d=>d.consultor===c).reduce((a,d)=>a+d.valor,0);
    const linhaQtd=pagos.filter(d=>d.consultor===c).length;
    var prodVals={};
    produtos.forEach(p=>{
      const rows=pagos.filter(d=>d.consultor===c&&(d.treinamento||'—')===p);
      prodVals['prod_'+p]=rows.reduce((a,d)=>a+d.valor,0);
      prodVals['prod_'+p+'_qtd']=rows.length;
    });
    return {c,linhaTotal,linhaQtd,prodVals};
  }).filter(l=>l.linhaTotal>0);

  // Ordenar linhas
  linhas.sort(function(a,b){
    var av,bv;
    if(_prodSortCol==='consultor'){av=a.c;bv=b.c;return av.localeCompare(bv,'pt-BR')*_prodSortDir;}
    if(_prodSortCol==='total'){av=a.linhaTotal;bv=b.linhaTotal;}
    else if(_prodSortCol==='qtd'){av=a.linhaQtd;bv=b.linhaQtd;}
    else{av=a.prodVals[_prodSortCol]||0;bv=b.prodVals[_prodSortCol]||0;}
    return(av-bv)*_prodSortDir;
  });

  linhas.forEach(({c,linhaTotal,linhaQtd,prodVals})=>{
    const col=getCol(Math.round((linhaTotal/META)*100));
    html+=`<tr><td style="font-weight:600;text-align:left;text-transform:uppercase;">${c}</td>`;
    produtos.forEach(p=>{
      const v=prodVals['prod_'+p]||0;
      const qtd=prodVals['prod_'+p+'_qtd']||0;
      totaisProd[p]+=v;totaisQtd[p]+=qtd;
      if(qtd>0){
        const cp=getCol(Math.round((v/(META/allConsultors.length||1))*100));
        html+=`<td style="text-align:center;cursor:pointer;" onclick="abrirProdutoClientes('${c}','${p}')" title="Ver clientes">
          <span style="font-size:13px;font-weight:700;color:${cp.text};">${qtd}</span>
          <br><span style="font-size:11px;color:var(--muted);white-space:nowrap;">${formatVal(v)}</span>
        </td>`;
      } else {
        html+=`<td style="text-align:center;color:var(--border2);">—</td>`;
      }
    });
    totalGeral+=linhaTotal;totalQtdGeral+=linhaQtd;
    html+=`<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--accent);cursor:pointer;" onclick="abrirProdutoClientes('${c}',null)">${linhaQtd}</td>`;
    html+=`<td style="text-align:center;font-weight:700;white-space:nowrap;color:${col.text};">${formatVal(linhaTotal)}</td></tr>`;
  });

  // Linha totais
  html+='<tr style="border-top:2px solid var(--border2);background:var(--surface2);"><td style="font-weight:700;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);">Total</td>';
  produtos.forEach(p=>{
    html+=totaisQtd[p]>0
      ?`<td style="text-align:center;font-weight:700;white-space:nowrap;cursor:pointer;" onclick="abrirTotalProduto('${p}')">
          <span style="font-size:12px;color:var(--accent);">${totaisQtd[p]}</span>
          <br><span style="font-size:11px;color:var(--muted);">${formatVal(totaisProd[p])}</span>
        </td>`
      :`<td style="text-align:center;color:var(--border2);">—</td>`;
  });
  const colTotal=getCol(Math.round((totalGeral/META)*100));
  html+=`<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--accent);cursor:pointer;" onclick="abrirTotalProduto(null)">${totalQtdGeral}</td>`;
  html+=`<td style="text-align:center;font-weight:700;white-space:nowrap;color:${colTotal.text};">${formatVal(totalGeral)}</td></tr>`;
  html+='</tbody>';
  el.innerHTML=html;
}

// ── Tabela Consultor × Produto — Entrada Realizada ──
let _prodEntSortCol='consultor', _prodEntSortDir=1;

function _setProdEntSort(col){
  if(_prodEntSortCol===col){_prodEntSortDir*=-1;}else{_prodEntSortCol=col;_prodEntSortDir=-1;}
  _renderProdutoCruzadaEntrada();
}

function _renderProdutoCruzadaEntrada(){
  var panel=document.getElementById('produtoEntradaPanel');
  var el=document.getElementById('produtoCruzadaEntradaTable');
  if(!panel||!el) return;

  // Apenas clientes com entrada > 0
  var _sessRE=_getSessao?_getSessao():null;
  var _perfilRE=_sessRE?_sessRE.perfil:'adm';
  var _vinculoRE=_sessRE?(_sessRE.vinculo||''). toUpperCase():'';
  var _isConsRE=_perfilRE==='consultor';
  var comEntrada=_isConsRE
    ?data.filter(function(d){return d.entrada&&d.entrada>0&&(d.consultor||''). toUpperCase()===_vinculoRE;})
    :data.filter(function(d){return d.entrada&&d.entrada>0;});

  // Ocultar painel inteiro se não houver entradas
  if(!comEntrada.length){panel.style.display='none';return;}
  panel.style.display='';

  var produtos=[...new Set(data.map(function(d){return d.treinamento||'—';}))].sort();
  var consultores=[...new Set(comEntrada.map(function(d){return d.consultor;}))].sort();

  function _sortArrowE(col){
    if(_prodEntSortCol!==col) return '<span style="color:var(--border2);font-size:10px;margin-left:3px;">↕</span>';
    return _prodEntSortDir===-1
      ?'<span style="color:var(--accent);font-size:10px;margin-left:3px;">↓</span>'
      :'<span style="color:var(--accent);font-size:10px;margin-left:3px;">↑</span>';
  }

  var html='<thead><tr><th style="text-align:left;min-width:120px;cursor:pointer;" onclick="_setProdEntSort(\'consultor\')">Consultor '+_sortArrowE('consultor')+'</th>';
  produtos.forEach(function(p){
    var key='prod_'+p;
    html+='<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdEntSort(\''+key+'\')">'+p+' '+_sortArrowE(key)+'</th>';
  });
  html+='<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdEntSort(\'qtd\')">Total clientes '+_sortArrowE('qtd')+'</th>';
  html+='<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdEntSort(\'total\')">Total entrada '+_sortArrowE('total')+'</th></tr></thead><tbody>';

  var totaisProd={},totaisQtd={};
  produtos.forEach(function(p){totaisProd[p]=0;totaisQtd[p]=0;});
  var totalGeral=0,totalQtdGeral=0;

  // Calcular dados por consultor
  var linhas=consultores.map(function(c){
    var linhaTotal=comEntrada.filter(function(d){return d.consultor===c;}).reduce(function(a,d){return a+d.entrada;},0);
    var linhaQtd=comEntrada.filter(function(d){return d.consultor===c;}).length;
    var prodVals={};
    produtos.forEach(function(p){
      var rows=comEntrada.filter(function(d){return d.consultor===c&&(d.treinamento||'—')===p;});
      prodVals['prod_'+p]=rows.reduce(function(a,d){return a+d.entrada;},0);
      prodVals['prod_'+p+'_qtd']=rows.length;
    });
    return {c:c,linhaTotal:linhaTotal,linhaQtd:linhaQtd,prodVals:prodVals};
  }).filter(function(l){return l.linhaQtd>0;});

  // Ordenar linhas
  linhas.sort(function(a,b){
    var av,bv;
    if(_prodEntSortCol==='consultor'){return a.c.localeCompare(b.c,'pt-BR')*_prodEntSortDir;}
    if(_prodEntSortCol==='total'){av=a.linhaTotal;bv=b.linhaTotal;}
    else if(_prodEntSortCol==='qtd'){av=a.linhaQtd;bv=b.linhaQtd;}
    else{av=a.prodVals[_prodEntSortCol]||0;bv=b.prodVals[_prodEntSortCol]||0;}
    return(av-bv)*_prodEntSortDir;
  });

  linhas.forEach(function(row){
    var c=row.c,linhaTotal=row.linhaTotal,linhaQtd=row.linhaQtd,prodVals=row.prodVals;
    html+='<tr><td style="font-weight:600;text-align:left;text-transform:uppercase;">'+c+'</td>';
    produtos.forEach(function(p){
      var v=prodVals['prod_'+p]||0;
      var qtd=prodVals['prod_'+p+'_qtd']||0;
      totaisProd[p]+=v;totaisQtd[p]+=qtd;
      if(qtd>0){
        html+='<td style="text-align:center;cursor:pointer;" onclick="abrirEntradaClientes(\''+c+'\',\''+p+'\')" title="Ver clientes">'
          +'<span style="font-size:13px;font-weight:700;color:var(--blue);">'+qtd+'</span>'
          +'<br><span style="font-size:11px;color:var(--muted);white-space:nowrap;">'+formatVal(v)+'</span>'
          +'</td>';
      } else {
        html+='<td style="text-align:center;color:var(--border2);">—</td>';
      }
    });
    totalGeral+=linhaTotal;totalQtdGeral+=linhaQtd;
    html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--blue);cursor:pointer;" onclick="abrirEntradaClientes(\''+c+'\',null)">'+linhaQtd+'</td>';
    html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--blue);">'+formatVal(linhaTotal)+'</td></tr>';
  });

  // Linha totais
  html+='<tr style="border-top:2px solid var(--border2);background:var(--surface2);">'
    +'<td style="font-weight:700;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);">Total</td>';
  produtos.forEach(function(p){
    html+=totaisQtd[p]>0
      ?'<td style="text-align:center;font-weight:700;white-space:nowrap;cursor:pointer;" onclick="abrirTotalEntrada(\''+p+'\')">'
        +'<span style="font-size:12px;color:var(--blue);">'+totaisQtd[p]+'</span>'
        +'<br><span style="font-size:11px;color:var(--muted);">'+formatVal(totaisProd[p])+'</span></td>'
      :'<td style="text-align:center;color:var(--border2);">—</td>';
  });
  html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--blue);cursor:pointer;" onclick="abrirTotalEntrada(null)">'+totalQtdGeral+'</td>';
  html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--blue);">'+formatVal(totalGeral)+'</td></tr>';
  html+='</tbody>';
  el.innerHTML=html;
}

// Estado de ordenação do modal de clientes
let _cmLista=[], _cmSortCol='valor', _cmSortDir=-1;

function _cmRenderRows(){
  const sorted=[..._cmLista].sort((a,b)=>{
    let av=a[_cmSortCol],bv=b[_cmSortCol];
    if(typeof av==='number') return (av-bv)*_cmSortDir;
    return String(av||'').localeCompare(String(bv||''),'pt-BR')*_cmSortDir;
  });
  ['cliente','treinamento','treinador','consultor','valor','entrada'].forEach(c=>{
    const th=document.getElementById('cmth-'+c);
    if(th) th.className='sortable'+(_cmSortCol===c?(_cmSortDir===1?' sort-asc':' sort-desc'):'');
  });
  document.getElementById('clientesModalTable').innerHTML=sorted.length===0
    ?'<tr class="empty-row"><td colspan="6">Nenhum cliente.</td></tr>'
    :sorted.map(d=>{
      const idx=data.indexOf(d);
      const temInfo=!!(d.info&&d.info.trim());
      var _sessM=_getSessao?_getSessao():null;
      var _perfilM=_sessM?_sessM.perfil:'adm';
      const iBtn=temInfo
        ?`<button class="info-btn has-info" onclick="event.stopPropagation();openClientInfo(${idx})" title="${d.info.replace(/"/g,'&quot;')}">i</button>`
        :(_perfilM!=='consultor'?`<button class="info-btn" onclick="event.stopPropagation();openClientInfo(${idx})">i</button>`:'')
      return `<tr style="border-left:2px solid #39ff14;">
        <td style="font-weight:600;text-transform:uppercase;text-align:left;color:#39ff14;white-space:nowrap;"><span style="display:inline-flex;align-items:center;gap:4px;">${d.cliente}${iBtn}</span></td>
        <td style="text-align:center;font-size:12px;white-space:nowrap;">${d.treinamentos&&d.treinamentos.length?d.treinamentos.map(t=>t.cod).join(' · '):'—'}</td>
        <td style="text-align:center;font-size:12px;color:var(--muted);white-space:nowrap;">${(d.treinamentos&&d.treinamentos.some(t=>t.cod==='CI'))?d.treinador:'-'}</td>
        <td style="text-align:center;font-size:12px;color:var(--muted);white-space:nowrap;">${d.consultor.toUpperCase()}</td>
        <td style="text-align:right;font-weight:600;white-space:nowrap;">${formatVal(d.valor)}</td>
        <td style="text-align:right;font-size:12px;white-space:nowrap;color:${d.entrada>0?'var(--accent)':'var(--muted)'};">${d.entrada>0?formatVal(d.entrada):'—'}</td>
      </tr>`;
    }).join('');
}

function _cmSort(col){
  if(_cmSortCol===col) _cmSortDir*=-1; else{_cmSortCol=col;_cmSortDir=1;}
  _cmRenderRows();
}

function _abrirClientesModalComLista(lista,titulo,sub){
  _cmLista=lista; _cmSortCol='valor'; _cmSortDir=-1;
  document.getElementById('clientesModalTitulo').textContent=titulo;
  document.getElementById('clientesModalSub').innerHTML=sub;
  _cmRenderRows();
  document.getElementById('clientesModalOverlay').classList.add('open');
}

function abrirTotalProduto(produto){
  const lista=data.filter(d=>d&&d.cliente&&d.status==='pago'&&(produto===null||produto==='null'||(d.treinamento||'—')===produto));
  const total=lista.reduce((a,d)=>a+d.valor,0);
  const titulo=produto&&produto!=='null'?'Total · '+produto:'Total · Todos os produtos';
  const col=getCol(Math.round((total/META)*100));
  const sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' pagos · Total: <span style="color:'+col.text+';font-weight:700;">'+formatVal(total)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub);
}

function abrirProdutoClientes(consultor,produto){
  const lista=data.filter(d=>d&&d.cliente&&d.status==='pago'&&d.consultor===consultor&&(produto===null||produto==='null'||(d.treinamento||'—')===produto));
  const total=lista.reduce((a,d)=>a+d.valor,0);
  const titulo=produto&&produto!=='null'?consultor.toUpperCase()+' · '+produto:consultor.toUpperCase()+' · Todos os produtos';
  const sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' pagos · Total: <span style="color:var(--accent);font-weight:700;">'+formatVal(total)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub);
}

function abrirEntradaClientes(consultor,produto){
  var lista=data.filter(function(d){
    return d.entrada&&d.entrada>0
      &&d.consultor===consultor
      &&(produto===null||produto==='null'||(d.treinamento||'—')===produto);
  });
  var totalEnt=lista.reduce(function(a,d){return a+d.entrada;},0);
  var titulo=produto&&produto!=='null'
    ?consultor.toUpperCase()+' · '+produto+' — Entrada'
    :consultor.toUpperCase()+' · Todos os produtos — Entrada';
  var sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' com entrada · Total: <span style="color:var(--blue);font-weight:700;">'+formatVal(totalEnt)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub);
}

function abrirTotalEntrada(produto){
  var lista=data.filter(function(d){
    return d.entrada&&d.entrada>0
      &&(produto===null||produto==='null'||(d.treinamento||'—')===produto);
  });
  var totalEnt=lista.reduce(function(a,d){return a+d.entrada;},0);
  var titulo=produto&&produto!=='null'?'Total · '+produto+' — Entrada':'Total · Todos os produtos — Entrada';
  var sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' com entrada · Total: <span style="color:var(--blue);font-weight:700;">'+formatVal(totalEnt)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub);
}

/* ═══════════════════════════════════════════
   ABAS
═══════════════════════════════════════════ */
function switchTab(tab){
  document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',['geral','consultor','treinador','produto'][i]===tab));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  if(tab==='consultor')renderConsultor();
  if(tab==='treinador')renderTreinador();
  if(tab==='produto')renderProduto();
}

window._consultorAtivo=null;
function renderConsultor(){
  document.getElementById('consultorDetail').style.display='none';
  // Mostrar o layout wrapper com grid + ranking
  var wrap = document.getElementById('consultorLayoutWrap');
  if(wrap) wrap.style.display='grid';
  document.getElementById('consultorCards').style.display='';
  const metaInd=allConsultors.length>0?META/allConsultors.length:0;
  const _rankMapC=[...allConsultors].map(c=>({nome:c,pago:data.filter(d=>d&&d.cliente&&d.consultor===c&&d.status==='pago').reduce((a,d)=>a+d.valor,0)})).sort((a,b)=>b.pago-a.pago);
  const _posMapC={};_rankMapC.forEach((c,i)=>{_posMapC[c.nome]=i;});
  var _sessC=_getSessao?_getSessao():null;
  var _perfilC=_sessC?_sessC.perfil:'adm';
  var _vinculoC=_sessC?(_sessC.vinculo||'').toUpperCase():'';
  var _allConsultorsSorted=[...allConsultors].sort(function(a,b){return a.localeCompare(b,'pt-BR');});
  var _listaC=(_perfilC==='consultor'&&_vinculoC&&allConsultors.map(c=>c.toUpperCase()).includes(_vinculoC))
    ?_allConsultorsSorted.filter(c=>c.toUpperCase()===_vinculoC)
    :_allConsultorsSorted;

  // ── Renderizar apenas os cards de consultores (sem ranking embutido) ──
  document.getElementById('consultorCards').innerHTML=_listaC.map(c=>{
    const cdA=data.filter(d=>d&&d.cliente&&d.consultor===c);
    const cd=activeConsultorStatus===null?cdA:activeConsultorStatus==='entrada'?cdA.filter(d=>d.entrada>0):cdA.filter(d=>d.status===activeConsultorStatus);
    const total=cd.reduce((a,d)=>a+d.valor,0),pago=cd.filter(d=>d.status==='pago').reduce((a,d)=>a+d.valor,0);
    const aberto=cd.filter(d=>d.status==='aberto').reduce((a,d)=>a+d.valor,0),entrada=cd.reduce((a,d)=>a+d.entrada,0);
    const pctMeta=metaInd>0?Math.round((pago/metaInd)*100):0;
    const colMeta=getCol(pctMeta);
    const restante=Math.max(metaInd-pago,0);
    const cor=cColors[c]||'#888',bg=cBg[c]||'rgba(136,136,136,0.1)';
    const barW=metaInd>0?Math.min(Math.round((pago/(metaInd*1.5))*100),100):0;
    const _pos=_posMapC[c];
    const _medal=_pos===0?'🥇':_pos===1?'🥈':_pos===2?'🥉':`<span style="font-size:20px;font-weight:700;color:var(--muted);">${_pos+1}º</span>`;
    return `<div class="person-card" onclick="openConsultorDetail('${c}')" style="position:relative;">
      <div style="position:absolute;top:14px;right:14px;display:flex;flex-direction:column;align-items:center;line-height:1;">
        <span style="font-size:36px;font-weight:800;color:var(--accent);line-height:1;">${cd.length}</span>
        <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">cliente${cd.length!==1?'s':''}</span>
      </div>
      <div class="pc-avatar" style="background:${bg};color:${cor};border:2px solid ${cor};">${c.toUpperCase().charAt(0)}</div>
      <div class="pc-name" style="font-size:15px;">${c.toUpperCase()}</div>
      <div class="pc-stats">
        <div><div class="pc-stat-label" style="font-size:13px;">Potencial</div><div class="pc-stat-val" style="font-size:16px;color:var(--blue);">${formatVal(total)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Faturado</div><div class="pc-stat-val" style="font-size:16px;color:${colMeta.text};">${formatVal(pago)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Em aberto</div><div class="pc-stat-val" style="font-size:16px;color:var(--amber);">${formatVal(aberto)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">% Meta</div><div class="pc-stat-val" style="font-size:16px;color:${colMeta.text};">${pctMeta}%</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Individual</div><div class="pc-stat-val" style="font-size:16px;color:var(--accent);">${formatVal(metaInd)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Restante</div><div class="pc-stat-val" style="font-size:16px;color:${colMeta.text};">${restante>0?formatVal(restante):'Meta atingida!'}</div></div>
      </div>
      <div style="margin:10px 0 20px;"></div>
      <div class="pc-bar"><div class="pc-bar-fill" style="width:${barW}%;background:${colMeta.bar};box-shadow:0 0 15px 10px ${hexToRgba(colMeta.bar,.35)},0 0 10px 10px ${hexToRgba(colMeta.bar,.45)};"></div></div>
      <div style="text-align:center;margin-top:14px;font-size:60px;line-height:1;">${_medal}</div>
    </div>`;
  }).join('');

  // ── Ranking separado: injetado no painel fixo à direita ──
  const _medals=['gold','silver','bronze'];
  var _isAdmC=(_perfilC==='adm'||_perfilC==='ministrante');
  const _rankCFat=[...allConsultors].map(c=>({
    nome:c,
    total:data.filter(d=>d&&d.cliente&&d.consultor===c).reduce((a,d)=>a+d.valor,0),
    pago:data.filter(d=>d&&d.cliente&&d.consultor===c&&d.status==='pago').reduce((a,d)=>a+d.valor,0),
    clientes:data.filter(d=>d&&d.cliente&&d.consultor===c).length
  })).sort((a,b)=>b.pago-a.pago);

  const _totalPagoC=data.filter(d=>d&&d.cliente&&d.status==='pago').reduce((a,d)=>a+d.valor,0);
  const _pctGeralC=Math.round((_totalPagoC/META)*100);
  const _colGeralC=getCol(_pctGeralC);

  const _rankCHtml=_rankCFat.length===0
    ?'<div style="font-size:13px;color:var(--muted);padding:8px 0;">Nenhum dado.</div>'
    :_rankCFat.map((c,i)=>{
      const _pct=metaInd>0?Math.round((c.pago/metaInd)*100):0;
      const _col=getCol(_pct);
      const _onclick=_isAdmC?`onclick="abrirClientesVinculados('${c.nome}')" style="cursor:pointer;"` :`style="cursor:default;"`;
      return `<div class="rank-row" ${_onclick}>
        <div class="rank-num ${_medals[i]||''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
        <div class="rank-info">
          <div class="rank-name">${c.nome.toUpperCase()}</div>
          <div class="rank-detail">${c.clientes} cliente${c.clientes!==1?'s':''} · ${_pct}%</div>
        </div>
        <div class="rank-val" style="color:${_col.text};">${formatVal(c.pago)}</div>
      </div>`;
    }).join('');

  var rankPanel = document.getElementById('consultorRankingPanel');
  var rankBody  = document.getElementById('consultorRankingBody');
  if(rankPanel && rankBody){
    // Total geral no cabeçalho do painel
    var rankHeader = rankPanel.querySelector('.spanel-title');
    if(rankHeader) rankHeader.innerHTML = `Ranking — Faturado<br><span style="font-size:16px;font-weight:700;color:${_colGeralC.text};">${formatVal(_totalPagoC)}</span>`;
    rankBody.innerHTML = _rankCHtml;
    // NÃO atribuir onclick ao painel — cada linha já abre abrirClientesVinculados()
    rankPanel.style.cursor = 'default';
    rankPanel.onclick = null;
  }
}
function abrirClientesModal(tipo){
  // Filtrar por consultor vinculado se perfil for consultor
  var _sess=_getSessao?_getSessao():null;
  var _perfil=_sess?_sess.perfil:'adm';
  var _vinculo=_sess?(_sess.vinculo||'').toUpperCase():'';
  var _base=(_perfil==='consultor'&&_vinculo)
    ? data.filter(function(d){return d&&d.cliente&&(d.consultor||'').toUpperCase()===_vinculo;})
    : data.filter(function(d){return d&&d.cliente;});

  let lista,titulo,subExtra='';
  if(tipo==='todos'){
    lista=[..._base];
    titulo='Potencial total';
    const total=lista.reduce((a,d)=>a+d.valor,0);
    subExtra=lista.length+' cliente'+(lista.length!==1?'s':'')+' · Potencial total: <span style="color:var(--blue);font-weight:700;">'+formatVal(total)+'</span>';
  } else if(tipo==='aberto'){
    lista=_base.filter(d=>d.status==='aberto');
    titulo='Em aberto';
    const total=lista.reduce((a,d)=>a+d.valor,0);
    subExtra=lista.length+' cliente'+(lista.length!==1?'s':'')+' · Total em aberto: <span style="color:var(--amber);font-weight:700;">'+formatVal(total)+'</span>';
  } else if(tipo==='pago'){
    lista=_base.filter(d=>d.status==='pago');
    titulo='Faturado';
    const total=lista.reduce((a,d)=>a+d.valor,0);
    const col=getCol(Math.round((total/META)*100));
    subExtra=lista.length+' cliente'+(lista.length!==1?'s':'')+' · Total faturado: <span style="color:'+col.text+';font-weight:700;">'+formatVal(total)+'</span>';
  } else if(tipo==='entrada'){
    lista=_base.filter(d=>d.entrada>0);
    titulo='Total entradas';
    const total=lista.reduce((a,d)=>a+d.entrada,0);
    subExtra=lista.length+' cliente'+(lista.length!==1?'s':'')+' com entrada · Total: <span style="color:var(--accent);font-weight:700;">'+formatVal(total)+'</span>';
  }
  _abrirClientesModalComLista(lista,titulo,subExtra);
}
function abrirPagosModal(){
  const pagos=data.filter(d=>d&&d.cliente&&d.status==='pago').sort((a,b)=>b.valor-a.valor);
  const total=pagos.reduce((a,d)=>a+d.valor,0);
  const pct=Math.round((total/META)*100);
  const col=getCol(pct);
  document.getElementById('pagosModalSub').innerHTML=
    pagos.length+' cliente'+(pagos.length!==1?'s':'')+' pagos · Total: <span style="color:'+col.text+';font-weight:700;">'+formatVal(total)+'</span> · '+pct+'% da meta';
  document.getElementById('pagosModalTable').innerHTML=pagos.length===0
    ?'<tr class="empty-row"><td colspan="5">Nenhum cliente pago.</td></tr>'
    :pagos.map(d=>`<tr style="border-left:2px solid #39ff14;">
      <td style="font-weight:600;text-transform:uppercase;color:#39ff14;text-align:left;">${d.cliente}</td>
      <td style="text-align:center;font-size:12px;">${d.treinamento||'—'}</td>
      <td style="text-align:center;font-size:12px;color:var(--muted);">${d.treinamento==='CI'?d.treinador:'-'}</td>
      <td style="text-align:center;font-size:12px;color:var(--muted);">${d.consultor.toUpperCase()}</td>
      <td style="text-align:right;font-weight:600;color:${col.text};">${formatVal(d.valor)}</td>
    </tr>`).join('');
  document.getElementById('pagosModalOverlay').classList.add('open');
}
function openConsultorDetail(c){window._consultorAtivo=c;_renderConsultorDetail(c);}
function _renderConsultorDetail(c){
  const cdA=data.filter(d=>d&&d.cliente&&d.consultor===c).sort((a,b)=>a.cliente.localeCompare(b.cliente,'pt-BR'));
  var _cdStatus=activeConsultorStatus===null?cdA:activeConsultorStatus==='entrada'?cdA.filter(d=>d.entrada>0):cdA.filter(d=>d.status===activeConsultorStatus);
  var _fpC=window._getFiltroPresencaConsultor?window._getFiltroPresencaConsultor():null;
  const cd=_fpC?_cdStatus.filter(d=>(d.presenca||'pendente')===_fpC):_cdStatus;
  if(window._renderFiltrosPresencaConsultor) window._renderFiltrosPresencaConsultor();

  // ── Métricas agregadas ──
  // POTENCIAL = vendas em NEGOCIAÇÃO (não total geral)
  const potencial=cdA.filter(d=>d.status==='negociacao').reduce((a,d)=>a+d.valor,0);
  const total=cdA.reduce((a,d)=>a+d.valor,0); // mantido para subtítulo
  const pago=cdA.filter(d=>d.status==='pago').reduce((a,d)=>a+d.valor,0);
  const aberto=cdA.filter(d=>d.status==='aberto').reduce((a,d)=>a+d.valor,0);
  const entrada=cdA.reduce((a,d)=>a+(d.entrada||0),0);
  const nTodos=cdA.length;
  const nPago=cdA.filter(d=>d.status==='pago').length;
  const nAberto=cdA.filter(d=>d.status==='aberto').length;
  const nEntrada=cdA.filter(d=>d.entrada>0).length;
  const nPotencial=cdA.filter(d=>d.status==='negociacao').length;

  const fl=activeConsultorStatus?' · Filtro: '+activeConsultorStatus.toUpperCase():'';
  const _metaInd=allConsultors.length>0?META/allConsultors.length:0;
  const _pctDetail=_metaInd>0?Math.round((pago/_metaInd)*100):0;
  const _colDetail=getCol(_pctDetail);

  // Permissão: só ADM edita/remove
  var _sessD=_getSessao?_getSessao():null;
  var _perfilD=_sessD?_sessD.perfil:'adm';
  var _isAdmD=_perfilD==='adm';
  var _vinculoD=_sessD?(_sessD.vinculo||'').toUpperCase():'';
  var _ehProprio=_perfilD==='consultor';

  var _btnNC2=document.getElementById('btnNovoClienteConsultor');
  var _rowNC2=document.getElementById('rowNovoClienteConsultor');
  if(_btnNC2) _btnNC2.style.display=_ehProprio?'block':'none';
  if(_rowNC2) _rowNC2.style.display=_ehProprio?'block':'none';

  // ── Nome do consultor (sem alteração) ──
  document.getElementById('consultorDetailName').textContent=c.toUpperCase()+' — '+cdA.length+' cliente'+(cdA.length!==1?'s':'');

  // ── Melhoria 1: KPIs + Melhoria 5: barra de progresso ──
  const _pctBar=Math.min(_pctDetail,100);
  const _barColor=_colDetail.bar;
  document.getElementById('consultorDetailSub').innerHTML=
    // Barra de progresso da meta (melhoria 5)
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    +'<div style="flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;">'
    +'<div style="height:4px;width:'+_pctBar+'%;background:'+_barColor+';border-radius:2px;transition:width .4s;"></div>'
    +'</div>'
    +'<span style="font-size:11px;font-weight:600;color:'+_colDetail.text+';font-family:\'DM Mono\',monospace;min-width:36px;text-align:right;">'+_pctDetail+'%</span>'
    +'<span style="font-size:10px;color:var(--muted);">da meta</span>'
    +'</div>'
    // KPI cards — clicáveis para filtrar lista
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">'
    +'<div onclick="setConsultorStatus(\'negociacao\')" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--accent)44\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Potencial</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--text);font-family:\'DM Mono\',monospace;">'+formatVal(potencial)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nPotencial+' em negoc.</div>'
    +'</div>'
    +'<div onclick="setConsultorStatus(\'pago\')" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--green)44\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Faturado</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--green);font-family:\'DM Mono\',monospace;">'+formatVal(pago)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nPago+' pago'+(nPago!==1?'s':'')+'</div>'
    +'</div>'
    +'<div onclick="setConsultorStatus(\'aberto\')" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--amber)44\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Em aberto</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--amber);font-family:\'DM Mono\',monospace;">'+formatVal(aberto)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nAberto+' cliente'+(nAberto!==1?'s':'')+'</div>'
    +'</div>'
    +'<div onclick="setConsultorStatus(\'entrada\')" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--blue)44\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Entradas</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--blue);font-family:\'DM Mono\',monospace;">'+(entrada>0?formatVal(entrada):'—')+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nEntrada+' cliente'+(nEntrada!==1?'s':'')+'</div>'
    +'</div>'
    +'</div>'
    // Barra de presença
    +'<div id="presencaBarConsultor" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 0 4px;font-size:11px;"></div>'
    // Subtítulo original compacto
    +'<span style="font-size:12px;color:var(--muted);">Potencial: '+formatVal(total)+' · Faturado: <span style="color:'+_colDetail.text+';font-weight:700;">'+formatVal(pago)+'</span>'+(entrada>0?' · Entradas: '+formatVal(entrada):'')+fl+'</span>';

  // ── Botões de filtro: atualizar contagem ──
  const _fcMap={fcAll:nTodos,fcAberto:nAberto,fcPago:nPago,fcEntrada:nEntrada};
  const _fcLabel={fcAll:'Todos',fcAberto:'Aberto',fcPago:'Pago',fcEntrada:'Entrada'};
  Object.keys(_fcMap).forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.textContent=_fcLabel[id]+(_fcMap[id]>0?' ('+_fcMap[id]+')':'');
  });

  // Ocultar layout wrap e mostrar detail (sem alteração)
  var _wrap=document.getElementById('consultorLayoutWrap');
  if(_wrap) _wrap.style.display='none';
  document.getElementById('consultorDetail').style.display='block';

  const sl=s=>s==='pago'?'PAGO':s==='negociacao'?'NEGOCIAÇÃO':s==='desistiu'?'DESISTIU':s==='estorno'?'ESTORNO':s==='-'?'—':'ABERTO';

  // ── Cores por status (melhoria 3 + spec: PAGO = neon no nome) ──
  const _statusBorder={pago:'2px solid #39ff14',aberto:'2px solid var(--amber)',negociacao:'2px solid var(--blue)',desistiu:'2px solid var(--red)',estorno:'2px solid rgba(168,85,247,.7)','-':'none'};

  // ── Renderização bifurcada por perfil (sem alteração de lógica) ──
  const tblEl=document.getElementById('consultorDetailTable');
  const tbl=tblEl?tblEl.closest('table'):null;
  var listEl=document.getElementById('consultorDetailList');

  // Helper: texto de treinamentos do registro
  function _treinDisplay(d){
    if(d.treinamentos&&d.treinamentos.length) return d.treinamentos.map(function(t){return t.cod;}).join(' · ');
    return d.treinamento||'—';
  }

  if(_ehProprio){
    if(tbl) tbl.style.display='none';
    if(!listEl){
      listEl=document.createElement('div');
      listEl.id='consultorDetailList';
      listEl.style.marginTop='8px';
      document.getElementById('consultorDetail').appendChild(listEl);
    }
    listEl.style.display='';
    if(!cd.length){
      listEl.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Nenhum cliente para este filtro.</div>';
    } else {
      listEl.style.cssText='margin-top:8px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;';
      listEl.innerHTML=cd.map(function(d){
        var ri=data.indexOf(d);
        var _ip=d.status==='pago';
        var _td=_treinDisplay(d);
        var _treins=d.treinamentos&&d.treinamentos.length?d.treinamentos:[];
        var _treinRows=_treins.length?_treins.map(function(t){
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);">'
            +'<span style="font-size:12px;font-weight:700;color:var(--accent);font-family:\'DM Mono\',monospace;letter-spacing:.05em;">'+t.cod+'</span>'
            +'<span style="font-size:12px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums;">'+formatVal(t.valor)+'</span>'
            +'</div>';
        }).join(''):'<div style="font-size:11px;color:var(--muted);padding:6px 0;">Nenhum treinamento cadastrado.</div>';
        var _panelId='clipanel_'+ri;
        return '<div style="border-bottom:1px solid var(--border);">'
          // ── Header clicável ──
          +'<div id="clihdr_'+ri+'" onclick="window._toggleCliAcc('+ri+')" style="display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;transition:background .12s;user-select:none;" onmouseover="this.style.background=\'var(--surface3,rgba(255,255,255,.03))\'" onmouseout="this.style.background=\'transparent\'">'
          +'<span id="cliarr_'+ri+'" style="font-size:9px;color:var(--muted);flex-shrink:0;transition:transform .2s;line-height:1;">▶</span>'
          +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:13px;font-weight:700;'+(+_ip?'color:#39ff14;':'color:var(--text);')+'text-transform:uppercase;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+d.cliente+'</div>'
          +(function(){
            var _stMap={'pago':{cor:'#39ff14',l:'Pago'},'negociacao':{cor:'#60a5fa',l:'Negociação'},'desistiu':{cor:'#ff5252',l:'Desistiu'},'estorno':{cor:'#ff5252',l:'Estorno'},'entrada':{cor:'#c8f05a',l:'Entrada'},'aberto':{cor:'#ffaa00',l:'Aberto'}};
            var _stInfo=_stMap[d.status||'']||{cor:'#666',l:'Sem status'};
            var _valTxt=d.valor>0?('<span style="font-size:10px;color:var(--muted);margin-left:auto;font-variant-numeric:tabular-nums;">'+formatVal(d.valor)+'</span>'):'';
            return '<div style="display:flex;align-items:center;gap:5px;margin-top:3px;">'
              +'<span style="width:6px;height:6px;border-radius:50%;background:'+_stInfo.cor+';flex-shrink:0;display:inline-block;"></span>'
              +'<span style="font-size:10px;font-weight:600;color:'+_stInfo.cor+';">'+_stInfo.l+'</span>'
              +_valTxt
              +'</div>';
          })()
          +'</div>'
          +'<div onclick="event.stopPropagation();" data-presenca-ri="'+ri+'" style="flex-shrink:0;">'+(window._presencaBadgeHtml?window._presencaBadgeHtml(ri):'—')+'</div>'
          +'<button onclick="event.stopPropagation();window._abrirMenuCliente(event,\''+d.cliente.replace(/'/g,"\\'")+'\',' +ri+')" style="background:rgba(200,240,90,.12);border:1px solid rgba(200,240,90,.3);border-radius:50%;width:22px;height:22px;cursor:pointer;color:var(--accent);font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;flex-shrink:0;">+</button>'
          +'</div>'
          // ── Painel expansível ──
          +'<div id="'+_panelId+'" style="display:none;background:rgba(0,0,0,.18);padding:10px 14px 12px 34px;border-top:1px solid rgba(255,255,255,.04);">'
          +_treinRows
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);">'
          +'<span style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.07em;">Total</span>'
          +'<span style="font-size:13px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums;">'+formatVal(d.valor)+'</span>'
          +'</div>'
          +'<button onclick="abrirClienteDetalhe('+ri+')" style="margin-top:10px;width:100%;font-size:11px;font-weight:700;padding:7px 0;border-radius:6px;border:1px solid rgba(200,240,90,.3);background:rgba(200,240,90,.08);color:var(--accent);cursor:pointer;font-family:\'DM Sans\',sans-serif;">✏ Editar cliente</button>'
          +'</div>'
          +'</div>';
      }).join('');
    }

    // Toggle accordion — expande 1 por vez
    window._toggleCliAcc=function(ri){
      var panel=document.getElementById('clipanel_'+ri);
      var arrow=document.getElementById('cliarr_'+ri);
      if(!panel) return;
      var open=panel.style.display!=='none';
      // fechar todos
      document.querySelectorAll('[id^="clipanel_"]').forEach(function(p){ p.style.display='none'; });
      document.querySelectorAll('[id^="cliarr_"]').forEach(function(a){ a.style.transform='';a.style.color='var(--muted)'; });
      if(!open){
        panel.style.display='block';
        if(arrow){arrow.style.transform='rotate(90deg)';arrow.style.color='var(--accent)';}
      }
    };
  } else {
    if(tbl) tbl.style.display='';
    if(listEl) listEl.style.display='none';
    if(!cd.length){
      tblEl.innerHTML='<tr class="empty-row"><td colspan="7">Nenhum cliente para este filtro.</td></tr>';
    } else {
      var _rows='';
      cd.forEach(function(d){
          const ri=data.indexOf(d);
          const ip=d.status==='pago';
          const hi=!!(d.info&&d.info.trim());
          const st=d.status||'-';
          const borderLeft=_statusBorder[st]||'2px solid var(--border)';
          const treinadorTxt=(d.treinador&&d.treinador!=='-')?d.treinador.toUpperCase():'—';
          const entradaTxt=d.entrada>0?'↑ '+formatVal(d.entrada):'—';
          const entradaStyle=d.entrada>0?'color:var(--green);font-weight:600;':'color:var(--muted);';
          _rows+=`<tr style="border-left:${borderLeft};" onclick="abrirClienteDetalhe(${ri})" title="Clique para editar" class="tr-clickable">
            <td style="font-weight:600;text-transform:uppercase;white-space:nowrap;${ip?'color:#39ff14;':''}"><span style="display:inline-flex;align-items:center;gap:4px;">${d.cliente}<button class="info-btn${hi?' has-info':''}" onclick="event.stopPropagation();openClientInfo(${ri})">i</button><button onclick="event.stopPropagation();window._abrirMenuCliente(event,'${d.cliente.replace(/'/g,"\\'")}',${ri})" style="background:rgba(200,240,90,.12);border:1px solid rgba(200,240,90,.3);border-radius:50%;width:18px;height:18px;cursor:pointer;color:var(--accent);font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0;line-height:1;">+</button></span></td>
            <td style="text-align:center;white-space:nowrap;color:var(--muted);font-size:11px;">${treinadorTxt}</td>
            <td style="text-align:center;white-space:nowrap;font-size:11px;color:var(--muted);">—</td>
            <td style="text-align:center;white-space:nowrap;">${formatVal(d.valor)}</td>
            <td style="text-align:center;white-space:nowrap;"><span class="badge badge-${st}">${sl(st)}</span></td>
            <td style="text-align:center;white-space:nowrap;${entradaStyle}">${entradaTxt}</td>
            <td style="text-align:center;padding:3px 6px;vertical-align:middle;" data-presenca-ri="${ri}" onclick="event.stopPropagation();">${window._presencaBadgeHtml?window._presencaBadgeHtml(ri):'—'}</td>
          </tr>`;
      });
      tblEl.innerHTML=_rows;
    }
  }
  // Preencher barra de presença após renderizar o detail
  if(typeof window._atualizarBarraPresencaConsultor==='function') window._atualizarBarraPresencaConsultor();
}

window._toggleGrupo=function(gid){
  var filhos=document.querySelectorAll('[data-grupo="'+gid+'"]');
  var subDiv=document.getElementById(gid);
  var arr=document.getElementById('arr_'+gid);
  if(filhos.length){
    var aberto=filhos[0].style.display!=='none';
    filhos.forEach(function(el){el.style.display=aberto?'none':'';});
    if(arr) arr.style.transform=aberto?'':'rotate(90deg)';
  } else if(subDiv){
    var aberto=subDiv.style.display!=='none';
    subDiv.style.display=aberto?'none':'';
    if(arr) arr.style.transform=aberto?'':'rotate(90deg)';
  }
};
var _clienteDetalheIdx=null;
function abrirClienteDetalhe(ri){
  var d=data[ri];
  if(!d) return;
  _clienteDetalheIdx=ri;
  var sl=function(s){return s==='pago'?'PAGO':s==='negociacao'?'NEGOCIAÇÃO':s==='desistiu'?'DESISTIU':s==='estorno'?'ESTORNO':s==='-'?'—':'ABERTO';};

  /* Modo edição: consultor edita seus próprios clientes; ADM edita qualquer um */
  var _sess=_getSessao?_getSessao():null;
  var _perfil=_sess?_sess.perfil:'adm';
  var _modoEdit=(_perfil==='consultor'||_perfil==='adm'||!_sess);

  document.getElementById('clienteDetalheName').textContent=d.cliente;

  /* Treinamentos múltiplos */
  var _cdLista=document.getElementById('cdTreinamentosLista');
  if(_cdLista){
    _cdLista.innerHTML='';
    // Usa array real se existir (mesmo vazio); só usa fallback legado se treinamentos for null/undefined
    var _treinsEdit=Array.isArray(d.treinamentos)?d.treinamentos:(d.treinamento&&d.treinamento!=='-'?[{cod:d.treinamento,valor:d.valor||0}]:[]);
    _treinsEdit.forEach(function(t){_addTreinRow('cdTreinamentosLista',t.cod,t.valor);});
    _calcTotalTrein('cdTreinamentosLista');
    // Bloquear edição de linhas existentes se não for modo edição
    if(!_modoEdit){
      _cdLista.querySelectorAll('select,input,button').forEach(function(el){el.disabled=true;el.style.opacity='0.6';});
    }
  }
  var _cdBtns=document.getElementById('cdTreinBtns');
  if(_cdBtns)_cdBtns.style.display=_modoEdit?'':'none';

  /* Treinador */
  var _trdRow=document.getElementById('clienteDetalheTreinadorRow');
  var trdEdit=document.getElementById('clienteDetalheTreinadorEdit');
  var _trainLst=(typeof allTrainers!=='undefined'&&Array.isArray(allTrainers))?allTrainers:[];
  trdEdit.innerHTML='<option value="-">—</option>'+_trainLst.map(function(t){
    return '<option value="'+t+'"'+(d.treinador===t?' selected':'')+'>'+t.toUpperCase()+'</option>';
  }).join('');
  _checkCITreinador('cdTreinamentosLista');

  /* Valor legado (hidden) */
  var valEl=document.getElementById('clienteDetalheValor');if(valEl)valEl.textContent=formatVal(d.valor);

  /* Status */
  var stEl=document.getElementById('clienteDetalheStatus');
  stEl.textContent=sl(d.status);
  stEl.className='badge badge-'+(d.status||'aberto');
  var stEdit=document.getElementById('clienteDetalheStatusEdit');
  var STATUS_OPTS=[{v:'-',l:'—'},{v:'aberto',l:'ABERTO'},{v:'pago',l:'PAGO'},{v:'negociacao',l:'NEGOCIAÇÃO'},{v:'desistiu',l:'DESISTIU'},{v:'estorno',l:'ESTORNO'}];
  stEdit.innerHTML=STATUS_OPTS.map(function(s){
    return '<option value="'+s.v+'"'+((d.status||'aberto')===s.v?' selected':'')+'>'+s.l+'</option>';
  }).join('');
  stEl.style.display=_modoEdit?'none':'';
  stEdit.style.display=_modoEdit?'':'none';

  /* Entrada e Info (sempre só leitura) */
  var entRow=document.getElementById('clienteDetalheEntradaRow');
  document.getElementById('clienteDetalheEntrada').textContent=d.entrada>0?formatVal(d.entrada):'—';
  entRow.style.display=d.entrada>0?'flex':'none';
  var infoRow=document.getElementById('clienteDetalheInfoRow');
  var infoEl=document.getElementById('clienteDetalheInfo');
  if(d.info&&d.info.trim()){infoEl.textContent=d.info.trim();infoRow.style.display='block';}
  else infoRow.style.display='none';

  /* Botão Salvar */
  document.getElementById('clienteDetalheSalvar').style.display=_modoEdit?'':'none';

  document.getElementById('clienteDetalheOverlay').classList.add('open');
}

function salvarClienteDetalhe(){
  if(_clienteDetalheIdx===null) return;
  var d=data[_clienteDetalheIdx];
  if(!d) return;

  var _treinRows=_getTreinRows('cdTreinamentosLista');
  var _valorTotal=_treinRows.reduce(function(a,t){return a+t.valor;},0);
  var _hasCI=_treinRows.some(function(t){return t.cod==='CI';});
  var novoStatus=document.getElementById('clienteDetalheStatusEdit').value||'aberto';
  var novoTreinador=(document.getElementById('clienteDetalheTreinadorEdit')||{}).value||'-';

  d.treinamentos=_treinRows;
  d.treinamento=_treinRows.length?_treinRows[0].cod:'-';
  d.valor=_valorTotal;
  d.treinador=_hasCI?(novoTreinador==='-'?'':novoTreinador):'-';
  d.status=novoStatus;

  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  if(typeof renderAll==='function') renderAll();
  // Re-abrir detalhe do consultor se estava aberto
  if(window._consultorAtivo){
    var _cd=document.getElementById('consultorDetail');
    if(_cd&&_cd.style.display!=='none') _renderConsultorDetail(window._consultorAtivo);
    else openConsultorDetail(window._consultorAtivo);
  }
  fecharClienteDetalhe();
  if(typeof _showToast==='function') _showToast('Cliente atualizado!','var(--accent)');
}

function fecharClienteDetalhe(){
  document.getElementById('clienteDetalheOverlay').classList.remove('open');
  _clienteDetalheIdx=null;
}
function closeConsultorDetail(){
  window._consultorAtivo=null;activeConsultorStatus=null;
  ['fcAll','fcAberto','fcPago','fcEntrada'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const el=document.getElementById('fcAll');if(el)el.classList.add('active');
  document.getElementById('consultorDetail').style.display='none';
  var _wrap=document.getElementById('consultorLayoutWrap');
  if(_wrap) _wrap.style.display='grid';
  renderConsultor();
}

/* ═══════════════════════════════════════════
   ABA TREINADOR
═══════════════════════════════════════════ */
window._treinadorAtivo=null;

function _getTurmaMinistante(){
  if(!_turmaAtiva) return null;
  return _turmaAtiva.ministrante||null;
}

function _setMinistrante(nome,ativo){
  if(!_turmaAtiva) return;
  var novoMin=ativo?nome:null;
  _turmaAtiva.ministrante=novoMin;
  // Salvar ministrante direto no nó unificado turmas/{id}
  _saveTurmaMeta(_turmaAtiva.id,'ministrante',novoMin);

  // Atualiza visual imediatamente
  renderAll();
  renderTreinador();

  var novoPerfil=ativo?'ministrante':'treinador';
  var uid='treinador_'+_normalizeUid(nome);

  if(window._fbSave){
    _showToast('🔄 Atualizando perfil...','var(--muted)');
    // Primeiro garante que o registro existe
    var registroBase={nome:nome,perfil:novoPerfil,login:'',senha:'',ativo:true,vinculo:nome};
    window._fbGet('usuarios/'+uid).then(function(registro){
      if(registro){
        // Registro existe — atualiza apenas o campo perfil
        return window._fbSave('usuarios/'+uid+'/perfil',novoPerfil);
      } else {
        // Registro não existe — cria completo com perfil correto
        return window._fbSave('usuarios/'+uid,registroBase);
      }
    }).then(function(){
      _showToast(ativo?'✅ '+nome+' agora é Ministrante':'✅ '+nome+' voltou para Treinador','var(--accent)');
      renderAll();
      renderTreinador();
    }).catch(function(e){
      _showToast('❌ Erro: '+(e&&e.message?e.message:JSON.stringify(e)),'var(--red)');
      renderTreinador();
    });
  } else {
    _showToast('⚠️ Firebase não disponível. Salvo apenas localmente.','var(--amber)');
    renderAll();
    renderTreinador();
  }
}

function renderTreinador(){
  document.getElementById('treinadorDetail').style.display='none';
  var _twrapR=document.getElementById('treinadorLayoutWrap');
  if(_twrapR) _twrapR.style.display='grid';
  document.getElementById('treinadorCards').style.display='grid';
  const _ministrante=_getTurmaMinistante();
  const _sessT=_getSessao?_getSessao():null;
  const _isAdmT=!_sessT||_sessT.perfil==='adm';

  // Lista editável — oculta por padrão, gerenciada por abrirEditarTreinadores
  var listaEl=document.getElementById('treinadorListaEdicao');
  if(listaEl) listaEl.style.display='none';
  var btnEdit=document.getElementById('btnEditarTreinadores');
  if(btnEdit) btnEdit.style.display=_isAdmT?'':'none';

  var _allTrainersSorted=[...allTrainers].sort(function(a,b){return a.localeCompare(b,'pt-BR');});
  var _listaT=(_isAdmT||_sessT&&_sessT.perfil==='ministrante')
    ?_allTrainersSorted
    :(_sessT&&_sessT.perfil==='treinador'&&(_sessT.vinculo||''))
      ?_allTrainersSorted.filter(t=>t.toUpperCase()===(_sessT.vinculo||'').toUpperCase())||_allTrainersSorted
      :_allTrainersSorted;
  document.getElementById('treinadorCards').innerHTML=_listaT.map(t=>{
    const tdA=data.filter(d=>d&&d.cliente&&d.treinador===t);
    const td=activeTreinadorStatus===null?tdA:activeTreinadorStatus==='entrada'?tdA.filter(d=>d.entrada>0):tdA.filter(d=>d.status===activeTreinadorStatus);
    const total=td.reduce((a,d)=>a+d.valor,0),pago=td.filter(d=>d.status==='pago').reduce((a,d)=>a+d.valor,0),aberto=td.filter(d=>d.status==='aberto').reduce((a,d)=>a+d.valor,0);
    const pct=Math.round((pago/META)*100),col=getCol(pct),cor=tBorder[t]||'#888',bg=tBg[t]||'rgba(136,136,136,0.1)',ini=t.split(' ').map(w=>w[0]).join('').slice(0,2);
    const isMinistrante=_ministrante===t;
    const outroMinistrante=!!(_ministrante&&!isMinistrante);
    const ministranteToggle=_isAdmT?`
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;" onclick="event.stopPropagation()">
        <span style="font-size:12px;font-weight:700;color:${isMinistrante?'var(--accent)':outroMinistrante?'var(--border2)':'var(--muted)'};text-transform:uppercase;letter-spacing:.06em;">${isMinistrante?'Ministrante':'Treinador'}</span>
        <div onclick="event.stopPropagation();${outroMinistrante?`_showToast('\u274c Desative o ministrante atual antes de ativar outro.','var(--red)')`:(`_setMinistrante('${t}',${!isMinistrante})`)}" style="cursor:${outroMinistrante?'not-allowed':'pointer'};width:44px;height:24px;border-radius:999px;background:${isMinistrante?'var(--accent)':'rgba(255,255,255,.1)'};position:relative;transition:background .3s;flex-shrink:0;opacity:${outroMinistrante?'0.35':'1'};">
          <div style="position:absolute;top:3px;left:${isMinistrante?'23':'3'}px;width:18px;height:18px;border-radius:50%;background:${isMinistrante?'#0f0f0f':'var(--muted)'};transition:left .3s;"></div>
        </div>
      </div>`:'';
    return `<div class="person-card" onclick="openTreinadorDetail('${t}')" style="position:relative;">
      <div style="position:absolute;top:14px;right:14px;display:flex;flex-direction:column;align-items:center;line-height:1;">
        <span style="font-size:36px;font-weight:800;color:var(--accent);line-height:1;">${td.length}</span>
        <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">cliente${td.length!==1?'s':''}</span>
      </div>
      <div class="pc-avatar" style="background:${bg};color:${cor};border:2px solid ${cor};">${ini}</div>
      <div class="pc-name" style="font-size:15px;">${t.toUpperCase()}</div>
      <div class="pc-stats" style="margin-top:10px;">
        <div><div class="pc-stat-label" style="font-size:13px;">Potencial</div><div class="pc-stat-val" style="font-size:16px;color:var(--blue);">${formatVal(total)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Faturado</div><div class="pc-stat-val" style="font-size:16px;color:${col.text};">${formatVal(pago)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Em aberto</div><div class="pc-stat-val" style="font-size:16px;color:var(--amber);">${formatVal(aberto)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">% Meta</div><div class="pc-stat-val" style="font-size:16px;color:${col.text};">${pct}%</div></div>
      </div>
      <div class="pc-bar" style="margin-top:20px;"><div class="pc-bar-fill" style="width:${Math.min(Math.round((pago/(META*1.5))*100),100)}%;background:${col.bar};box-shadow:0 0 15px 10px ${hexToRgba(col.bar,.35)},0 0 10px 10px ${hexToRgba(col.bar,.45)};"></div></div>
      ${ministranteToggle}
    </div>`;
  }).join('');
  // Ranking Faturado injetado dentro do grid como último card
  const _medalsT=['gold','silver','bronze'];
  const _rankTFat=[...allTrainers].map(t=>({
    nome:t,
    total:data.filter(d=>d&&d.cliente&&d.treinador===t).reduce((a,d)=>a+d.valor,0),
    pago:data.filter(d=>d&&d.cliente&&d.treinador===t&&d.status==='pago').reduce((a,d)=>a+d.valor,0),
    clientes:data.filter(d=>d&&d.cliente&&d.treinador===t).length,
    pct:Math.round((data.filter(d=>d&&d.cliente&&d.treinador===t&&d.status==='pago').reduce((a,d)=>a+d.valor,0)/META)*100)
  })).sort((a,b)=>b.pago-a.pago);
  const _rankTHtml=_rankTFat.length===0
    ?'<div style="font-size:13px;color:var(--muted);padding:8px 0;">Nenhum dado.</div>'
    :_rankTFat.map((t,i)=>{
      const _col=getCol(t.pct);
      return `<div class="rank-row" onclick="openTreinadorDetail('${t.nome}')" style="cursor:pointer;padding:12px 0;" title="Ver detalhe de ${t.nome}">
        <div class="rank-num ${_medalsT[i]||''}" style="font-size:28px;width:36px;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
        <div class="rank-info">
          <div class="rank-name" style="font-size:15px;font-weight:700;">${t.nome.toUpperCase()}</div>
          <div class="rank-detail" style="font-size:13px;margin-top:3px;">${t.clientes} cliente${t.clientes!==1?'s':''} · ${t.pct}% da meta</div>
        </div>
        <div class="rank-val" style="font-size:16px;font-weight:700;color:${_col.text};">${formatVal(t.pago)}</div>
      </div>`;
    }).join('');
  const _totalPagoT=data.filter(d=>d&&d.cliente&&d.status==='pago').reduce((a,d)=>a+d.valor,0);
  const _pctGeralT=Math.round((_totalPagoT/META)*100);
  const _colGeralT=getCol(_pctGeralT);
  var rankPanelT = document.getElementById('treinadorRankingPanel');
  var rankBodyT  = document.getElementById('treinadorRankingBody');
  if(rankPanelT && rankBodyT){
    var rankHeaderT = rankPanelT.querySelector('.spanel-title');
    if(rankHeaderT) rankHeaderT.innerHTML = `Ranking — Faturado<br><span style="font-size:16px;font-weight:700;color:${_colGeralT.text};">${formatVal(_totalPagoT)}</span>`;
    rankBodyT.innerHTML = _rankTHtml;
    rankPanelT.style.cursor = 'default';
    rankPanelT.onclick = null;
  }
}
function openTreinadorDetail(t){window._treinadorAtivo=t;_renderTreinadorDetail(t);}
function _renderTreinadorDetail(t){
  const tdA=data.filter(d=>d&&d.cliente&&d.treinador===t).sort((a,b)=>a.cliente.localeCompare(b.cliente,'pt-BR'));
  const td=activeTreinadorStatus===null?tdA:activeTreinadorStatus==='entrada'?tdA.filter(d=>d.entrada>0):tdA.filter(d=>d.status===activeTreinadorStatus);

  // Métricas
  const total=tdA.reduce((a,d)=>a+d.valor,0);
  const pago=tdA.filter(d=>d.status==='pago').reduce((a,d)=>a+d.valor,0);
  const aberto=tdA.filter(d=>d.status==='aberto').reduce((a,d)=>a+d.valor,0);
  const entrada=tdA.reduce((a,d)=>a+d.entrada,0);
  const nTodos=tdA.length;
  const nPago=tdA.filter(d=>d.status==='pago').length;
  const nAberto=tdA.filter(d=>d.status==='aberto').length;
  const nEntrada=tdA.filter(d=>d.entrada>0).length;

  const fl=activeTreinadorStatus?' · Filtro: '+activeTreinadorStatus.toUpperCase():'';
  const pct=META>0?Math.round((pago/META)*100):0;
  const _colTDetail=getCol(pct);
  const _pctBar=Math.min(pct,100);

  document.getElementById('treinadorDetailName').textContent=t.toUpperCase()+' — '+tdA.length+' cliente'+(tdA.length!==1?'s':'');

  // KPIs + barra de progresso (igual ao consultor)
  document.getElementById('treinadorDetailSub').innerHTML=
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    +'<div style="flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;">'
    +'<div style="height:4px;width:'+_pctBar+'%;background:'+_colTDetail.bar+';border-radius:2px;transition:width .4s;"></div>'
    +'</div>'
    +'<span style="font-size:11px;font-weight:600;color:'+_colTDetail.text+';font-family:\'DM Mono\',monospace;min-width:36px;text-align:right;">'+pct+'%</span>'
    +'<span style="font-size:10px;color:var(--muted);">da meta</span>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">'
    +'<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Potencial</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--text);font-family:\'DM Mono\',monospace;">'+formatVal(total)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nTodos+' cliente'+(nTodos!==1?'s':'')+'</div>'
    +'</div>'
    +'<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Faturado</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--green);font-family:\'DM Mono\',monospace;">'+formatVal(pago)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nPago+' pago'+(nPago!==1?'s':'')+'</div>'
    +'</div>'
    +'<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Em aberto</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--amber);font-family:\'DM Mono\',monospace;">'+formatVal(aberto)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nAberto+' cliente'+(nAberto!==1?'s':'')+'</div>'
    +'</div>'
    +'<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Entradas</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--blue);font-family:\'DM Mono\',monospace;">'+(entrada>0?formatVal(entrada):'—')+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nEntrada+' cliente'+(nEntrada!==1?'s':'')+'</div>'
    +'</div>'
    +'</div>'
    +'<span style="font-size:12px;color:var(--muted);">Potencial: '+formatVal(total)+' · Faturado: <span style="color:'+_colTDetail.text+';font-weight:700;">'+formatVal(pago)+'</span>'+(entrada>0?' · Entradas: '+formatVal(entrada):'')+fl+'</span>';

  // Contadores nos botões de filtro
  const _ftMap={ftAll:nTodos,ftAberto:nAberto,ftPago:nPago,ftEntrada:nEntrada};
  const _ftLabel={ftAll:'Todos',ftAberto:'Aberto',ftPago:'Pago',ftEntrada:'Entrada'};
  Object.keys(_ftMap).forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.textContent=_ftLabel[id]+(_ftMap[id]>0?' ('+_ftMap[id]+')':'');
  });
  // Checkbox ministrante no detail
  var ministrante=_getTurmaMinistante();
  var isMinistrante=ministrante===t;
  var sess=_getSessao?_getSessao():null;
  var isAdm=!sess||sess.perfil==='adm';
  var boxEl=document.getElementById('treinadorMinistranteBox');
  if(boxEl&&isAdm){
    var lblCor=isMinistrante?'var(--accent)':'var(--muted)';
    var brdCor=isMinistrante?'rgba(200,240,90,.5)':'var(--border2)';
    var bgCor=isMinistrante?'rgba(200,240,90,.08)':'transparent';
    var chk=isMinistrante?'checked':'';
    boxEl.innerHTML='<label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;padding:6px 16px;border-radius:20px;border:1px solid '+brdCor+';background:'+bgCor+';transition:all .2s;">'
      +'<input type="checkbox" '+chk+' onchange="_setMinistrante(\"'+t+'\",this.checked)" style="cursor:pointer;accent-color:var(--accent);width:14px;height:14px;" />'
      +'<span style="font-size:12px;font-weight:700;color:'+lblCor+';text-transform:uppercase;letter-spacing:.06em;">Ministrante</span>'
      +'</label>';
  } else if(boxEl){ boxEl.innerHTML=''; }
  var _twrap=document.getElementById('treinadorLayoutWrap');
  if(_twrap) _twrap.style.display='none';
  document.getElementById('treinadorDetail').style.display='block';
  const sl=s=>s==='pago'?'PAGO':s==='negociacao'?'NEGOCIAÇÃO':s==='desistiu'?'DESISTIU':s==='estorno'?'ESTORNO':s==='-'?'—':'ABERTO';
  document.getElementById('treinadorDetailTable').innerHTML=td.length===0
    ?'<tr class="empty-row"><td colspan="8">Nenhum cliente para este filtro.</td></tr>'
    :td.map(d=>{const ri=data.indexOf(d),ip=d.status==='pago',hi=!!(d.info&&d.info.trim());return `<tr style="border-left:${ip?'2px solid #39ff14':'2px solid transparent'};">
      <td style="font-weight:600;text-transform:uppercase;${ip?'color:#39ff14;':''}"><span style="display:inline-flex;align-items:center;gap:4px;">${d.cliente}<button class="info-btn${hi?' has-info':''}" onclick="openClientInfo(${ri})">i</button></span></td>
      <td style="text-align:center;">${d.treinamento||'—'}</td>
      <td style="color:var(--muted);">${d.consultor.toUpperCase()}</td>
      <td style="${ip?'font-weight:600;':''}">${formatVal(d.valor)}</td>
      <td style="text-align:center;"><span style="font-size:10px;font-weight:500;padding:2px 8px;border-radius:4px;" class="badge badge-${d.status}">${sl(d.status)}</span></td>
      <td style="text-align:center;" class="${d.entrada>0?'entrada-green':''}">${d.entrada>0?formatVal(d.entrada):'—'}</td>
      <td style="text-align:center;"><div style="display:inline-flex;gap:5px;"><button class="edit-btn" onclick="openModal(${ri})" title="Editar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button><button class="edit-btn del" onclick="openConfirm(${ri})" title="Excluir"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></td>
    </tr>`;}).join('');
}
function closeTreinadorDetail(){
  window._treinadorAtivo=null;activeTreinadorStatus=null;
  ['ftAll','ftAberto','ftPago','ftEntrada'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const el=document.getElementById('ftAll');if(el)el.classList.add('active');
  document.getElementById('treinadorDetail').style.display='none';
  var _twrapClose=document.getElementById('treinadorLayoutWrap');
  if(_twrapClose) _twrapClose.style.display='grid';
  renderTreinador();
}

/* ═══════════════════════════════════════════
   NOVO CONSULTOR / TREINADOR
═══════════════════════════════════════════ */
var _ncSelecionados=[];
function _ncLimparSelecao(){
  _ncSelecionados=[];
  document.querySelectorAll('#novoConsultorLista .fbtn').forEach(function(b){b.classList.remove('active');});
}
function abrirNovoConsultor(){
  _ncSelecionados=[];
  document.getElementById('novoConsultorNome').value='';
  document.getElementById('novoConsultorLista').innerHTML='<span style="font-size:12px;color:var(--muted);">Carregando...</span>';
  document.getElementById('novoConsultorVazio').style.display='none';
  document.getElementById('novoConsultorOverlay').classList.add('open');
  if(window._fbGet){
    window._fbGet('usuarios').then(function(usuarios){
      var lista=[];
      if(usuarios&&typeof usuarios==='object'){
        Object.values(usuarios).forEach(function(u){
          if(u&&u.nome&&u.ativo!==false&&u.perfil==='consultor'){
            var nomeUp=u.nome.toUpperCase();
            if(!allConsultors.map(function(c){return c.toUpperCase();}).includes(nomeUp))
              lista.push(nomeUp);
          }
        });
      }
      lista.sort();
      var el=document.getElementById('novoConsultorLista');
      if(!lista.length){
        el.innerHTML='';
        document.getElementById('novoConsultorVazio').style.display='block';
        return;
      }
      el.innerHTML=lista.map(function(n){
        return '<button class="fbtn" onclick="_ncSelecionar(\''+n+'\')" type="button">'+n+'</button>';
      }).join('');
    }).catch(function(){
      document.getElementById('novoConsultorLista').innerHTML='<span style="font-size:12px;color:var(--muted);">Erro ao carregar.</span>';
    });
  } else {
    document.getElementById('novoConsultorLista').innerHTML='';
  }
  setTimeout(function(){document.getElementById('novoConsultorNome').focus();},100);
}
function _ncSelecionar(nome){
  document.getElementById('novoConsultorNome').value='';
  var idx=_ncSelecionados.indexOf(nome);
  if(idx===-1){_ncSelecionados.push(nome);}
  else{_ncSelecionados.splice(idx,1);}
  document.querySelectorAll('#novoConsultorLista .fbtn').forEach(function(b){
    b.classList.toggle('active',_ncSelecionados.indexOf(b.textContent)!==-1);
  });
}
function fecharNovoConsultor(){document.getElementById('novoConsultorOverlay').classList.remove('open');_ncSelecionados=[];}
function salvarNovoConsultor(){
  var digitado=document.getElementById('novoConsultorNome').value.trim().toUpperCase();
  var lista=_ncSelecionados.length?_ncSelecionados.slice():(digitado?[digitado]:[]);
  if(!lista.length){document.getElementById('novoConsultorNome').focus();return;}
  var adicionados=[];
  lista.forEach(function(nome){
    if(!allConsultors.includes(nome)){
      allConsultors.push(nome);
      adicionados.push(nome);
      if(typeof _addPendLog==='function')_addPendLog('Novo consultor adicionado','Consultor: '+nome,'👤');
    }
  });
  if(!adicionados.length){_showToast('Todos já existem na turma.','var(--amber)');return;}
  _buildColors();_atualizarEquipeTurma();buildSelects();renderConsultor();fecharNovoConsultor();
  _showToast('✅ '+adicionados.length+' consultor'+(adicionados.length>1?'es':'')+' adicionado'+(adicionados.length>1?'s':'')+'!','var(--accent)');
}
function editarNomeTreinador(nomeAtual){
  var novoNome=prompt('Novo nome para "'+nomeAtual+'":', nomeAtual);
  if(!novoNome||!novoNome.trim()||novoNome.trim().toUpperCase()===nomeAtual.toUpperCase()) return;
  novoNome=novoNome.trim().toUpperCase();
  if(allTrainers.includes(novoNome)){alert('Já existe um treinador com esse nome.');return;}
  // Atualizar em allTrainers e na turma
  var idx=allTrainers.indexOf(nomeAtual);
  if(idx===-1) return;
  allTrainers[idx]=novoNome;
  // Atualizar nos dados dos clientes
  data.forEach(function(d){if(d.treinador===nomeAtual)d.treinador=novoNome;});
  // Atualizar na turma ativa
  if(_turmaAtiva){
    var turmas=_getTurmas();
    var ti=turmas.findIndex(function(t){return t.id===_turmaAtiva.id;});
    if(ti!==-1){
      turmas[ti].treinadores=allTrainers;
      _saveTurmas(turmas);
      _turmaAtiva=turmas[ti];
    }
  }
  _buildColors();buildSelects();buildFilterBtns();renderAll();
  _showToast('✅ Treinador renomeado para '+novoNome,'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador renomeado',nomeAtual+' → '+novoNome,'✏️');
}

function removerTreinador(nome){
  if(!confirm('Remover "'+nome+'" da turma?\nOs clientes vinculados a ele não serão excluídos.')) return;
  allTrainers=allTrainers.filter(function(t){return t!==nome;});
  if(_turmaAtiva){
    var turmas=_getTurmas();
    var ti=turmas.findIndex(function(t){return t.id===_turmaAtiva.id;});
    if(ti!==-1){
      turmas[ti].treinadores=allTrainers;
      _saveTurmas(turmas);
      _turmaAtiva=turmas[ti];
    }
  }
  _buildColors();buildSelects();buildFilterBtns();renderAll();
  _showToast('✅ Treinador '+nome+' removido da turma.','var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador removido (rápido)','Treinador: '+nome,'🗑️');
}

function abrirModalEditarConsultores(){
  _renderEditarConsultoresLista();
  document.getElementById('novoConsultorModalInput').value='';
  document.getElementById('editarConsultoresOverlay').classList.add('open');
}
function fecharModalEditarConsultores(){
  document.getElementById('editarConsultoresOverlay').classList.remove('open');
}
function _renderEditarConsultoresLista(){
  var el=document.getElementById('editarConsultoresLista');
  if(!el) return;
  if(!allConsultors.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:12px 0;">Nenhum consultor cadastrado.</div>';
    return;
  }
  el.innerHTML=allConsultors.map(function(c,i){
    return '<div id="consultorEditRow_'+i+'" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);">'
      +'<span style="flex:1;font-size:13px;font-weight:600;color:var(--text);">'+c+'</span>'
      +'<button class="title-edit-btn" onclick="_iniciarRenomearConsultor('+i+',\''+c+'\')" style="padding:4px 10px;font-size:12px;">Renomear</button>'
      +'<button class="title-edit-btn del" onclick="_confirmarExcluirConsultor(\''+c+'\','+i+')" style="padding:4px 10px;font-size:12px;">Excluir</button>'
      +'</div>';
  }).join('');
}

function _iniciarRenomearConsultor(idx,nomeAtual){
  var row=document.getElementById('consultorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<input id="inputRenomearConsultor_'+idx+'" class="modal-input" value="'+nomeAtual+'" style="flex:1;font-size:13px;padding:4px 8px;" />'
    +'<button class="modal-save" onclick="_confirmarRenomearConsultor('+idx+',\''+nomeAtual+'\')" style="padding:4px 12px;font-size:12px;">Confirmar</button>'
    +'<button class="modal-cancel" onclick="_renderEditarConsultoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
  var inp=document.getElementById('inputRenomearConsultor_'+idx);
  if(inp){inp.focus();inp.select();}
}

function _confirmarRenomearConsultor(idx,nomeAtual){
  var inp=document.getElementById('inputRenomearConsultor_'+idx);
  if(!inp) return;
  var novoNome=inp.value.trim().toUpperCase();
  if(!novoNome||novoNome===nomeAtual){_renderEditarConsultoresLista();return;}
  if(allConsultors.includes(novoNome)){alert('Já existe um consultor com esse nome.');return;}
  allConsultors[allConsultors.indexOf(nomeAtual)]=novoNome;
  data.forEach(function(d){if(d.consultor===nomeAtual)d.consultor=novoNome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarConsultoresLista();
  renderAll();renderConsultor();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
}

function _confirmarExcluirConsultor(nome,idx){
  var row=document.getElementById('consultorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<span style="flex:1;font-size:13px;color:var(--red);font-weight:600;">Excluir "'+nome+'"?</span>'
    +'<button class="modal-save" onclick="_executarExcluirConsultor(\''+nome+'\')" style="padding:4px 12px;font-size:12px;background:var(--red);border-color:var(--red);color:#fff;">Sim, excluir</button>'
    +'<button class="modal-cancel" onclick="_renderEditarConsultoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
}

function _executarExcluirConsultor(nome){
  allConsultors=allConsultors.filter(function(c){return c!==nome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarConsultoresLista();
  renderAll();renderConsultor();
  _showToast('✅ '+nome+' removido.','var(--accent)');
}
function adicionarConsultorModal(){
  var inp=document.getElementById('novoConsultorModalInput');
  var nome=inp.value.trim().toUpperCase();
  if(!nome){alert('Informe o nome.');return;}
  if(allConsultors.includes(nome)){alert('Consultor já cadastrado.');return;}
  allConsultors.push(nome);
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarConsultores();
  renderAll();renderConsultor();
  inp.value='';
  _showToast('✅ '+nome+' adicionado.','var(--accent)');
}
function renomearConsultorModal(nomeAtual){
  var novoNome=prompt('Novo nome para "'+nomeAtual+'":', nomeAtual);
  if(!novoNome||!novoNome.trim()) return;
  novoNome=novoNome.trim().toUpperCase();
  if(novoNome===nomeAtual) return;
  if(allConsultors.includes(novoNome)){alert('Já existe um consultor com esse nome.');return;}
  var idx=allConsultors.indexOf(nomeAtual);
  if(idx===-1) return;
  allConsultors[idx]=novoNome;
  data.forEach(function(d){if(d.consultor===nomeAtual)d.consultor=novoNome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarConsultores();
  renderAll();renderConsultor();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Consultor renomeado',nomeAtual+' → '+novoNome,'✏️');
}
function excluirConsultorModal(nome){
  if(!confirm('Excluir "'+nome+'" da turma?\nOs clientes vinculados não serão excluídos.')) return;
  allConsultors=allConsultors.filter(function(c){return c!==nome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarConsultores();
  renderAll();renderConsultor();
  _showToast('✅ '+nome+' removido.','var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Consultor excluído',nome,'🗑️');
}

function abrirModalEditarTreinadores(){
  _renderEditarTreinadoresLista();
  document.getElementById('novoTreinadorModalInput').value='';
  document.getElementById('editarTreinadoresOverlay').classList.add('open');
}
function fecharModalEditarTreinadores(){
  document.getElementById('editarTreinadoresOverlay').classList.remove('open');
}
function _renderEditarTreinadoresLista(){
  var el=document.getElementById('editarTreinadoresLista');
  if(!el) return;
  if(!allTrainers.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:12px 0;">Nenhum treinador cadastrado.</div>';
    return;
  }
  el.innerHTML=allTrainers.map(function(t,i){
    return '<div id="treinadorEditRow_'+i+'" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);">'
      +'<span style="flex:1;font-size:13px;font-weight:600;color:var(--text);">'+t+'</span>'
      +'<button class="title-edit-btn" onclick="_iniciarRenomearTreinador('+i+',\''+t+'\')" style="padding:4px 10px;font-size:12px;">Renomear</button>'
      +'<button class="title-edit-btn del" onclick="_confirmarExcluirTreinador(\''+t+'\','+i+')" style="padding:4px 10px;font-size:12px;">Excluir</button>'
      +'</div>';
  }).join('');
}

function _iniciarRenomearTreinador(idx,nomeAtual){
  var row=document.getElementById('treinadorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<input id="inputRenomearTreinador_'+idx+'" class="modal-input" value="'+nomeAtual+'" style="flex:1;font-size:13px;padding:4px 8px;" />'
    +'<button class="modal-save" onclick="_confirmarRenomearTreinador('+idx+',\''+nomeAtual+'\')" style="padding:4px 12px;font-size:12px;">Confirmar</button>'
    +'<button class="modal-cancel" onclick="_renderEditarTreinadoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
  var inp=document.getElementById('inputRenomearTreinador_'+idx);
  if(inp){inp.focus();inp.select();}
}

function _confirmarRenomearTreinador(idx,nomeAtual){
  var inp=document.getElementById('inputRenomearTreinador_'+idx);
  if(!inp) return;
  var novoNome=inp.value.trim().toUpperCase();
  if(!novoNome||novoNome===nomeAtual){_renderEditarTreinadoresLista();return;}
  if(allTrainers.includes(novoNome)){alert('Já existe um treinador com esse nome.');return;}
  allTrainers[allTrainers.indexOf(nomeAtual)]=novoNome;
  data.forEach(function(d){if(d.treinador===nomeAtual)d.treinador=novoNome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarTreinadoresLista();
  renderAll();renderTreinador();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
}

function _confirmarExcluirTreinador(nome,idx){
  var row=document.getElementById('treinadorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<span style="flex:1;font-size:13px;color:var(--red);font-weight:600;">Excluir "'+nome+'"?</span>'
    +'<button class="modal-save" onclick="_executarExcluirTreinador(\''+nome+'\')" style="padding:4px 12px;font-size:12px;background:var(--red);border-color:var(--red);color:#fff;">Sim, excluir</button>'
    +'<button class="modal-cancel" onclick="_renderEditarTreinadoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
}

function _executarExcluirTreinador(nome){
  allTrainers=allTrainers.filter(function(t){return t!==nome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarTreinadoresLista();
  renderAll();renderTreinador();
  _showToast('✅ '+nome+' removido.','var(--accent)');
}
function adicionarTreinadorModal(){
  var inp=document.getElementById('novoTreinadorModalInput');
  var nome=inp.value.trim().toUpperCase();
  if(!nome){alert('Informe o nome.');return;}
  if(allTrainers.includes(nome)){alert('Treinador já cadastrado.');return;}
  allTrainers.push(nome);
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarTreinadores();
  renderAll();renderTreinador();
  inp.value='';
  _showToast('✅ '+nome+' adicionado.','var(--accent)');
}
function renomearTreinadorModal(nomeAtual){
  var novoNome=prompt('Novo nome para "'+nomeAtual+'":', nomeAtual);
  if(!novoNome||!novoNome.trim()) return;
  novoNome=novoNome.trim().toUpperCase();
  if(novoNome===nomeAtual) return;
  if(allTrainers.includes(novoNome)){alert('Já existe um treinador com esse nome.');return;}
  var idx=allTrainers.indexOf(nomeAtual);
  if(idx===-1) return;
  allTrainers[idx]=novoNome;
  data.forEach(function(d){if(d.treinador===nomeAtual)d.treinador=novoNome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarTreinadores();
  renderAll();renderTreinador();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador renomeado',nomeAtual+' → '+novoNome,'✏️');
}
function excluirTreinadorModal(nome){
  if(!confirm('Excluir "'+nome+'" da turma?\nOs clientes vinculados não serão excluídos.')) return;
  allTrainers=allTrainers.filter(function(t){return t!==nome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarTreinadores();
  renderAll();renderTreinador();
  _showToast('✅ '+nome+' removido.','var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador excluído',nome,'🗑️');
}

var _ntSelecionados=[];
function _ntLimparSelecao(){
  _ntSelecionados=[];
  document.querySelectorAll('#novoTreinadorLista .fbtn').forEach(function(b){b.classList.remove('active');});
}
function abrirNovoTreinador(){
  _ntSelecionados=[];
  document.getElementById('novoTreinadorNome').value='';
  document.getElementById('novoTreinadorLista').innerHTML='<span style="font-size:12px;color:var(--muted);">Carregando...</span>';
  document.getElementById('novoTreinadorVazio').style.display='none';
  document.getElementById('novoTreinadorOverlay').classList.add('open');
  if(window._fbGet){
    window._fbGet('usuarios').then(function(usuarios){
      var lista=[];
      if(usuarios&&typeof usuarios==='object'){
        Object.values(usuarios).forEach(function(u){
          if(u&&u.nome&&u.ativo!==false&&(u.perfil==='treinador'||u.perfil==='ministrante')){
            var nomeUp=u.nome.toUpperCase();
            if(!allTrainers.map(function(t){return t.toUpperCase();}).includes(nomeUp))
              lista.push(nomeUp);
          }
        });
      }
      lista.sort();
      var el=document.getElementById('novoTreinadorLista');
      if(!lista.length){
        el.innerHTML='';
        document.getElementById('novoTreinadorVazio').style.display='block';
        return;
      }
      el.innerHTML=lista.map(function(n){
        return '<button class="fbtn" onclick="_ntSelecionar(\''+n+'\')" type="button">'+n+'</button>';
      }).join('');
    }).catch(function(){
      document.getElementById('novoTreinadorLista').innerHTML='<span style="font-size:12px;color:var(--muted);">Erro ao carregar.</span>';
    });
  } else {
    document.getElementById('novoTreinadorLista').innerHTML='';
  }
  setTimeout(function(){document.getElementById('novoTreinadorNome').focus();},100);
}
function _ntSelecionar(nome){
  document.getElementById('novoTreinadorNome').value='';
  var idx=_ntSelecionados.indexOf(nome);
  if(idx===-1){_ntSelecionados.push(nome);}
  else{_ntSelecionados.splice(idx,1);}
  document.querySelectorAll('#novoTreinadorLista .fbtn').forEach(function(b){
    b.classList.toggle('active',_ntSelecionados.indexOf(b.textContent)!==-1);
  });
}
function fecharNovoTreinador(){document.getElementById('novoTreinadorOverlay').classList.remove('open');_ntSelecionados=[];}
function salvarNovoTreinador(){
  var digitado=document.getElementById('novoTreinadorNome').value.trim().toUpperCase();
  var lista=_ntSelecionados.length?_ntSelecionados.slice():(digitado?[digitado]:[]);
  if(!lista.length){document.getElementById('novoTreinadorNome').focus();return;}
  var adicionados=[];
  lista.forEach(function(nome){
    if(!allTrainers.includes(nome)){
      allTrainers.push(nome);
      adicionados.push(nome);
      if(typeof _addPendLog==='function')_addPendLog('Novo treinador adicionado','Treinador: '+nome,'👤');
    }
  });
  if(!adicionados.length){_showToast('Todos já existem na turma.','var(--amber)');return;}
  _buildColors();_atualizarEquipeTurma();buildSelects();buildFilterBtns();renderTreinador();fecharNovoTreinador();
  _showToast('✅ '+adicionados.length+' treinador'+(adicionados.length>1?'es':'')+' adicionado'+(adicionados.length>1?'s':'')+'!','var(--accent)');
}
function _atualizarEquipeTurma(){
  if(!_turmaAtiva)return;
  // FIX: sempre atualizar _turmaAtiva em memória antes de qualquer save
  _turmaAtiva.consultores=allConsultors.slice();
  _turmaAtiva.treinadores=allTrainers.slice();
  // Atualizar localStorage se a turma estiver na lista local
  const turmas=_getTurmas(),idx=turmas.findIndex(t=>t.id===_turmaAtiva.id);
  if(idx!==-1){turmas[idx].treinadores=allTrainers;turmas[idx].consultores=allConsultors;_saveTurmas(turmas);}
  // Salvar no Firebase — campos individuais E documento completo via saveStorage
  if(window._fbSave&&_turmaAtiva.id){
    window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id+'/treinadores',allTrainers)
      .catch(function(e){console.error('[FB] treinadores erro:',e);});
    window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id+'/consultores',allConsultors)
      .catch(function(e){console.error('[FB] consultores erro:',e);});
  }
  // Também salva o documento inteiro para garantir consistência
  if(typeof saveStorage==='function') saveStorage();
}

/* ═══════════════════════════════════════════
   MODAIS EDITAR / ADICIONAR
═══════════════════════════════════════════ */
function onEditTreinamentoChange(){const t=document.getElementById('mTreinamento').value,ic=t==='CI',ts=document.getElementById('mTreinador'),nt=document.getElementById('mTreinamentoNote');ts.disabled=!ic;ts.style.opacity=ic?'1':'0.4';if(!ic)ts.value='-';nt.textContent=ic?'CI: selecione o treinador.':(t==='-'?'Treinamento não especificado.':'Treinamento '+t+': treinador não aplicável (—).');}
function onAddTreinamentoChange(){const t=document.getElementById('aTreinamento').value,ic=t==='CI',ts=document.getElementById('aTreinador'),nt=document.getElementById('aTreinamentoNote');ts.disabled=!ic;ts.style.opacity=ic?'1':'0.4';if(!ic)ts.value='-';nt.textContent=ic?'CI: selecione o treinador responsável.':(t==='-'?'Treinamento não especificado.':'Treinamento '+t+': treinador não aplicável (—).');}
function setEntradaToggle(sim){entradaRealizada=sim;document.getElementById('eToggleSim').className='etoggle'+(sim?' active-yes':'');document.getElementById('eToggleNao').className='etoggle'+(!sim?' active-no':'');document.getElementById('entradaValField').style.display=sim?'block':'none';}
function openModal(idx){
  editIdx=idx;const d=data[idx];
  document.getElementById('mCliente').value=d.cliente;
  document.getElementById('mEditSub').textContent=d.treinador+' · '+d.consultor;
  document.getElementById('mTreinamento').value=d.treinamento;
  document.getElementById('mTreinador').value=d.treinador||'-';
  document.getElementById('mConsultor').value=d.consultor;
  document.getElementById('mValor').value=d.valor.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('mStatus').value=d.status;
  document.getElementById('mEntrada').value=d.entrada>0?d.entrada.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
  setEntradaToggle(d.entrada>0);onEditTreinamentoChange();
  // ── Elevar z-index se modal de clientes vinculados estiver aberto ──
  var ov = document.getElementById('clientesVinculadosOverlay');
  var mo = document.getElementById('modalOverlay');
  var co = document.getElementById('confirmOverlay');
  if(ov && ov.classList.contains('open')){
    if(mo) mo.classList.add('sobre-vinculados');
    if(co) co.classList.add('sobre-vinculados');
  } else {
    if(mo) mo.classList.remove('sobre-vinculados');
    if(co) co.classList.remove('sobre-vinculados');
  }
  if(mo) mo.classList.add('open');
}
function closeModal(){
  var mo=document.getElementById('modalOverlay');
  var co=document.getElementById('confirmOverlay');
  if(mo){ mo.classList.remove('open'); mo.classList.remove('sobre-vinculados'); }
  if(co) co.classList.remove('sobre-vinculados');
  editIdx=null;
}
function saveEdit(){
  if(editIdx===null)return;
  const nome=document.getElementById('mCliente').value.trim();if(!nome){document.getElementById('mCliente').focus();return;}
  const trein=document.getElementById('mTreinamento').value,ic=trein==='CI';
  data[editIdx].cliente=nome.toUpperCase();
  data[editIdx].treinamento=trein;
  data[editIdx].treinador=ic?document.getElementById('mTreinador').value:'-';
  const consultorSalvo=document.getElementById('mConsultor').value;
  data[editIdx].consultor=consultorSalvo;
  const mValorRaw=document.getElementById('mValor').value.trim();data[editIdx].valor=mValorRaw===''?data[editIdx].valor:parseVal(mValorRaw);
  var _statusAntes=data[editIdx].status;
  data[editIdx].status=document.getElementById('mStatus').value;
  data[editIdx].entrada=entradaRealizada?parseVal(document.getElementById('mEntrada').value):0;
  /* Notificar pagamento quando status muda para 'pago' */
  if(_statusAntes!=='pago'&&data[editIdx].status==='pago'&&typeof window._notifOnPagamento==='function'){
    window._notifOnPagamento(_turmaAtiva&&_turmaAtiva.id,_turmaAtiva&&_turmaAtiva.nome,data[editIdx].cliente,data[editIdx].consultor,data[editIdx].valor);
  }
  closeModal();markUnsaved();saveStorage();renderAll();renderConsultor();renderTreinador();renderProduto();
  // Se o modal de clientes vinculados estava aberto, re-renderizá-lo com dados atualizados
  var ov=document.getElementById('clientesVinculadosOverlay');
  if(ov&&ov.classList.contains('open')&&typeof abrirClientesVinculados==='function'){
    var nomEl=document.getElementById('cvNome');
    if(nomEl&&nomEl.textContent) abrirClientesVinculados(nomEl.textContent);
    else if(consultorSalvo) abrirClientesVinculados(consultorSalvo);
  }
}
function openConfirm(idx){
  confirmIdx=idx;
  document.getElementById('confirmMsg').textContent='Excluir '+(data[idx]?data[idx].cliente.toUpperCase():'?')+'? Esta ação não pode ser desfeita.';
  var co=document.getElementById('confirmOverlay');
  var ov=document.getElementById('clientesVinculadosOverlay');
  if(ov&&ov.classList.contains('open')) co.classList.add('sobre-vinculados');
  else co.classList.remove('sobre-vinculados');
  co.classList.add('open');
}
function cancelConfirm(){
  var co=document.getElementById('confirmOverlay');
  co.classList.remove('open');
  co.classList.remove('sobre-vinculados');
  confirmIdx=null;
}
function executeDelete(){
  if(confirmIdx===null)return;
  const idx=confirmIdx;
  var co=document.getElementById('confirmOverlay');
  co.classList.remove('open');
  co.classList.remove('sobre-vinculados');
  if(editIdx!==null)closeModal();
  confirmIdx=null;
  data.splice(idx,1);
  markUnsaved();saveStorage();renderAll();renderConsultor();renderTreinador();renderProduto();
  // Atualizar ou fechar modal de clientes vinculados
  var ov=document.getElementById('clientesVinculadosOverlay');
  if(ov&&ov.classList.contains('open')&&typeof abrirClientesVinculados==='function'){
    var nomEl=document.getElementById('cvNome');
    if(nomEl&&nomEl.textContent) abrirClientesVinculados(nomEl.textContent);
  }
}
function setAddEntradaToggle(sim){addEntradaRealizada=sim;document.getElementById('aToggleSim').className='etoggle'+(sim?' active-yes':'');document.getElementById('aToggleNao').className='etoggle'+(!sim?' active-no':'');document.getElementById('addEntradaValField').style.display=sim?'block':'none';}
// Modal simplificado para consultor — campos restritos
// ── Mini-menu "+" por linha de cliente ──
/* ═══════════════════════════════════════════
   TREINAMENTOS MÚLTIPLOS — helpers
═══════════════════════════════════════════ */
function _treinTotalId(listId){return listId==='aTreinamentosLista'?'aValorTotal':'cdValorTotal';}

function _removerUltimoTrein(listId){
  var container=document.getElementById(listId);
  if(!container)return;
  var rows=container.querySelectorAll('.trein-row');
  if(!rows.length) return;
  rows[rows.length-1].remove();
  _calcTotalTrein(listId);
  _checkCITreinador(listId);
  _updateRemoveBtns(listId);
}
window._removerUltimoTrein=_removerUltimoTrein;

function _updateRemoveBtns(listId){
  var container=document.getElementById(listId);
  if(!container)return;
  var rows=container.querySelectorAll('.trein-row');
  rows.forEach(function(row){
    var btn=row.querySelector('.trein-remove-btn');
    if(btn)btn.style.display='flex';
  });
}

function _addTreinRow(listId,cod,val){
  var container=document.getElementById(listId);
  if(!container)return;
  var opts='<option value="-">— treinamento —</option>';
  var _tl=(typeof allTreinamentos!=='undefined'&&Array.isArray(allTreinamentos))?allTreinamentos:[];
  _tl.forEach(function(t){opts+='<option value="'+t+'"'+(cod===t?' selected':'')+'>'+t+'</option>';});
  var valStr=val?Number(val).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
  var row=document.createElement('div');
  row.className='trein-row';
  row.style.cssText='display:flex;gap:6px;align-items:center;';
  row.innerHTML='<select class="modal-select trein-cod" style="flex:1;min-width:0;font-size:12px;padding:6px 8px;" onchange="_calcTotalTrein(\''+listId+'\');_checkCITreinador(\''+listId+'\')">'+opts+'</select>'
    +'<input type="text" inputmode="numeric" class="modal-input trein-valor" style="width:110px;flex-shrink:0;font-size:12px;padding:6px 8px;text-align:right;margin:0;" placeholder="0,00" value="'+valStr+'" oninput="this.value=lcMoneyMask(this.value);_calcTotalTrein(\''+listId+'\')">'
    +'<button type="button" class="trein-remove-btn" onclick="this.closest(\'.trein-row\').remove();_calcTotalTrein(\''+listId+'\');_checkCITreinador(\''+listId+'\');_updateRemoveBtns(\''+listId+'\')" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--red);background:transparent;color:var(--red);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1;font-family:monospace;">×</button>';
  container.appendChild(row);
  _calcTotalTrein(listId);
  _checkCITreinador(listId);
  _updateRemoveBtns(listId);
}

function _calcTotalTrein(listId){
  var container=document.getElementById(listId);
  var totalEl=document.getElementById(_treinTotalId(listId));
  if(!container||!totalEl)return;
  var total=0;
  container.querySelectorAll('.trein-valor').forEach(function(inp){total+=parseVal(inp.value)||0;});
  totalEl.textContent=formatVal(total);
}

function _getTreinRows(listId){
  var container=document.getElementById(listId);
  if(!container)return[];
  var rows=[];
  container.querySelectorAll('.trein-row').forEach(function(row){
    var sel=row.querySelector('.trein-cod');
    var inp=row.querySelector('.trein-valor');
    if(!sel||!inp)return;
    var cod=sel.value;
    if(!cod||cod==='-')return;
    rows.push({cod:cod,valor:parseVal(inp.value)||0});
  });
  return rows;
}

function _checkCITreinador(listId){
  var container=document.getElementById(listId);
  if(!container)return;
  var hasCI=false;
  container.querySelectorAll('.trein-cod').forEach(function(sel){if(sel.value==='CI')hasCI=true;});
  if(listId==='aTreinamentosLista'){
    var rowEl=document.getElementById('addTreinadorRow');
    if(rowEl)rowEl.style.display=hasCI?'':'none';
  } else {
    var rowEl=document.getElementById('clienteDetalheTreinadorRow');
    if(rowEl)rowEl.style.display=hasCI?'flex':'none';
  }
}
window._addTreinRow=_addTreinRow;
window._calcTotalTrein=_calcTotalTrein;
window._getTreinRows=_getTreinRows;
window._checkCITreinador=_checkCITreinador;
window._updateRemoveBtns=_updateRemoveBtns;

window._abrirMenuCliente=function(e,nomeCliente,ri){
  e.stopPropagation();
  // Remove menu anterior se existir
  var old=document.getElementById('_menuCliente');
  if(old){ old.remove(); return; }

  var btn=e.currentTarget;
  var rect=btn.getBoundingClientRect();

  var menu=document.createElement('div');
  menu.id='_menuCliente';
  menu.style.cssText='position:fixed;z-index:99999;background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);padding:6px;min-width:200px;'
    +'box-shadow:0 16px 48px rgba(0,0,0,.75);display:flex;flex-direction:column;gap:2px;';
  menu.style.top=(rect.bottom+6)+'px';
  menu.style.left=Math.min(rect.left,window.innerWidth-220)+'px';

  var opcoes=[
    {icon:'➕', label:'Adicionar treinamento', fn:function(){
      // Encontra o registro existente do cliente e abre o modal de edição
      var _riEdit=data.findIndex(function(d){
        return d&&d.cliente&&d.cliente===nomeCliente&&(!window._consultorAtivo||d.consultor===window._consultorAtivo);
      });
      if(_riEdit>=0){
        abrirClienteDetalhe(_riEdit);
        setTimeout(function(){
          _addTreinRow('cdTreinamentosLista');
          var _btns=document.getElementById('cdTreinBtns');
          if(_btns)_btns.style.display='';
        },80);
      }
    }},
    {icon:'✏️', label:'Editar registro', fn:function(){ abrirClienteDetalhe(ri); }},
    {icon:'ℹ️', label:'Ver informações', fn:function(){ openClientInfo(ri); }},
  ];

  opcoes.forEach(function(op){
    var item=document.createElement('button');
    item.style.cssText='display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--radius-sm);cursor:pointer;border:none;background:none;font-family:"DM Sans",sans-serif;font-size:13px;color:var(--muted);width:100%;text-align:left;transition:background .12s;';
    item.innerHTML='<span style="font-size:14px;">'+op.icon+'</span><span>'+op.label+'</span>';
    item.onmouseover=function(){this.style.background='var(--surface2)';this.style.color='var(--text)';};
    item.onmouseout=function(){this.style.background='none';this.style.color='var(--muted)';};
    item.onclick=function(){ menu.remove(); op.fn(); };
    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  setTimeout(function(){
    document.addEventListener('click',function _c(){ menu.remove(); document.removeEventListener('click',_c); });
  },0);
};

function openAddModalConsultor(){
  var _s=_getSessao?_getSessao():null;
  if(!_s||_s.perfil!=='consultor'){openAddModal();return;}
  // Pré-preencher campos fixos
  document.getElementById('aNome').value='';
  document.getElementById('aStatus').value='aberto';
  document.getElementById('aEntrada').value='';
  // Init multi-training list
  var _lista=document.getElementById('aTreinamentosLista');
  if(_lista){_lista.innerHTML='';_addTreinRow('aTreinamentosLista');}
  var _tot=document.getElementById('aValorTotal');if(_tot)_tot.textContent='R$ 0,00';
  var _trdRow=document.getElementById('addTreinadorRow');if(_trdRow)_trdRow.style.display='none';
  // Treinador e consultor: ocultar/fixar
  var _vinculo=_s.vinculo||_s.nome||'';
  var _aConsEl=document.getElementById('aConsultor');
  if(_aConsEl)_aConsEl.value=_vinculo;
  var _aTreinEl=document.getElementById('aTreinador');
  if(_aTreinEl){_aTreinEl.value='-';_aTreinEl.disabled=true;_aTreinEl.style.opacity='0.4';}
  // Ocultar campos que consultor não deve ver
  var _cRow=document.getElementById('addConsultorRow');
  if(_cRow)_cRow.style.display='none';
  setAddEntradaToggle(false);
  // Mudar título do modal
  var _mt=document.querySelector('#addModalOverlay .modal-title');
  if(_mt)_mt.textContent='Novo cliente';
  var _ms=document.querySelector('#addModalOverlay .modal-subtitle');
  if(_ms)_ms.textContent='Preencha os dados. O cliente será vinculado à sua conta.';
  document.getElementById('addModalOverlay').classList.add('open');
}

function openAddModal(){
  document.getElementById('aNome').value='';
  document.getElementById('aStatus').value='aberto';document.getElementById('aEntrada').value='';
  if(allConsultors.length)document.getElementById('aConsultor').value=allConsultors[0];
  // Init multi-training list
  var _lista=document.getElementById('aTreinamentosLista');
  if(_lista){_lista.innerHTML='';_addTreinRow('aTreinamentosLista');}
  var _tot=document.getElementById('aValorTotal');if(_tot)_tot.textContent='R$ 0,00';
  var _trdRow=document.getElementById('addTreinadorRow');if(_trdRow)_trdRow.style.display='none';
  if(allTrainers.length){var _trd=document.getElementById('aTreinador');if(_trd)_trd.value=allTrainers[0];}
  setAddEntradaToggle(false);document.getElementById('addModalOverlay').classList.add('open');
}
function closeAddModal(){
  document.getElementById('addModalOverlay').classList.remove('open');
  var _cRow=document.getElementById('addConsultorRow');
  if(_cRow)_cRow.style.display='';
  var _aTreinEl=document.getElementById('aTreinador');
  if(_aTreinEl){_aTreinEl.disabled=false;_aTreinEl.style.opacity='1';}
  // Resetar nome e consultor (podem ter sido fixados pelo fluxo de "adicionar treinamento")
  var _aNomeEl=document.getElementById('aNome');
  if(_aNomeEl){_aNomeEl.disabled=false;_aNomeEl.style.opacity='1';}
  var _aConsReset=document.getElementById('aConsultor');
  if(_aConsReset){_aConsReset.disabled=false;_aConsReset.style.opacity='1';}
  var _mt=document.querySelector('#addModalOverlay .modal-title');
  if(_mt)_mt.textContent='Novo cliente';
  var _ms=document.querySelector('#addModalOverlay .modal-subtitle');
  if(_ms)_ms.textContent='';
}
function saveAdd(){
  const nome=document.getElementById('aNome').value.trim();
  if(!nome){document.getElementById('aNome').focus();return;}
  // ── Regra 1: nome obrigatório com mínimo 2 palavras ──
  const _palavras=nome.trim().split(/\s+/);
  if(_palavras.length<2){
    _showToast('⚠️ Informe o nome completo (mínimo nome e sobrenome).','var(--amber)');
    document.getElementById('aNome').focus();
    return;
  }
  const nomeUp=nome.toUpperCase();
  const _consultorVal=document.getElementById('aConsultor').value;
  // ── Ler treinamentos múltiplos (opcional) ──
  var _treinRows=_getTreinRows('aTreinamentosLista');
  // ── Regra: 1 registro por cliente+consultor ──
  var _dupCliente=data.find(function(d){return d&&d.cliente&&d.cliente.toUpperCase()===nomeUp&&(d.consultor||'')===((_consultorVal)||'');});
  if(_dupCliente){
    _showToast('❌ "'+nomeUp+'" já tem registro neste consultor. Use "+" no card do cliente para adicionar treinamentos.','var(--red)');return;
  }
  // ── Gravar criadoPor ──
  var _sessA=_getSessao?_getSessao():null;
  var _criadoPor=_sessA?(_sessA.vinculo||_sessA.nome||_sessA.login||'adm'):'adm';
  var _valorTotal=_treinRows.reduce(function(a,t){return a+t.valor;},0);
  var _hasCI=_treinRows.some(function(t){return t.cod==='CI';});
  data.push({
    cliente:nomeUp,
    treinamento:_treinRows.length?_treinRows[0].cod:'-',
    treinamentos:_treinRows,
    treinador:_hasCI?document.getElementById('aTreinador').value:'-',
    consultor:_consultorVal,
    valor:_valorTotal,
    status:document.getElementById('aStatus').value,
    entrada:addEntradaRealizada?parseVal(document.getElementById('aEntrada').value):0,
    criadoPor:_criadoPor,
    presenca:'pendente',
    presencaLog:[]
  });
  closeAddModal();markUnsaved();saveStorage();renderAll();renderConsultor();renderTreinador();renderProduto();
  // Se estava no detalhe de um consultor, reabrir o detalhe ao invés de voltar ao grid
  if(window._consultorAtivo&&document.getElementById('consultorDetail')&&document.getElementById('consultorDetail').style.display!=='none'){
    _renderConsultorDetail(window._consultorAtivo);
  } else if(window._consultorAtivo){
    openConsultorDetail(window._consultorAtivo);
  }
}

/* ═══════════════════════════════════════════
   INFO CLIENTE
═══════════════════════════════════════════ */
let _ciIdx=null;
function openClientInfo(idx){
  _ciIdx=idx;
  const d=data[idx];
  document.getElementById('clientInfoSub').textContent=d.cliente+' · '+d.treinador+' · '+d.consultor;
  document.getElementById('clientInfoText').value=d.info||'';
  var _sessCI=_getSessao?_getSessao():null;
  var _perfilCI=_sessCI?_sessCI.perfil:'adm';
  var _soLeitura=_perfilCI==='consultor';
  var _isAdmCI=_perfilCI==='adm';
  var ta=document.getElementById('clientInfoText');
  ta.readOnly=_soLeitura;
  ta.style.opacity=_soLeitura?'0.7':'1';
  ta.style.cursor=_soLeitura?'default':'auto';
  var btnSalvar=document.querySelector('#clientInfoOverlay .modal-save');
  var btnLimpar=document.querySelector('#clientInfoOverlay .modal-del');
  if(btnSalvar) btnSalvar.style.display=_soLeitura?'none':'';
  if(btnLimpar) btnLimpar.style.display=_soLeitura?'none':'';
  // Campo nome: só ADM pode editar
  var campoNome=document.getElementById('clientInfoNomeCampo');
  var inpNome=document.getElementById('clientInfoNome');
  if(campoNome) campoNome.style.display=_isAdmCI?'':'none';
  if(inpNome) inpNome.value=d.cliente||'';
  document.getElementById('clientInfoOverlay').classList.add('open');
}
function closeClientInfo(){document.getElementById('clientInfoOverlay').classList.remove('open');_ciIdx=null;}
function saveClientInfo(){
  if(_ciIdx===null)return;
  data[_ciIdx].info=document.getElementById('clientInfoText').value.trim();
  var inpNome=document.getElementById('clientInfoNome');
  if(inpNome&&document.getElementById('clientInfoNomeCampo').style.display!=='none'){
    var novoNome=inpNome.value.trim().toUpperCase();
    if(novoNome) data[_ciIdx].cliente=novoNome;
  }
  closeClientInfo();markUnsaved();saveStorage();renderAll();renderConsultor();renderTreinador();
}
function clearClientInfo(){if(_ciIdx===null)return;data[_ciIdx].info='';closeClientInfo();markUnsaved();saveStorage();renderAll();}

/* ═══════════════════════════════════════════
   TÍTULO / INFO / PERÍODO
═══════════════════════════════════════════ */
function openTitleModal(){document.getElementById('titleInput').value=document.getElementById('dashTitle').textContent;document.getElementById('titleModalOverlay').classList.add('open');}
function closeTitleModal(){document.getElementById('titleModalOverlay').classList.remove('open');}
function saveTitleModal(){document.getElementById('dashTitle').textContent=document.getElementById('titleInput').value.trim()||"CI'S POR RESPONSÁVEL";closeTitleModal();markUnsaved('titulo');saveStorage();}
function openPeriodModal(){document.getElementById('periodStart').value=_periodStart;document.getElementById('periodEnd').value=_periodEnd;document.getElementById('periodModalOverlay').classList.add('open');}
function closePeriodModal(){document.getElementById('periodModalOverlay').classList.remove('open');}
function savePeriodModal(){
  const s=document.getElementById('periodStart').value,e=document.getElementById('periodEnd').value;
  _periodStart=s;_periodEnd=e;
  if(s&&e)_periodText=formatDate(s)+'  →  '+formatDate(e);
  else if(s)_periodText='A partir de '+formatDate(s);
  else if(e)_periodText='Até '+formatDate(e);
  else _periodText='';
  document.getElementById('periodBarText').textContent=_periodText;
  document.getElementById('periodBarInner').style.display=_periodText?'flex':'none';
  closePeriodModal();markUnsaved('period');saveStorage();
}
function clearPeriod(){_periodStart='';_periodEnd='';_periodText='';document.getElementById('periodStart').value='';document.getElementById('periodEnd').value='';document.getElementById('periodBarText').textContent='';document.getElementById('periodBarInner').style.display='none';closePeriodModal();markUnsaved('period');saveStorage();}
function openInfoModal(){document.getElementById('infoInput').value=document.getElementById('infoBarText').textContent;document.getElementById('infoModalOverlay').classList.add('open');}
function closeInfoModal(){document.getElementById('infoModalOverlay').classList.remove('open');}
function saveInfoModal(){const info=document.getElementById('infoInput').value.trim();document.getElementById('infoBarText').textContent=info;document.getElementById('infoBar').style.display=info?'block':'none';closeInfoModal();markUnsaved('info');saveStorage();}

/* ═══════════════════════════════════════════
   FOGO CANVAS
═══════════════════════════════════════════ */
window._fireRAF=null;window._particles=[];window._fireStartPct=66;window._fireEndPct=100;
function startFireCanvas(sp,ep){window._fireStartPct=sp;window._fireEndPct=ep;if(window._fireRAF)return;_animateFire();}
function stopFireCanvas(){if(window._fireRAF){cancelAnimationFrame(window._fireRAF);window._fireRAF=null;}window._particles=[];const cv=document.getElementById('fireCanvas');if(cv){const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);}}
function _animateFire(){
  const cv=document.getElementById('fireCanvas');if(!cv){window._fireRAF=null;return;}
  const pw=cv.parentElement?cv.parentElement.getBoundingClientRect().width:800;
  cv.width=pw;cv.height=65;const ctx=cv.getContext('2d');ctx.clearRect(0,0,pw,65);
  const zone=pw*(window._fireEndPct/100-window._fireStartPct/100),startX=pw*(window._fireStartPct/100);
  for(let i=0;i<Math.max(1,Math.round(zone/6));i++){window._particles.push({x:startX+Math.random()*zone,y:65,vy:-(0.6+Math.random()*1.4),vx:(Math.random()-.5)*.6,size:0.8+Math.random()*4.2,life:1,decay:0.030+Math.random()*0.020});}
  window._particles=window._particles.filter(p=>p.life>0);
  window._particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=p.decay;const a=p.life,r=Math.floor(255*Math.min(1,a*2)),g=Math.floor(180*Math.max(0,a-.3)),grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);grad.addColorStop(0,`rgba(255,255,${Math.floor(200*a)},${a})`);grad.addColorStop(.4,`rgba(${r},${g},0,${a*.8})`);grad.addColorStop(1,'rgba(255,50,0,0)');ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();});
  if(window._particles.length>500)window._particles=window._particles.slice(-500);
  window._fireRAF=requestAnimationFrame(_animateFire);
}



