/* ============================================
   BANDI MONITOR – APP.JS
   Legge i dati già lavorati dal monitor e li mostra in tre sezioni.
   ============================================

   I dati arrivano da data/bandi.json, generato ogni giorno da
   server/monitor.js e pubblicato insieme al sito. È un file piccolo servito
   dalla stessa origine della pagina.

   Prima questa pagina interrogava in diretta l'API della Regione Calabria:
   mezzo megabyte di JSON che da telefono, o dentro la webview di Gmail,
   spesso non arrivava mai – e il sito restava a girare a vuoto. In più i
   campi con scadenza e stato lì dentro sono vuoti, quindi le scadenze non si
   vedevano comunque. Quella chiamata resta solo come rete di sicurezza,
   se il file dei dati manca.
*/

// === Configuration ===
const CONFIG = {
    dataUrl: 'data/bandi.json',

    // Rete di sicurezza: usata solo se data/bandi.json non è disponibile
    fallback: {
        calabriaAPI: 'https://calabriaeuropa.regione.calabria.it/wp-json/wp/v2/bando',
        perPage: 50,
        timeoutMs: 12000
    },

    dataTimeoutMs: 8000,

    // Oltre questi giorni senza che nulla cambi, avvisa. Non è più "ogni
    // quanto gira il controllo" (gira ogni giorno) ma "da quanto i bandi
    // sono fermi": il sito viene ripubblicato solo quando cambia qualcosa,
    // quindi una settimana tranquilla è normale.
    staleAfterDays: 8,

    newThresholdDays: 7,

    // Le stesse soglie del monitor (CONFIG.deadlineAlerts): il conto alla
    // rovescia si calcola qui, non arriva più dentro bandi.json
    deadlineAlerts: {
        urgent: 7,   // 🔴 scade entro una settimana
        soon: 15,    // 🟠 scade entro due settimane
        plan: 30     // 🟡 scade entro un mese
    },

    // Le stesse icone dichiarate in server/fonti.js. Una fonte che manca qui
    // non rompe niente: prende l'icona generica.
    sourceIcons: {
        'Calabria Europa': '🏛️',
        'Regione Calabria': '📍',
        'EU Funding & Tenders': '🇪🇺',
        'MIMIT': '🇮🇹',
        'MIMIT – misure e decreti': '📜',
        'EEN Italia': '🤝',
        'Fincalabra': '💰',
        'Comune di Cosenza': '🏘️',
        'Comune di Catanzaro': '🏘️',
        'Comune di Crotone': '🏘️',
        'Agenda Urbana Reggio Calabria': '🏘️',
        'CCIAA Cosenza': '🏢',
        'Federterziario Calabria': '🏢',
        'Confcommercio Cosenza': '🏢',
        'Confartigianato Cosenza': '🏢',
        'CNA Calabria': '🏢',
        'Unindustria Calabria': '🏢',
        'Unical – Bandi europei': '🎓',
        'Unical – Bandi nazionali': '🎓',
        'Unical – Bandi regionali': '🎓',
        'Interreg Grecia-Italia': '🇬🇷'
    },

    // Etichette dei livelli. L'ordine è quello in cui compaiono i conteggi.
    ambiti: [
        { key: 'europeo', label: 'Europei', icona: '🇪🇺' },
        { key: 'nazionale', label: 'Nazionali', icona: '🇮🇹' },
        { key: 'regionale', label: 'Regionali', icona: '📍' },
        { key: 'locale', label: 'Locali', icona: '🏘️' }
    ],

    // Da soli o con partner. Le chiavi sono quelle scritte dal monitor
    // (server/monitor.js, modalitaPartecipazione): non vanno rinominate.
    // L'ordine è quello delle sezioni: prima quello che puoi fare subito.
    partecipazione: [
        {
            key: 'singola', label: 'Da soli', icona: '👤', colore: '#34d399',
            spiega: 'si presenta come impresa singola, nessun partner obbligatorio'
        },
        {
            key: 'partenariato', label: 'Con partner', icona: '🤝', colore: '#fbbf24',
            spiega: 'serve un consorzio o almeno un partner'
        },
        {
            key: 'daVerificare', label: 'Da verificare', icona: '❓', colore: '#94a3b8',
            spiega: 'dal titolo non si capisce: va letto l’avviso'
        }
    ],

    // Usate solo dalla rete di sicurezza, quando i dati veri non ci sono
    relevanceKeywords: {
        high: [
            'economia circolare', 'circular economy', 'riciclo', 'riciclaggio',
            'riuso', 'riutilizzo', 'rifiuti', 'waste', 'raccolta differenziata',
            'gestione rifiuti', 'waste management', 'compostaggio', 'biomassa',
            'pannolini', 'materiali riciclati', 'upcycling', 'downcycling',
            'end of waste', 'materie prime seconde', 'simbiosi industriale',
            'life cycle', 'ciclo di vita', 'ecodesign', 'eco-design',
            'plastic free', 'zero waste', 'circular', 'circolare'
        ],
        medium: [
            'ambiente', 'ambientale', 'environment', 'sostenibilit', 'sustainable',
            'sustainability', 'green', 'ecolog', 'innovazione', 'innovation',
            'ricerca e sviluppo', 'r&s', 'r&d', 'research', 'pmi', 'sme',
            'piccole e medie imprese', 'startup', 'start-up', 'start up',
            'impresa', 'imprese', 'enterprise', 'sviluppo impresa',
            'transizione ecologica', 'green deal', 'energia', 'energy',
            'rinnovabil', 'renewable', 'efficienza energetica', 'carbon',
            'emissioni', 'emission', 'clima', 'climate', 'biodiversit',
            'tutela ambientale', 'inquinamento', 'pollution', 'bonifica',
            'calabria', 'mezzogiorno', 'sud italia', 'meridione',
            'giovani', 'youth', 'donne', 'women', 'imprenditoria',
            'digitalizzazione', 'digital', 'industria 4.0', 'tecnolog'
        ],
        low: [
            'finanziamento', 'funding', 'contributo', 'grant', 'bando',
            'agevolazione', 'incentivo', 'credito', 'investiment',
            'formazione', 'training', 'competenze', 'skills',
            'occupazione', 'lavoro', 'employment', 'assunzion',
            'territorio', 'sviluppo locale', 'coesione', 'cohesion',
            'cooperazione', 'cooperation', 'partenariato', 'partnership',
            'universit', 'ricerca', 'laborator'
        ]
    },
    relevanceThreshold: 3
};

const DEFAULT_SETTINGS = {
    emailIntervalDays: 7,
    notifyNewImmediately: true,
    expiringAlertDays: 30,
    monthlyReport: true
};

// === State ===
const state = {
    bandi: [],
    meta: {},
    settings: { ...DEFAULT_SETTINGS },
    activeSource: 'all',
    activeProgramma: 'all',
    activeAmbito: 'all',
    activePartecipazione: 'all',
    activeView: 'panoramica',
    searchQuery: '',
    modalitaRipiego: false,
    // Il pannello dei filtri: chiuso finche' non lo si apre, e la scelta
    // resta (localStorage) perché chi lo tiene aperto lo vuole aperto.
    filtriAperti: false,
    // La priorità è scelta sezione per sezione: chiave della sezione ->
    // 'all' | 'A' | 'B' | 'C'. "Dei bandi da soli fammi vedere solo gli A"
    // è una domanda diversa da quella che ci si fa sull'archivio.
    prioritaSezione: {}
};

// === DOM ===
const el = id => document.getElementById(id);

