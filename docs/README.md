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

## Ovládání
- Enter — potvrzení na obrazovkách s jedním tlačítkem
- Mezerník — tajný kód na PIN obrazovce
- Drag & Drop — import zálohy v administraci
- Dvojklik na 🗑️ — potvrzení mazání

## Licence
MIT

## Autor
[Pavel Braun](https://github.com/PavelBraun)
