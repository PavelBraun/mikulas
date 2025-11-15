// Aplikace Mikuláš
const app = {
    closeHelp() {
        document.getElementById('helpModal').classList.remove('active');
    },
    showHelp() {
        document.getElementById('helpModal').classList.add('active');
    },
    exportNames() {
        const data = this.loadData();
        const csv = '\uFEFFPIN,Jmeno,Text dopisu\n' + data.children.map(child => `${child.pin},"${child.name}","${(child.text || '').replace(/"/g, '""').replace(/\n/g, '\n')}"`).join('\n');
        this.downloadCSV(csv, 'jmena.csv');
    },
    closeAdmin() {
        this.showScreen('welcomeScreen');
    },
    exportBackup() {
        const data = this.loadData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'mikulas-zaloha.json';
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
    currentPrize: null,
    wheelRotation: 0,
    isSpinning: false,
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
                    text: 'Milá Sofie,\n\nbylas letos hodná holčička! Měj se krásně a užij si svou výhru.\n\nTvůj Mikuláš'
                },
                {
                    pin: '5678',
                    name: 'Tomáš',
                    gender: 'male',
                    text: 'Milý Tomáši,\n\nbyls letos hodný chlapec! Měj se krásně a užij si svou výhru.\n\nTvůj Mikuláš'
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
    },

    goToPin() {
        this.showScreen('pinScreen');
        // Vymazat PIN pole
        document.querySelectorAll('.pin-digit').forEach(input => {
            input.value = '';
        });
        document.getElementById('pinError').textContent = '';
        document.querySelector('.pin-digit').focus();
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
            // Vygenerovat náhodné jméno
            const randomName = this.randomNames[Math.floor(Math.random() * this.randomNames.length)];
            
            // Vygenerovat náhodnou fortune cookie větu
            const fortuneCookie = this.fortuneCookies[Math.floor(Math.random() * this.fortuneCookies.length)];
            
            // Vytvořit dočasné dítě
            this.currentChild = {
                pin: '7897',
                name: randomName,
                text: `Vítáme tě tady,\n\n${fortuneCookie}`
            };
            
            this.showScreen('wheelScreen');
            this.startLoading();
            return;
        }

        // Speciální PIN pro štěstíčko
        if (pin === '1231') {
            // Vygenerovat náhodné jméno
            const randomName = this.randomNames[Math.floor(Math.random() * this.randomNames.length)];
            
            // Vygenerovat náhodnou fortune cookie větu
            const fortuneCookie = this.fortuneCookies[Math.floor(Math.random() * this.fortuneCookies.length)];
            
            // Vytvořit dočasné dítě
            this.currentChild = {
                pin: '1231',
                name: randomName,
                text: `Tvé štěstíčko:\n\n${fortuneCookie}`
            };
            
            this.showScreen('wheelScreen');
            this.startLoading();
            return;
        }

        // Speciální PIN pro vtipy
        if (pin === '4564') {
            // Vygenerovat náhodné jméno
            const randomName = this.randomNames[Math.floor(Math.random() * this.randomNames.length)];
            
            // Vygenerovat náhodný vtip
            const randomJoke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
            
            // Vytvořit dočasné dítě
            this.currentChild = {
                pin: '4564',
                name: randomName,
                text: `Máme pro tebe vtip:\n\n${randomJoke}`
            };
            
            this.showScreen('wheelScreen');
            this.startLoading();
            return;
        }

        // Hledání dítěte
        const data = this.loadData();
        const child = data.children.find(c => c.pin === pin);

        if (child) {
            this.currentChild = child;
            this.showScreen('wheelScreen');
            this.startLoading();
        } else {
            document.getElementById('pinError').textContent = 'Nesprávný PIN';
            // Vymazat PIN po chybě
            setTimeout(() => {
                inputs.forEach(input => input.value = '');
                inputs[0].focus();
                document.getElementById('pinError').textContent = '';
            }, 1500);
        }
    },

    // Načítání s progressbarem
    startLoading() {
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = '0%';
        
        // Spustit animaci
        setTimeout(() => {
            progressFill.style.width = '100%';
        }, 100);

        // Po 3 sekundách přejít na dopis
        setTimeout(() => {
            this.generatePrize();
            this.showLetter();
        }, 3100);
    },

    // Vygenerovat náhodnou cenu
    generatePrize() {
        const randomIndex = Math.floor(Math.random() * this.prizes.length);
        this.currentPrize = this.prizes[randomIndex];
    },

    // Inicializace kola
    initWheel() {
        const canvas = document.getElementById('wheelCanvas');
        const ctx = canvas.getContext('2d');

        this.wheelRotation = 0;
        this.isSpinning = false;
        document.getElementById('spinButton').disabled = false;
        this.drawWheel(ctx);
    },

    // Vykreslení kola
    drawWheel(ctx) {
        const canvas = ctx.canvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 250;
        const segmentAngle = (Math.PI * 2) / this.prizes.length;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Vykreslení segmentů
        this.prizes.forEach((prize, index) => {
            const startAngle = this.wheelRotation + (index * segmentAngle) - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;

            // Segment
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = prize.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Tahoma';
            ctx.fillText(prize.name, radius * 0.65, 0);
            ctx.restore();
        });

        // Střed kola
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#2c3e50';
        ctx.fill();

        // Šipka nahoře
        ctx.beginPath();
        ctx.moveTo(centerX, 30);
        ctx.lineTo(centerX - 20, 70);
        ctx.lineTo(centerX + 20, 70);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 3;
        ctx.stroke();
    },

    // Roztočení kola
    spinWheel() {
        if (this.isSpinning) return;

        this.isSpinning = true;
        document.getElementById('spinButton').disabled = true;

        const canvas = document.getElementById('wheelCanvas');
        const ctx = canvas.getContext('2d');

        const startRotation = this.wheelRotation;
        const spins = 5 + Math.random() * 3; // 5-8 otočení
        const randomAngle = Math.random() * Math.PI * 2;
        const targetRotation = startRotation + (spins * Math.PI * 2) + randomAngle;

        const duration = 5000;
        const startTime = Date.now();

        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            this.wheelRotation = startRotation + (targetRotation - startRotation) * easeProgress;

            this.drawWheel(ctx);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Kolo zastaveno - zjistit výhru
                this.wheelRotation = targetRotation;
                this.drawWheel(ctx);

                const segmentAngle = (Math.PI * 2) / this.prizes.length;
                const normalizedRotation = ((this.wheelRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const winningIndex = Math.floor(((-normalizedRotation + Math.PI / 2 + segmentAngle / 2) % (Math.PI * 2) + Math.PI * 2) / segmentAngle) % this.prizes.length;
                
                this.currentPrize = this.prizes[winningIndex];

                setTimeout(() => {
                    this.showLetter();
                }, 500);
            }
        };

        animate();
    },

    // Zobrazení dopisu
    showLetter() {
        const letterText = this.currentChild.text.replace('{výhra}', this.currentPrize.name);
        
        // Pro vtipy neaplikovat odměnu a podpis
        let fullText = letterText;
        let signature = '';
        let showReward = false;
        if (this.currentChild.pin !== '4564' && this.currentChild.pin !== '1231') {
            fullText = letterText + '\n\nUžij si svou odměnu!\n\n';
            showReward = true;
            signature = 'Mikuláš a spol.';
        } else {
            signature = 'Mikuláš a spol.';
        }
        
        // Odsazení třetího řádku pod nadpisem
        const lines = fullText.split('\n');
        if (lines.length > 2) {
            lines[2] = '<span style="text-indent:2ch;display:inline-block;width:calc(100% - 2ch);">' + lines[2] + '</span>';
        }
        const formattedText = lines.join('<br>');
        const letterElement = document.getElementById('letterText');
        letterElement.innerHTML = formattedText + '<div style="text-align: right; margin-top: 10px;">~' + signature + '</div>';
        
        // Skrýt/zobrazit neviditelné tlačítko podle typu PINu
        const regenerateBtn = document.querySelector('.secret-regenerate-btn');
        if (this.currentChild.pin === '4564' || this.currentChild.pin === '7897' || this.currentChild.pin === '1231') {
            regenerateBtn.style.display = 'block';
        } else {
            regenerateBtn.style.display = 'none';
        }
        
        this.showScreen('letterScreen');
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
            this.showLetter();
        } else if (this.currentChild.pin === '1231') {
            // Nové štěstíčko
            const fortuneCookie = this.fortuneCookies[Math.floor(Math.random() * this.fortuneCookies.length)];
            this.currentChild.text = `Tvé štěstíčko:\n\n${fortuneCookie}`;
            this.showLetter();
        }
    },

    goToGoodbye() {
        this.showScreen('goodbyeScreen');
    },

    restart() {
        this.currentChild = null;
        this.currentPrize = null;
        this.showScreen('welcomeScreen');
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
            // ...původní tabulka dětí...
            container.innerHTML = `<div class="admin-controls">
                <button onclick="app.addChild()" class="btn-small">➕ Přidat dítě</button>
                <button onclick="app.exportNames()" class="btn-small">💾 Exportovat jména</button>
                <button onclick="app.openImportModal('names')" class="btn-small">📂 Importovat jména</button>
            </div>
            <table class="admin-table" id="adminTable">
                <thead>
                    <tr>
                        <th>PIN</th>
                        <th>Jméno</th>
                        <th>Akce</th>
                    </tr>
                </thead>
                <tbody id="adminTableBody"></tbody>
            </table>`;
            this.renderAdminTable();
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
        tbody.innerHTML = '';
        const data = this.loadData();
        data.children.forEach((child, idx) => {
            tbody.innerHTML += `<tr><td>${child.pin}</td><td>${child.name}</td><td class="actions">
                <button onclick="app.editChild(${idx})" class="btn-small">✏️</button>
                <button class="btn-small btn-danger" data-idx="${idx}" data-confirm="0">🗑️</button>
            </td></tr>`;
        });
        // Potvrzovací logika pro mazání jména
        Array.from(tbody.querySelectorAll('.btn-danger')).forEach(btn => {
            btn.addEventListener('click', function(e) {
                const idx = parseInt(btn.getAttribute('data-idx'));
                if (btn.getAttribute('data-confirm') === '0') {
                    btn.textContent = 'Opravdu smazat?';
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

    renderJokesTable() {
        const tbody = document.getElementById('jokesTableBody');
        tbody.innerHTML = '';
        this.jokes.forEach((joke, idx) => {
            tbody.innerHTML += `<tr><td>${joke}</td><td class="actions">
                <button onclick="app.editJoke(${idx})" class="btn-small">✏️</button>
                <button class="btn-small btn-danger" data-idx="${idx}" data-confirm="0">🗑️</button>
            </td></tr>`;
        });
        // Potvrzovací logika pro mazání vtipu
        Array.from(tbody.querySelectorAll('.btn-danger')).forEach(btn => {
            btn.addEventListener('click', function(e) {
                const idx = parseInt(btn.getAttribute('data-idx'));
                if (btn.getAttribute('data-confirm') === '0') {
                    btn.textContent = 'Opravdu smazat?';
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
            tbody.innerHTML += `<tr><td>${phrase}</td><td class="actions">
                <button onclick="app.editPhrase(${idx})" class="btn-small">✏️</button>
                <button class="btn-small btn-danger" data-idx="${idx}" data-confirm="0">🗑️</button>
            </td></tr>`;
        });
        // Potvrzovací logika pro mazání fráze
        Array.from(tbody.querySelectorAll('.btn-danger')).forEach(btn => {
            btn.addEventListener('click', function(e) {
                const idx = parseInt(btn.getAttribute('data-idx'));
                if (btn.getAttribute('data-confirm') === '0') {
                    btn.textContent = 'Opravdu smazat?';
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
        document.getElementById('editModal').classList.remove('active');
    },

    // Import/export CSV
    exportJokes() {
        const csv = '\uFEFFPoznamka\n' + this.jokes.map(j => '"' + j.replace(/"/g, '""') + '"').join('\n');
        this.downloadCSV(csv, 'vtipy.csv');
    },
    exportPhrases() {
        const csv = '\uFEFFPoznamka\n' + this.fortuneCookies.map(f => '"' + f.replace(/"/g, '""') + '"').join('\n');
        this.downloadCSV(csv, 'fraze.csv');
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
        this.downloadCSV(csv, type + '-template.csv');
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

window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    // Logika pro dvojklik na vymazání dat
    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) {
        let resetConfirm = false;
        resetBtn.addEventListener('click', () => {
            if (!resetConfirm) {
                resetBtn.textContent = 'Opravdu vymazat všechna data? Klikněte znovu!';
                resetBtn.classList.add('confirm-delete');
                resetConfirm = true;
                setTimeout(() => {
                    resetBtn.textContent = '🗑️ Vymazat data a začít znovu';
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

    // PIN input navigace
    const pinInputs = document.querySelectorAll('.pin-digit');
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1) {
                if (index < pinInputs.length - 1) {
                    pinInputs[index + 1].focus();
                } else {
                    // Po zadání 4. číslice automaticky ověřit
                    app.verifyPin();
                }
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                pinInputs[index - 1].focus();
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
    document.addEventListener('keydown', (e) => {
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
});