const elements = {
    loadingState: el('loadingState'),
    loadingSubtext: el('loadingSubtext'),
    errorState: el('errorState'),
    errorMessage: el('errorMessage'),
    errorDetail: el('errorDetail'),
    retryButton: el('retryButton'),
    sections: el('sections'),
    viewTabs: el('viewTabs'),
    searchInput: el('searchInput'),
    header: el('header'),
    filtersBar: document.querySelector('.filters-bar'),
    filtriToggle: el('filtriToggle'),
    filtriBadge: el('filtriBadge'),
    filtriAzzera: el('filtriAzzera'),
    filtriPannello: el('filtriPannello'),
    partecipazioneFilters: el('partecipazioneFilters'),
    ambitoFilters: el('ambitoFilters'),
    sourceFilters: el('sourceFilters'),
    programmaFilters: el('programmaFilters'),
    footerScartati: el('footerScartati'),
    lastUpdate: el('lastUpdate'),
    bgParticles: el('bgParticles'),
    scadenzaGiorni: el('scadenzaGiorni'),

    // Impostazioni
    settingsModal: el('settingsModal'),
    fabSettings: el('fabSettings'),
    modalClose: el('modalClose'),
    sumCadenza: el('sumCadenza'),
    sumNuovi: el('sumNuovi'),
    sumScadenze: el('sumScadenze'),
    sumMensile: el('sumMensile'),
    sumUltimoCheck: el('sumUltimoCheck'),
    sumUltimaEmail: el('sumUltimaEmail'),
    sumProssimaEmail: el('sumProssimaEmail'),

    // Dettaglio bando
    bandoModal: el('bandoModal'),
    bandoModalClose: el('bandoModalClose'),
    bandoModalTitolo: el('bandoModalTitolo'),
    bandoModalBody: el('bandoModalBody')
};

// Le griglie da riempire: chiave del gruppo → elementi della pagina
const SEZIONI = [
    { key: 'nuovi', grid: 'gridNuovi', count: 'countNuovi', empty: 'emptyNuovi', prio: 'prioNuovi' },
    { key: 'solo', grid: 'gridSolo', count: 'countSolo', empty: 'emptySolo', prio: 'prioSolo' },
    { key: 'partner', grid: 'gridPartner', count: 'countPartner', empty: 'emptyPartner', prio: 'prioPartner' },
    { key: 'daVerificare', grid: 'gridDaVerificare', count: 'countDaVerificare', empty: 'emptyDaVerificare', prio: 'prioDaVerificare' },
    { key: 'scadenza', grid: 'gridScadenza', count: 'countScadenza', empty: 'emptyScadenza', prio: 'prioScadenza' },
    { key: 'rete', grid: 'gridRete', count: 'countRete', empty: 'emptyRete', prio: 'prioRete' },
    { key: 'tutti', grid: 'gridTutti', count: 'countTutti', empty: 'emptyTutti', prio: 'prioTutti' },
    { key: 'archivio', grid: 'gridArchivio', count: 'countArchivio', empty: 'emptyArchivio', prio: 'prioArchivio' }
];

// Le schermate fra cui si naviga
const VISTE = {
    panoramica: 'viewPanoramica',
    rete: 'viewRete',
    tutti: 'viewTutti',
    archivio: 'viewArchivio'
};

// I programmi di finanziamento riconosciuti dall'id del bando. Servono a
// filtrare: "fammi vedere solo i Cluster 6" è la domanda che ci si fa davanti
// a trenta bandi europei tutti uguali nel titolo.
// Ripiego per i bandi salvati prima che il monitor scrivesse il campo
// `programma`. Da settembre 2026 il programma lo decide la fonte
// (server/fonti.js) e arriva già dentro bandi.json: questa tabella non va più
// allungata quando si aggiunge una fonte.
const PROGRAMMI = [
    { key: 'cl6', label: 'Horizon CL6', re: /^eu-HORIZON-CL6/i },
    { key: 'cl4', label: 'Horizon CL4', re: /^eu-HORIZON-CL4/i },
    { key: 'missioni', label: 'Missioni e NEB', re: /^eu-HORIZON-MISS/i },
    { key: 'cbe', label: 'CBE JU', re: /^eu-HORIZON-JU-CBE/i },
    { key: 'life', label: 'LIFE', re: /^eu-LIFE/i },
    { key: 'altri-eu', label: 'Altri europei', re: /^eu-/i },
    { key: 'calabria', label: 'Calabria', re: /^calabria|^rcal|^fincalabra/i },
    { key: 'nazionali', label: 'Nazionali', re: /^mimit/i },
    { key: 'een', label: 'EEN', re: /^een-/i }
];

/**
 * Da soli o con partner.
 *
 * L'ordine è lo stesso del monitor: prima il verdetto dato a mano (che arriva
 * da valutazioni.json o dall'analisi di Claude e viaggia anche da solo, senza
 * aspettare che il monitor rigeneri bandi.json), poi il campo scritto dal
 * monitor. Il ripiego finale serve per il bandi.json pubblicato prima di
 * questa modifica: senza, le tre sezioni resterebbero vuote fino al primo
 * controllo notturno.
 */
function partecipazioneDi(bando) {
    const chiavi = CONFIG.partecipazione.map(p => p.key);
    if (chiavi.includes(bando.valutazione?.partecipazione)) return bando.valutazione.partecipazione;
    if (chiavi.includes(bando.partecipazione)) return bando.partecipazione;
    // Stesso ripiego del monitor: sul portale europeo il consorzio è la regola.
    if ((bando.id || '').startsWith('eu-')) return 'partenariato';
    return 'daVerificare';
}

/**
 * La fascia A/B/C, quando qualcuno l'ha assegnata (a mano in valutazioni.json
 * o dall'analisi automatica). Chi non ce l'ha compare solo sotto "Tutte".
 */
function prioritaDi(bando) {
    const p = bando.valutazione?.priorita;
    return PRIORITA[p] ? p : null;
}

/** La riga che spiega cosa serve, quando qualcuno l'ha scritta. */
function partnerRichiestiDi(bando) {
    return bando.valutazione?.partner || bando.partnerRichiesti || null;
}

/** Il programma di un bando: quello scritto dal monitor, o il ripiego sull'id. */
function programmaDi(bando) {
    if (bando.programma) return bando.programma;
    const trovato = PROGRAMMI.find(p => p.re.test(bando.id || ''));
    return trovato ? trovato.label : null;
}

// === Avvio ===
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initEventListeners();
    initFiltri();
    misuraBarre();
    loadBandi();
});

