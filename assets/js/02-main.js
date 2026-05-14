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
  var _metaMob=document.getElementById('turmaMetaLabelMobile'); if(_metaMob) _metaMob.textContent=formatVal(META);
  document.getElementById('metaValLabel').textContent=formatVal(META);
  _mostrarTela('dashboard');
  // P1: botão ← Turmas visível para ADM e para consultor em desktop
  var _sessBtn=_getSessao?_getSessao():null;
  var _perfilBtn=_sessBtn?_sessBtn.perfil:'adm';
  var _bvt=document.getElementById('btnVoltarTurmas');
  var _isConsDesk=(typeof window._eConsultorDesktop==='function')&&window._eConsultorDesktop();
  if(_bvt) _bvt.style.display=(_perfilBtn==='adm'||_isConsDesk)?'':'none';

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
    op.catch(function(e){ window._err && window._err('voltarTurmas: salvar dados', e); });
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
  // Sincronizar selects mobile — refletem APENAS o estado global atual
  const tSel=document.getElementById('filtroTreinadorSel');
  if(tSel){
    tSel.innerHTML='<option value="">Treinador ▾</option>'+allTrainers.map(function(t){return '<option value="'+t+'">'+t+'</option>';}).join('');
    tSel.value=activeTrainer||'';
    tSel.classList.toggle('ativo',!!activeTrainer);
  }
  const cSel=document.getElementById('filtroConsultorSel');
  if(cSel){
    cSel.innerHTML='<option value="">Consultor ▾</option>'+allConsultors.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
    cSel.value=activeConsultor||'';
    cSel.classList.toggle('ativo',!!activeConsultor);
  }
  const pSel=document.getElementById('filtroPresencaSel');
  if(pSel && typeof window._getFiltroPresenca==='function'){
    pSel.value=window._getFiltroPresenca()||'';
    pSel.classList.toggle('ativo',!!pSel.value);
  }
}
function toggleTrainer(t){activeTrainer=activeTrainer===t?null:t;renderAll();}
function toggleConsultor(c){activeConsultor=activeConsultor===c?null:c;renderAll();}
window._filtroMobTrainer=function(v){activeTrainer=v||null;renderAll();};
window._filtroMobConsultor=function(v){activeConsultor=v||null;renderAll();};
window._filtroMobPresenca=function(v){
  /* _setFiltroPresenca faz toggle (mesmo valor zera). Para set direto, garantimos que o
     valor atual seja diferente antes de chamar. */
  if(typeof window._setFiltroPresenca!=='function') return;
  var atual=typeof window._getFiltroPresenca==='function'?window._getFiltroPresenca():null;
  if(!v){
    /* user escolheu "Presença ▾" — limpar */
    if(atual) window._setFiltroPresenca(atual); /* toggle off */
    return;
  }
  if(atual===v) return; /* já está */
  if(atual) window._setFiltroPresenca(atual); /* limpa primeiro */
  window._setFiltroPresenca(v);
};
function setStatus(s){activeStatus=s;renderAll();}
function setStatusDropdown(v){activeStatus=v||null;renderAll();}
function clearAll(){
  activeTrainer=null;activeConsultor=null;activeStatus=null;activeCliente=null;
  var _sf=document.getElementById('statusFilter');if(_sf)_sf.value='';
  /* Limpar filtro de presença (estado global no módulo 17-presenca) */
  if(typeof window._getFiltroPresenca==='function' && typeof window._setFiltroPresenca==='function'){
    var _pAtual=window._getFiltroPresenca();
    if(_pAtual) window._setFiltroPresenca(_pAtual); /* toggle off */
  }
  /* Resetar visualmente os selects mobile */
  ['filtroTreinadorSel','filtroConsultorSel','filtroPresencaSel'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){el.value='';el.classList.remove('ativo');}
  });
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
  ['fcAll','fcAberto','fcPago','fcEntrada','fcNegociacao'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const aid=s===null?'fcAll':s==='aberto'?'fcAberto':s==='pago'?'fcPago':s==='negociacao'?'fcNegociacao':'fcEntrada';
  const el=document.getElementById(aid);if(el)el.classList.add('active');
  if(document.getElementById('consultorDetail').style.display!=='none'&&window._consultorAtivo)_renderConsultorDetail(window._consultorAtivo);
  else renderConsultor();
}
function setTreinadorStatus(s){
  activeTreinadorStatus=s;
  ['ftAll','ftAberto','ftPago','ftEntrada','ftNegociacao'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const aid=s===null?'ftAll':s==='aberto'?'ftAberto':s==='pago'?'ftPago':s==='negociacao'?'ftNegociacao':'ftEntrada';
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

/* ── Accordion dos cards de cliente em mobile ── */
window._toggleClienteMobile=function(ri){
  var card=document.getElementById('mobcard_'+ri);
  if(!card) return;
  var open=card.classList.contains('open');
  document.querySelectorAll('.mob-card.open').forEach(function(c){ c.classList.remove('open'); });
  if(!open) card.classList.add('open');
};
window._mobToggleTreinador=function(ri){
  var card=document.getElementById('mobcard_'+ri);
  if(!card) return;
  var trein=card.querySelector('[data-campo="treinamento"]');
  var field=card.querySelector('.mob-field-treinador');
  if(trein && field){ field.style.display = trein.value==='CI' ? 'flex' : 'none'; }
};

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
  const clientesNegociacao=_base.filter(d=>d.status==='negociacao');
  const totalNegociacao=clientesNegociacao.reduce((a,d)=>a+d.valor,0);
  const clientesEntrada=_base.filter(d=>d.entrada>0);
  const totalEntradas=clientesEntrada.reduce((a,d)=>a+d.entrada,0);
  const pctGeral=Math.round((totalPago/META)*100);
  const colGeral=getCol(pctGeral);
  const ultrapassado=Math.max(totalPago-META,0);
  const faltam=Math.max(META-totalPago,0);
  const barW=Math.min(Math.round((totalPago/(META*1.5))*100),100);
  const needlePct=Math.round((META/(META*1.5))*100);

  document.getElementById('mTotal').textContent=formatVal(totalNegociacao);
  document.getElementById('mTotalSub').textContent=clientesNegociacao.length+' em negociação';
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
    ?'<tr class="empty-row"><td colspan="7" style="text-align:center;">Nenhum cliente para os filtros selecionados.</td></tr>'
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
          <span style="display:inline-flex;align-items:center;gap:6px;">${d.cliente}<button class="info-btn${hasInfo?' has-info':''}" onclick="openClientInfo(${ri})">i</button><span data-presenca-ri="${ri}">${window._presencaBadgeHtml?window._presencaBadgeHtml(ri):''}</span></span>
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
      </tr>`;
    }).join('');

  // ── Renderização de cards mobile (espelha a tabela acima) ──
  const _ccEl=document.getElementById('clientCards');
  if(_ccEl){
    if(f.length===0){
      _ccEl.innerHTML='<div class="mob-empty">Nenhum cliente para os filtros selecionados.</div>';
    } else {
      const _statusMap={pago:{c:'#39ff14',l:'Pago'},aberto:{c:'var(--amber)',l:'Aberto'},negociacao:{c:'var(--blue)',l:'Negociação'},entrada:{c:'var(--accent)',l:'Entrada'},desistiu:{c:'var(--red)',l:'Desistiu'},estorno:{c:'var(--red)',l:'Estorno'},'-':{c:'var(--muted)',l:'Sem status'}};
      _ccEl.innerHTML=f.map(d=>{
        const ri=data.indexOf(d), pago=d.status==='pago', hasInfo=!!(d.info&&d.info.trim());
        const valEdit = d.valor  ? d.valor.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})  : '';
        const entEdit = d.entrada? d.entrada.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
        const isCI = d.treinamento === 'CI';
        const treinOpts='<option value="">— vazio —</option>'+allTreinamentos.map(t=>`<option value="${t}"${(d.treinamento||'')===t?' selected':''}>${t}</option>`).join('');
        const trainOpts=`<option value="-"${(d.treinador||'-')==='-'?' selected':''}>—</option>`+allTrainers.map(t=>`<option value="${t}"${d.treinador===t?' selected':''}>${t.toUpperCase()}</option>`).join('');
        const consOpts=`<option value=""${!d.consultor?' selected':''}>—</option>`+allConsultors.map(c=>`<option value="${c}"${d.consultor===c?' selected':''}>${c.toUpperCase()}</option>`).join('');
        const statOpts=[
          {v:'aberto',l:'ABERTO'},{v:'pago',l:'PAGO'},{v:'negociacao',l:'NEGOCIAÇÃO'},
          {v:'entrada',l:'ENTRADA'},{v:'desistiu',l:'DESISTIU'},{v:'estorno',l:'ESTORNO'},{v:'-',l:'—'}
        ].map(s=>`<option value="${s.v}"${(d.status||'aberto')===s.v?' selected':''}>${s.l}</option>`).join('');
        const stInfo=_statusMap[d.status||'aberto']||_statusMap['-'];
        const ticketCor = d.valor >= 10000.01 ? 'var(--green)' : d.valor >= 5001 ? 'var(--amber)' : d.valor > 0 ? 'var(--blue)' : 'var(--muted)';
        return `<div class="mob-card${pago?' pago':''}" id="mobcard_${ri}">
          <div class="mob-header" onclick="window._toggleClienteMobile(${ri})">
            <span class="mob-arrow">▶</span>
            <div class="mob-info">
              <div class="mob-name-row">
                <span class="mob-name${pago?' pago':''}">${d.cliente}</span>
                <button class="info-btn${hasInfo?' has-info':''}" onclick="event.stopPropagation();openClientInfo(${ri})">i</button>
                <span class="mob-presenca" data-presenca-ri="${ri}">${window._presencaBadgeHtml?window._presencaBadgeHtml(ri):'<span style="color:var(--muted);font-size:10px;">—</span>'}</span>
              </div>
              <div class="mob-status" style="color:${stInfo.c};"><span class="mob-dot" style="background:${stInfo.c};"></span>${stInfo.l}</div>
            </div>
            <div class="mob-val" style="color:${pago?'#39ff14':ticketCor};">${formatVal(d.valor||0)}</div>
          </div>
          <div class="mob-body">
            <div class="mob-field"><span class="mob-field-label">Treinamento</span>
              <select class="card-sel mob-sel" data-ri="${ri}" data-campo="treinamento" onchange="cardCellChange(this);window._mobToggleTreinador(${ri});">${treinOpts}</select>
            </div>
            <div class="mob-field mob-field-treinador" style="display:${isCI?'flex':'none'};"><span class="mob-field-label">Treinador</span>
              <select class="card-sel cs-treinador mob-sel" data-ri="${ri}" data-campo="treinador" onchange="cardCellChange(this)">${trainOpts}</select>
            </div>
            <div class="mob-field"><span class="mob-field-label">Consultor</span>
              <select class="card-sel cs-consultor mob-sel" data-ri="${ri}" data-campo="consultor" onchange="cardCellChange(this)">${consOpts}</select>
            </div>
            <div class="mob-field"><span class="mob-field-label">Valor</span>
              <input type="text" inputmode="numeric" class="card-num-input mob-input" data-ri="${ri}" data-campo="valor" value="${valEdit}" oninput="cardMoneyMask(this)" onchange="cardNumChange(this)" placeholder="0,00" style="color:${pago?'#39ff14':ticketCor};font-weight:${pago?'700':'600'};">
            </div>
            <div class="mob-field"><span class="mob-field-label">Entrada</span>
              <input type="text" inputmode="numeric" class="card-num-input mob-input" data-ri="${ri}" data-campo="entrada" value="${entEdit}" oninput="cardMoneyMask(this)" onchange="cardNumChange(this)" placeholder="—" style="color:var(--blue);">
            </div>
            <div class="mob-field"><span class="mob-field-label">Status</span>
              <select class="card-sel mob-sel cs-status-${d.status||'aberto'}" data-ri="${ri}" data-campo="status" onchange="cardCellChange(this);cardUpdateStatusClass(this)">${statOpts}</select>
            </div>
          </div>
        </div>`;
      }).join('');
    }
  }

  const _totalValid=data.filter(d=>d&&d.cliente).length;
  document.getElementById('tableCount').textContent=`${f.length} de ${_totalValid} cliente${_totalValid!==1?'s':''}`;
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

