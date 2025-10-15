 // ---------- Datos (nombres canónicos)
  const CANON_NAMES = [
    "Emili Marcel Cabrera Flores",
    "Dulce Naomy Calderón Gonzalez",
    "Jennifer Estefanía Chajón Barrios",
    "Enrique Cifuentes Bauer",
    "Santiago Del Río Méndez",
    "Carlos Rafael Fernández Valdés",
    "Martin Figueroa Tavares",
    "Esteban Renato Fratta Torres",
    "María Fernanda Garcia Barrios",
    "Julian García Fernández de la Torre",
    "Andrea Michelle Lacota Martínez",
    "Maria Amalia Leclair Rodriguez",
    "Fátima Anaí López Castellanos",
    "Maria Andrea Marinelli Toruño",
    "Ana Lucía Morales Paiz",
    "Ana Lucía Muñoz Turcios",
    "Martin Leonardo Rivera Grajeda",
    "José Mariano Rodríguez Rios",
    "Ximena Santizo Murúa",
    "Isabel Siliézar Rodas",
    "Jeanne Marie Wheelock"
  ];

  // Casos de juego
  const TASKS = {
    "Decir elogio": [
      {
        si: "Elogia una acción concreta y su impacto: 'Tu explicación sobre el método hizo que todo el grupo entendiera el porqué —se nota tu claridad al dar ejemplos.'",
        no: "Foco solo en apariencia o comentario fuera de contexto: 'Qué bien te ves' en medio de una exposición técnica."
      },
      {
        si: "Destaca esfuerzo y progreso: 'Se nota que practicaste; ese avance en la resolución fue evidente.'",
        no: "Comparar negativamente con otros: 'Al menos tú sí...' (crea tensión)."
      },
      {
        si: "Relaciona con valores: 'Admiro tu persistencia al completar la tarea a pesar de las dificultades.'",
        no: "Elogio vago y excesivo sin explicación: 'Eres increíble' sin ejemplos."
      }
    ],
    "Adivinar el cumplido": [
      {
        si: "Escucha atentamente y elige si el cumplido se centra en esfuerzo, habilidad o apariencia; argumenta tu elección.",
        no: "Responder impulsivamente 'incorrecto' sin razonarlo."
      },
      {
        si: "Pide detalle si no está claro: '¿Te refieres a mi claridad o a mi estilo?'.",
        no: "Confundir el cumplido con crítica y responder a la defensiva."
      },
      {
        si: "Valora intención y contexto: identifica si el cumplido busca empoderar o solo halagar superficialmente.",
        no: "Tomarlo como una obligación de reciprocidad inmediata."
      }
    ]
  };

  // ---------- Helpers ----------
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => Array.from(root.querySelectorAll(s));

  // normaliza (quita tildes, case, espacios extra)
  function normalizar(s){
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  // Mapa normalizado
  const normalizedMap = CANON_NAMES.reduce((acc, name) => {
    acc[normalizar(name)] = name; return acc;
  }, {});

  // Hash/PRNG helpers
  function xfnv1a(str) {
    for (var i=0,h=2166136261>>>0; i<str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return function(){ h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; return (h>>>0); };
  }
  function mulberry32(a){
    return function(){
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  function seededShuffle(array, seed){
    const a = array.slice();
    const seedNum = xfnv1a(seed)();
    const rand = mulberry32(seedNum);
    for (let i=a.length-1; i>0; i--){
      const j = Math.floor(rand() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomCaseForRole(role, seed){
    const arr = role === "Decir elogio" ? TASKS["Decir elogio"] : TASKS["Adivinar el cumplido"];
    const idx = xfnv1a(seed)() % arr.length;
    return arr[idx];
  }

  // Genera emparejamientos determinísticos desde un seed
  function generatePairs(seed){
    const order = seededShuffle(CANON_NAMES, seed);

    // Agrupar en parejas, último sobrante se fusiona a trío
    const groups = [];
    for (let i=0;i<order.length;i+=2){
      if (i+1 < order.length) groups.push([order[i], order[i+1]]);
      else groups.push([order[i]]);
    }
    if (groups.length >= 2 && groups[groups.length-1].length === 1){
      const last = groups.pop()[0];
      const prev = groups.pop();
      groups.push([prev[0], prev[1], last]);
    }

    const assignments = {}; // name -> { partners, role, caseSi, caseNo, group }
    for (const group of groups){
      if (group.length === 2){
        const pickSeed = seed + group.join("|");
        const h = xfnv1a(pickSeed)();
        const rand = mulberry32(h);
        const firstIsDecir = rand() < 0.5;
        const roles = firstIsDecir ? ["Decir elogio","Adivinar el cumplido"] : ["Adivinar el cumplido","Decir elogio"];
        const caseA = randomCaseForRole(roles[0], seed + group[0]);
        const caseB = randomCaseForRole(roles[1], seed + group[1]);
        assignments[group[0]] = { partners:[group[1]], role:roles[0], caseSi:caseA.si, caseNo:caseA.no, group:group.slice() };
        assignments[group[1]] = { partners:[group[0]], role:roles[1], caseSi:caseB.si, caseNo:caseB.no, group:group.slice() };
      } else if (group.length === 3){
        const pickSeed = seed + group.join("|") + "|trio";
        const idx = xfnv1a(pickSeed)() % 3;
        for (let i=0;i<3;i++){
          const role = i === idx ? "Decir elogio" : "Adivinar el cumplido";
          const c = randomCaseForRole(role, seed + group[i]);
          assignments[group[i]] = { partners: group.filter((_,k)=>k!==i), role, caseSi:c.si, caseNo:c.no, group:group.slice() };
        }
      } else if (group.length === 1){
        const pickSeed = seed + group[0] + "|solo";
        const role = (xfnv1a(pickSeed)() % 2) === 0 ? "Decir elogio" : "Adivinar el cumplido";
        const c = randomCaseForRole(role, seed + group[0]);
        assignments[group[0]] = { partners:[], role, caseSi:c.si, caseNo:c.no, group:group.slice() };
      }
    }
    return assignments;
  }

  // ---------- DOM refs ----------
  const nameInput = qs('#nameInput');
  const seedInput = qs('#seedInput');
  const revealBtn = qs('#revealBtn');
  const generateSeedBtn = qs('#generateSeedBtn');
  const copyResultBtn = qs('#copyResultBtn');
  const statusEl = qs('#status');
  const resultArea = qs('#resultArea');

  // Seed legible
  function makeSeed(){
    const rand = Math.floor(Math.random()*1e9).toString(36);
    const time = (Date.now() % 1_000_000).toString(36);
    return seed-${time}-${rand};
  }

  async function copyToClipboard(text){
    if (navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
  }

  function setStatus(msg, kind='info'){
    statusEl.textContent = msg;
    statusEl.className = 'status show';
    statusEl.style.borderColor = kind==='error'? '#5e2234' : (kind==='warn'? '#584520' : '#222859');
    statusEl.style.background = kind==='error'? '#1a0f18' : (kind==='warn'? '#1a170f' : '#101431');
  }

  function diceAnimate(el, ms=900){
    return new Promise(resolve => {
      const frames = ['🎲','⚀','⚁','⚂','⚃','⚄','⚅'];
      let t = 0; const iv = setInterval(()=>{
        el.textContent = frames[Math.floor(Math.random()*frames.length)];
        el.style.transform = rotate(${(Math.random()-0.5)*30}deg) scale(${1 + Math.random()*0.07});
        if ((t+=80) >= ms){ clearInterval(iv); el.style.transform = 'rotate(0) scale(1)'; resolve(); }
      }, 80);
    })
  }

  function roleIcon(role){
    return role === 'Decir elogio' ? '🗣' : '🧩';
  }

  function renderResult(name, info){
    resultArea.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'result-card';

    const left = document.createElement('div');
    left.className = 'result-left';

    const right = document.createElement('div');

    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = name;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = <span class="role-badge"><span class="icon">${roleIcon(info.role)}</span>${info.role}</span>;

    const dice = document.createElement('div');
    dice.className = 'dice';
    dice.textContent = '🎲';

    left.appendChild(nameEl);
    left.appendChild(meta);
    left.appendChild(dice);

    const partners = document.createElement('div');
    partners.className = 'meta'; partners.style.marginTop = '8px';
    if (!info.partners.length){
      partners.textContent = 'No tienes pareja asignada (caso único).';
    } else {
      const label = info.group.length===3 ? '<strong>Pareja(s) (trío):</strong>' : '<strong>Pareja(s):</strong>';
      partners.innerHTML = ${label} ${info.partners.join(' — ')};
    }

    const caseSi = document.createElement('div');
    caseSi.className = 'case';
    caseSi.innerHTML = <b>Cómo sí</b><div>${info.caseSi}</div>;

    const caseNo = document.createElement('div');
    caseNo.className = 'case'; caseNo.style.marginTop = '8px';
    caseNo.innerHTML = <b>Cómo no</b><div>${info.caseNo}</div>;

    right.appendChild(partners);
    right.appendChild(caseSi);
    right.appendChild(caseNo);

    card.appendChild(left);
    card.appendChild(right);
    resultArea.appendChild(card);

    // enable copy
    copyResultBtn.disabled = false;
    copyResultBtn.onclick = async ()=>{
      const partnersTxt = info.partners.length ? info.partners.join(', ') : '—';
      const groupTxt = info.group.length===3 ? ' (trío)' : '';
      const text = [
        Nombre: ${name},
        Rol: ${info.role},
        Pareja(s)${groupTxt}: ${partnersTxt},
        Cómo sí: ${info.caseSi},
        Cómo no: ${info.caseNo}
      ].join('\n');
      await copyToClipboard(text);
      setStatus('Resultado copiado al portapapeles ✅');
    }

    // animate dice
    diceAnimate(dice);
  }

  function proceedReveal(canonicalName, seed){
    let s = seed && seed.trim();
    if (!s){
      setStatus('Advertencia: No pegaste un seed. Se generará una asignación local que NO coincide con otros dispositivos. Pide el seed al profesor.', 'warn');
      s = 'local-default';
    } else {
      setStatus('Seed recibido. Generando tu pareja y rol…');
    }

    const assignments = generatePairs(s);
    if (!assignments[canonicalName]){
      setStatus('Error: tu nombre no aparece en la lista generada con este seed.', 'error');
      return;
    }
    renderResult(canonicalName, assignments[canonicalName]);
    try{ localStorage.setItem('lastSeedUsed', s); localStorage.setItem('lastNameUsed', canonicalName); }catch(e){}
  }

  // ---------- Events ----------
  revealBtn.addEventListener('click', ()=>{
    const rawName = nameInput.value || '';
    const rawSeed = (seedInput.value || '').trim();
    setStatus('', 'info'); statusEl.classList.remove('show');
    resultArea.innerHTML = '';

    if (!rawName.trim()){
      setStatus('Ingresa tu nombre completo.', 'error');
      nameInput.focus();
      return;
    }
    const n = normalizar(rawName);
    if (!normalizedMap[n]){
      // Fuzzy: buscar inclusión recíproca si el fragmento es largo
      let foundKey = null;
      if (n.length >= 5){
        foundKey = Object.keys(normalizedMap).find(k => k.includes(n) || n.includes(k));
      }
      if (foundKey){
        proceedReveal(normalizedMap[foundKey], rawSeed || null);
      } else {
        setStatus('Nombre no reconocido. Asegúrate de escribir el nombre completo (sin tildes ni mayúsculas necesarias).', 'error');
      }
      return;
    }
    proceedReveal(normalizedMap[n], rawSeed || null);
  });

  // Enter para revelar
  [nameInput, seedInput].forEach(el=>{
    el.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') revealBtn.click();
    })
  })

  // Generar/copiar seed
  generateSeedBtn.addEventListener('click', async ()=>{
    const s = makeSeed();
    try{
      await copyToClipboard(s);
      setStatus(Seed generado y copiado: ${s} — compártelo con la clase.);
      seedInput.value = s;
      // Escribir en la URL para compartir fácilmente
      const url = new URL(location.href); url.searchParams.set('seed', s); history.replaceState({}, '', url);
    }catch{
      setStatus(Seed: ${s} (cópialo manualmente).);
    }
  });

  // Prefill desde URL/localStorage
  (function init(){
    const url = new URL(location.href);
    const seedFromUrl = url.searchParams.get('seed');
    const lastSeed = localStorage.getItem('lastSeedUsed');
    if (seedFromUrl){ seedInput.value = seedFromUrl; }
    else if (lastSeed){ seedInput.value = lastSeed; }

    const lastName = localStorage.getItem('lastNameUsed');
    if (lastName){ nameInput.value = lastName; }
  })();
  </script>
</body>
</html>
