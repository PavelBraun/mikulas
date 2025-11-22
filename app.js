const signature = '~Mikuláš a spol.';
let awardText = true;
// Name of the kiosk printer (provided by user)
const KIOSK_PRINTER_NAME = 'Diebold Nixdorf TP31';

// Track all timers/intervals so we can clear them when returning to welcome screen
(function(){
    try {
        const _setTimeout = window.setTimeout.bind(window);
        const _clearTimeout = window.clearTimeout.bind(window);
        const _setInterval = window.setInterval.bind(window);
        const _clearInterval = window.clearInterval.bind(window);
        window.__trackedTimeouts = new Set();
        window.__trackedIntervals = new Set();
        window.setTimeout = function(fn, ms, ...args) {
            const id = _setTimeout(fn, ms, ...args);
            try { window.__trackedTimeouts.add(id); } catch(e){}
            return id;
        };
        window.clearTimeout = function(id) { try { window.__trackedTimeouts.delete(id); } catch(e){}; return _clearTimeout(id); };
        window.setInterval = function(fn, ms, ...args) {
            const id = _setInterval(fn, ms, ...args);
            try { window.__trackedIntervals.add(id); } catch(e){}
            return id;
        };
        window.clearInterval = function(id) { try { window.__trackedIntervals.delete(id); } catch(e){}; return _clearInterval(id); };
        window.clearAllTrackedTimers = function() {
            try {
                for (const id of Array.from(window.__trackedTimeouts)) { _clearTimeout(id); window.__trackedTimeouts.delete(id); }
                for (const id of Array.from(window.__trackedIntervals)) { _clearInterval(id); window.__trackedIntervals.delete(id); }
            } catch(e) {}
        };
    } catch(e) {}
})();

    // Simple auto-print logger to centralize logs
function _autoLog(...args) {
    try {
        const prefix = '[AUTOPRINT]';
        console.log(prefix, ...args);
    } catch (e) {}
}

