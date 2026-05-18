/* ════════════════════════════════════════════════════════════════
   THEME PICKER — 30 temas via classe no <body>
   - Default = SEM tema (CSS original do projeto vigora)
   - Aplica apenas quando o usuário escolhe explicitamente
   - Persiste em localStorage (chave selected_theme_v2)
   - Suporta múltiplos pickers na mesma página (id passado no toggle)
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var CINEMATIC = [
    { n:'c01', name:'Rain on Glass',     bg:'#050810', accent:'#5ed0ff' },
    { n:'c02', name:'Snow Fall',         bg:'#0a0e1a', accent:'#ffffff' },
    { n:'c03', name:'Aurora Cinema',     bg:'#020a18', accent:'#7fffd4' },
    { n:'c04', name:'Ocean Waves',       bg:'#001830', accent:'#5ed0ff' },
    { n:'c05', name:'Fire Embers',       bg:'#080302', accent:'#ffaf50' },
    { n:'c06', name:'City Lights',       bg:'#04081a', accent:'#ffd060' },
    { n:'c07', name:'Galaxy Spin',       bg:'#04021a', accent:'#c890ff' },
    { n:'c08', name:'Sunset Beach',      bg:'#1a0510', accent:'#ffaa50' },
    { n:'c09', name:'Forest Mist',       bg:'#02080a', accent:'#8ad070' },
    { n:'c10', name:'Volcanic Heat',     bg:'#080202', accent:'#ff5030' },
    { n:'c11', name:'Northern Lights',   bg:'#020812', accent:'#5fffaa' },
    { n:'c12', name:'Underwater',        bg:'#001020', accent:'#5be8ff' },
    { n:'c13', name:'Desert Heat',       bg:'#2a1a10', accent:'#ffc880' },
    { n:'c14', name:'Lightning Storm',   bg:'#020208', accent:'#a8c8ff' },
    { n:'c15', name:'Cherry Blossom',    bg:'#1a0815', accent:'#ff9ad4' },
    { n:'c16', name:'Steam Punk',        bg:'#1a0e08', accent:'#b88a4a' },
    { n:'c17', name:'Neon Rain',         bg:'#080018', accent:'#ff64c8' },
    { n:'c18', name:'Wheat Field',       bg:'#1a1408', accent:'#e8c870' },
    { n:'c19', name:'Lava Flow',         bg:'#1a0500', accent:'#ff7020' },
    { n:'c20', name:'Time Tunnel',       bg:'#020208', accent:'#7090ff' }
  ];

  var MATERIAL = [
    { n:'m01', name:'Lifted Paper',      bg:'#f0f0f0', accent:'#2a5b8f' },
    { n:'m02', name:'Tilted Glass',      bg:'#0a0a1a', accent:'#7fffd4' },
    { n:'m03', name:'Metallic Plate',    bg:'#1a1d22', accent:'#a8c0d4' },
    { n:'m04', name:'Floating Cards',    bg:'#0a0e1a', accent:'#c8f05a' },
    { n:'m05', name:'Wood Polished',     bg:'#2a1810', accent:'#d4a060' },
    { n:'m06', name:'Marble Luxury',     bg:'#f5f0ea', accent:'#1a1a1a' },
    { n:'m07', name:'Brushed Steel',     bg:'#0e1218', accent:'#5ba8e8' },
    { n:'m08', name:'Carbon 3D',         bg:'#0a0a0a', accent:'#ff3838' },
    { n:'m09', name:'Velvet 3D',         bg:'#1a0a2e', accent:'#f0d68a' },
    { n:'m10', name:'Acrylic Pane',      bg:'#e8eef4', accent:'#4a90e2' },
    { n:'m11', name:'Gold Plate',        bg:'#0a0500', accent:'#ffd060' },
    { n:'m12', name:'Silver Foil',       bg:'#1a1a1f', accent:'#d8d8e0' },
    { n:'m13', name:'Concrete Brutalist',bg:'#3a3a38', accent:'#ffd060' },
    { n:'m14', name:'Glass Panes',       bg:'#080a18', accent:'#a8c8ff' },
    { n:'m15', name:'Origami Paper',     bg:'#f8f5ea', accent:'#b85c20' },
    { n:'m16', name:'Crystal Cut',       bg:'#0a0a18', accent:'#a8e0ff' },
    { n:'m17', name:'Liquid Mercury',    bg:'#1a1c20', accent:'#e0e8f0' },
    { n:'m18', name:'Glow Sticks',       bg:'#080018', accent:'#80ff60' },
    { n:'m19', name:'Embossed Leather',  bg:'#2a1810', accent:'#d8a868' },
    { n:'m20', name:'Holographic Foil',  bg:'#0a0a18', accent:'#ffffff' }
  ];

  var GLASS = [
    { n:'g01', name:'Light Pure',        bg:'#e8eef4', accent:'#4a90e2' },
    { n:'g02', name:'Dark Pure',         bg:'#0a0e1a', accent:'#a8c8ff' },
    { n:'g03', name:'Ocean Glass',       bg:'#001830', accent:'#5ed0ff' },
    { n:'g04', name:'Forest Glass',      bg:'#0a1810', accent:'#7fe070' },
    { n:'g05', name:'Sunset Glass',      bg:'#1a0d0a', accent:'#ff8a5b' },
    { n:'g06', name:'Rose Glass',        bg:'#f8e6ec', accent:'#c04880' },
    { n:'g07', name:'Violet Glass',      bg:'#150825', accent:'#b890ff' },
    { n:'g08', name:'Mint Glass',        bg:'#f0faf5', accent:'#0a8a5a' },
    { n:'g09', name:'Gold Glass',        bg:'#1a0e00', accent:'#ffd060' },
    { n:'g10', name:'Silver Glass',      bg:'#1a1d22', accent:'#d8e0e8' },
    { n:'g11', name:'Crimson Glass',     bg:'#180404', accent:'#ff5060' },
    { n:'g12', name:'Indigo Glass',      bg:'#02021a', accent:'#7890ff' },
    { n:'g13', name:'Coral Glass',       bg:'#0e1822', accent:'#ff7890' },
    { n:'g14', name:'Champagne Glass',   bg:'#f5ead0', accent:'#b8862c' },
    { n:'g15', name:'Lavender Glass',    bg:'#e8e0f4', accent:'#7848d4' },
    { n:'g16', name:'Smoke Glass',       bg:'#1a1a1f', accent:'#b8b8c8' },
    { n:'g17', name:'Crystal Refraction',bg:'#0a0a18', accent:'#a8e0ff' },
    { n:'g18', name:'Frosted Rainbow',   bg:'#f0f4f8', accent:'#a060e0' },
    { n:'g19', name:'Etched Glass',      bg:'#10181f', accent:'#88c0e0' },
    { n:'g20', name:'Stained Glass',     bg:'#0a0518', accent:'#ff8060' }
  ];

  var GLITCH = [
    { n:'x01', name:'Matrix Cascade',    bg:'#000000', accent:'#00ff88' },
    { n:'x02', name:'Neon Tokyo',        bg:'#050015', accent:'#00ffff' },
    { n:'x03', name:'VHS Static',        bg:'#0a0a0a', accent:'#ff60c0' },
    { n:'x04', name:'Hologram',          bg:'#020812', accent:'#00ffff' },
    { n:'x05', name:'Glitch Red',        bg:'#100000', accent:'#ff0000' },
    { n:'x06', name:'Cyberdeck Green',   bg:'#000800', accent:'#00cc88' },
    { n:'x07', name:'Synthwave Pink',    bg:'#150525', accent:'#ff60c8' },
    { n:'x08', name:'Plasma Cyber',      bg:'#050510', accent:'#ffffff' },
    { n:'x09', name:'Hacker Black',      bg:'#000000', accent:'#ffffff' },
    { n:'x10', name:'Chromatic Split',   bg:'#0a0a18', accent:'#ffffff' },
    { n:'x11', name:'Glitch Magenta',    bg:'#100018', accent:'#ff00cc' },
    { n:'x12', name:'Digital Rain',      bg:'#000800', accent:'#00ff88' },
    { n:'x13', name:'Distorted Cyan',    bg:'#001818', accent:'#00ffff' },
    { n:'x14', name:'Static Snow',       bg:'#0a0a0a', accent:'#ffffff' },
    { n:'x15', name:'Cyber Neon',        bg:'#000018', accent:'#00ffff' },
    { n:'x16', name:'ASCII Art',         bg:'#000000', accent:'#00ff88' },
    { n:'x17', name:'Pixel Static',      bg:'#0a0a18', accent:'#ff60c0' },
    { n:'x18', name:'Datamosh',          bg:'#101010', accent:'#ffff00' },
    { n:'x19', name:'Holographic Glitch',bg:'#0a0a18', accent:'#ffffff' },
    { n:'x20', name:'System Error',      bg:'#100000', accent:'#ff0000' }
  ];

  var PREMIUM = [
    { n:'p01', name:'★ Obsidian Gold',    bg:'#000000', accent:'#d4af37' },
    { n:'p02', name:'★ Aurora Dynamics',  bg:'#020a18', accent:'#7fffd4' },
    { n:'p03', name:'★ Cyber Tokyo',      bg:'#050015', accent:'#00dcff' },
    { n:'p04', name:'★ Velvet Royale',    bg:'#1a0a2e', accent:'#f0d68a' },
    { n:'p05', name:'★ Crystal Ice',      bg:'#dde8f4', accent:'#2a5b8f' },
    { n:'p06', name:'★ Inferno Ember',    bg:'#080302', accent:'#ffaf50' },
    { n:'p07', name:'★ Emerald Lux',      bg:'#02100c', accent:'#d4af37' },
    { n:'p08', name:'★ Cosmic Nebula',    bg:'#04021a', accent:'#c890ff' },
    { n:'p09', name:'★ Synthwave Grid',   bg:'#1a0540', accent:'#ff80c8' },
    { n:'p10', name:'★ Champagne Elite',  bg:'#f5ead0', accent:'#b8862c' },
    { n:'p11', name:'★ Holographic Prism',bg:'#0a0a18', accent:'#64c8ff' },
    { n:'p12', name:'★ Carbon Fiber',     bg:'#0a0a0a', accent:'#ff3838' },
    { n:'p13', name:'★ Forest Mystic',    bg:'#02080a', accent:'#e8c870' },
    { n:'p14', name:'★ Sakura Blossom',   bg:'#f8e6ec', accent:'#c04880' },
    { n:'p15', name:'★ Royal Indigo',     bg:'#02021a', accent:'#7890ff' },
    { n:'p16', name:'★ Steel Brushed',    bg:'#0e1218', accent:'#5ba8e8' },
    { n:'p17', name:'★ Coral Tropical',   bg:'#0e1822', accent:'#ff7890' },
    { n:'p18', name:'★ Plasma Storm',     bg:'#050510', accent:'#ffffff' },
    { n:'p19', name:'★ Frosted Lavender', bg:'#e8e0f4', accent:'#7848d4' },
    { n:'p20', name:'★ Sandstone Mirage', bg:'#1a0e08', accent:'#da8a54' },
    { n:'p21', name:'★ Arctic Aurora',    bg:'#040c14', accent:'#a0f0e0' },
    { n:'p22', name:'★ Matrix Code',      bg:'#000800', accent:'#00ff80' },
    { n:'p23', name:'★ Vintage Sepia',    bg:'#f0e3c8', accent:'#a86838' },
    { n:'p24', name:'★ Neon Pink Dream',  bg:'#1a0220', accent:'#ff64c8' },
    { n:'p25', name:'★ Brutalist Concrete',bg:'#111111', accent:'#ffffff' },
    { n:'p26', name:'★ Mint Frost',       bg:'#f0faf5', accent:'#0a8a5a' },
    { n:'p27', name:'★ Rose Champagne',   bg:'#f8e8e0', accent:'#b85c44' },
    { n:'p28', name:'★ Twilight Magic',   bg:'#0a0218', accent:'#ffaa50' },
    { n:'p29', name:'★ Charcoal Smoke',   bg:'#0e0e0e', accent:'#ffffff' },
    { n:'p30', name:'★ Diamond Crystal',  bg:'#e8f0f8', accent:'#4a90e2' }
  ];

  var THEMES = [
    { n:'01', name:'Midnight Glass',   bg:'#0a0e1a', accent:'#c8f05a' },
    { n:'02', name:'Aurora Boreal',    bg:'#02141a', accent:'#7fffd4' },
    { n:'03', name:'Sunset Lounge',    bg:'#1a0d0a', accent:'#ff8a5b' },
    { n:'04', name:'Cyber Tokyo',      bg:'#050015', accent:'#00dcff' },
    { n:'05', name:'Iceberg',          bg:'#dde8f4', accent:'#2a5b8f' },
    { n:'06', name:'Brutalist Mono',   bg:'#111111', accent:'#ffffff' },
    { n:'07', name:'Velvet Royale',    bg:'#1a0a2e', accent:'#f0d68a' },
    { n:'08', name:'Emerald Lux',      bg:'#04201a', accent:'#d4af37' },
    { n:'09', name:'Steel Industrial', bg:'#1a1f26', accent:'#5ba8e8' },
    { n:'10', name:'Sakura Mist',      bg:'#f8e6ec', accent:'#c04880' },
    { n:'11', name:'Carbon Fiber',     bg:'#0a0a0a', accent:'#ff3838' },
    { n:'12', name:'Ocean Depths',     bg:'#001830', accent:'#5ed0ff' },
    { n:'13', name:'Volcanic Ember',   bg:'#190a05', accent:'#ffaf50' },
    { n:'14', name:'Frosted Lavender', bg:'#e8e0f4', accent:'#7848d4' },
    { n:'15', name:'Holographic',      bg:'#0a0a18', accent:'#64c8ff' },
    { n:'16', name:'Matrix Rain',      bg:'#001a08', accent:'#00ff80' },
    { n:'17', name:'Vintage Paper',    bg:'#f0e3c8', accent:'#a86838' },
    { n:'18', name:'Neon Dreams',      bg:'#1a0220', accent:'#ff64c8' },
    { n:'19', name:'Mint Cream',       bg:'#f0faf5', accent:'#0a8a5a' },
    { n:'20', name:'Obsidian Gold',    bg:'#000000', accent:'#d4af37' },
    { n:'21', name:'Plasma TV',        bg:'#050510', accent:'#ffffff' },
    { n:'22', name:'Sandstone',        bg:'#3a1f10', accent:'#da8a54' },
    { n:'23', name:'Arctic Mint',      bg:'#082030', accent:'#a0f0e0' },
    { n:'24', name:'Royal Indigo',     bg:'#0a0a3a', accent:'#7890ff' },
    { n:'25', name:'Coral Reef',       bg:'#022a30', accent:'#ff7890' },
    { n:'26', name:'Charcoal',         bg:'#1a1a1a', accent:'#ffffff' },
    { n:'27', name:'Synthwave',        bg:'#2a0850', accent:'#ff80c8' },
    { n:'28', name:'Forest Canopy',    bg:'#0a1810', accent:'#e8c870' },
    { n:'29', name:'Rose Gold',        bg:'#f8e8e0', accent:'#b85c44' },
    { n:'30', name:'Cosmic Nebula',    bg:'#0e0830', accent:'#c890ff' }
  ];

  var LS_KEY = 'selected_theme_v2';
  // ID do picker atualmente aberto (suporta múltiplos pickers na página)
  var _pickerAberto = null;

  function _removerClasse(){
    var classes = document.body.className.split(/\s+/).filter(function(c){
      return c && c.indexOf('theme-') !== 0;
    });
    document.body.className = classes.join(' ');
  }

  function _aplicarTema(num){
    _removerClasse();
    if(num){
      document.body.classList.add('theme-' + num);
      try { localStorage.setItem(LS_KEY, num); } catch(e){}
    } else {
      // num = null → voltar ao tema original (sem classe)
      try { localStorage.removeItem(LS_KEY); } catch(e){}
    }
  }

  function _temaAtual(){
    try { return localStorage.getItem(LS_KEY) || null; } catch(e){ return null; }
  }

  // NÃO aplica default — só renderiza se já houver tema salvo
  // (a aplicação no boot é feita pelo script inline no <head>)

  // ───────────────────────────────────────────────────────
  // POPOVER do picker — aceita id do picker (suporta múltiplos)
  // ───────────────────────────────────────────────────────
  window._themePickerToggle = function(ev, pickerId){
    if(ev){ ev.stopPropagation(); }
    pickerId = pickerId || 'themePicker';
    var picker = document.getElementById(pickerId);
    if(!picker) return;
    var abrindo = !picker.classList.contains('open');
    // Fecha qualquer outro picker aberto
    document.querySelectorAll('.theme-picker.open').forEach(function(p){
      if(p !== picker) p.classList.remove('open');
    });
    picker.classList.toggle('open', abrindo);
    _pickerAberto = abrindo ? pickerId : null;
    if(abrindo) _renderPicker(pickerId);
  };

  window._themeSelect = function(num){
    _aplicarTema(num);
    // Re-renderiza qualquer picker aberto
    document.querySelectorAll('.theme-picker.open').forEach(function(p){
      _renderPicker(p.id);
    });
  };

  function _renderPicker(pickerId){
    var pop = document.querySelector('#'+pickerId+' .theme-picker-pop');
    if(!pop) return;
    var atual = _temaAtual();
    var html = '';

    // PADRÃO no topo
    var ativoPadrao = (!atual) ? ' active' : '';
    html += '<div class="theme-picker-head">🎨 Tema</div>'
         +  '<div class="theme-picker-grid">'
         +    '<div class="theme-swatch theme-swatch-default'+ativoPadrao+'" onclick="_themeSelect(null)" title="Tema original (sem modificação)">'
         +      '<div class="theme-swatch-bg" style="background:linear-gradient(135deg,#1a1a1a,#0f0f0f);"></div>'
         +      '<div class="theme-swatch-num">—</div>'
         +      '<div class="theme-swatch-name">Padrão</div>'
         +      '<div class="theme-swatch-accent" style="background:#c8f05a;"></div>'
         +    '</div>'
         +  '</div>';

    // Helper para renderizar uma categoria
    function _renderCat(label, list, color){
      var h = '<div class="theme-picker-head" style="margin-top:14px;'+(color?'color:'+color+';':'')+'">'+label+'</div>'
            + '<div class="theme-picker-grid">';
      list.forEach(function(t){
        var ativo = (t.n === atual) ? ' active' : '';
        h += '<div class="theme-swatch theme-swatch-premium'+ativo+'" onclick="_themeSelect(\''+t.n+'\')" title="'+t.name+'">'
          +   '<div class="theme-swatch-bg" style="background:radial-gradient(circle at 30% 20%,'+t.accent+'30,transparent 60%),'+t.bg+';"></div>'
          +   '<div class="theme-swatch-num">'+t.n.toUpperCase()+'</div>'
          +   '<div class="theme-swatch-name">'+t.name+'</div>'
          +   '<div class="theme-swatch-accent" style="background:'+t.accent+';box-shadow:0 0 12px '+t.accent+';"></div>'
          + '</div>';
      });
      h += '</div>';
      return h;
    }

    // ★★ CINEMATIC
    html += _renderCat('★★ Cinematic (animados)', CINEMATIC, '#5ed0ff');
    // ★★ MATERIAL 3D
    html += _renderCat('★★ Material 3D (depth + tilt)', MATERIAL, '#c8f05a');
    // ★★ GLASSMORPHISM PRO
    html += _renderCat('★★ Glassmorphism Pro', GLASS, '#a8c8ff');
    // ★ GLITCH
    html += _renderCat('★ Glitch / Cyberpunk', GLITCH, '#ff60c0');
    // ★ PREMIUM (originais)
    html += _renderCat('★ Premium (com efeitos)', PREMIUM, '#d4af37');

    // LITE (só paleta)
    html += '<div class="theme-picker-head" style="margin-top:14px;">Lite (só cores)</div>'
         +  '<div class="theme-picker-grid">';
    THEMES.forEach(function(t){
      var ativo = (t.n === atual) ? ' active' : '';
      html += '<div class="theme-swatch'+ativo+'" onclick="_themeSelect(\''+t.n+'\')" title="'+t.name+'">'
            +   '<div class="theme-swatch-bg" style="background:'+t.bg+';"></div>'
            +   '<div class="theme-swatch-num">'+t.n+'</div>'
            +   '<div class="theme-swatch-name">'+t.name+'</div>'
            +   '<div class="theme-swatch-accent" style="background:'+t.accent+';"></div>'
            + '</div>';
    });
    html += '</div>';

    pop.innerHTML = html;
  }

  // Fecha clicando fora
  document.addEventListener('click', function(ev){
    document.querySelectorAll('.theme-picker.open').forEach(function(picker){
      if(!picker.contains(ev.target)) picker.classList.remove('open');
    });
  });
  document.addEventListener('keydown', function(ev){
    if(ev.key === 'Escape'){
      document.querySelectorAll('.theme-picker.open').forEach(function(p){
        p.classList.remove('open');
      });
    }
  });
})();
