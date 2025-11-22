# Mikulášská aplikace

Tato aplikace slouží k zobrazení personalizovaných dopisů od Mikuláše pro děti, správu dětí, vtipů a motivačních frází, včetně administrace, exportu/importu dat a speciálních režimů.

## Funkce
- **Personalizované dopisy**: Každé dítě má unikátní PIN, po zadání se zobrazí jeho dopis.
- **Speciální PINy**: Fortune cookie, vtipný režim, štěstíčko, administrace.
- **Administrace**: Správa dětí, vtipů, motivačních frází v přehledných tabech.
- **Export/Import CSV**: Pro každou sekci lze data exportovat/importovat ve formátu CSV.
- **Záloha aplikace**: Export a import celé databáze ve formátu JSON.
- **Drag & Drop**: Přímý import zálohy přetažením souboru na dropzonu v administraci.
- **Potvrzení mazání**: Mazání položek vyžaduje dvojklik pro potvrzení.
- **Reset dat**: Tlačítko pro vymazání všech dat a restart aplikace.
- **Nápověda**: Modal s dokumentací a ovládáním.

## Instalace a spuštění
1. Naklonujte repozitář:
   ```sh
   git clone https://github.com/PavelBraun/mikulas.git
   ```
2. Otevřete složku v prohlížeči nebo editoru (např. VS Code).
3. Spusťte `index.html` v prohlížeči (doporučeno Chrome/Edge).

## Struktura projektu
- `index.html` — hlavní HTML soubor
- `app.js` — logika aplikace
- `style.css` — styly
- `docs/README.md` — dokumentace
- `importTemplate.csv` — ukázkový CSV soubor
- `images/` — obrázky pozadí a ikony

## Export/Import dat
- **Export jmen**: CSV soubor s PIN, Jméno, Text dopisu
- **Export vtipů/frází**: CSV soubor s poznámkami
- **Export zálohy**: JSON soubor s celou databází
- **Import**: Podporuje formáty .json a .csv (drag & drop nebo tlačítko Importovat)

## Speciální PINy
- `9989` — administrace
- `7897` — fortune cookie (náhodný citát)
- `1231` — štěstíčko
- `4564` — vtipný režim

## Obrázkový PIN (pro malé děti)
- Aplikace podporuje nový režim zadávání PINu pomocí obrázků (3×3 grid). Obrázky jsou v `images/` a mají prefix `i-`.
- Na úvodní obrazovce je vedle tlačítka `START` nové tlačítko s ikonou (kachničky) — pokud jej stisknete, přejdete přímo do obrazkového režimu.
- V přímém obrazkovém režimu stačí dítěti nechat zmáčknout libovolnou sekvenci 4 obrázků. Pokud sekvence odpovídá některému existujícímu číselnému PINu nebo speciálnímu PINu (viz výše), aplikace se chová jako při číselném zadání (např. `4564` spustí vtip, `9989` otevře administraci). Pokud sekvence neodpovídá žádnému záznamu, aplikace vytvoří dočasný záznam a pokračuje na dopis (chování stejné jako při běžném PINu).

## Timeouty a bezpečné návraty na úvod
- Aplikace nyní centralizovaně sleduje aktivní `setTimeout`/`setInterval` volání a při návratu na úvodní obrazovku (`welcome`) se všechny aktivní časovače ruší. To zabraňuje tomu, aby zbylé timeouty z předchozích obrazovek náhle spustily neočekávané akce.
- Pokud během testování pozorujete, že se stránka „vytimeoutuje“ nebo dojde k neočekávanému návratu na úvod, restartujte aplikaci přes tlačítko `START` a problém se vyřeší — případně pošlete denní journal a konzolový výpis.

## Testování speciálních PINů přes obrázky
- Zadejte numericky `4564` — mělo by se zobrazit vtip.
- Stiskněte ikonku kachničky → v obrazkovém režimu stiskněte čtyři obrázky odpovídající číslům `4`,`5`,`6`,`4` — aplikace by měla také spustit vtip.
- Stejně lze otestovat admin PIN `9989` (obrázkově nebo číselně) — měl by otevřít administraci.

## Hotfolder / tisk (shrnutí)
- Pokud je povolen hotfolder režim, aplikace vygeneruje rasterizovaný obrázek účtenky a pošle jej na lokální save server (`http://127.0.0.1:3333/save`). Ten uloží soubor do `C:\temp\mikulas\hotfolder` a `hotfolder-printer.ps1` jej vyzvedne a vytiskne.
- Logování a denní journaly naleznete v `C:\temp\mikulas\logs\YYYYMMDD.jrn` a v projektu `logs/` složce.

## Ovládání
- Enter — potvrzení na obrazovkách s jedním tlačítkem
- Mezerník — tajný kód na PIN obrazovce
- Drag & Drop — import zálohy v administraci
- Dvojklik na 🗑️ — potvrzení mazání

## Licence
MIT

## Autor
[Pavel Braun](https://github.com/PavelBraun)
