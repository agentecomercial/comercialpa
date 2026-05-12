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