// === Sfondo animato ===
function initParticles() {
    // Su schermi piccoli e per chi ha chiesto meno animazioni sono solo
    // lavoro in più per il telefono: si saltano.
    const riduciMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (riduciMovimento || window.innerWidth < 600) return;

    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 4 + 2;
        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            top: ${100 + Math.random() * 20}%;
            animation-delay: ${Math.random() * 15}s;
            animation-duration: ${15 + Math.random() * 10}s;
            background: ${Math.random() > 0.5 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)'};
        `;
        elements.bgParticles.appendChild(particle);
    }
}

// === Eventi ===
function initEventListeners() {
    elements.searchInput.addEventListener('input', debounce(e => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        render();
    }, 250));

    elements.retryButton.addEventListener('click', loadBandi);

    // Schede: Panoramica · Tutti i bandi · Archivio
    elements.viewTabs.addEventListener('click', e => {
        const btn = e.target.closest('.view-tab');
        if (btn) mostraVista(btn.dataset.view);
    });

    // I contatori in alto riportano alla panoramica, sulla sezione giusta
    document.querySelectorAll('.stat-pill[href^="#sezione-"]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            mostraVista('panoramica');
            el(link.getAttribute('href').substring(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Pannello impostazioni
    elements.fabSettings.addEventListener('click', apriImpostazioni);
    elements.modalClose.addEventListener('click', chiudiImpostazioni);
    elements.settingsModal.addEventListener('click', e => {
        if (e.target === elements.settingsModal) chiudiImpostazioni();
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (!elements.bandoModal.hidden) chiudiDettaglio();
        else if (!elements.settingsModal.hidden) chiudiImpostazioni();
    });

    // Dettaglio bando: click su una card (ma non sui link, che restano link)
    elements.sections.addEventListener('click', e => {
        if (e.target.closest('a')) return;
        const card = e.target.closest('.bando-card[data-id]');
        if (card) apriDettaglio(card.dataset.id);
    });
    elements.bandoModalClose.addEventListener('click', chiudiDettaglio);
    elements.bandoModal.addEventListener('click', e => {
        if (e.target === elements.bandoModal) chiudiDettaglio();
    });
    // Priorita': i bottoni sono ricostruiti a ogni render, quindi l'ascolto
    // sta sul contenitore, non sui singoli bottoni.
    elements.sections.addEventListener('click', e => {
        const btn = e.target.closest('.prio-btn');
        if (!btn) return;
        const sezione = SEZIONI.find(s => s.prio === btn.closest('.prio-filters')?.id);
        if (!sezione) return;
        state.prioritaSezione[sezione.key] = btn.dataset.priorita;
        render();
    });

    // Le barre fisse cambiano altezza col riquadro (sotto i 768px
    // l'intestazione va a colonna): il CSS la deve sapere, non indovinare.
    window.addEventListener('resize', debounce(misuraBarre, 150));
    if (window.ResizeObserver) {
        const osservatore = new ResizeObserver(misuraBarre);
        if (elements.header) osservatore.observe(elements.header);
        if (elements.filtersBar) osservatore.observe(elements.filtersBar);
    }

    elements.sections.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.bando-card[data-id]');
        if (card && e.target === card) {
            e.preventDefault();
            apriDettaglio(card.dataset.id);
        }
    });
}

// === Barra dei filtri ===
const CHIAVE_FILTRI = 'bandi-monitor:filtri-aperti';

/**
 * Scrive nel CSS quanto sono alte davvero le due barre fisse.
 *
 * Erano due numeri scritti a mano (72px l'intestazione, 90px il margine di
 * scorrimento) e sbagliavano in entrambi i versi: sotto i 768px
 * l'intestazione va a colonna e diventa quasi il doppio, e la barra dei
 * filtri cambia altezza ogni volta che si apre o si chiude.
 */
function misuraBarre() {
    const radice = document.documentElement;
    if (elements.header) radice.style.setProperty('--header-h', elements.header.offsetHeight + 'px');
    if (elements.filtersBar) radice.style.setProperty('--filters-h', elements.filtersBar.offsetHeight + 'px');
}

/**
 * I filtri stavano tutti aperti sotto l'intestazione: con undici fonti e
 * dodici programmi i bottoni andavano a capo su cinque righe e tenevano
 * occupata mezza pagina anche mentre si leggevano i bandi. Ora si aprono
 * quando servono, e il sito ricorda come li hai lasciati.
 */
function initFiltri() {
    try {
        state.filtriAperti = localStorage.getItem(CHIAVE_FILTRI) === 'si';
    } catch (e) {
        // Navigazione privata o cookie bloccati: si parte con i filtri chiusi.
    }

    applicaAperturaFiltri();

    elements.filtriToggle.addEventListener('click', () => {
        state.filtriAperti = !state.filtriAperti;
        try { localStorage.setItem(CHIAVE_FILTRI, state.filtriAperti ? 'si' : 'no'); } catch (e) { /* vedi sopra */ }
        applicaAperturaFiltri();
    });

    elements.filtriAzzera.addEventListener('click', azzeraFiltri);
}

function applicaAperturaFiltri() {
    elements.filtriPannello.hidden = !state.filtriAperti;
    elements.filtriToggle.setAttribute('aria-expanded', String(state.filtriAperti));
    misuraBarre();
}

/** Quanti filtri sono accesi: è il numero sul bottone "Filtri". */
function filtriAttivi() {
    const globali = [
        state.activeSource !== 'all',
        state.activeProgramma !== 'all',
        state.activeAmbito !== 'all',
        state.activePartecipazione !== 'all',
        state.searchQuery !== ''
    ].filter(Boolean).length;

    // Anche le priorità scelte dentro le sezioni contano: se no "Azzera"
    // sparisce proprio quando servirebbe.
    const perSezione = SEZIONI.filter(s => (state.prioritaSezione[s.key] || 'all') !== 'all').length;

    return globali + perSezione;
}

function aggiornaStatoFiltri() {
    const quanti = filtriAttivi();
    elements.filtriBadge.hidden = quanti === 0;
    elements.filtriBadge.textContent = quanti;
    elements.filtriAzzera.hidden = quanti === 0;
}

function azzeraFiltri() {
    state.activeSource = 'all';
    state.activeProgramma = 'all';
    state.activeAmbito = 'all';
    state.activePartecipazione = 'all';
    state.searchQuery = '';
    SEZIONI.forEach(s => { state.prioritaSezione[s.key] = 'all'; });
    elements.searchInput.value = '';

    // I bottoni dei filtri in cima sono ricostruiti solo quando cambiano i
    // dati, non a ogni render: qui si riaccende a mano il primo di ogni
    // gruppo, che è sempre quello che dice "tutto".
    [elements.partecipazioneFilters, elements.ambitoFilters, elements.sourceFilters, elements.programmaFilters]
        .forEach(gruppo => {
            gruppo?.querySelectorAll('.source-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
        });

    render();
}

// === Caricamento dati ===
async function loadBandi() {
    mostraCaricamento();

    // Le valutazioni viaggiano anche da sole: così un verdetto nuovo compare
    // al primo deploy, senza aspettare che il monitor notturno rigeneri
    // bandi.json. Due file: quelle fatte a mano e quelle dell'analisi
    // automatica (Claude); le manuali vincono. Se un file manca non è un errore.
    const valutazioniPromise = Promise.all([
        fetchJSON(`data/valutazioni.json?v=${Date.now()}`, CONFIG.dataTimeoutMs).catch(() => null),
        fetchJSON(`data/valutazioni-auto.json?v=${Date.now()}`, CONFIG.dataTimeoutMs).catch(() => null)
    ]).then(([manuali, auto]) => {
        const unite = {};
        Object.entries(auto || {}).forEach(([id, v]) => {
            if (!id.startsWith('_') && v && typeof v === 'object') unite[id] = { ...v, automatica: true };
        });
        Object.entries(manuali || {}).forEach(([id, v]) => {
            if (!id.startsWith('_') && v && typeof v === 'object') unite[id] = v;
        });
        return unite;
    });

    try {
        const dati = await fetchJSON(`${CONFIG.dataUrl}?v=${Date.now()}`, CONFIG.dataTimeoutMs);

        if (!dati || !Array.isArray(dati.bandi)) throw new Error('Il file dei dati non ha il formato atteso.');

        state.bandi = dati.bandi;
        state.meta = dati;
        state.settings = { ...DEFAULT_SETTINGS, ...(dati.settings || {}) };
        state.modalitaRipiego = false;

        normalizzaBandi();
        applicaValutazioniLocali(await valutazioniPromise);
        mostraContenuti();
        return;
    } catch (errorePrincipale) {
        console.warn('Dati locali non disponibili, provo la fonte in diretta:', errorePrincipale);
        elements.loadingSubtext.textContent = 'Provo a collegarmi direttamente a Calabria Europa…';

        // Rete di sicurezza: dati grezzi dalla fonte, senza scadenze né stato
        try {
            state.bandi = await caricaDaFonteInDiretta();
            state.meta = { generatedAt: new Date().toISOString(), ripiego: true };
            state.modalitaRipiego = true;
            normalizzaBandi();
            applicaValutazioniLocali(await valutazioniPromise);
            mostraContenuti();
        } catch (erroreRipiego) {
            mostraErrore(errorePrincipale, erroreRipiego);
        }
    }
}

/**
 * Scadenza, urgenza ed etichetta "nuovo" calcolate qui, alla lettura.
 *
 * Prima arrivavano già pronte dentro bandi.json, ma erano l'unica cosa che
 * cambiava tutti i giorni: il file risultava sempre diverso e il sito veniva
 * ricostruito ogni notte per niente. Calcolandole nel browser il conto alla
 * rovescia è giusto anche se l'ultima pubblicazione è di una settimana fa.
 *
 * Le regole sono quelle del monitor (`getDeadlineStatus`, `isStillActive`).
 */
function normalizzaBandi() {
    state.bandi.forEach(b => {
        b.deadlineStatus = calcolaScadenza(b);
        b.isNew = eRecente(b.date) || eRecente(b.segnalatoIl);

        // Se nel frattempo il termine è passato, il bando va in archivio
        // anche se il file lo dava ancora aperto
        if (b.attivo !== false && ['expired', 'closed'].includes(b.deadlineStatus.level)) {
            b.attivo = false;
        }
    });
}

function calcolaScadenza(bando) {
    const giorni = giorniAllaScadenza(bando.deadline);

    // Lo stato dichiarato dalla fonte vince su qualunque data: a sportello
    // chiuso non si presentano più domande, scadenza o meno
    if (bando.isOpen === false) {
        return {
            level: 'closed', days: null, emoji: '⛔', color: '#64748b',
            label: (bando.statoLabel || 'CHIUSO').toUpperCase()
        };
    }

    if (giorni === null) {
        return bando.aSportello
            ? { level: 'sportello', days: null, emoji: '🔵', color: '#60a5fa', label: 'A SPORTELLO – FINO A ESAURIMENTO RISORSE' }
            : { level: 'unknown', days: null, emoji: '⚪', color: '#94a3b8', label: 'SCADENZA NON RILEVATA' };
    }

    if (giorni < 0) {
        return { level: 'expired', days: giorni, emoji: '⛔', color: '#64748b', label: 'SCADUTO' };
    }

    const etichetta = giorni === 0 ? 'SCADE OGGI' : giorni === 1 ? 'SCADE DOMANI' : `SCADE TRA ${giorni} GIORNI`;
    const { urgent, soon, plan } = CONFIG.deadlineAlerts;

    if (giorni <= urgent) return { level: 'urgent', days: giorni, emoji: '🔴', color: '#f43f5e', label: etichetta };
    if (giorni <= soon)   return { level: 'soon',   days: giorni, emoji: '🟠', color: '#fb923c', label: etichetta };
    if (giorni <= plan)   return { level: 'plan',   days: giorni, emoji: '🟡', color: '#facc15', label: etichetta };

    return { level: 'open', days: giorni, emoji: '🟢', color: '#34d399', label: 'APERTO' };
}

/** Giorni interi che mancano alla data (negativi se già passata). */
function giorniAllaScadenza(valore) {
    if (!valore) return null;
    const data = new Date(valore);
    if (isNaN(data.getTime())) return null;

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const scadenza = new Date(data);
    scadenza.setHours(0, 0, 0, 0);

    return Math.round((scadenza - oggi) / 86400000);
}

function eRecente(valore) {
    if (!valore) return false;
    const giorni = giorniDa(valore);
    return giorni >= 0 && giorni <= CONFIG.newThresholdDays;
}

/**
 * Sovrappone ai bandi le valutazioni fatte a mano lette da
 * data/valutazioni.json, con la stessa logica del monitor: il verdetto
 * dell'utente vince sempre; 'forse' lascia la classe che c'era.
 */
function applicaValutazioniLocali(valutazioni) {
    if (!valutazioni || typeof valutazioni !== 'object') return;

    const classePerVerdetto = { si: 'nostro', rete: 'rete', no: 'fuori' };

    state.bandi.forEach(b => {
        const v = valutazioni[b.id];
        if (!v || typeof v !== 'object' || String(b.id).startsWith('_')) return;
        if (!['si', 'rete', 'no', 'forse'].includes(v.verdetto)) return;

        b.valutazione = { ...(b.valutazione || {}), ...v };
        b.classe = classePerVerdetto[v.verdetto] || b.classe || 'nostro';
        b.ruolo = v.ruolo || b.ruolo || null;
        b.decisoDaTe = v.automatica !== true;
    });

    // I bandi bocciati a mano non devono restare in mezzo agli altri
    state.bandi = state.bandi.filter(b => b.classe !== 'fuori' || b.attivo === false);
}

function mostraCaricamento() {
    elements.loadingState.hidden = false;
    elements.errorState.hidden = true;
    elements.sections.hidden = true;
    elements.loadingSubtext.textContent = 'Un attimo solo…';
}

function mostraContenuti() {
    elements.loadingState.hidden = true;
    elements.errorState.hidden = true;
    elements.sections.hidden = false;

    costruisciFiltriPartecipazione();
    costruisciFiltriAmbito();
    costruisciFiltriFonte();
    costruisciFiltriProgramma();
    aggiornaImpostazioniUI();
    render();

    const quando = state.meta.generatedAt ? new Date(state.meta.generatedAt) : new Date();
    elements.lastUpdate.textContent = formatDateTime(quando);

    const giorni = giorniDa(quando);
    if (state.modalitaRipiego) {
        avvisoInTesta('⚠️ Dati letti in diretta dal sito della Regione: scadenze e stato non sono disponibili.');
    } else if (giorni > CONFIG.staleAfterDays) {
        avvisoInTesta(`⚠️ Nessun cambiamento nei bandi da ${giorni} giorni. Le scadenze qui sotto restano aggiornate, ` +
            `ma se ti sembra troppo tempo controlla che il controllo automatico giri ancora.`);
    }
}

function mostraErrore(errorePrincipale, erroreRipiego) {
    elements.loadingState.hidden = true;
    elements.sections.hidden = true;
    elements.errorState.hidden = false;

    elements.errorMessage.textContent = navigator.onLine
        ? 'I dati non sono raggiungibili in questo momento. Riprova tra poco.'
        : 'Sembra che il telefono sia offline. Controlla la connessione e riprova.';

    elements.errorDetail.textContent = `Dettaglio tecnico: ${errorePrincipale.message}` +
        (erroreRipiego ? ` · ${erroreRipiego.message}` : '');
}

/** Fetch con timeout: senza, su rete lenta la pagina resterebbe a girare a vuoto. */
async function fetchJSON(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`risposta ${res.status}`);
        return await res.json();
    } catch (e) {
        if (e.name === 'AbortError') throw new Error(`tempo scaduto dopo ${Math.round(timeoutMs / 1000)} secondi`);
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

function avvisoInTesta(testo) {
    let banner = document.getElementById('staleBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'staleBanner';
        banner.className = 'stale-banner';
        elements.sections.prepend(banner);
    }
    banner.textContent = testo;
}

// === Rete di sicurezza: fonte in diretta ===
// Usata solo quando data/bandi.json non è disponibile. Produce bandi nella
// stessa forma, ma senza scadenza né stato: quelle informazioni non stanno
// nell'API, si leggono solo dalle pagine dei bandi (lo fa il monitor).
async function caricaDaFonteInDiretta() {
    const url = `${CONFIG.fallback.calabriaAPI}?per_page=${CONFIG.fallback.perPage}` +
        `&orderby=date&order=desc&_fields=id,title,link,date,modified,slug`;

    const grezzi = await fetchJSON(url, CONFIG.fallback.timeoutMs);

    return grezzi
        .map(raw => {
            const title = decodeHTML(raw.title?.rendered || '');
            const punteggio = calcolaRilevanza(`${title} ${raw.slug || ''}`.toLowerCase());

            return {
                id: `calabria-${raw.id}`,
                title,
                link: raw.link,
                source: 'Calabria Europa',
                sourceUrl: 'https://calabriaeuropa.regione.calabria.it/bandi/',
                date: raw.date,
                deadline: null,
                aSportello: false,
                statoLabel: null,
                isOpen: null,
                relevanceScore: punteggio.score,
                relevanceKeywords: punteggio.keywords.slice(0, 6)
                // isNew e deadlineStatus li mette normalizzaBandi()
            };
        })
        .filter(b => b.relevanceScore >= CONFIG.relevanceThreshold);
}

function calcolaRilevanza(text) {
    let score = 0;
    const keywords = [];
    const pesi = [['high', 3], ['medium', 2], ['low', 1]];

    pesi.forEach(([livello, punti]) => {
        CONFIG.relevanceKeywords[livello].forEach(kw => {
            if (text.includes(kw.toLowerCase())) {
                score += punti;
                keywords.push(kw);
            }
        });
    });

    return { score, keywords };
}

// === Filtri ===
/**
 * Bottoni per modalità: da soli, con partner, da verificare.
 *
 * Vale su tutte le schede, non solo sulla panoramica: serve soprattutto in
 * "Tutti i bandi", dove i due tipi di lavoro sono altrimenti mescolati.
 */
function costruisciFiltriPartecipazione() {
    const attivi = state.bandi.filter(b => b.attivo !== false);
    const presenti = CONFIG.partecipazione.filter(p => attivi.some(b => partecipazioneDi(b) === p.key));

    if (presenti.length < 2) {
        elements.partecipazioneFilters.hidden = true;
        return;
    }

    const quanti = key => attivi.filter(b => partecipazioneDi(b) === key).length;

    elements.partecipazioneFilters.hidden = false;
    elements.partecipazioneFilters.innerHTML =
        '<button class="source-btn active" data-partecipazione="all">Come si partecipa: tutto ' +
        '<span class="source-count">' + attivi.length + '</span></button>' +
        presenti.map(p => '<button class="source-btn" data-partecipazione="' + p.key + '">' +
            p.icona + ' ' + escapeHTML(p.label) + ' <span class="source-count">' + quanti(p.key) + '</span></button>').join('');

    elements.partecipazioneFilters.querySelectorAll('.source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.partecipazioneFilters.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activePartecipazione = btn.dataset.partecipazione;
            render();
        });
    });
}

/**
 * Bottoni per livello: europeo, nazionale, regionale, locale.
 *
 * È il filtro che risponde alla domanda da cui sono nate le fonti nuove:
 * "stiamo sfruttando solo l'Europa?". Se il conteggio dei nazionali o dei
 * locali è a zero per settimane, vuol dire che quelle fonti non stanno
 * pescando niente e c'è da guardarci dentro.
 */
function costruisciFiltriAmbito() {
    const attivi = state.bandi.filter(b => b.attivo !== false);
    const presenti = CONFIG.ambiti.filter(a => attivi.some(b => b.ambito === a.key));

    if (presenti.length < 2) {
        elements.ambitoFilters.hidden = true;
        return;
    }

    const quanti = key => attivi.filter(b => b.ambito === key).length;

    elements.ambitoFilters.hidden = false;
    elements.ambitoFilters.innerHTML =
        `<button class="source-btn active" data-ambito="all">Tutti i livelli <span class="source-count">${attivi.length}</span></button>` +
        presenti.map(a => `<button class="source-btn" data-ambito="${a.key}">${a.icona} ${escapeHTML(a.label)} <span class="source-count">${quanti(a.key)}</span></button>`).join('');

    elements.ambitoFilters.querySelectorAll('.source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.ambitoFilters.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeAmbito = btn.dataset.ambito;
            render();
        });
    });
}

function costruisciFiltriFonte() {
    const fonti = [...new Set(state.bandi.map(b => b.source).filter(Boolean))].sort();

    // Con una fonte sola i bottoni non servono a niente
    if (fonti.length < 2) {
        elements.sourceFilters.hidden = true;
        return;
    }

    // Accanto a ogni fonte quanti bandi aperti ha prodotto: si vede subito
    // quali stanno dando risultati e quali no
    const attiviPerFonte = f => state.bandi.filter(b => b.source === f && b.attivo !== false).length;
    const totaleAttivi = state.bandi.filter(b => b.attivo !== false).length;

    elements.sourceFilters.hidden = false;
    elements.sourceFilters.innerHTML =
        `<button class="source-btn active" data-source="all">Tutte le fonti <span class="source-count">${totaleAttivi}</span></button>` +
        fonti.map(f => `<button class="source-btn" data-source="${escapeAttr(f)}">${iconaFonte(f)} ${escapeHTML(f)} <span class="source-count">${attiviPerFonte(f)}</span></button>`).join('');

    elements.sourceFilters.querySelectorAll('.source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.sourceFilters.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeSource = btn.dataset.source;
            render();
        });
    });
}

/**
 * Bottoni per programma di finanziamento (Horizon CL6, LIFE, Calabria…),
 * costruiti solo sui programmi che hanno davvero dei bandi.
 */
function costruisciFiltriProgramma() {
    // Costruiti da quello che c'è davvero, come i filtri per fonte: con quindici
    // fonti un elenco scritto a mano sarebbe già fuori sincrono.
    const attivi = state.bandi.filter(b => b.attivo !== false);
    const presenti = [...new Set(attivi.map(programmaDi).filter(Boolean))].sort();

    if (presenti.length < 2) {
        elements.programmaFilters.hidden = true;
        return;
    }

    const quanti = nome => attivi.filter(b => programmaDi(b) === nome).length;

    elements.programmaFilters.hidden = false;
    elements.programmaFilters.innerHTML =
        `<button class="source-btn active" data-programma="all">Tutti i programmi</button>` +
        presenti.map(nome => `<button class="source-btn" data-programma="${escapeHTML(nome)}">${escapeHTML(nome)} <span class="source-count">${quanti(nome)}</span></button>`).join('');

    elements.programmaFilters.querySelectorAll('.source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.programmaFilters.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeProgramma = btn.dataset.programma;
            render();
        });
    });
}

/**
 * I bottoni della priorità di una sezione, costruiti sui bandi che la
 * sezione contiene davvero. Stessa forma dei filtri in cima: con una sola
 * fascia presente il selettore non sceglie niente e resta nascosto.
 */
function costruisciFiltriPriorita(key, prioId, lista) {
    const contenitore = el(prioId);
    if (!contenitore) return;

    const presenti = Object.keys(PRIORITA).filter(p => lista.some(b => prioritaDi(b) === p));

    if (presenti.length < 2) {
        contenitore.hidden = true;
        contenitore.innerHTML = '';
        // Senza bottoni non si potrebbe più togliere un filtro rimasto acceso
        // da prima (per esempio dopo una ricerca che lascia due soli bandi).
        state.prioritaSezione[key] = 'all';
        return;
    }

    const scelta = state.prioritaSezione[key] || 'all';
    const quanti = p => lista.filter(b => prioritaDi(b) === p).length;
    const bottone = (valore, classe, testo, numero) =>
        `<button type="button" class="prio-btn ${classe}${scelta === valore ? ' active' : ''}" data-priorita="${valore}">` +
        `${escapeHTML(testo)}<span class="prio-conteggio">${numero}</span></button>`;

    contenitore.hidden = false;
    contenitore.innerHTML =
        bottone('all', '', 'Tutte le priorità', lista.length) +
        presenti.map(p => bottone(p, PRIORITA[p].classe, PRIORITA[p].label, quanti(p))).join('');
}

function bandiFiltrati() {
    return state.bandi.filter(b => {
        if (state.activeSource !== 'all' && b.source !== state.activeSource) return false;
        if (state.activeProgramma !== 'all' && programmaDi(b) !== state.activeProgramma) return false;
        if (state.activeAmbito !== 'all' && b.ambito !== state.activeAmbito) return false;
        if (state.activePartecipazione !== 'all' && partecipazioneDi(b) !== state.activePartecipazione) return false;

        if (state.searchQuery) {
            // Si cerca anche nei motivi e nella tua nota: "comuni", "CAM" o
            // "living lab" sono il modo naturale di cercare un bando qui dentro
            const testo = [
                b.title, b.source, b.ruolo,
                (b.motivi || []).join(' '),
                (b.relevanceKeywords || []).join(' '),
                b.valutazione?.nota || ''
            ].join(' ').toLowerCase();
            if (!testo.includes(state.searchQuery)) return false;
        }

        return true;
    });
}

// === Rendering ===
function render() {
    const bandi = bandiFiltrati();
    const sogliaScadenza = state.settings.expiringAlertDays;

    // I bandi senza il campo `attivo` vengono da dati vecchi o dal ripiego:
    // in quel caso sono tutti da considerarsi aperti.
    const attivi = bandi.filter(b => b.attivo !== false);
    const scaduti = bandi.filter(b => b.attivo === false);

    // I bandi senza classe vengono da dati vecchi o dal ripiego: valgono come
    // nostri, così un aggiornamento a metà non svuota la schermata principale.
    const nostri = attivi.filter(b => (b.classe || 'nostro') === 'nostro');
    const perLaRete = attivi.filter(b => b.classe === 'rete');

    // La divisione che conta: un aiuto alle imprese si presenta in due
    // settimane, un consorzio Horizon richiede mesi di ricerca partner.
    // Mescolarli nella stessa lista faceva sembrare tutto ugualmente vicino.
    const conModalita = key => nostri.filter(b => partecipazioneDi(b) === key);

    const gruppi = {
        nuovi: nostri.filter(b => b.isNew),
        solo: conModalita('singola'),
        partner: conModalita('partenariato'),
        daVerificare: conModalita('daVerificare'),
        scadenza: nostri.filter(b =>
            b.deadlineStatus?.days !== null &&
            b.deadlineStatus?.days !== undefined &&
            b.deadlineStatus.days <= sogliaScadenza),
        rete: perLaRete,
        tutti: attivi,
        archivio: scaduti
    };

    SEZIONI.forEach(({ key, grid, count, empty, prio }) => {
        const lista = gruppi[key];
        const gridEl = el(grid);
        const emptyEl = el(empty);

        if (!gridEl) return;

        // Prima i bottoni (che possono spegnere una scelta rimasta senza
        // bandi), poi la lista che ne esce.
        costruisciFiltriPriorita(key, prio, lista);
        const scelta = state.prioritaSezione[key] || 'all';
        const visibili = scelta === 'all' ? lista : lista.filter(b => prioritaDi(b) === scelta);

        // Con la priorità accesa il numero accanto al titolo direbbe una
        // bugia: si mostra "visti su totali".
        el(count).innerHTML = scelta === 'all'
            ? String(lista.length)
            : `${visibili.length}<span class="conteggio-totale"> / ${lista.length}</span>`;
        gridEl.innerHTML = visibili.map(b => cardBando(b, key === 'archivio')).join('');
        gridEl.hidden = visibili.length === 0;
        emptyEl.hidden = visibili.length > 0;

        if (visibili.length === 0 && (state.searchQuery || state.activeSource !== 'all' || scelta !== 'all')) {
            emptyEl.textContent = 'Nessun bando corrisponde ai filtri.';
        }
    });

    el('statNuovi').textContent = gruppi.nuovi.length;
    el('statSolo').textContent = gruppi.solo.length;
    el('statPartner').textContent = gruppi.partner.length;
    el('statScadenza').textContent = gruppi.scadenza.length;
    el('tabCountNostri').textContent = nostri.length;
    el('tabCountRete').textContent = gruppi.rete.length;
    el('tabCountTutti').textContent = gruppi.tutti.length;
    el('tabCountArchivio').textContent = gruppi.archivio.length;
    elements.scadenzaGiorni.textContent = sogliaScadenza;

    // Quanti ne ha scartati il filtro: se il numero è zero o enorme, i profili
    // di pertinenza vanno ritarati, e conviene accorgersene dal sito
    const fuoriTema = state.meta?.counts?.fuoriTema || 0;
    if (elements.footerScartati) {
        elements.footerScartati.hidden = fuoriTema === 0;
        elements.footerScartati.textContent =
            `${fuoriTema} band${fuoriTema === 1 ? 'o' : 'i'} scartat${fuoriTema === 1 ? 'o' : 'i'} perché fuori tema`;
    }

    aggiornaStatoFiltri();
    misuraBarre();
}

/**
 * Vero quando la fonte dichiara il bando ancora aperto ma il termine è
 * già passato. Succede davvero: certi enti lasciano lo stato "Aperto"
 * sulla propria pagina anche dopo la scadenza. In quel caso l'etichetta
 * diventa "Stato alla fonte", così è chiaro che è la fonte a dirlo, non noi.
 */
function statoDiscordante(bando) {
    return bando.deadlineStatus?.level === 'expired' && bando.isOpen !== false;
}

/** Mostra una sola schermata alla volta. */
function mostraVista(vista) {
    state.activeView = VISTE[vista] ? vista : 'panoramica';

    Object.entries(VISTE).forEach(([nome, id]) => {
        const elemento = el(id);
        if (elemento) elemento.hidden = nome !== state.activeView;
    });

    elements.viewTabs.querySelectorAll('.view-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === state.activeView);
    });
}

function cardBando(bando, archiviato = false) {
    const status = bando.deadlineStatus || {};
    const colore = status.color || '#94a3b8';

    const scadenzaTesto = bando.deadline
        ? formatDate(bando.deadline)
        : bando.aSportello
            ? 'fino a esaurimento risorse'
            : 'non indicata';

    const perLaRete = bando.classe === 'rete';

    // Il ruolo che giochiamo in questo bando, al posto del vecchio badge
    // "rilevante" che era identico su tutte le card
    const ruoloBadge = bando.ruolo
        ? `<span class="badge badge-ruolo ${perLaRete ? 'is-rete' : ''}">${perLaRete ? '🤝' : '🎯'} ${escapeHTML(bando.ruolo)}</span>`
        : '';

    const prioritaBadge = badgePriorita(bando);

    // Da soli o con partner: la prima cosa da sapere guardando una card,
    // perché dice se il lavoro è di due settimane o di mesi
    const modo = CONFIG.partecipazione.find(p => p.key === partecipazioneDi(bando));
    const partecipazioneBadge = modo
        ? `<span class="badge badge-partecipazione is-${modo.key}">${modo.icona} ${escapeHTML(modo.label)}</span>`
        : '';

    // Le due scadenze dei bandi a fasi: senza, la prima passata fa credere
    // che il bando sia chiuso
    const fasiRiga = (bando.fasi || []).length > 1
        ? `<span class="meta-item"><span class="meta-icon">🪜</span> Fasi: ${bando.fasi.map(f => formatDate(f)).join(' → ')}</span>`
        : '';

    return `
        <article class="bando-card ${bando.isNew && !archiviato ? 'is-new' : ''} ${archiviato ? 'is-archived' : perLaRete ? 'is-rete' : 'relevant'}"
            data-id="${escapeAttr(bando.id)}" role="button" tabindex="0"
            title="Clicca per vedere perché possiamo usufruirne e come partecipare">
            <div class="card-accent"></div>
            <div class="card-body">
                <div class="card-badges">
                    ${bando.isNew && !archiviato ? '<span class="badge badge-new">✨ Nuovo</span>' : ''}
                    ${archiviato ? '' : prioritaBadge}
                    ${archiviato ? '' : partecipazioneBadge}
                    ${archiviato ? '' : ruoloBadge}
                    <span class="badge badge-deadline" style="background: ${hexToRgba(colore, 0.15)}; color: ${colore};">
                        ${status.emoji || '⚪'} ${escapeHTML(status.label || 'SCADENZA NON RILEVATA')}
                    </span>
                    <span class="badge badge-source">${iconaFonte(bando.source)} ${escapeHTML(bando.source || '')}</span>
                </div>

                <h3 class="card-title">
                    <a href="${escapeAttr(bando.link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(bando.title)}</a>
                </h3>

                ${(bando.motivi || []).length ? `
                    <div class="card-keywords">
                        <span class="meta-item card-motivi">
                            🧭 Perché ci riguarda: ${escapeHTML(bando.motivi.join(' · '))}
                        </span>
                    </div>` : ''}

                ${bando.valutazione ? `
                    <div class="card-valutazione ${perLaRete ? 'is-rete' : ''} ${bando.classe === 'fuori' ? 'is-scartato' : ''}">
                        <strong>${bando.valutazione.automatica ? '🤖 Analisi automatica' : '✍️ Valutato da te'}${bando.valutazione.aggiornato ? ` il ${formatDate(bando.valutazione.aggiornato)}` : ''}</strong>
                        ${bando.valutazione.nota ? `<p>${escapeHTML(bando.valutazione.nota)}</p>` : ''}
                    </div>` : ''}

                <div class="card-meta">
                    ${fasiRiga}
                    <span class="meta-item"><span class="meta-icon">📅</span> Pubblicato: ${formatDate(bando.date)}</span>
                    <span class="meta-item"><span class="meta-icon">⏳</span> Scadenza:
                        <strong style="color: ${colore};">${escapeHTML(scadenzaTesto)}</strong>
                    </span>
                    ${bando.statoLabel ? `
                        <span class="meta-item"><span class="meta-icon">📋</span> ${statoDiscordante(bando) ? 'Stato alla fonte' : 'Stato'}:
                            <strong style="color: ${bando.isOpen === false ? 'var(--text-secondary)' : 'var(--accent-emerald)'};">
                                ${escapeHTML(bando.statoLabel)}
                            </strong>
                        </span>` : ''}
                </div>
            </div>

            <div class="card-footer">
                <span class="card-detail-hint">🧭 Perché e come partecipare</span>
                <a href="${escapeAttr(bando.link)}" target="_blank" rel="noopener noreferrer" class="card-link">
                    Vai al bando
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </a>
                ${bando.sourceUrl ? `<a href="${escapeAttr(bando.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="card-source-link">Vedi sul sito originale →</a>` : ''}
            </div>
        </article>
    `;
}

// === Dettaglio bando ===
// L'iter fatto a mano sul resoconto — "possiamo usufruirne? e come?" — vive
// in valutazioni.json: qui viene mostrato cliccando la card, senza dover
// riaprire il documento ogni volta.

const VERDETTI = {
    si: { label: '✅ Ci partecipiamo', classe: 'verdetto-si' },
    rete: { label: '🤝 Da girare alla rete', classe: 'verdetto-rete' },
    forse: { label: '🤔 Possibile, con riserve', classe: 'verdetto-forse' },
    no: { label: '⛔ Scartato', classe: 'verdetto-no' }
};

const PRIORITA = {
    A: { label: 'Priorità A · puntiamo forte', classe: 'prio-a' },
    B: { label: 'Priorità B · probabile', classe: 'prio-b' },
    C: { label: 'Priorità C · marginale', classe: 'prio-c' }
};

/** Badge A/B/C sulla card, solo se la priorità è stata assegnata a mano. */
function badgePriorita(bando) {
    const p = PRIORITA[bando.valutazione?.priorita];
    return p
        ? `<span class="badge badge-priorita ${p.classe}">${escapeHTML(p.label.split(' · ')[0])}</span>`
        : '';
}

function apriDettaglio(id) {
    const bando = state.bandi.find(b => b.id === id);
    if (!bando) return;

    elements.bandoModalTitolo.textContent = bando.classe === 'rete' ? '🤝 Bando per la rete' : '🎯 Dettaglio bando';
    elements.bandoModalBody.innerHTML = dettaglioBando(bando);
    elements.bandoModal.hidden = false;
}

function chiudiDettaglio() {
    elements.bandoModal.hidden = true;
}

function elenco(voci) {
    return `<ul class="dettaglio-lista">${voci.map(v => `<li>${escapeHTML(v)}</li>`).join('')}</ul>`;
}

/**
 * Le altre fonti che pubblicano lo stesso bando.
 *
 * Il monitor unisce i doppioni tenendo il link migliore, ma le copie hanno
 * spesso qualcosa in più: le associazioni di categoria riassumono importi e
 * requisiti meglio dell'ente che pubblica l'avviso, e assistono gli associati
 * nella domanda. Vale la pena poterci andare.
 */
function ancheSuHTML(bando) {
    const copie = bando.ancheSu || [];
    if (!copie.length) return '';

    return `
        <div class="dettaglio-anche-su">
            <span class="meta-icon">🔗</span> Segnalato anche da:
            ${copie.map(c => `<a href="${escapeAttr(c.link)}" target="_blank" rel="noopener noreferrer">${iconaFonte(c.fonte)} ${escapeHTML(c.fonte)}</a>`).join(' · ')}
        </div>`;
}

/**
 * Avviso, modulistica e FAQ, quando li abbiamo scritti in bandi-manuali.json.
 *
 * Sono i file che servono davvero per presentare la domanda. Il bando
 * dell'Agenda Urbana è nato così: il link portava al comunicato della
 * proroga, e da lì non si arrivava né all'avviso né agli allegati.
 */
function documentiHTML(bando) {
    const documenti = bando.documenti || [];
    if (!documenti.length) return '';

    return `
        <section class="dettaglio-sezione">
            <h3>📎 Documenti e allegati</h3>
            <ul class="dettaglio-lista dettaglio-documenti">
                ${documenti.map(d => `<li><a href="${escapeAttr(d.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(d.label)}</a></li>`).join('')}
            </ul>
        </section>`;
}

function dettaglioBando(bando) {
    const v = bando.valutazione;
    const status = bando.deadlineStatus || {};
    const colore = status.color || '#94a3b8';
    const verdetto = v ? VERDETTI[v.verdetto] : null;
    const prio = v ? PRIORITA[v.priorita] : null;

    const scadenzaTesto = bando.deadline
        ? formatDate(bando.deadline)
        : bando.aSportello ? 'fino a esaurimento risorse' : 'non indicata';

    const modo = CONFIG.partecipazione.find(p => p.key === partecipazioneDi(bando));
    const partner = partnerRichiestiDi(bando);

    const badges = [
        verdetto ? `<span class="badge badge-verdetto ${verdetto.classe}">${verdetto.label}</span>` : '',
        prio ? `<span class="badge badge-priorita ${prio.classe}">${escapeHTML(prio.label)}</span>` : '',
        `<span class="badge badge-deadline" style="background: ${hexToRgba(colore, 0.15)}; color: ${colore};">${status.emoji || '⚪'} ${escapeHTML(status.label || 'SCADENZA NON RILEVATA')}</span>`,
        `<span class="badge badge-source">${iconaFonte(bando.source)} ${escapeHTML(bando.source || '')}</span>`
    ].filter(Boolean).join('');

    // Con la valutazione a mano si mostrano perché e come; senza, i motivi
    // della classificazione automatica e l'avviso che manca il giudizio umano.
    let corpo;
    if (v && ((v.perche || []).length || (v.come || []).length || v.nota)) {
        corpo = `
            ${(v.perche || []).length ? `
                <section class="dettaglio-sezione">
                    <h3>🧭 Perché possiamo usufruirne</h3>
                    ${elenco(v.perche)}
                </section>` : ''}
            ${(v.come || []).length ? `
                <section class="dettaglio-sezione">
                    <h3>🚀 Come partecipare</h3>
                    ${elenco(v.come)}
                </section>` : ''}
            ${v.nota ? `
                <section class="dettaglio-sezione dettaglio-nota">
                    <h3>✍️ In sintesi</h3>
                    <p>${escapeHTML(v.nota)}</p>
                </section>` : ''}
            ${v.automatica ? `<p class="dettaglio-aggiornato">🤖 Analisi fatta automaticamente da Claude${v.aggiornato ? ` il ${formatDate(v.aggiornato)}` : ''} sul profilo della società: verificala prima di muoverti. Il tuo verdetto in <code>valutazioni.json</code> la sostituisce.</p>`
                : v.aggiornato ? `<p class="dettaglio-aggiornato">✍️ Valutato da te il ${formatDate(v.aggiornato)}</p>` : ''}
        `;
    } else {
        corpo = `
            <section class="dettaglio-sezione">
                <h3>🧭 Perché il monitor l'ha selezionato</h3>
                ${(bando.motivi || []).length
                    ? elenco(bando.motivi)
                    : '<p>Selezionato dalla classificazione automatica sul profilo della società.</p>'}
                <p class="dettaglio-avviso">Questo bando non ha ancora un'analisi: al prossimo controllo giornaliero
                verrà analizzato automaticamente e qui compariranno il perché e il come. Un tuo verdetto in
                <code>valutazioni.json</code> vince comunque sull'analisi automatica.</p>
            </section>
        `;
    }

    const fasiRiga = (bando.fasi || []).length > 1
        ? `<span class="meta-item"><span class="meta-icon">🪜</span> Fasi: ${bando.fasi.map(f => formatDate(f)).join(' → ')}</span>`
        : '';

    return `
        <h3 class="dettaglio-titolo">${escapeHTML(bando.title)}</h3>
        <div class="card-badges">${badges}</div>
        ${corpo}
        <div class="card-meta dettaglio-meta">
            ${fasiRiga}
            <span class="meta-item"><span class="meta-icon">📅</span> Pubblicato: ${formatDate(bando.date)}</span>
            <span class="meta-item"><span class="meta-icon">⏳</span> Scadenza: <strong style="color: ${colore};">${escapeHTML(scadenzaTesto)}</strong></span>
            ${bando.statoLabel ? `<span class="meta-item"><span class="meta-icon">📋</span> Stato: <strong>${escapeHTML(bando.statoLabel)}</strong></span>` : ''}
            ${modo ? `<span class="meta-item"><span class="meta-icon">${modo.icona}</span> Si partecipa: <strong style="color: ${modo.colore};">${escapeHTML(modo.label.toLowerCase())}</strong> – ${escapeHTML(partner || modo.spiega)}</span>` : ''}
            ${bando.ruolo ? `<span class="meta-item"><span class="meta-icon">${bando.classe === 'rete' ? '🤝' : '🎯'}</span> Ruolo: <strong>${escapeHTML(bando.ruolo)}</strong></span>` : ''}
            ${bando.programma ? `<span class="meta-item"><span class="meta-icon">🗂️</span> Programma: <strong>${escapeHTML(bando.programma)}</strong></span>` : ''}
        </div>
        ${documentiHTML(bando)}
        ${ancheSuHTML(bando)}
        <div class="dettaglio-azioni">
            <a href="${escapeAttr(bando.link)}" target="_blank" rel="noopener noreferrer" class="btn-primary dettaglio-vai">Vai al bando ufficiale →</a>
            ${bando.linkNotizia ? `<a href="${escapeAttr(bando.linkNotizia)}" target="_blank" rel="noopener noreferrer" class="card-source-link">La notizia dell'ente</a>` : ''}
            ${bando.sourceUrl ? `<a href="${escapeAttr(bando.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="card-source-link">Vedi sul sito della fonte</a>` : ''}
        </div>
    `;
}

// === Impostazioni ===
// Il pannello è in sola lettura: dice com'è configurato l'invio e dove si
// cambia. Prima c'era un modulo con password che scriveva su GitHub passando
// per una funzione Netlify; il sito ora sta su GitHub Pages, che è statico e
// non ha funzioni, e i valori si cambiano dal workflow "Impostazioni email".
// I valori mostrati arrivano da bandi.json, che il monitor riscrive ogni
// giorno leggendo lo stesso settings.json che il workflow modifica.
function apriImpostazioni() {
    elements.settingsModal.hidden = false;
    aggiornaImpostazioniUI();
}

function chiudiImpostazioni() {
    elements.settingsModal.hidden = true;
}

function aggiornaImpostazioniUI() {
    const s = state.settings;

    elements.sumCadenza.textContent = descriviCadenza(s.emailIntervalDays);
    elements.sumNuovi.textContent = s.notifyNewImmediately ? 'segnalati subito' : 'solo nel riepilogo';
    elements.sumScadenze.textContent = `${s.expiringAlertDays} giorni prima`;
    elements.sumMensile.textContent = s.monthlyReport ? 'il 1° di ogni mese' : 'no';
    elements.sumUltimoCheck.textContent = state.meta.generatedAt ? formatDateTime(state.meta.generatedAt) : '–';
    elements.sumUltimaEmail.textContent = state.meta.lastEmailSentAt ? formatDateTime(state.meta.lastEmailSentAt) : 'mai inviata';
    elements.sumProssimaEmail.textContent = descriviProssimaEmail();
}

function descriviCadenza(giorni) {
    if (giorni === 1) return 'ogni giorno';
    if (giorni === 7) return 'ogni settimana';
    if (giorni === 14) return 'ogni 2 settimane';
    if (giorni === 30) return 'ogni mese';
    return `ogni ${giorni} giorni`;
}

function descriviProssimaEmail() {
    if (!state.meta.nextEmailDueAt) {
        return state.settings.notifyNewImmediately ? 'appena esce un bando nuovo' : '–';
    }

    const giorni = -giorniDa(state.meta.nextEmailDueAt);
    if (giorni <= 0) return 'appena c\'è qualcosa da segnalare';
    return `${formatDate(state.meta.nextEmailDueAt)} (tra ${giorni} giorn${giorni === 1 ? 'o' : 'i'})`;
}

// === Utilities ===
function decodeHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || html;
}

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
    return escapeHTML(value).replace(/"/g, '&quot;');
}

function formatDate(value) {
    if (!value) return '–';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '–';
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '–';
    return date.toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function giorniDa(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return 0;
    return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function iconaFonte(nome) {
    return CONFIG.sourceIcons[nome] || '📄';
}

function hexToRgba(hex, alpha) {
    const value = String(hex).replace('#', '');
    if (value.length !== 6) return `rgba(148, 163, 184, ${alpha})`;
    const r = parseInt(value.substring(0, 2), 16);
    const g = parseInt(value.substring(2, 4), 16);
    const b = parseInt(value.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