// Aplikace Mikuláš
const app = {
    // ---- Audio feedback (beep) pomocí WebAudio ----
    _audioCtx: null,
    // Is sound enabled (stored in localStorage)
    isSoundEnabled() {
        try {
            const v = localStorage.getItem('mikulas_sound_enabled');
            if (v === null) return true;
            return v === '1';
        } catch (e) { return true; }
    },
    // Správa zapnutí/vypnutí zvukových efektů
    async _buildInlinedPrintHtml() {
        try {
            const previewLetter = document.getElementById('printPreviewLetter');
            if (!previewLetter) return this._buildPrintHtmlForPreview();
            const letterNode = previewLetter.querySelector('.parchment') || previewLetter.querySelector('*');
            if (!letterNode) return this._buildPrintHtmlForPreview();

            const clone = letterNode.cloneNode(true);

            // Inline computed styles but skip font-size and transform so template CSS controls them
            function inlineStyles(element) {
                try {
                    const cs = window.getComputedStyle(element);
                    let styleStr = '';
                    for (let i = 0; i < cs.length; i++) {
                        const prop = cs[i];
                        // skip problematic properties
                        if (prop === 'font-size' || prop === 'transform' || prop === 'position' || prop.indexOf('margin') === 0 || prop === 'top' || prop === 'left') continue;
                        const val = cs.getPropertyValue(prop);
                        styleStr += `${prop}:${val};`;
                    }
                    element.setAttribute('style', styleStr);
                    // Adjust padding for parchment to reduce top margin
                    if (element.classList.contains('parchment')) {
                        element.style.padding = '0 4mm 6mm 6mm';
                        element.style.marginTop = '-5mm';
                    }
                } catch (e) {}
                Array.from(element.children || []).forEach(inlineStyles);
            }

            // Helper: try to fetch an element's src and convert to data URL; fallbackPath used if element is missing
            async function toDataUrlMaybe(el, fallbackPath) {
                try {
                    if (el && el.src) return await toDataUrl(el.src);
                    // fallback to provided path relative to page
                    const baseHref = (window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1));
                    const fallback = new URL(fallbackPath, baseHref).href;
                    return await toDataUrl(fallback);
                } catch (e) { return null; }
            }

            async function toDataUrl(path) {
                try {
                    const res = await fetch(path);
                    if (!res.ok) throw new Error('fetch-failed');
                    const blob = await res.blob();
                    return await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) { return null; }
            }

            const headerData = await toDataUrlMaybe(headerEl, 'images/bg-print-header.png');
            const footerData = await toDataUrlMaybe(footerEl, 'images/bg-print-footer.png');

            const headerHtml = headerData ? `<div class="print-header"><img src="${headerData}" alt="header"></div>` : '';
            const footerHtml = footerData ? `<div class="print-footer"><img src="${footerData}" alt="footer"></div>` : '';

            _autoLog('Print assets embedded - header present:', !!headerData, 'footer present:', !!footerData);

            const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8"><title>Mikuláš - Print</title><style>
                @page { size: 240mm auto; margin: 0; }
                html,body{margin:0;padding:0;background:#fff;color:#000}
                body{font-family: 'Segoe UI', Roboto, Arial, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; zoom:1; transform:none; -webkit-transform:none}
                .print-wrapper{margin:0 auto; box-sizing:border-box; padding:0; overflow:visible}
                .print-header img, .print-footer img{display:block;width:95%;height:auto;margin:0;padding:0}
                .parchment{font-size:14pt !important; line-height:1.25 !important; width:calc(100% - 15px) !important; display:block !important; transform:scale(3) !important; transform-origin:top left !important; position:static !important; top:auto !important; left:auto !important; margin:0 !important; padding:0 4mm 6mm 6mm !important; overflow:visible !important}
                img{width:100%; height:auto}
            </style></head><body><div class="print-wrapper">${headerHtml}${clone.outerHTML}${footerHtml}</div></body></html>`;
            return html;
        } catch (e) { console.warn('_buildInlinedPrintHtml failed', e); return this._buildPrintHtmlForPreview(); }
    },

    // Simple PDF HTML builder as a fallback — keeps content visible without transforms
    _buildPdfHtmlForPreview() {
        try {
            const previewLetter = document.getElementById('printPreviewLetter');
            const baseHref = (window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1));
            const headerEl = previewLetter ? previewLetter.querySelector('.print-preview-header-img') : null;
            const footerEl = previewLetter ? previewLetter.querySelector('.print-preview-footer-img') : null;
            const letterEl = previewLetter ? (previewLetter.querySelector('.parchment') || previewLetter.querySelector('*')) : document.querySelector('.parchment');
            let headerHtml = '';
            let footerHtml = '';
            if (headerEl && headerEl.src) headerHtml = `<div class="print-header"><img src="${headerEl.src}" alt="header"></div>`;
            if (footerEl && footerEl.src) footerHtml = `<div class="print-footer"><img src="${footerEl.src}" alt="footer"></div>`;
            const contentHtml = letterEl ? letterEl.outerHTML : '<div class="parchment">(no content)</div>';
            const html = `<!doctype html><html><head><base href="${baseHref}"><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8"><title>PDF Preview</title><style>
                @page{margin:0}
                html,body{height:100%;margin:0;padding:0}
                body{font-family: 'Segoe UI', Roboto, Arial, sans-serif; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; zoom:1; transform:none; -webkit-transform:none}
                .print-wrapper{width:100%;box-sizing:border-box;margin:0; padding:0; overflow:visible}
                .print-header img,.print-footer img{width:100%;height:auto;display:block}
                .parchment{font-size:13pt; line-height:1.25; width:100%; display:block; margin:0; padding:6mm; transform:none !important; position:static !important; overflow:visible}
            </style></head><body><div class="print-wrapper">${headerHtml}${contentHtml}${footerHtml}</div></body></html>`;
            return html;
        } catch (e) { console.warn('_buildPdfHtmlForPreview failed', e); return '<html><body>Failed to build PDF preview</body></html>'; }
    },
    setSoundEnabled(val) {
        try {
            localStorage.setItem('mikulas_sound_enabled', val ? '1' : '0');
        } catch (e) {}
    },
    // Auto-print toggle stored in localStorage
    isAutoPrintEnabled() {
        const v = localStorage.getItem('mikulas_auto_print');
        if (v === null) return true; // default enabled
        return v === '1';
    },
    setAutoPrintEnabled(val) {
        try {
            localStorage.setItem('mikulas_auto_print', val ? '1' : '0');
        } catch (e) {}
    },

    // Hotfolder toggle stored in localStorage for admin
    isHotfolderEnabled() {
        try { const v = localStorage.getItem('mikulas_use_hotfolder'); return v === '1'; } catch(e){ return false; }
    },
    setHotfolderEnabled(val) {
        try { localStorage.setItem('mikulas_use_hotfolder', val ? '1' : '0'); } catch(e){}
    },
    playBeep(duration = 80, frequency = 800, volume = 0.2) {
        if (!this.isSoundEnabled()) return;
        try {
            if (!this._audioCtx) {
                this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = this._audioCtx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.value = volume;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            setTimeout(() => {
                try { osc.stop(); } catch (e) {}
            }, duration);
        } catch (err) {
            console.warn('AudioContext not available:', err);
        }
    },
    // Přehraj více frekvencí současně (pro DTMF)
    playTones(frequencies = [800], duration = 80, volume = 0.2, type = 'sine') {
        if (!this.isSoundEnabled()) return;
        try {
            if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = this._audioCtx;
            const gain = ctx.createGain();
            gain.gain.value = volume;
            gain.connect(ctx.destination);
            const oscs = frequencies.map(f => {
                const o = ctx.createOscillator();
                o.type = type;
                o.frequency.value = f;
                o.connect(gain);
                o.start();
                return o;
            });
            setTimeout(() => { oscs.forEach(o => { try { o.stop(); } catch(e){} }); }, duration);
        } catch (err) {
            console.warn('playTones failed:', err);
        }
    },
    // DTMF map pro čísla
    playDTMF(digit) {
        const dtmf = {
            '1': [697,1209], '2': [697,1336], '3': [697,1477],
            '4': [770,1209], '5': [770,1336], '6': [770,1477],
            '7': [852,1209], '8': [852,1336], '9': [852,1477],
            '*': [941,1209], '0': [941,1336], '#': [941,1477]
        };
        if (!this.isSoundEnabled()) return;
        const freqs = dtmf[digit];
        if (freqs) this.playTones(freqs, 100, 0.18, 'sine');
        else this.playBeep(80, 900, 0.15);
    },
    // Zvuk pro chybné PIN (illegal)
    playIllegal() {
        if (!this.isSoundEnabled()) return;
        // Windows 'not allowed' like descending tone sequence
       const seq = [1000, 850, 700];
        seq.forEach((f, i) => {
            setTimeout(() => { this.playBeep(110, f, 0.25); }, i * 120);
        });

    },
    // Zvuk pro běžné kliknutí tlačítka
    playClick() {
        if (!this.isSoundEnabled()) return;
        this.playBeep(30, 1800, 0.08);

    },
    
    playMagic() {
    if (!this.isSoundEnabled()) return;
        const sweep = [700, 900, 1200, 1500];
        sweep.forEach((f, i) => {
            setTimeout(() => { this.playBeep(80, f, 0.12); }, i * 90);
        });
    },
    showToast(msg, ms = 3000) {
        try {
            const t = document.getElementById('toast');
            if (!t) return;
            t.textContent = msg;
            t.style.display = 'block';
            setTimeout(() => { try { t.style.display = 'none'; } catch(e){} }, ms);
        } catch (e) { console.log('toast failed', e); }
    },
    closeHelp() {
        document.getElementById('helpModal').classList.remove('active');
    },
    showHelp() {
        document.getElementById('helpModal').classList.add('active');
    },
    // Print preview lightbox
    // show === true -> display the preview as before
    // show === false -> prepare preview DOM but keep it hidden (returns a Promise)
    showPrintPreview(show = true) {
        return new Promise((resolve) => {
            try {
                const preview = document.getElementById('printPreview');
                const previewLetter = document.getElementById('printPreviewLetter');
                if (!preview || !previewLetter) {
                    _autoLog('Print preview elements missing', { previewExists: !!preview, previewLetterExists: !!previewLetter });
                    return resolve(false);
                }
            // Najdi originální pergamen a jeho uzel
            const orig = document.querySelector('.parchment');
            if (!orig) return;
            // Klonuj celý element, aby měl stejné styly a písmo
            const clone = orig.cloneNode(true);
            // Odeber možná ID zevnitř klonu
            clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
            // Vyčisti preview a vlož klon spolu s header/footer obrázky
            previewLetter.innerHTML = '';
            // vytvoř header img
            const headerImg = document.createElement('img');
            headerImg.className = 'print-preview-header-img';
            headerImg.src = 'images/bg-print-header.png';
            headerImg.alt = 'print header';
            headerImg.style.display = 'block';
            headerImg.style.width = '100%';
            headerImg.onerror = () => _autoLog('Header image failed to load: images/bg-print-header.png');
            // vytvoř footer img
            const footerImg = document.createElement('img');
            footerImg.className = 'print-preview-footer-img';
            footerImg.src = 'images/bg-print-footer.png';
            footerImg.alt = 'print footer';
            footerImg.style.display = 'block';
            footerImg.style.width = '100%';
            footerImg.onerror = () => _autoLog('Footer image failed to load: images/bg-print-footer.png');
            // append header, clone, footer
            previewLetter.appendChild(headerImg);
            previewLetter.appendChild(clone);
            previewLetter.appendChild(footerImg);
            // Debug logging
            _autoLog('Print preview prepared — inserting clone into previewLetter');
            // Show preview only if requested
            try {
                if (show) {
                    preview.style.display = 'flex';
                    preview.classList.add('active');
                } else {
                    // ensure hidden but present in DOM
                    preview.style.display = 'none';
                    preview.classList.remove('active');
                }
            } catch (err) {
                console.warn('Failed to set preview display/style', err);
            }
            // Check that background image exists (best-effort)
            try {
                const img = new Image();
                const el = document.querySelector('.print-preview-bg');
                const bg = el ? (el.style.backgroundImage || window.getComputedStyle(el).backgroundImage) : null;
                if (bg && bg !== 'none') {
                    // extract URL
                    const m = /url\(["']?(.*?)["']?\)/.exec(bg);
                    if (m && m[1]) {
                        img.onload = () => {
                            _autoLog('Print background image loaded:', m[1]);
                            return resolve(true);
                        };
                        img.onerror = () => {
                            _autoLog('Print background image failed to load:', m[1]);
                            return resolve(true);
                        };
                        img.src = m[1];
                    } else {
                        _autoLog('Could not parse print preview background URL from CSS:', bg);
                        return resolve(true);
                    }
                } else {
                    _autoLog('No print preview background set (print-preview-bg not found or backgroundImage none)');
                    return resolve(true);
                }
            } catch (err) {
                _autoLog('Background image check failed', err);
                return resolve(true);
            }
            // If we reach here and didn't resolve via image handlers, resolve immediately
            return resolve(true);
        } catch (e) { _autoLog('showPrintPreview failed', e); return resolve(false); }
        });
    },

    // Render current letter into a JPEG and send to local save server (hotfolder)
    async saveLetterAsImageAndSend() {
        try {
            // mm -> px at 300 DPI
            const DPI = 300;
            const mmToPx = (mm) => Math.round(mm * DPI / 25.4);
            const widthMm = 80;
            const heightMm = 80 * 3; // 1:3 ratio
            const w = mmToPx(widthMm);
            const h = mmToPx(heightMm);

            // Find elements: header, footer, letter content, signature
            const headerEl = document.querySelector('.print-preview-header-img') || null;
            const footerEl = document.querySelector('.print-preview-footer-img') || null;
            const orig = document.querySelector('.parchment') || document.querySelector('*');
            if (!orig) { _autoLog('No letter content found for image generation'); return false; }

            // Helper to fetch image and convert to data URL
            async function fetchDataUrl(src) {
                try {
                    const res = await fetch(src);
                    if (!res.ok) throw new Error('fetch failed');
                    const blob = await res.blob();
                    return await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) { return null; }
            }

            const headerData = headerEl && headerEl.src ? await fetchDataUrl(headerEl.src) : await fetchDataUrl('images/bg-print-header.png');
            const footerData = footerEl && footerEl.src ? await fetchDataUrl(footerEl.src) : await fetchDataUrl('images/bg-print-footer.png');
            // signature image path guessed - adjust if different
            const sigData = await fetchDataUrl('images/mikulas-signature.png') || null;

            // Clone content and inline basic styles
            const clone = orig.cloneNode(true);
            function inlineStyles(el) {
                try {
                    const cs = window.getComputedStyle(el);
                    let s = '';
                    for (let i = 0; i < cs.length; i++) {
                        const p = cs[i];
                        if (p === 'position' || p === 'top' || p === 'left') continue;
                        s += `${p}:${cs.getPropertyValue(p)};`;
                    }
                    el.setAttribute('style', s);
                } catch (e) {}
                Array.from(el.children || []).forEach(inlineStyles);
            }
            inlineStyles(clone);

            // Build HTML content for foreignObject
            const headerHtml = headerData ? `<div style="text-align:center;margin-bottom:4mm;"><img src="${headerData}" style="width:100%;height:auto;display:block"></div>` : '';
            const footerHtml = footerData ? `<div style="text-align:center;margin-top:4mm;"><img src="${footerData}" style="width:100%;height:auto;display:block"></div>` : '';
            const sigHtml = sigData ? `<div style="margin-top:6mm;text-align:right;"><img src="${sigData}" style="width:40%;height:auto;display:inline-block"></div>` : '';

            const wrapperStyle = `width:${w}px;height:${h}px;box-sizing:border-box;padding:6mm;background:#fff;color:#000;font-family:Segoe UI, Roboto, Arial, sans-serif;`;
            const innerHtml = `<div xmlns='http://www.w3.org/1999/xhtml' style='${wrapperStyle}'>${headerHtml}${clone.outerHTML}${sigHtml}${footerHtml}</div>`;

            // Build SVG with foreignObject
            const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>\n<foreignObject width='100%' height='100%'>${innerHtml}</foreignObject>\n</svg>`;

            const img = new Image();
            const svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            await new Promise((resolve, reject) => {
                img.onload = resolve; img.onerror = reject; img.src = svg64;
            });

            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
            ctx.drawImage(img, 0, 0, w, h);

            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const base64 = jpegDataUrl.replace(/^data:image\/jpeg;base64,/, '');

            // filename YYYYMMDD_mikulas_HHMMSS.jpg
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const fn = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_mikulas_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.jpg`;

            // POST to local server
            try {
                const res = await fetch('http://127.0.0.1:3333/save', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ filename: fn, data: base64 })
                });
                const json = await res.json();
                if (json && json.ok) {
                    _autoLog('Saved image to hotfolder:', json.path);
                    return true;
                } else {
                    _autoLog('Save server returned error', json);
                    return false;
                }
            } catch (e) { _autoLog('Could not POST to save server', e); return false; }

        } catch (e) { console.warn('saveLetterAsImageAndSend failed', e); return false; }
    },
    closePrintPreview() {
        try {
            const preview = document.getElementById('printPreview');
            if (!preview) return;
            _autoLog('Closing print preview');
            preview.classList.remove('active');
            try { preview.style.display = 'none'; } catch(e) { _autoLog('Failed to hide preview', e); }
        } catch (e) { _autoLog('closePrintPreview failed', e); }
    },
    // Print the preview lightbox content (opens a new window with the preview and calls print)
    printPreview(options = {}) {
        const { autoClose = false, timeout = 1500, silent = false } = options;
        return new Promise((resolve) => {
            try {
                // If silent printing requested: build an inlined HTML and attempt iframe print.
                if (silent) {
                    // Browser: true silent printing isn't available. We'll build an inlined HTML and attempt iframe print.
                    try {
                        this._buildInlinedPrintHtml().then((html) => {
                            // create a hidden iframe and print it (may show dialog depending on browser settings)
                            try {
                                const iframe = document.createElement('iframe');
                                iframe.style.position = 'fixed'; iframe.style.right = '100%'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = '0'; iframe.style.overflow = 'hidden'; iframe.setAttribute('aria-hidden', 'true');
                                document.body.appendChild(iframe);
                                const w = iframe.contentWindow; const doc = w.document;
                                doc.open(); doc.write(html); doc.close();
                                setTimeout(() => { try { w.focus && w.focus(); w.print && w.print(); } catch(e) { _autoLog('iframe.print failed', e); } setTimeout(() => { try { document.body.removeChild(iframe); } catch(e) {} }, 800); }, 300);
                                resolve(true);
                            } catch (e) { console.warn('iframe silent fallback failed', e); resolve(false); }
                        }).catch((err) => { console.warn('buildInlinedPrintHtml failed', err); resolve(false); });
                    } catch (e) { console.warn('silent print path failed', e); resolve(false); }
                    return;
                }
            const preview = document.getElementById('printPreview');
            const previewLetter = document.getElementById('printPreviewLetter');
            if (!preview || !previewLetter) {
                _autoLog('printPreview: preview elements missing');
                resolve(false);
                return;
            }
            // Find the parchment (letter) inside the preview specifically
            const orig = previewLetter.querySelector('.parchment') || previewLetter.querySelector('*') || document.querySelector('.parchment');
            if (!orig) { _autoLog('printPreview: no content to print'); return; }

            // Clone the node to avoid mutations
            const clone = orig.cloneNode(true);

            // Inline computed styles for the clone (simple best-effort)
            function inlineStyles(element) {
                const cs = window.getComputedStyle(element);
                let styleStr = '';
                for (let i = 0; i < cs.length; i++) {
                    const prop = cs[i];
                    styleStr += `${prop}:${cs.getPropertyValue(prop)};`;
                }
                element.setAttribute('style', styleStr);
                // recurse
                Array.from(element.children).forEach(inlineStyles);
            }
            inlineStyles(clone);

            // Prepare hidden iframe content to avoid visible popup
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '100%';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = '0';
            iframe.style.overflow = 'hidden';
            iframe.setAttribute('aria-hidden', 'true');
            document.body.appendChild(iframe);
            const w = iframe.contentWindow;
            if (!w || !w.document) { console.warn('Could not create print iframe'); try { document.body.removeChild(iframe); } catch(e){} resolve(false); return; }
            const doc = w.document;
            doc.open();
            // Basic HTML: include same background container styles
            // ensure relative URLs resolve inside the iframe by setting a base href
            const baseHref = (window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1));
            // measure sizes for header, letter and footer from the preview area (avoid global query)
            const headerEl = previewLetter.querySelector('.print-preview-header-img') || previewLetter.querySelector('.print-header img');
            const footerEl = previewLetter.querySelector('.print-preview-footer-img') || previewLetter.querySelector('.print-footer img');
            const letterEl = previewLetter.querySelector('.parchment') || previewLetter.querySelector('*');
            let rectW = 800;
            if (letterEl) {
                const r = letterEl.getBoundingClientRect();
                rectW = Math.round(r.width) || rectW;
            }
            // get header/footer URLs (if images exist)
            let headerUrl = headerEl ? headerEl.src : null;
            let footerUrl = footerEl ? footerEl.src : null;
            // If preview wasn't prepared, fall back to the known asset paths (absolute)
            try {
                const baseHrefForAssets = baseHref || (window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1));
                if (!headerUrl) headerUrl = new URL('images/bg-print-header.png', baseHrefForAssets).href;
                if (!footerUrl) footerUrl = new URL('images/bg-print-footer.png', baseHrefForAssets).href;
            } catch (e) { /* ignore URL errors */ }
            // Build head using fixed 80mm width for receipt printing; preserve header/footer aspect ratio
            const head = `
                <head>
                    <base href="${baseHref}">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <meta charset="utf-8">
                    <title>Mikuláš - Tisk</title>
                    <style>
                        /* Print on 80mm receipt paper */
                        @page {margin: 0; }
                        html,body{margin:0;padding:0;}
                        @page {margin: 0; }
                        html,body{margin:0;padding:0;}
                        body{zoom:1; transform:none; -webkit-transform:none}
                        .print-container{display:flex;align-items:flex-start;justify-content:center;padding:0;margin:0;background:#fff;}
                        /* wrapper is slightly narrower than full 80mm to avoid right-edge cutoff */
                        .print-wrapper{width:90%;margin:0;padding:0;overflow:hidden;} 
                        .print-header, .print-footer{width:100%;margin:0;padding:0;overflow:hidden;} 
                        .print-wrapper{width:90%;margin:0;padding:0;overflow:hidden;} 
                        .print-header, .print-footer{width:100%;margin:0;padding:0;overflow:hidden;} 
                        /* header/footer images fill the wrapper exactly and preserve aspect ratio */
                        .print-header img, .print-footer img{display:block;width:95%;height:auto;margin:0;padding:0;border:0;}
                        .print-letter{width:100%;margin:0;padding:20px 8px 20px 12px;}
                        img{display:block;width:95%;}
                        .print-header img, .print-footer img{display:block;width:95%;height:auto;margin:0;padding:0;border:0;}
                        .print-letter{width:100%;margin:0;padding:20px 8px 20px 12px;}
                        img{display:block;width:95%;}
                        body *{box-sizing:border-box;}
                    </style>
                </head>`;
            _autoLog('Print assets - header:', headerUrl, 'footer:', footerUrl);
            const headerHtml = headerUrl ? `<div class="print-header"><img src="${headerUrl}" alt="header"></div>` : '';
            const footerHtml = footerUrl ? `<div class="print-footer"><img src="${footerUrl}" alt="footer"></div>` : '';
            const body = `<body><div class="print-container"><div class="print-wrapper">${headerHtml}<div class="print-letter"></div>${footerHtml}</div></div></body>`;
            doc.write(`<!doctype html><html>${head}${body}</html>`);
            // insert the clone into the print-letter container
            const letterContainer = doc.querySelector('.print-letter');
            if (letterContainer) {
                const adopted = doc.adoptNode(clone);
                letterContainer.appendChild(adopted);
            }
            doc.close();

            // If autoClose requested, hide on-screen print controls so user doesn't see them
            const uiState = {};
            try {
                const pb = document.getElementById('printButton');
                if (pb) { uiState.printButtonDisplay = pb.style.display; pb.style.display = 'none'; }
                // hide modal's small buttons if present
                const modalBtns = document.querySelectorAll('#printPreview .btn-small');
                if (modalBtns && modalBtns.length) {
                    uiState.modalBtnDisplays = [];
                    modalBtns.forEach((b) => { uiState.modalBtnDisplays.push(b.style.display); b.style.display = 'none'; });
                }
                // Force a reflow so hiding is rendered before print dialog appears
                try { void document.body.offsetHeight; } catch(e){}
            } catch (e) { _autoLog('Could not hide on-screen print controls', e); }

            // Wait for images in the iframe document to load before printing
            const callPrint = () => {
                try {
                    // avoid bringing iframe window to foreground (don't call focus)
                    w.print();
                    // remove iframe after printing if autoClose
                    if (autoClose) {
                        setTimeout(() => {
                            try { document.body.removeChild(iframe); } catch(e){}
                            // restore UI
                            try {
                                const pb = document.getElementById('printButton');
                                if (pb) {
                                    // if we stored original display on dataset, restore that; otherwise use captured uiState
                                    if (pb.dataset && pb.dataset._prevDisplay !== undefined) {
                                        pb.style.display = pb.dataset._prevDisplay;
                                        delete pb.dataset._prevDisplay;
                                    } else if (uiState.printButtonDisplay !== undefined) {
                                        pb.style.display = uiState.printButtonDisplay;
                                    }
                                }
                                if (uiState.modalBtnDisplays && uiState.modalBtnDisplays.length) {
                                    const modalBtns = document.querySelectorAll('#printPreview .btn-small');
                                    modalBtns.forEach((b, i) => { try { b.style.display = uiState.modalBtnDisplays[i] || ''; } catch(e){} });
                                }
                            } catch(e) { _autoLog('Could not restore print UI', e); }
                            resolve(true);
                        }, 500);
                    } else {
                        try { document.body.removeChild(iframe); } catch(e){}
                        // restore UI immediately
                        try {
                            const pb = document.getElementById('printButton');
                            if (pb) {
                                if (pb.dataset && pb.dataset._prevDisplay !== undefined) {
                                    pb.style.display = pb.dataset._prevDisplay;
                                    delete pb.dataset._prevDisplay;
                                } else if (uiState.printButtonDisplay !== undefined) {
                                    pb.style.display = uiState.printButtonDisplay;
                                }
                            }
                            if (uiState.modalBtnDisplays && uiState.modalBtnDisplays.length) {
                                const modalBtns = document.querySelectorAll('#printPreview .btn-small');
                                modalBtns.forEach((b, i) => { try { b.style.display = uiState.modalBtnDisplays[i] || ''; } catch(e){} });
                            }
                        } catch(e) { _autoLog('Could not restore print UI', e); }
                        resolve(true);
                    }
                } catch (err) { _autoLog('printPreview: print failed', err); try { document.body.removeChild(iframe); } catch(e){}; resolve(false); }
            };

            try {
                const imgs = Array.from(doc.images || []);
                try {
                    _autoLog('printPreview: iframe has images count=', imgs.length, 'srcs=', imgs.map(i => i.src));
                } catch(e) {}
                if (imgs.length === 0) {
                    // no images, print immediately
                    setTimeout(callPrint, 100);
                } else {
                    let loaded = 0;
                    const onLoadOrError = () => {
                        loaded++;
                        if (loaded >= imgs.length) callPrint();
                    };
                    imgs.forEach(img => {
                        if (img.complete) {
                            loaded++;
                        } else {
                            img.addEventListener('load', onLoadOrError);
                            img.addEventListener('error', onLoadOrError);
                        }
                    });
                    if (loaded >= imgs.length) callPrint();
                    // safety fallback
                    setTimeout(() => { if (loaded < imgs.length) callPrint(); }, Math.max(1200, timeout));
                }
            } catch (err) {
                _autoLog('printPreview: image wait failed', err);
                setTimeout(callPrint, 300);
            }
        } catch (e) { _autoLog('printPreview failed', e); resolve(false); }
        });
    },

    // Prepare preview invisibly and ask main process to generate a PDF saved to disk
    savePreviewPdf() {
        try {
            // Prepare the preview DOM but keep it hidden
            this.showPrintPreview(false).then((ok) => {
                try {
                    // This build does not include a native PDF generation API.
                    // Build the printable HTML and offer it as a download so operators
                    // can inspect or print it manually if needed.
                    const html = this._buildPdfHtmlForPreview();
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'mikulas_print_preview.html';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    this.showToast('Náhled uložen jako HTML pro tisk', 3500);
                } catch (e) { console.warn('savePreviewPdf inner failed', e); }
            }).catch((e) => { console.warn('savePreviewPdf: showPrintPreview failed', e); });
        } catch (e) { console.warn('savePreviewPdf failed', e); }
    },

    // Small toast for user feedback
    showToast(msg, ms = 2500) {
        try {
            const t = document.getElementById('toast');
            if (!t) return;
            t.textContent = msg;
            t.style.display = 'block';
            t.style.opacity = '0';
            // fade-in
            t.style.transition = 'opacity 180ms ease';
            requestAnimationFrame(() => { t.style.opacity = '1'; });
            setTimeout(() => {
                t.style.opacity = '0';
                setTimeout(() => { try { t.style.display = 'none'; } catch(e){} }, 220);
            }, ms);
        } catch (e) { console.warn('showToast failed', e); }
    },

    // Build an HTML string by cloning the prepared preview and inlining computed styles
    _buildInlinedPrintHtml() {
        try {
            const previewLetter = document.getElementById('printPreviewLetter');
            if (!previewLetter) return this._buildPrintHtmlForPreview();
            // Find the letter node (parchment) inside preview
            const letterNode = previewLetter.querySelector('.parchment') || previewLetter.querySelector('*');
            if (!letterNode) return this._buildPrintHtmlForPreview();

            // Deep clone
            const clone = letterNode.cloneNode(true);

            // Inline computed styles recursively
            function inlineStyles(element) {
                try {
                    const cs = window.getComputedStyle(element);
                    let styleStr = '';
                    for (let i = 0; i < cs.length; i++) {
                        const prop = cs[i];
                        const val = cs.getPropertyValue(prop);
                        // Avoid embedding long or dynamic properties that may break print layout
                            styleStr += `${prop}:${val};`;
                    }
                    element.setAttribute('style', styleStr);
                } catch (e) {}
                Array.from(element.children || []).forEach(inlineStyles);
            }
            inlineStyles(clone);

            // Ensure the clone is visible and not transformed (some CSS used transforms to crop)
            try {
                if (clone.style) {
                    clone.style.transform = 'none';
                    clone.style.width = '100%';
                    clone.style.margin = '0';
                }
            } catch (e) {}

            // Build header/footer (if present in preview)
            const headerEl = previewLetter.querySelector('.print-preview-header-img') || previewLetter.querySelector('.print-header img');
            const footerEl = previewLetter.querySelector('.print-preview-footer-img') || previewLetter.querySelector('.print-footer img');
            // Determine asset URLs with fallback to known image paths
            const baseHref = (window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1));
            let headerUrl = headerEl && headerEl.src ? headerEl.src : null;
            let footerUrl = footerEl && footerEl.src ? footerEl.src : null;
            try {
                if (!headerUrl) headerUrl = new URL('images/bg-print-header.png', baseHref).href;
            } catch (e) { headerUrl = headerUrl || 'images/bg-print-header.png'; }
            try {
                if (!footerUrl) footerUrl = new URL('images/bg-print-footer.png', baseHref).href;
            } catch (e) { footerUrl = footerUrl || 'images/bg-print-footer.png'; }
            const headerHtml = headerUrl ? `<div class="print-header"><img src="${headerUrl}" alt="header"></div>` : '';
            const footerHtml = footerUrl ? `<div class="print-footer"><img src="${footerUrl}" alt="footer"></div>` : '';

            // Force print CSS: larger font, remove transforms/offsets and remove extra top spacing
            const html = `<!doctype html><html><head><base href="${baseHref}"><meta charset="utf-8"><title>Mikuláš - Print</title><style>
                @page{size:80mm auto; margin:0}
                html,body{margin:0;padding:0;background:#fff;color:#000}
                body{font-family: 'Segoe UI', Roboto, Arial, sans-serif; -webkit-font-smoothing:antialiased}
                .print-wrapper{width:80mm; margin:0 auto; box-sizing:border-box; padding:0}
                .print-header img, .print-footer img{display:block;width:100%;height:auto;margin:0;padding:0}
                .parchment{font-size:13pt !important; line-height:1.2 !important; width:100% !important; display:block !important; transform:none !important; margin:0 !important; padding:6mm !important}
                img{max-width:100%; height:auto}
            </style></head><body><div class="print-wrapper">${headerHtml}${clone.outerHTML}${footerHtml}</div></body></html>`;
            return html;
        } catch (e) { console.warn('_buildInlinedPrintHtml failed', e); return this._buildPrintHtmlForPreview(); }
    },

    // Silent print helper: prints provided HTML inside a hidden iframe and removes it quickly
    _silentPrint(htmlOrPromise, removeDelay = 1000) {
        return new Promise(async (resolve) => {
            try {
                const html = typeof htmlOrPromise === 'string' ? htmlOrPromise : await htmlOrPromise;
                if (!html) return resolve(false);
                try {
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'fixed'; iframe.style.right = '100%'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = '0'; iframe.style.overflow = 'hidden'; iframe.setAttribute('aria-hidden', 'true');
                    document.body.appendChild(iframe);
                    const w = iframe.contentWindow; const doc = w.document;
                    doc.open(); doc.write(html); doc.close();
                    const cleanup = () => { try { if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe); } catch (e) {} };
                    // If the iframe supports afterprint, use it to cleanup more reliably
                    try {
                        if (w && 'onafterprint' in w) {
                            const _onap = () => { try { cleanup(); } catch (e) {} finally { try { w.removeEventListener('afterprint', _onap); } catch(e){} resolve(true); } };
                            try { w.addEventListener('afterprint', _onap); } catch(e) { /* ignore */ }
                        }
                    } catch (e) { /* ignore */ }
                    // Trigger print shortly after resources settle
                    setTimeout(() => {
                        try { w.focus && w.focus(); w.print && w.print(); } catch (e) { _autoLog('_silentPrint iframe.print failed', e); }
                        setTimeout(cleanup, removeDelay);
                        // resolve even if afterprint isn't supported
                        resolve(true);
                    }, 300);
                } catch (e) { _autoLog('_silentPrint iframe setup failed', e); return resolve(false); }
            } catch (e) { _autoLog('_silentPrint failed to build html', e); return resolve(false); }
        });
    },

    async finishLetterAndPrint() {
        if (this.isPrinting) {
            _autoLog('finishLetterAndPrint: already printing, skipping');
            return;
        }
        this.isPrinting = true;
        // Called when user finishes viewing the letter. Prepare print window and auto-print, then continue.
        try {
            // If auto-print disabled, skip printing and go to goodbye immediately
            if (!this.isAutoPrintEnabled()) {
                try { this.goToGoodbye(); } catch(e){}
                return;
            }
            // If auto-print disabled, skip printing and go to goodbye immediately
            if (!this.isAutoPrintEnabled()) {
                try { this.goToGoodbye(); } catch(e){}
                return;
            }
            // Ensure the previewLetter is prepared (but do not show the modal)
            const previewLetter = document.getElementById('printPreviewLetter');
            if (!previewLetter) {
                console.warn('finishLetterAndPrint: previewLetter missing');
            }
            // make sure any visible preview is hidden so user doesn't see it flash
            try { this.closePrintPreview(); } catch(e) { console.warn('Could not hide preview before printing', e); }
            // hide the main print button immediately and save its previous state to dataset so printPreview can restore it
            try {
                const pb = document.getElementById('printButton');
                if (pb) { pb.dataset._prevDisplay = pb.style.display || ''; pb.style.display = 'none'; }
            } catch(e) { console.warn('Could not hide printButton before printing', e); }
            // Immediately navigate to goodbye so user doesn't wait for printing to finish
            try { this.goToGoodbye(); } catch(e) { console.warn('goToGoodbye failed', e); }
            
            // If hotfolder mode is enabled in admin, generate JPG and send to hotfolder instead of printing in browser
            if (this.isHotfolderEnabled()) {
                try {
                    _autoLog('Hotfolder mode enabled: generating image and sending to hotfolder');
                    const ok = await this.saveLetterAsImageAndSend();
                    if (!ok) _autoLog('Hotfolder save failed, falling back to normal print');
                } catch (e) { _autoLog('Hotfolder flow failed', e); }
                try { this.goToGoodbye(); } catch(e){}
                return;
            }

            // Allow simulation of native print for local debugging (set localStorage simulateNativePrint = '1')
            const simulate = localStorage.getItem('simulateNativePrint') === '1';
            if (simulate) {
                try {
                    _autoLog('finishLetterAndPrint: simulate native print active');
                    const html = this._buildPrintHtmlForPreview();
                    // Browser fallback: open hidden iframe and print (may show dialog depending on browser)
                    try {
                        const iframe = document.createElement('iframe');
                        iframe.style.position = 'fixed'; iframe.style.right = '100%'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; iframe.setAttribute('aria-hidden','true'); document.body.appendChild(iframe);
                        const w = iframe.contentWindow; const doc = w.document; doc.open(); doc.write(html); doc.close();
                        setTimeout(() => { try { w.focus && w.focus(); w.print && w.print(); } catch(e) { _autoLog('iframe.print failed', e); } setTimeout(() => { try { document.body.removeChild(iframe); } catch(e){} }, 800); }, 100);
                    } catch(e) { console.warn('simulate print iframe fallback failed', e); }
                    try { this.goToGoodbye(); } catch(e){}
                } catch (e) {
                    console.warn('simulate native print failed', e);
                    this.printPreview({ autoClose: true, timeout: 2000 }).then(() => { try { this.goToGoodbye(); } catch(e){} });
                }
            } else {
                // Prefer using the built-in lightbox.print() flow for auto-print so behaviour matches manual print dialog.
                // Prepare the preview hidden (not visible to user), activate in DOM with opacity 0, call lightbox.print(), wait for afterprint, then close and continue.
                this.showPrintPreview(false).then(async (ok) => {
                    if (!ok) {
                        _autoLog('Auto-print: preview failed to prepare, falling back to iframe print');
                        await this.printPreview({ autoClose: true, timeout: 2000 });
                        try { this.goToGoodbye(); } catch(e){}
                        return;
                    }

                    if (!this.isAutoPrintEnabled()) {
                        await this.printPreview({ autoClose: true, timeout: 2000 });
                        try { this.goToGoodbye(); } catch(e){}
                        return;
                    }

                    _autoLog('Auto-print: preparing preview and initiating silent fire-and-forget print');

                    // Insert autoprint override style
                    try {
                        const css = `@media print {
                            @page {  margin: 0 }
                            html,body,#printPreview { margin: 0 !important; height: auto !important; padding: 0 !important; }
                            body * { visibility: hidden !important; }
                            #printPreview, #printPreview * { visibility: visible !important; }
                            #printPreview { display: block !important; position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; }
                            #printPreview .print-preview-bg { width: 80mm !important; max-width:80mm !important; margin:0 !important; padding:0 !important; box-shadow:none !important; background: #fff !important; }
                            #printPreview .print-preview-bg .parchment { margin:0 !important; padding:3mm 6mm 6mm 6mm !important; box-shadow:none !important; width:100% !important; transform:none !important; position:static !important; }
                            #printPreview .print-header img, #printPreview .print-footer img { display:block !important; width:100% !important; height:auto !important; }
                        }`;
                        const style = document.createElement('style');
                        style.id = 'autoprint-override-style';
                        style.appendChild(document.createTextNode(css));
                        document.head.appendChild(style);
                        _autoLog('Inserted comprehensive autoprint override style');
                    } catch (e) { _autoLog('Could not insert autoprint override style', e); }

                    // Mark autoprint started so fallback flows skip duplicate printing
                    try { this._autoprintStarted = true; } catch(e){}

                    // Fire-and-forget print (prefer lightbox.print)
                    (async () => {
                        try {
                            if (window && window.lightbox && typeof window.lightbox.print === 'function') {
                                try { window.lightbox.print(); _autoLog('Called lightbox.print() (silent, fire-and-forget)'); } catch(e) { _autoLog('lightbox.print threw (fire-and-forget)', e); }
                            } else {
                                try {
                                    const html = await app._buildInlinedPrintHtml();
                                    await app._silentPrint(html, 800);
                                } catch (e) { _autoLog('autoprint iframe build failed', e); }
                            }
                        } catch (e) { _autoLog('Silent print fire-and-forget flow failed', e); }
                    })();

                    // Ensure preview is active but hidden to the user
                    try {
                        const embedPreviewImages = async () => {
                            try {
                                const baseHref = (window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1));
                                const previewLetter = document.getElementById('printPreviewLetter');
                                if (!previewLetter) return;
                                const headerImg = previewLetter.querySelector('.print-preview-header-img') || previewLetter.querySelector('.print-header img');
                                const footerImg = previewLetter.querySelector('.print-preview-footer-img') || previewLetter.querySelector('.print-footer img');
                                async function toDataUrl(url) {
                                    try {
                                        const res = await fetch(url);
                                        if (!res.ok) throw new Error('fetch-failed');
                                        const blob = await res.blob();
                                        return await new Promise((resolve, reject) => {
                                            const reader = new FileReader();
                                            reader.onloadend = () => resolve(reader.result);
                                            reader.onerror = reject;
                                            reader.readAsDataURL(blob);
                                        });
                                    } catch (e) { return null; }
                                }
                                if (headerImg && headerImg.src) {
                                    const data = await toDataUrl(headerImg.src).catch(() => null);
                                    if (data) headerImg.src = data;
                                } else if (previewLetter) {
                                    const h = previewLetter.querySelector('.print-header');
                                    if (h && !h.querySelector('img')) {
                                        const img = document.createElement('img'); img.className = 'print-preview-header-img'; img.src = new URL('images/bg-print-header.png', baseHref).href; h.insertBefore(img, h.firstChild);
                                        try { const d = await toDataUrl(img.src); if (d) img.src = d; } catch(e){}
                                    }
                                }
                                if (footerImg && footerImg.src) {
                                    const data = await toDataUrl(footerImg.src).catch(() => null);
                                    if (data) footerImg.src = data;
                                } else if (previewLetter) {
                                    const f = previewLetter.querySelector('.print-footer');
                                    if (f && !f.querySelector('img')) {
                                        const img = document.createElement('img'); img.className = 'print-preview-footer-img'; img.src = new URL('images/bg-print-footer.png', baseHref).href; f.appendChild(img);
                                        try { const d = await toDataUrl(img.src); if (d) img.src = d; } catch(e){}
                                    }
                                }
                            } catch (e) { _autoLog('embedPreviewImages failed', e); }
                        };
                        await embedPreviewImages();
                        const preview = document.getElementById('printPreview');
                        if (preview) {
                            preview.dataset._prevDisplay = preview.style.display || '';
                            preview.dataset._prevOpacity = preview.style.opacity || '';
                            preview.dataset._prevPointer = preview.style.pointerEvents || '';
                            preview.style.display = 'flex';
                            preview.classList.add('active');
                            preview.style.opacity = '0';
                            preview.style.pointerEvents = 'none';
                            _autoLog('Activated printPreview in DOM but kept invisible (opacity 0)');
                        }
                    } catch (e) { _autoLog('Could not activate hidden preview', e); }

                    // Finally, move user to goodbye immediately
                    try { this.goToGoodbye(); } catch(e) { _autoLog('goToGoodbye failed', e); }

                }).catch(async () => { await this.printPreview({ autoClose: true, timeout: 2000 }); try { this.goToGoodbye(); } catch(e){} });
            }
        } catch (e) { _autoLog('finishLetterAndPrint failed', e); this.goToGoodbye(); }
    },
    exportNames() {
        const data = this.loadData();
        const rows = ['PIN,Osloveni,Text dopisu'];
        data.children.forEach(child => {
            const pin = child.pin;
            const nameEsc = child.name ? child.name.replace(/"/g, '""') : '';
            let textDopisuEsc = child.text ? child.text.replace(/"/g, '""') : '';
            // Replace any newline with CRLF so Excel/Windows handles line breaks inside quoted fields
            textDopisuEsc = textDopisuEsc.replace(/\r?\n/g, '\r\n');
            // Build final text using real newlines instead of <br> tags
            const finalTextEsc = `Ahoj ${child.name || ''},\r\n\r\n${textDopisuEsc}\r\n`.replace(/"/g, '""');
            rows.push(`${pin},"${nameEsc}","${finalTextEsc}"`);
        });
        const csv = '\uFEFF' + rows.join('\r\n');
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const filename = `${dateStr}_Mikulas_jmena_${timeStr}.csv`;
        this.downloadCSV(csv, filename);
    },
    closeAdmin() {
        this.goToWelcome();
    },
    exportBackup() {
        const data = this.loadData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `${dateStr}_Mikulas_zaloha_${timeStr}.json`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    deleteChild(idx) {
        const data = this.loadData();
        data.children.splice(idx, 1);
        this.saveData(data);
        this.renderAdminTable();
    },
    currentChild: null,
    deleteQueue: null,
    sortColumn: null,
    sortDirection: 'asc',
    adminTab: 'names',

    prizes: [
        { name: '🎁 Dárek', color: '#e74c3c' },
        { name: '🍬 Cukrátko', color: '#3498db' },
        { name: '🎨 Pastelky', color: '#2ecc71' },
        { name: '📚 Knížka', color: '#f39c12' },
        { name: '🧸 Plyšák', color: '#9b59b6' },
        { name: '🎮 Hračka', color: '#1abc9c' },
        { name: '🍫 Čokoláda', color: '#e67e22' },
        { name: '⚽ Míč', color: '#34495e' },
        { name: '🎵 Hudba', color: '#e91e63' },
        { name: '🌟 Překvapení', color: '#ff9800' },
        { name: '🎪 Zábava', color: '#00bcd4' },
        { name: '🎉 Radost', color: '#8bc34a' }
    ],

    fortuneCookies: [
        "Tvoje budoucnost září jasnějším světlem než tisíc hvězd.",
        "Štěstí přichází k těm, kdo vytrvají.",
        "Dnes je den plný nových příležitostí.",
        "Tvoje láska a dobrota se ti vrátí stonásobně.",
        "Moudrý člověk dokáže najít radost i v malých věcech.",
        "Tvůj úsměv má moc změnit svět kolem tebe.",
        "Nejlepší je teprve před tebou.",
        "Tvá odvaha tě zavede tam, kam chceš.",
        "Každý den je šance začít znovu.",
        "Tvé srdce zná cestu, stačí ho poslouchat.",
        "Velké věci začínají malými kroky.",
        "Tvá pozitivní energie přitahuje zázraky.",
        "Věř si a dokážeš víc, než si myslíš.",
        "Tvoje laskavost je tvým největším pokladem.",
        "Nové dobrodružství na tebe čeká.",
        "Tvá trpělivost bude odměněna.",
        "Jsi silnější, než si dokážeš představit.",
        "Dnešní den přinese něco nečekaného a krásného.",
        "Tvá kreativita nezná hranic.",
        "Štěstí je v jednoduchosti.",
        "Tvá cesta je jedinečná a krásná.",
        "Každý krok tě přibližuje k tvému snu.",
        "Tvá vytrvalost se brzy vyplatí.",
        "Dnes je den, kdy se splní tvé přání.",
        "Tvá přítomnost rozjasňuje životy ostatních.",
        "Největší poklad máš uvnitř sebe.",
        "Tvé činy inspirují ty kolem tebe.",
        "Dobré věci se dějí těm, kdo věří.",
        "Tvá pozornost mění obyčejné v neobyčejné.",
        "Jsi na správné cestě, jen pokračuj.",
        "Tvá odvaha je světlo v temnotě.",
        "Malé radosti jsou ty největší dary.",
        "Tvá duše je plná kouzel.",
        "Každý den je nová kapitola tvého příběhu.",
        "Tvá vnitřní síla je nekonečná.",
        "Láska, kterou dáváš, se vrací zpět k tobě.",
        "Tvé sny jsou na dosah ruky.",
        "Jsi obklopen pozitivní energií.",
        "Tvá přirozenost je tvá největší síla.",
        "Dnes je den zázraků."
    ],

    randomNames: [
        "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery",
        "Quinn", "Skylar", "Charlie", "Dakota", "Jamie", "Reese", "Emery"
    ],

    jokes: [
        "Víte, proč má žirafa dlouhý krk? Protože má smradlavé nohy!",
        "Co dělá Pepíček ve vaně? Namáčí se!",
        "Tatínek se ptá: Pepíčku, kdo rozbil okno? To Pavel. A kdy? Když jsem do nějhodil cihlu.",
        "Přijde chlap do hospody: Pivo! Barman: To není moc zdvořilé. Chlap: Dobře, tak pivo, prosím. Až doběhnu!",
        "Co je to - zelené, má čtyři kolečka a zpívá? Travní sekačka. To zpívání jsem přidal, abyste to nehádali.",
        "Jaký je rozdíl mezi skokanem a raperem? Skokan skáče vysoko a rapuje nízko.",
        "Prarodiče sedí na lavičce. Děda povídá: Ty jo, babičko, pamatuješ si, jak jsme tady před 50 lety seděli? Babička: Ano. A víš, co by bylo hezké? Co? Dát si zase ruku do rozkroku!",
        "Pepíček se ptá táty: Tati, co je to optimista? To je člověk, který si myslí, že vše dobře dopadne. A pesimista? To je optimista s většími zkušenostmi.",
        "Přijde chlap k doktorovi: Pane doktore, mám pocit, že jsem neviditelný. Doktor: Kdo to mówi?",
        "Co udělá blondýnka, když vidí banán? Řekne: Hele, telefon!",
        "Víte, proč mají Slováci dlouhé nosy? Protože vzduch je zadarmo!",
        "Pepíček říká: Mami, dneska jsem ušetřil 50 korun! Jak? Běžel jsem za tramvají místo, abych jel! Ty hloupý chlapče, mohl jsi běžet za taxíkem a ušetřit 300!",
        "Přijde žák k tabuli a učitelka se ptá: Jaké je hlavní město Francie? Žák: P. Učitelka: Co je P? No přece Paříž!",
        "Co má společného Ferda Mravenec a Franta Vomáčka? Oba lezou po stěnách!",
        "Potká cikán druhého cikána. První povídá: Hele, včera jsem ukradl kalendář. A co s ním? Dostal jsem rok!",
        "Proč mají čeští fotbalisté silné ruce? Protože celý zápas drží střelné zbraně!",
        "Co dělá eskymák v posteli? Sní v spacáku!",
        "Přijde Pepíček do školy a učitelka se ptá: Kde máš domácí úkol? Snědl ho pes. To je hrozné! A co ty? Nic, je to můj pes!",
        "Víte, jak se řekne švédsky pivo? Pjívo!",
        "Co má společného hora a manželka? Čím víc se na ni díváš, tím menší se ti zdá!",
        "Dva kamarádi v hospodě. První povídá: Představ si, že jsem viděl, jak tvoje žena líbá chlapa na ulici! Druhý: To nic, ona líbá každého, když je opilá.",
        "Přijde muž domů a ptá se ženy: Miláčku, kde jsou ty prachy, co jsem ti dal na pračku? Manželka: Tady mám novou vestu!",
        "Pepíček se ptá: Tati, proč máš tak velké bříško? To je od piva, synku. A proč má mami tak velké bříško? Hmm, to je od... Táta: To musíš babičce!",
        "Co dělá horolezec na Vánoce? Stromolezec!",
        "Víte, jak se pozná chytrá blondýnka? To je ta s parochní!",
        "Setkají se dva kamarádi: Hele, slyšel jsem, že tvoje žena utekla s tvým nejlepším kamarádem! Jo, a proto ho budu hrozně postrádat!",
        "Co říká ježek, když potká kaktus? Ahoj, mami!",
        "Přijde chlap do obchodu: Dobrý den, máte brambory? Máme. A cibuli? Máme. A sádlo? Máme. Tak já si dám guláš!",
        "Proč dívky nosí kalhotky? Protože hasičům to trvá dlouho!",
        "Co dělá zelený slon? Zraje!",
        "Dva chlapi v hospodě. První: Včera mi žena řekla, že už mě nemiluje. Druhý: To je hrozné! První: Jo, ale dneska zase jo!",
        "Přijde blondýnka do obchodu: Chtěla bych levné lyže. Prodavač: Sáňky jsou tamhle!",
        "Co je to - stojí na rohu a pohybuje se? Prase, které má škytavku!",
        "Víte, proč mají cikáni velké rodiny? Aby nemuseli platit za televizní licenci - stačí jedna na celý karavan!",
        "Pepíček říká tátovi: Tati, já už vím, co budu dělat, až vyrostu! Co? Budu chodit s holí jako ty! S holí? Vždyť já nechodím s holí! Jo, ale až já vyrostu!",
        "Co dělá kovboj, když se nudí? Popojíždí!",
        "Dva kamarádi: Hele, slyšel jsem, že teď máš novou přítelkyni. Jo, je to taková vysoká blondýnka s modrýma očima. Ehm, ta měla zelené. Moment, to byla minulý týden!",
        "Víte, jak zastavit malého kluka? Kopnout mu do hlavy!",
        "Přijde chlap do hospody: Pivo a něco na zub! Barman: Prosím - pivo a vytržený nehtu!",
        "Co říká pan záchod paní záchodové? Ty vypadáš dneska nějak splacatě!",
        "Potká blondýnka druhou: Hele, co to máš za modřinu? To nic, včera jsem spadla ze žebříku. Ze žebříku? Vždyť ty ses přece bojíš výšek! Jo, ale to byl jen první příčel!",
        "Víte, proč se Pepíček směje ve spánku? Protože mu učitelka říkala vtipy v hodině!",
        "Co je to - má čtyři nohy a jedna ruka? Šťastný krokodýl!",
        "Dva chlapi: Má žena říká, že odejde, pokud si nekoupím novou záclonu. A co uděláš? Pomůžu jí balit!",
        "Proč mají hoši rádi matematiku? Protože tam můžou dělat různé úlohy s X!",
        "Co dělá tužka v posteli? Leží a čeká, až ji někdo ořeže!",
        "Víte, jak se pozná, že blondýnka poslala fax? Na obálce je známka!",
        "Pepíček přijde domů a říká: Tati, můžu tě něco požádat? Jasně, synku. Můžeš zavřít oči? Proč? Protože mi mami říkala, že dostaneš mrtvici, až uvidíš moje vysvědčení!",
        "Co dělá lékař, když přijde domů? Doktoruje si!",
        "Dva kamarádi: Hele, slyšel jsem, že tě žena vyhodila. Jo, řekla, že nemá ráda moje přátele. A co ty? Já taky ne, tak jsem šel!"
    ],

    // Načtení dat z localStorage
    loadData() {
        const data = localStorage.getItem('mikulasData');
        if (data) {
            return JSON.parse(data);
        }
        // Výchozí data
        return {
            children: [
                {
                    pin: '1234',
                    name: 'Sofie',
                    gender: 'female',
                    text: 'bylas letos hodná holčička! Měj se krásně!'
                },
                {
                    pin: '5678',
                    name: 'Tomáš',
                    gender: 'male',
                    text: 'byls letos hodný chlapec! Měj se krásně!'
                }
            ]
        };
    },

    // Uložení dat do localStorage
    saveData(data) {
        localStorage.setItem('mikulasData', JSON.stringify(data));
    },

    // Přechody mezi obrazovkami
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        // PINpad overlay zobrazit pouze na PIN obrazovce
        const pinpadOverlay = document.getElementById('pinpadOverlay');
        if (pinpadOverlay) {
            if (screenId === 'pinScreen') {
                pinpadOverlay.classList.add('active');
            } else {
                pinpadOverlay.classList.remove('active');
            }
        }
    },

    goToPin() {
        this.showScreen('pinScreen');
        // Vymazat PIN pole
        document.querySelectorAll('.pin-digit').forEach(input => {
            input.value = '';
        });
        document.querySelector('.pin-digit').focus();
    },

    // Show image-based PIN screen for very small children
    goToImagePin(expectedParentPin) {
        // expectedParentPin is the numeric PIN the parent entered (string)
        this._expectedNumericPin = expectedParentPin; // store to compare later
        // Build mapping of images to digits 1-9 from images folder
        try {
            console.log('goToImagePin: expectedParentPin=', expectedParentPin);
            const grid = document.getElementById('imagePinGrid');
            grid.innerHTML = '';
            // Hardcoded list discovery based on images in /images starting with i-
            const imgs = [
                'i-auticko.png','i-domecek.png','i-letadlo.png',
                'i-konicek.png','i-kocicka.png','i-kachnicka.png',
                'i-jablicko.png','i-medvidek.png','i-pejsek.png'
            ];
            // mapping index -> filename
            this._imagePinMap = {};
            for (let i = 0; i < 9; i++) {
                const fname = imgs[i] || '';
                this._imagePinMap[(i+1).toString()] = fname;
                const btn = document.createElement('button');
                btn.className = 'pinpad-btn image-pin-btn';
                btn.dataset.digit = (i+1).toString();
                if (fname) {
                    const img = document.createElement('img');
                    img.src = 'images/' + fname;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    btn.appendChild(img);
                } else {
                    btn.textContent = (i+1).toString();
                }
                grid.appendChild(btn);
            }
            // reset buffer
            this._imagePinBuffer = '';
            const dots = document.getElementById('imagePinDots');
            if (dots) dots.querySelectorAll('.pin-digit').forEach(d => d.textContent = '•');
            // clear last-pressed display
            const last = document.getElementById('imageLastPressed'); if (last) last.textContent = '';
            this.showScreen('pinImageScreen');
            console.log('goToImagePin: rendered grid, map=', this._imagePinMap);
        } catch (e) { console.warn('goToImagePin failed', e); }
    },

    // Start image-PIN flow directly (no parent numeric PIN). Child will enter images that map to digits.
    startImagePinDirect() {
        // We will treat this as if expectedParentPin is empty; on 4 presses we attempt to lookup the child directly
        this._expectedNumericPin = null;
        this._directImagePinLookup = true;
        this.goToImagePin('');
    },

    // Spustit vtipný režim (neviditelné tlačítko)
    triggerJoke() {
        const pinInputs = document.querySelectorAll('.pin-digit');
        const jokePin = ['4', '5', '6', '4'];
        
        // Animované vyplňování po jednom znaku
        let index = 0;
        const fillInterval = setInterval(() => {
            if (index < jokePin.length) {
                pinInputs[index].value = jokePin[index];
                index++;
            } else {
                clearInterval(fillInterval);
                // Po dokončení spustit verifikaci
                setTimeout(() => {
                    this.verifyPin();
                }, 200);
            }
        }, 150);
    },

    // Tajný kód při kliknutí na PIN pole
    secretCode() {
        const pinInputs = document.querySelectorAll('.pin-digit');
        const secretPin = ['7', '8', '9', '7'];
        
        // Animované vyplňování po jednom znaku
        let index = 0;
        const fillInterval = setInterval(() => {
            if (index < secretPin.length) {
                pinInputs[index].value = secretPin[index];
                index++;
            } else {
                clearInterval(fillInterval);
                // Po dokončení spustit verifikaci
                setTimeout(() => {
                    this.verifyPin();
                }, 200);
            }
        }, 150);
    },

    // Ověření PINu
    verifyPin() {
        const inputs = document.querySelectorAll('.pin-digit');
        const pin = Array.from(inputs).map(input => input.value).join('');
        
        if (pin.length !== 4) {
            document.getElementById('pinError').textContent = 'Zadej všechny 4 číslice';
            return;
        }

        // Kontrola admin PINu
        if (pin === '9989') {
            this.showAdmin();
            return;
        }

        // Speciální PIN pro fortune cookie
        if (pin === '7897') {
            
            // Vygenerovat náhodnou fortune cookie větu
            const fortuneCookie = this.fortuneCookies[Math.floor(Math.random() * this.fortuneCookies.length)];
            awardText = false;
            // Vytvořit dočasné dítě
            this.currentChild = {
                pin: '7897',
                text: `Vítáme tě tady,\n\n${fortuneCookie}`
            };
            
            this.startLoading();
            return;
        }

        // Speciální PIN pro štěstíčko
        if (pin === '1231') {
            
            // Vygenerovat náhodnou fortune cookie větu
            const fortuneCookie = this.fortuneCookies[Math.floor(Math.random() * this.fortuneCookies.length)];
            
            // Vytvořit dočasné dítě
            this.currentChild = {
                pin: '1231',
                text: `Tvé štěstíčko:\n\n${fortuneCookie}`
            };
            awardText = false;
            
            this.startLoading();
            return;
        }

        // Speciální PIN pro vtipy
        if (pin === '4564') {

            awardText = false;
            
            // Vygenerovat náhodný vtip
            const randomJoke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
            
            // Vytvořit dočasné dítě
            this.currentChild = {
                pin: '4564',
                text: `Máme pro tebe vtip:\n\n${randomJoke}`
            };
            
            this.startLoading();
            return;
        }

        // If PIN starts with '2' we expect a parent-entered numeric PIN and then an image-entry by child
        // But if we've just returned from an image-PIN flow, skip redirect to avoid loop
        if (pin.length === 4 && pin[0] === '2' && !this._skipImageRedirect) {
            // Redirect to image PIN screen; store expected numeric pin
            this.goToImagePin(pin);
            return;
        }
        // Clear the skip flag after using it once
        this._skipImageRedirect = false;

        // Hledání dítěte
        const data = this.loadData();
        const child = data.children.find(c => c.pin === pin);

        if (child) {
            this.currentChild = child;
            this.startLoading();
        } else {
            // Animace PINpadu při chybě
            const pinpadOverlay = document.getElementById('pinpadOverlay');
            const pinpadDigits = document.getElementById('pinpadDigits');
            if (pinpadOverlay) {
                pinpadOverlay.classList.add('error');
                try { app.playIllegal(); } catch (err) {}
                setTimeout(() => {
                    pinpadOverlay.classList.remove('error');
                    if (pinpadDigits) pinpadDigits.textContent = '____';
                    inputs.forEach(input => input.value = '');
                }, 500);
            }
            // Vymazat PIN po chybě
            setTimeout(() => {
                inputs.forEach(input => input.value = '');
                inputs[0].focus();
            }, 1500);
        }
    },
    

    // Zobrazení dopisu
    showLetter() {
        // Pro vtipy neaplikovat odměnu a podpis
        let fullText = ''
        let greetings = this.currentChild.name ? 'Ahoj ' + this.currentChild.name + ',\n\n' : '';
        let awardSuffix = awardText ? '\n\nUžij si svou odměnu!\n\n' : '';
        fullText = greetings + this.currentChild.text + awardSuffix;
        // console.log(fullText);
        
        // Odsazení třetího řádku pod nadpisem
        const lines = fullText.split('\n');
        if (lines.length > 2) {
            lines[2] = '<span style="text-indent:2ch;display:inline-block;width:calc(100% - 3ch);">' + lines[2] + '</span>';
            lines[2] = '<span style="text-indent:2ch;display:inline-block;width:calc(100% - 3ch);">' + lines[2] + '</span>';
        }

        const formattedText = lines.join('<br>');
        const letterElement = document.getElementById('letterText');
        letterElement.innerHTML = formattedText + '<div style="text-align: right; margin-top: 10px;">' + signature + '</div>';
        
        // Skrýt/zobrazit neviditelné tlačítko podle typu PINu
        const regenerateBtn = document.querySelector('.secret-regenerate-btn');
        if (this.currentChild.pin === '4564' || this.currentChild.pin === '7897' || this.currentChild.pin === '1231') {
            regenerateBtn.style.display = 'block';
        } else {
            regenerateBtn.style.display = 'none';
        }
        
        this.showScreen('letterScreen');
    },

    // Start the loading/progress animation then show the letter after 2s
    startLoading() {
        try {
            // Show wheel/loading screen with progress for 2s, then show letter
            try {
                // Defensive: hide/clear pinpad to prevent stray clicks or actions
                try {
                    const pinpadOverlay = document.getElementById('pinpadOverlay');
                    if (pinpadOverlay) {
                        pinpadOverlay.classList.remove('active');
                        // clear any temporary pinpad buffer if present
                        try { pinpadOverlay.querySelectorAll('.pin-digit').forEach(i => i.value = ''); } catch(e){}
                    }
                    // also clear any focused input
                    try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch(e){}
                } catch(e) {}

                this.showScreen('wheelScreen');
                const pf = document.getElementById('progressFill');
                if (pf) {
                    // reset and trigger CSS transition to 100%
                    pf.style.transition = 'none';
                    pf.style.width = '0%';
                    // force reflow
                    // eslint-disable-next-line no-unused-expressions
                    pf.offsetWidth;
                    pf.style.transition = 'width 2000ms linear';
                    pf.style.width = '100%';
                }
                setTimeout(() => {
                    try { this.showLetter(); } catch (e) { console.warn('showLetter failed after loading', e); }
                }, 2000);
            } catch (e) {
                console.warn('startLoading inner failed', e);
                try { this.showLetter(); } catch (ee) {}
            }
        } catch (e) { console.warn('startLoading failed', e); this.showLetter(); }
    },

    // Regenerovat obsah (vtipy nebo motivaci)
    regenerateContent() {
        if (this.currentChild.pin === '4564') {
            // Nový vtip
            const randomJoke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
            this.currentChild.text = `Máme pro tebe vtip:\n\n${randomJoke}`;
            this.showLetter();
        } else if (this.currentChild.pin === '7897') {
            // Nová motivační věta
            const fortuneCookie = this.fortuneCookies[Math.floor(Math.random() * this.fortuneCookies.length)];
            this.currentChild.text = `Vítáme tě tady,\n\n${fortuneCookie}`;
            awardText = false;
            this.showLetter();
        } else if (this.currentChild.pin === '1231') {
            // Nové štěstíčko
            const fortuneCookie = this.fortuneCookies[Math.floor(Math.random() * this.fortuneCookies.length)];
            this.currentChild.text = `Tvé štěstíčko:\n\n${fortuneCookie}`;
            awardText = false;
            this.showLetter();
        }
    },

    goToGoodbye(delayMs = 5000) {
        this.isPrinting = false;
        try { this.playMagic(); } catch (e) {}
        try {
            // Show goodbye immediately, then after delayMs return to welcome
            this.showScreen('goodbyeScreen');
            setTimeout(() => { try { this.goToWelcome(); } catch(e){} }, delayMs);
        } catch (e) { this.showScreen('goodbyeScreen'); }
    },

    restart() {
        this.currentChild = null;
        this.currentPrize = null;
        awardText = true;
        this.goToWelcome();
    },

    goToWelcome() {
        try {
            // clear tracked timers/intervals
            try { if (window.clearAllTrackedTimers) window.clearAllTrackedTimers(); } catch(e){}
            // reset some transient flags
            this._directImagePinLookup = false;
            this._imagePinBuffer = '';
            this._expectedNumericPin = null;
            // show welcome
            this.showScreen('welcomeScreen');
        } catch(e) { this.showScreen('welcomeScreen'); }
    },

    // Admin panel
    showAdmin() {
        this.showScreen('adminScreen');
        this.renderAdminTable();
    },

    switchAdminTab(tab) {
        this.adminTab = tab;
        document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        this.renderAdminTab();
    },

    renderAdminTab() {
        const container = document.getElementById('adminTabContent');
        if (this.adminTab === 'names') {
            container.innerHTML = `<div class="admin-controls">
                <button onclick="app.addChild()" class="btn-small">➕ Přidat dítě</button>
                <button onclick="app.exportNames()" class="btn-small">💾 Exportovat jména</button>
                <button onclick="app.openImportModal('names')" class="btn-small">📂 Importovat jména</button>
            </div>
            <table class="admin-table" id="adminTable">
                <thead>
                    <tr>
                        <th class="sortable" id="sort-pin" style="width:75px;">PIN</th>
                        <th class="sortable" id="sort-name">Osloveni</th>
                        <th style="width:60px;">Akce</th>
                    </tr>
                </thead>
                <tbody id="adminTableBody"></tbody>
            </table>`;
            this.renderAdminTable();
            // Řazení tabulky kliknutím na hlavičku
            document.getElementById('sort-pin').addEventListener('click', () => app.sortAdminTable('pin'));
            document.getElementById('sort-name').addEventListener('click', () => app.sortAdminTable('name'));
        } else if (this.adminTab === 'jokes') {
            container.innerHTML = `<div class="admin-controls">
                <button onclick="app.addJoke()" class="btn-small">➕ Přidat vtip</button>
                <button onclick="app.exportJokes()" class="btn-small">💾 Exportovat vtipy</button>
                <button onclick="app.openImportModal('jokes')" class="btn-small">📂 Importovat vtipy</button>
            </div>
            <table class="admin-table-simple" id="jokesTable">
                <thead>
                    <tr>
                        <th>Poznámka</th>
                        <th>Akce</th>
                    </tr>
                </thead>
                <tbody id="jokesTableBody"></tbody>
            </table>`;
            this.renderJokesTable();
        } else if (this.adminTab === 'phrases') {
            container.innerHTML = `<div class="admin-controls">
                <button onclick="app.addPhrase()" class="btn-small">➕ Přidat frázi</button>
                <button onclick="app.exportPhrases()" class="btn-small">💾 Exportovat fráze</button>
                <button onclick="app.openImportModal('phrases')" class="btn-small">📂 Importovat fráze</button>
            </div>
            <table class="admin-table-simple" id="phrasesTable">
                <thead>
                    <tr>
                        <th>Poznámka</th>
                        <th>Akce</th>
                    </tr>
                </thead>
                <tbody id="phrasesTableBody"></tbody>
            </table>`;
            this.renderPhrasesTable();
        }
    },

    renderAdminTable() {
        // Původní renderování tabulky dětí
        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return; // Element neexistuje, pokud není aktivní tab 'names'
        tbody.innerHTML = '';
        const data = this.loadData();
        let children = data.children.slice();
        // Řazení podle sortColumn
        if (this.sortColumn) {
            children.sort((a, b) => {
                let valA = this.sortColumn === 'pin' ? a.pin : a.name.toLowerCase();
                let valB = this.sortColumn === 'pin' ? b.pin : b.name.toLowerCase();
                if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        children.forEach((child, idx) => {
            // Sestavíme text pro sloupec Osloveni
            let text = child.text || '';
            // Odstraníme HTML tagy, pokud jsou
            text = text.replace(/<[^>]*>/g, '').replace(/\r?\n/g, ' ');
            let osloveni = `Ahoj ${child.name}, ${text}`;
            tbody.innerHTML += `<tr>
                <td style="width:75px; font-size:50px;">${child.pin}</td>
                <td class="osloveni-cell" data-idx="${idx}">${osloveni}</td>
                <td class="actions" style="width:50px; text-align:center;">
                    <button class="btn-small btn-danger" data-idx="${idx}" data-confirm="0">🗑️</button>
                </td>
            </tr>`;
        });
        // Double-click na jméno otevře editaci
        Array.from(tbody.querySelectorAll('.osloveni-cell')).forEach(cell => {
            cell.addEventListener('dblclick', function(e) {
                const idx = parseInt(cell.getAttribute('data-idx'));
                app.editChild(idx);
            });
        });
        // Potvrzovací logika pro mazání jména
        Array.from(tbody.querySelectorAll('.btn-danger')).forEach(btn => {
            btn.addEventListener('click', function(e) {
                const idx = parseInt(btn.getAttribute('data-idx'));
                if (btn.getAttribute('data-confirm') === '0') {
                    btn.textContent = '✅';
                    btn.setAttribute('data-confirm', '1');
                    btn.classList.add('confirm-delete');
                    setTimeout(() => {
                        btn.textContent = '🗑️';
                        btn.setAttribute('data-confirm', '0');
                        btn.classList.remove('confirm-delete');
                    }, 2000);
                } else {
                    app.deleteChild(idx);
                }
            });
        });
    },

    sortAdminTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.renderAdminTable();
    },

    renderJokesTable() {
        const tbody = document.getElementById('jokesTableBody');
        tbody.innerHTML = '';
        this.jokes.forEach((joke, idx) => {
            tbody.innerHTML += `<tr>
                <td class="joke-cell" data-idx="${idx}">${joke}</td>
                <td class="actions">
                    <button class="btn-small btn-danger" data-idx="${idx}" data-confirm="0">🗑️</button>
                </td>
            </tr>`;
        });
        // Double-click na vtip otevře editaci
        Array.from(tbody.querySelectorAll('.joke-cell')).forEach(cell => {
            cell.addEventListener('dblclick', function(e) {
                const idx = parseInt(cell.getAttribute('data-idx'));
                app.editJoke(idx);
            });
        });
        // Potvrzovací logika pro mazání vtipu
        Array.from(tbody.querySelectorAll('.btn-danger')).forEach(btn => {
            btn.addEventListener('click', function(e) {
                const idx = parseInt(btn.getAttribute('data-idx'));
                if (btn.getAttribute('data-confirm') === '0') {
                    btn.textContent = '✅';
                    btn.setAttribute('data-confirm', '1');
                    btn.classList.add('confirm-delete');
                    setTimeout(() => {
                        btn.textContent = '🗑️';
                        btn.setAttribute('data-confirm', '0');
                        btn.classList.remove('confirm-delete');
                    }, 2000);
                } else {
                    app.deleteJoke(idx);
                }
            });
        });
    },

    renderPhrasesTable() {
        const tbody = document.getElementById('phrasesTableBody');
        tbody.innerHTML = '';
        this.fortuneCookies.forEach((phrase, idx) => {
            tbody.innerHTML += `<tr>
                <td class="phrase-cell" data-idx="${idx}">${phrase}</td>
                <td class="actions">
                    <button class="btn-small btn-danger" data-idx="${idx}" data-confirm="0">🗑️</button>
                </td>
            </tr>`;
        });
        // Double-click na frázi otevře editaci
        Array.from(tbody.querySelectorAll('.phrase-cell')).forEach(cell => {
            cell.addEventListener('dblclick', function(e) {
                const idx = parseInt(cell.getAttribute('data-idx'));
                app.editPhrase(idx);
            });
        });
        // Potvrzovací logika pro mazání fráze
        Array.from(tbody.querySelectorAll('.btn-danger')).forEach(btn => {
            btn.addEventListener('click', function(e) {
                const idx = parseInt(btn.getAttribute('data-idx'));
                if (btn.getAttribute('data-confirm') === '0') {
                    btn.textContent = '✅';
                    btn.setAttribute('data-confirm', '1');
                    btn.classList.add('confirm-delete');
                    setTimeout(() => {
                        btn.textContent = '🗑️';
                        btn.setAttribute('data-confirm', '0');
                        btn.classList.remove('confirm-delete');
                    }, 2000);
                } else {
                    app.deletePhrase(idx);
                }
            });
        });
    },

    addChild() {
        this.editingType = 'child';
        this.editingIndex = null;
        document.getElementById('editModalTitle').textContent = 'Přidat dítě';
        document.getElementById('editModalLabel').textContent = 'PIN:';
        const modal = document.getElementById('editModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // Vygenerovat nový nepoužitý PIN
        const data = this.loadData();
        const usedPins = new Set(data.children.map(child => child.pin));
        let newPin = '';
        for (let i = 1000; i <= 9999; i++) {
            const pin = i.toString();
            if (!usedPins.has(pin) && pin !== '9989' && pin !== '7897' && pin !== '1231' && pin !== '4564') {
                newPin = pin;
                break;
            }
        }
        
        // Přidáme extra pole pro jméno a text
        modalContent.innerHTML = `
            <h2 id="editModalTitle">Přidat dítě</h2>
            <label>PIN:</label>
            <input type="text" id="modalEditPin" maxlength="4" value="${newPin}" />
            <label>Jméno:</label>
            <input type="text" id="modalEditName" />
            <label>Text dopisu:</label>
            <textarea id="modalEditText"></textarea>
            <div class="modal-buttons">
                <button class="btn-edit" onclick="app.saveChildModal()">💾 Uložit</button>
                <button class="btn-edit" onclick="app.closeModal()">❌ Zrušit</button>
            </div>
        `;
        modal.classList.add('active');
        
        // Nastavit focus na pole Jméno po zobrazení modalu
        setTimeout(() => {
            document.getElementById('modalEditName').focus();
        }, 100);
    },
    
    editChild(idx) {
        this.editingType = 'child';
        this.editingIndex = idx;
        const data = this.loadData();
        const child = data.children[idx];
        const modal = document.getElementById('editModal');
        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <h2 id="editModalTitle">Upravit dítě</h2>
            <label>PIN:</label>
            <input type="text" id="modalEditPin" maxlength="4" value="${child.pin}" />
            <label>Jméno:</label>
            <input type="text" id="modalEditName" value="${child.name}" />
            <label>Text dopisu:</label>
            <textarea id="modalEditText">${child.text || ''}</textarea>
            <div class="modal-buttons">
                <button class="btn-edit" onclick="app.saveChildModal()">💾 Uložit</button>
                <button class="btn-edit" onclick="app.closeModal()">❌ Zrušit</button>
            </div>
        `;
        modal.classList.add('active');
    },

    saveChildModal() {
        const pin = document.getElementById('modalEditPin').value.trim();
        const name = document.getElementById('modalEditName').value.trim();
        const text = document.getElementById('modalEditText').value.trim();
        
        if (!pin || !name) {
            alert('PIN a jméno jsou povinné!');
            return;
        }
        
        const data = this.loadData();
        
        if (this.editingIndex === null) {
            // Přidání nového dítěte
            data.children.push({ pin, name, text });
        } else {
            // Úprava existujícího dítěte
            data.children[this.editingIndex] = { pin, name, text };
        }
        
        this.saveData(data);
        this.renderAdminTable();
        this.closeModal();
    },

    addJoke() {
        this.editingType = 'joke';
        this.editingIndex = null;
        document.getElementById('editModalTitle').textContent = 'Přidat vtip';
        document.getElementById('editModalLabel').textContent = 'Poznámka:';
        document.getElementById('modalEditText').value = '';
        document.getElementById('editModal').classList.add('active');
    },
    editJoke(idx) {
        this.editingType = 'joke';
        this.editingIndex = idx;
        document.getElementById('editModalTitle').textContent = 'Upravit vtip';
        document.getElementById('editModalLabel').textContent = 'Poznámka:';
        document.getElementById('modalEditText').value = this.jokes[idx];
        document.getElementById('editModal').classList.add('active');
    },
    deleteJoke(idx) {
        this.jokes.splice(idx, 1);
        this.renderJokesTable();
    },
    addPhrase() {
        this.editingType = 'phrase';
        this.editingIndex = null;
        document.getElementById('editModalTitle').textContent = 'Přidat frázi';
        document.getElementById('editModalLabel').textContent = 'Poznámka:';
        document.getElementById('modalEditText').value = '';
        document.getElementById('editModal').classList.add('active');
    },
    editPhrase(idx) {
        this.editingType = 'phrase';
        this.editingIndex = idx;
        document.getElementById('editModalTitle').textContent = 'Upravit frázi';
        document.getElementById('editModalLabel').textContent = 'Poznámka:';
        document.getElementById('modalEditText').value = this.fortuneCookies[idx];
        document.getElementById('editModal').classList.add('active');
    },
    deletePhrase(idx) {
        this.fortuneCookies.splice(idx, 1);
        this.renderPhrasesTable();
    },
    saveEditModal() {
        const val = document.getElementById('modalEditText').value.trim();
        if (this.editingType === 'joke') {
            if (this.editingIndex === null) {
                this.jokes.push(val);
            } else {
                this.jokes[this.editingIndex] = val;
            }
            this.renderJokesTable();
        } else if (this.editingType === 'phrase') {
            if (this.editingIndex === null) {
                this.fortuneCookies.push(val);
            } else {
                this.fortuneCookies[this.editingIndex] = val;
            }
            this.renderPhrasesTable();
        }
        document.getElementById('editModal').classList.remove('active');
    },
    closeModal() {
        const modal = document.getElementById('editModal');
        modal.classList.remove('active');
        // Obnovit původní strukturu modalu
        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <h2 id="editModalTitle">Upravit</h2>
            <label id="editModalLabel">Poznámka:</label>
            <textarea id="modalEditText"></textarea>
            <div class="modal-buttons">
                <button class="btn-edit" onclick="app.saveEditModal()">💾 Uložit</button>
                <button class="btn-edit" onclick="app.closeModal()">❌ Zrušit</button>
            </div>
        `;
    },

    // Import/export CSV
    exportJokes() {
        const rows = ['Poznamka'];
        this.jokes.forEach(joke => {
            const text = joke.replace(/"/g, '""');
            rows.push(`"${text}"`);
        });
        const csv = '\uFEFF' + rows.join('\r\n');
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const filename = `${dateStr}_Mikulas_vtipy_${timeStr}.csv`;
        this.downloadCSV(csv, filename);
    },
    exportPhrases() {
        const rows = ['Poznamka'];
        this.fortuneCookies.forEach(phrase => {
            const text = phrase.replace(/"/g, '""');
            rows.push(`"${text}"`);
        });
        const csv = '\uFEFF' + rows.join('\r\n');
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const filename = `${dateStr}_Mikulas_fraze_${timeStr}.csv`;
        this.downloadCSV(csv, filename);
    },
    openImportModal(type) {
        this.importType = type;
        document.getElementById('importModal').classList.add('active');
        document.getElementById('importModalTitle').textContent = 'Importovat ' + (type === 'jokes' ? 'vtipy' : type === 'phrases' ? 'fráze' : 'jména');
        document.getElementById('importTemplateLink').innerHTML = `<a href="#" onclick="app.downloadTemplate('${type}')">Stáhnout šablonu CSV</a>`;
    },
    closeImportModal() {
        document.getElementById('importModal').classList.remove('active');
    },
    downloadTemplate(type) {
        let csv = '\uFEFFPoznamka\n"Příklad textu"';
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const filename = `${dateStr}_Mikulas_${type}_${timeStr}-template.csv`;
        this.downloadCSV(csv, filename);
    },
    importCSVModal() {
        const fileInput = document.getElementById('importFileInput');
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
            if (lines.length < 2) return;
            const items = lines.slice(1).map(l => l.replace(/^"|"$/g, '').replace(/""/g, '"'));
            if (this.importType === 'jokes') {
                this.jokes = items;
                this.renderJokesTable();
            } else if (this.importType === 'phrases') {
                this.fortuneCookies = items;
                this.renderPhrasesTable();
            }
            this.closeImportModal();
        };
        reader.readAsText(file, 'UTF-8');
    },
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Načtení při načtení
};

// Ensure window.lightbox.print exists — lightweight shim that prints prepared preview
try {
    if (!window.lightbox) window.lightbox = {};
    if (!window.lightbox.print || typeof window.lightbox.print !== 'function') {
        window.lightbox.print = function lightboxPrintShim() {
            (async () => {
                try {
                    _autoLog('lightbox.print shim: building inlined HTML');
                    const html = await app._buildInlinedPrintHtml();
                    // create hidden iframe
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'fixed';
                    iframe.style.right = '100%';
                    iframe.style.width = '0px';
                    iframe.style.height = '0px';
                    iframe.style.border = '0';
                    iframe.style.overflow = 'hidden';
                    iframe.setAttribute('aria-hidden', 'true');
                    document.body.appendChild(iframe);
                    const w = iframe.contentWindow;
                    const doc = w.document;
                    doc.open();
                    doc.write(html);
                    doc.close();
                    // wait for images in iframe
                    try {
                        const imgs = Array.from(doc.images || []);
                        if (imgs.length > 0) {
                            await new Promise((resolve) => {
                                let loaded = 0;
                                const onDone = () => { loaded++; if (loaded >= imgs.length) resolve(true); };
                                imgs.forEach(img => {
                                    if (img.complete) { onDone(); return; }
                                    img.addEventListener('load', onDone);
                                    img.addEventListener('error', onDone);
                                });
                                setTimeout(() => resolve(true), 1500);
                            });
                        }
                    } catch (e) { /* ignore */ }
                    try {
                        // Use iframe.print fallback in browser
                        _autoLog('lightbox.print shim: calling iframe.print()');
                        w.focus && w.focus();
                        w.print && w.print();
                    } catch (err) { _autoLog('lightbox.print shim: print() failed', err); }
                    // cleanup after short delay
                    setTimeout(() => { try { document.body.removeChild(iframe); } catch(e){} }, 800);
                } catch (e) { _autoLog('lightbox.print shim failed', e); }
            })();
        };
        _autoLog('Installed lightbox.print shim');
    }
} catch (e) { console.warn('Could not install lightbox.print shim', e); }

window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    // --- PINpad overlay logika ---
    let pinpadValue = '';
    const pinpadOverlay = document.getElementById('pinpadOverlay');
    const pinpadDigits = document.getElementById('pinpadDigits');
    function renderPinpadDots() {
        if (pinpadDigits) {
            pinpadDigits.textContent = '•'.repeat(pinpadValue.length) + '_'.repeat(4 - pinpadValue.length);
        }
    }
    function clearPinpad() {
        pinpadValue = '';
        renderPinpadDots();
    }
    function submitPinpad() {
        // Zkopíruj čísla do inputů
        const pinInputs = document.querySelectorAll('.pin-digit');
        pinpadValue.split('').forEach((val, idx) => {
            if (pinInputs[idx]) pinInputs[idx].value = val;
        });
        app.verifyPin();
        clearPinpad();
    }
    if (pinpadOverlay) {
        // Inicializace teček
        renderPinpadDots();
        pinpadOverlay.addEventListener('click', (e) => {
            const btn = e.target.closest('.pinpad-btn');
            if (!btn) return;
            if (btn.dataset.digit) {
                // DTMF tón pro PINpad tlačítko
                try { app.playDTMF(btn.dataset.digit); } catch (err) {}
                if (pinpadValue.length < 4) {
                    pinpadValue += btn.dataset.digit;
                    renderPinpadDots();
                    if (pinpadValue.length === 4) {
                        submitPinpad();
                    }
                }
            } else if (btn.dataset.action === 'clear') {
                // Pokud je pinpad prázdný, ukončit transakci a vrátit se na úvod
                if (!pinpadValue || pinpadValue.length === 0) {
                    clearPinpad();
                    const pinInputs = document.querySelectorAll('.pin-digit');
                    pinInputs.forEach(inp => { inp.value = ''; });
                    try { app.goToWelcome(); } catch (e) {}
                } else {
                    // Jinak pouze vymazat pinpad
                    clearPinpad();
                }
            } else if (btn.dataset.action === 'ok') {
                // Pokud není zadáno nic, ukončit transakci a vrátit se na uvod
                if (!pinpadValue || pinpadValue.length === 0) {
                    clearPinpad();
                    const pinInputs = document.querySelectorAll('.pin-digit');
                    pinInputs.forEach(inp => { inp.value = ''; });
                    try { app.goToWelcome(); } catch (e) {}
                } else if (pinpadValue.length === 4) {
                    submitPinpad();
                }
            }
        });
        // Zpětná vazba na klávesnici
        document.addEventListener('keydown', (e) => {
            if (!pinpadOverlay.classList.contains('active')) return;
            if (e.key >= '0' && e.key <= '9') {
                if (pinpadValue.length < 4) {
                    pinpadValue += e.key;
                    renderPinpadDots();
                    if (pinpadValue.length === 4) {
                        submitPinpad();
                    }
                }
            } else if (e.key === 'Backspace') {
                pinpadValue = pinpadValue.slice(0, -1);
                renderPinpadDots();
            }
        });
    }
    // Logika pro dvojklik na vymazání dat
    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) {
        let resetConfirm = false;
        resetBtn.addEventListener('click', () => {
            if (!resetConfirm) {
                resetBtn.textContent = 'Vymazat všechna data?';
                resetBtn.classList.add('confirm-delete');
                resetConfirm = true;
                setTimeout(() => {
                    resetBtn.textContent = '🗑️ Začít znovu';
                    resetBtn.classList.remove('confirm-delete');
                    resetConfirm = false;
                }, 2000);
            } else {
                localStorage.clear();
                location.reload();
            }
        });
    }
    // Inicializace admin tabů
    if (document.getElementById('tab-names')) {
        app.switchAdminTab('names');
    }
    // Ostatní původní inicializace...

    // --- Sound toggle button (admin) wiring ---
    try {
        const soundBtn = document.getElementById('soundToggle');
        if (soundBtn) {
            const updateBtn = () => {
                const enabled = app.isSoundEnabled();
                soundBtn.textContent = enabled ? 'Zvuk ON' : 'Zvuk OFF';
                if (enabled) soundBtn.classList.remove('off'); else soundBtn.classList.add('off');
            };
            updateBtn();
            soundBtn.addEventListener('click', (e) => {
                const newVal = !app.isSoundEnabled();
                app.setSoundEnabled(newVal);
                updateBtn();
            });
        }
    } catch (err) { console.warn('sound toggle wiring failed', err); }

    // Auto-print toggle wiring
    try {
        const autoBtn = document.getElementById('autoPrintToggle');
        if (autoBtn) {
            const updateAutoBtn = () => {
                const enabled = app.isAutoPrintEnabled();
                autoBtn.textContent = enabled ? 'AutoTisk ON' : 'AutoTisk OFF';
                if (enabled) autoBtn.classList.remove('off'); else autoBtn.classList.add('off');
            };
            updateAutoBtn();
            autoBtn.addEventListener('click', () => {
                console.log('autoPrintToggle clicked; current=', app.isAutoPrintEnabled());
                const newVal = !app.isAutoPrintEnabled();
                app.setAutoPrintEnabled(newVal);
                console.log('autoPrintToggle newVal=', newVal);
                updateAutoBtn();
            });
        }
    } catch (err) { console.warn('autoPrint toggle wiring failed', err); }

    // Hotfolder toggle wiring
    try {
        const hfBtn = document.getElementById('hotfolderToggle');
        if (hfBtn) {
            const updateHfBtn = () => {
                const enabled = app.isHotfolderEnabled();
                hfBtn.textContent = enabled ? 'Použít hotfolder ON' : 'Použít hotfolder OFF';
                if (enabled) hfBtn.classList.remove('off'); else hfBtn.classList.add('off');
            };
            updateHfBtn();
            hfBtn.addEventListener('click', async () => {
                const newVal = !app.isHotfolderEnabled();
                app.setHotfolderEnabled(newVal);
                updateHfBtn();
            });
        }
    } catch (err) { console.warn('hotfolder toggle wiring failed', err); }

    // Simulate native print toggle wiring (for local debugging)
    try {
        const simBtn = document.getElementById('simulatePrintToggle');
        if (simBtn) {
            const updateSimBtn = () => {
                const enabled = localStorage.getItem('simulateNativePrint') === '1';
                simBtn.textContent = enabled ? 'Simulate Print ON' : 'Simulate Print OFF';
                if (enabled) simBtn.classList.remove('off'); else simBtn.classList.add('off');
            };
            updateSimBtn();
            simBtn.addEventListener('click', () => {
                const curr = localStorage.getItem('simulateNativePrint') === '1';
                localStorage.setItem('simulateNativePrint', curr ? '0' : '1');
                updateSimBtn();
            });
        }
    } catch (err) { console.warn('simulatePrint toggle wiring failed', err); }

// debug: log lightbox presence (browser-only)
try { console.log('Running in browser environment. window.lightbox present=', !!window.lightbox); } catch(e) {}

    // PIN input navigace
    const pinInputs = document.querySelectorAll('.pin-digit');
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1) {
                // beep pro zadání číslice
                try { app.playBeep(70, 900, 0.18); } catch (err) {}
                if (index < pinInputs.length - 1) {
                    pinInputs[index + 1].focus();
                } else {
                    // Po zadání 4. číslice automaticky ověřit
                    app.verifyPin();
                }
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                // když je pole prázdné a je to backspace, posunout fokus a hrát tón
                if (!e.target.value && index > 0) {
                    try { app.playBeep(90, 400, 0.16); } catch (err) {}
                    pinInputs[index - 1].focus();
                } else {
                    // lehký potvrzovací tón pro smažení znaku
                    try { app.playBeep(40, 700, 0.08); } catch (err) {}
                }
            }
        });

        input.addEventListener('focus', (e) => {
            e.target.value = '';
        });
    });

    // Drag & Drop pro zálohu vždy pokud existuje dropZone
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                if (file.type === 'application/json' || file.name.endsWith('.json')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const imported = JSON.parse(ev.target.result);
                            if (imported && imported.children) {
                                localStorage.setItem('mikulasData', JSON.stringify(imported));
                                app.renderAdminTable();
                                alert('Záloha byla úspěšně importována.');
                            } else {
                                alert('Soubor neobsahuje platná data.');
                            }
                        } catch (err) {
                            alert('Chyba při importu zálohy: ' + err.message);
                        }
                    };
                    reader.readAsText(file, 'UTF-8');
                } else if (file.name.endsWith('.csv')) {
                    app.importBackup(file);
                } else {
                    alert('Podporované formáty: .json nebo .csv');
                }
            }
        });
        // Kliknutí na dropzonu otevře file dialog
        dropZone.addEventListener('click', () => {
            const fileInput = document.getElementById('dropZoneFileInput');
            if (fileInput) fileInput.click();
        });
        // Po výběru souboru z dialogu zpracuj import
        const fileInput = document.getElementById('dropZoneFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.type === 'application/json' || file.name.endsWith('.json')) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            try {
                                const imported = JSON.parse(ev.target.result);
                                if (imported && imported.children) {
                                    localStorage.setItem('mikulasData', JSON.stringify(imported));
                                    app.renderAdminTable();
                                    alert('Záloha byla úspěšně importována.');
                                } else {
                                    alert('Soubor neobsahuje platná data.');
                                }
                            } catch (err) {
                                alert('Chyba při importu zálohy: ' + err.message);
                            }
                        };
                        reader.readAsText(file, 'UTF-8');
                    } else if (file.name.endsWith('.csv')) {
                        app.importBackup(file);
                    } else {
                        alert('Podporované formáty: .json nebo .csv');
                    }
                }
            });
        }
    }

    // Image PIN handlers (for pinImageScreen)
    const imageGridContainer = document.getElementById('imagePinGrid');
    const imageClear = document.getElementById('imagePinClear');
    const imageCancel = document.getElementById('imagePinCancel');
    if (imageGridContainer) {
        imageGridContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.pinpad-btn');
            if (!btn) return;
            const digit = btn.dataset.digit;
            if (!digit) return;
            // Add to image buffer
            try { app.playDTMF(digit); } catch (err) {}
            app._imagePinBuffer = (app._imagePinBuffer || '') + digit;
            // Update dots
            const dots = document.getElementById('imagePinDots');
            if (dots) {
                const ds = dots.querySelectorAll('.pin-digit');
                for (let i = 0; i < ds.length; i++) {
                    ds[i].textContent = i < app._imagePinBuffer.length ? '•' : ' ';
                }
            }
            // When 4 pressed, verify against expected numeric PIN mapping
            if ((app._imagePinBuffer || '').length === 4) {
                // Compare sequences as digits: we interpret image presses as digits 1-9; map these digits to numeric PIN digits
                // The numeric PIN expected is in app._expectedNumericPin (e.g. '2789')
                const expected = app._expectedNumericPin || '';
                // We need to translate image-digit sequence into numeric digits by mapping image choice -> numeric digit position
                // For simplicity: the image-digit '1' maps to numeric digit '1' etc. So we compare sequences directly.
                
                if (app._directImagePinLookup) {
                    // First, check for special PINs (behave same as numeric entry) or existing child
                    const buf = app._imagePinBuffer;
                    const data = app.loadData();
                    const child = data.children.find(c => c.pin === buf);
                    const specialHandled = (buf === '9989' || buf === '7897' || buf === '1231' || buf === '4564');
                    if (specialHandled || child) {
                        
                        // populate numeric inputs and call verifyPin to reuse logic
                        const pinInputs = document.querySelectorAll('.pin-digit');
                        buf.split('').forEach((v, idx) => { if (pinInputs[idx]) pinInputs[idx].value = v; });
                        app._expectedNumericPin = null;
                        app._imagePinBuffer = '';
                        app._directImagePinLookup = false;
                        // mark skip flag to avoid redirect loop if needed
                        app._skipImageRedirect = true;
                        setTimeout(() => { app.verifyPin(); }, 100);
                        return;
                    }
                    // no special or child found -> accept as temporary child
                    
                    app.currentChild = { pin: app._imagePinBuffer, name: '', text: '' };
                    app._directImagePinLookup = false;
                    app._imagePinBuffer = '';
                    app.showScreen('wheelScreen');
                    setTimeout(() => { app.showLetter(); }, 1200);
                    return;
                }
                if (app._imagePinBuffer === expected) {
                    // success: set the numeric inputs accordingly and continue
                    
                    const pinInputs = document.querySelectorAll('.pin-digit');
                    app._imagePinBuffer.split('').forEach((v, idx) => { if (pinInputs[idx]) pinInputs[idx].value = v; });
                    app._expectedNumericPin = null;
                    app._imagePinBuffer = '';
                    // set flag to skip redirect back to image screen
                    app._skipImageRedirect = true;
                    app.showScreen('pinScreen');
                    setTimeout(() => { app.verifyPin(); }, 150);
                } else {
                    
                    // failure: animate and reset
                    try { app.playIllegal(); } catch (e) {}
                    app._imagePinBuffer = '';
                    const ds = document.getElementById('imagePinDots');
                    if (ds) ds.querySelectorAll('.pin-digit').forEach(d => d.textContent = ' ');
                    // if direct lookup, also clear the direct flag
                    app._directImagePinLookup = false;
                }
            }
        });
    }
    if (imageClear) {
        imageClear.addEventListener('click', (e) => {
            app._imagePinBuffer = '';
            const ds = document.getElementById('imagePinDots');
            if (ds) ds.querySelectorAll('.pin-digit').forEach(d => d.textContent = ' ');
        });
    }
    if (imageCancel) {
        imageCancel.addEventListener('click', (e) => {
            app._imagePinBuffer = '';
            app._expectedNumericPin = null;
            app.goToWelcome();
        });
    }
    // Import přes soubor pouze pokud existuje fileInput
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                app.importBackup(file);
            }
        });
    }

    // Klávesové zkratky
    // Přidat click zvuk pro běžná tlačítka
    const allButtons = document.querySelectorAll('.btn-large, .btn-small, .help-btn, .modal-close-btn');
    allButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            try { app.playClick(); } catch (err) {}
        });
    });

    // Přehrát magický zvuk při pokračování (tlačítka s třídou .continue)
    const continueButtons = document.querySelectorAll('.btn-large.continue');
    continueButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            try { app.playMagic(); } catch (err) {}
        });
    });

    document.addEventListener('keydown', (e) => {
        // If welcome screen is active and Enter pressed, act like START
        const activeScreen = document.querySelector('.screen.active');
        if (e.key === 'Enter' && activeScreen && activeScreen.id === 'welcomeScreen') {
            e.preventDefault();
            try { app.goToPin(); } catch (err) {}
            return;
        }
        // Mezerník - tajný kód
        if (e.key === ' ' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen && activeScreen.id === 'pinScreen') {
                // Zabránit scrollování stránky
                e.preventDefault();
                
                // Spustit animované vyplnění
                app.secretCode();
            }
            return;
        }
        
        // Enter - kliknout na tlačítko, pokud je jen jedno viditelné
        if (e.key === 'Enter') {
            // Najít aktivní obrazovku
            const activeScreen = document.querySelector('.screen.active');
            if (!activeScreen) return;
            
            // Speciální chování pro PIN obrazovku
            if (activeScreen.id === 'pinScreen') {
                const pinInputs = activeScreen.querySelectorAll('.pin-digit');
                const focusedInput = document.activeElement;
                
                // Pokud žádný PIN input nemá focus
                if (!Array.from(pinInputs).includes(focusedInput)) {
                    // Vyčistit všechny PIN inputy
                    pinInputs.forEach(input => input.value = '');
                    // Focus na první input
                    pinInputs[0].focus();
                    e.preventDefault();
                    return;
                }
            }
            
            // Pokud je otevřený modal, ignorovat
            const modal = document.getElementById('editModal');
            if (modal && modal.classList.contains('active')) return;
            
            // Pokud je aktivní admin obrazovka a nějaký input má focus, ignorovat
            if (activeScreen.id === 'adminScreen') {
                return;
            }
            
            // Najít všechna viditelná tlačítka na aktivní obrazovce (kromě admin tabulky)
            const buttons = activeScreen.querySelectorAll('.btn-large:not([style*="display: none"])');
            
            // Pokud je jen jedno tlačítko, klikni na něj
            if (buttons.length === 1) {
                buttons[0].click();
            }
        }
    });

    // Animované automatické zadání PINu i na PINpad při stisku mezerníku
    document.addEventListener('keydown', (e) => {
        if (!pinpadOverlay || !pinpadOverlay.classList.contains('active')) return;
        if (e.key === ' ') {
            // Pokud je pinpad prázdný, spustit animované zadání vtipného PINu
            if (pinpadValue.length === 0) {
                const jokePin = ['4', '5', '6', '4'];
                let index = 0;
                if (typeof renderPinpadDots === 'function') renderPinpadDots();
                const fillInterval = setInterval(() => {
                    if (index < jokePin.length) {
                        pinpadValue += jokePin[index];
                        if (typeof renderPinpadDots === 'function') renderPinpadDots();
                        index++;
                    } else {
                        clearInterval(fillInterval);
                        setTimeout(() => {
                            if (typeof submitPinpad === 'function') {
                                submitPinpad();
                            }
                        }, 200);
                    }
                }, 150);
            }
        }
    });
});

// Developer helper: debug printers and lightbox presence
window.devPrintDebug = async function devPrintDebug() {
    try {
        _autoLog('devPrintDebug: window.lightbox present=', !!window.lightbox);
        if (window.lightbox) _autoLog('devPrintDebug: window.lightbox keys=', Object.keys(window.lightbox));
    } catch(e) { console.warn('devPrintDebug lightbox check failed', e); }
    try {
        _autoLog('devPrintDebug: environment check complete (browser-only diagnostics)');
    } catch (e) { _autoLog('devPrintDebug: environment check threw', e); }
};
