# Requirements Document

## Introduction

Questo documento descrive i requisiti di una UI Pokédex Web (React + TypeScript + Vite) per sfogliare l'elenco continuo dei 151 Pokémon della 1ª generazione (Kanto) e visualizzarne il dettaglio, con due temi visivi commutabili al volo: il Tema Rosso (Game Boy, 1ª generazione) e il Tema Diamante (Nintendo DS, 4ª generazione).

L'elenco è un flusso continuo scrollabile con caricamento incrementale a blocchi di 20 (infinite scroll) e NON è paginato: non esistono pagine "successiva"/"precedente", ma un unico elenco che cresce mentre l'Utente scorre.

La portata è limitata alla 1ª generazione (Kanto): esattamente i 151 Pokémon con identificatore da 1 a 151 (Bulbasaur → Mew). L'elenco non deve mai richiedere né mostrare Pokémon oltre l'identificatore 151.

I dati provengono dal client PokéAPI esistente (`createPokeApiClient`, con `get(idOrName)` e `list({limit, offset})`), che restituisce un `Result<T>` con `PokeApiError` in caso di errore. Solo il livello `api/` conosce la forma grezza delle PokéAPI: il resto dell'applicazione lavora con tipi di dominio. Nota che i 151 Pokémon di Kanto corrispondono agli identificatori 1..151 delle PokéAPI.

### Contesto di design (ricerca web)

> Il contenuto di questa sezione è stato riformulato per conformità alle licenze: nessuna riproduzione verbatim oltre poche parole e nessun asset originale dei giochi.

Interfaccia del Pokédex (generale): la Pokédex è un catalogo dei Pokémon; l'elenco è ordinato per numero identificativo e ogni voce mostra almeno numero e nome; la voce di dettaglio (chiamata "Data" in 1ª generazione) include l'immagine del Pokémon, il numero, il nome, la categoria/specie, l'altezza, il peso e una breve descrizione ([Bulbapedia — Pokédex entry](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9dex_entry), [Bulbapedia — Pokédex](https://bulbapedia.bulbagarden.net/wiki/Pokedex)). La 1ª generazione (Kanto) copre i 151 Pokémon da Bulbasaur (#1) a Mew (#151) ([Wikipedia — List of generation I Pokémon](https://en.wikipedia.org/wiki/List_of_generation_I_Pok%C3%A9mon), [Bulbapedia — Kanto Pokédex number](https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_Kanto_Pok%C3%A9dex_number)).

Stile "Pokémon Rosso" / Game Boy (1ª generazione):

- Palette a quattro tonalità verdastre dello schermo LCD del Game Boy, comunemente riportate come `#9BBC0F`, `#8BAC0F`, `#306230`, `#0F380F`, dal più chiaro al più scuro ([Bulbapedia — Color palette Gen I–II](https://bulbapedia.bulbagarden.net/wiki/Color_palette_(Generations_I%E2%80%93II)), [Design Pieces — Game Boy palette](https://www.designpieces.com/palette/game-boy-original-color-palette-hex-and-rgb/)).
- Elenco: righe di testo scorrevoli con numero e nome, selezione indicata da un cursore a freccia; nel gioco originale si distinguono i Pokémon visti da quelli posseduti. Voce di dettaglio "Data": sprite, numero, nome, categoria/specie, altezza, peso, breve descrizione ([Bulbapedia — Pokédex entry](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9dex_entry), [StrategyWiki — Red/Blue Pokédex](https://strategywiki.org/wiki/Pok%C3%A9mon_Red_and_Blue/Pok%C3%A9dex)).
- Tipografia bitmap/pixel, finestre di dialogo con bordo marcato e angoli squadrati.

Stile "Pokémon Diamante" / Nintendo DS (4ª generazione):

- La Pokédex di Sinnoh è un dispositivo pieghevole, primo modello a due schermi ispirato al Nintendo DS Lite: schermo superiore informativo, schermo inferiore con comandi ([Pokémon Wiki — Sinnoh Pokédex](http://pokemon.fandom.com/wiki/Sinnoh_Pok%C3%A9dex)).
- Elenco di Sinnoh: righe scorrevoli con numero regionale, icona/sprite, nome e tipi ([PokémonDB — Sinnoh Pokédex](https://pokemondb.net/pokedex/game/diamond-pearl), [Serebii — Sinnoh Dex](https://www.serebii.net/diamondpearl/shinoudex.shtml)).
- Palette a colori pieni con dominante blu, pannelli con angoli arrotondati, tipografia antialiasata e leggibile ([Wikipedia — Diamond and Pearl](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Diamond_and_Pearl)).

Nota di conformità: le due estetiche sono ricreazioni stilistiche "in stile" realizzate via CSS e asset propri; non si usano font, sprite o immagini originali dei giochi; le palette sono valori tecnici di pubblico dominio; il contenuto è stato rielaborato per conformità alle licenze.

## Glossary

- **Applicazione**: l'applicazione Pokédex Web nel suo complesso (React + TypeScript + Vite).
- **Vista_Elenco**: la vista che mostra l'elenco continuo scrollabile dei Pokémon della Prima_Generazione.
- **Vista_Dettaglio**: la vista che mostra i dati di un singolo Pokémon.
- **Gestore_Temi**: la logica che gestisce il Tema attivo, la sua persistenza e il suo ripristino.
- **Tema**: uno stile visivo completo applicabile alle viste dell'Applicazione.
- **Tema_Rosso**: il Tema ispirato a Pokémon Rosso su Game Boy (1ª generazione).
- **Tema_Diamante**: il Tema ispirato a Pokémon Diamante su Nintendo DS (4ª generazione).
- **Selettore_Tema**: il controllo dell'interfaccia con cui l'Utente sceglie il Tema attivo.
- **Client_PokeAPI**: il client esistente `createPokeApiClient`, che espone `get(idOrName)` e `list({limit, offset})` e restituisce un `Result<T>` con `PokeApiError`.
- **Blocco_Elenco**: una singola risposta di `list` con `limit` pari a 20, usata per il caricamento incrementale dell'elenco.
- **Riferimento_Pokemon**: un riferimento a una risorsa Pokémon nella forma `ResourceReference { name, url }`.
- **Dominio_Pokemon**: il tipo di dominio `Pokemon` definito in `src/types/pokemon.ts`.
- **Prima_Generazione**: l'insieme dei 151 Pokémon di Kanto, con identificatore da 1 a 151 inclusi.
- **Utente**: la persona che utilizza l'Applicazione.
- **Stato_Caricamento**: lo stato in cui una richiesta di dati è in corso e l'esito non è ancora disponibile.
- **Stato_Errore**: lo stato in cui una richiesta di dati si è conclusa con un `PokeApiError`.
- **Stato_Vuoto**: lo stato in cui una richiesta ha avuto esito positivo ma non ha prodotto elementi da mostrare.
- **Sprite_Pokemon**: l'immagine del Pokémon, non ancora presente nel Dominio_Pokemon.

## Requirements

### Requirement 1: Elenco continuo dei Pokémon di prima generazione

**User Story:** Come Utente, voglio scorrere un elenco continuo dei Pokémon della prima generazione, così da sfogliare tutte le 151 creature di Kanto in un unico flusso.

#### Acceptance Criteria

1. WHEN l'Applicazione viene aperta sulla Vista_Elenco, THE Vista_Elenco SHALL richiedere al Client_PokeAPI il primo Blocco_Elenco tramite `list` con `limit` pari a 20 e `offset` pari a 0.
2. THE Vista_Elenco SHALL limitare l'elenco esclusivamente alla Prima_Generazione, mostrando solo Pokémon con identificatore numerico compreso tra 1 e 151 inclusi.
3. WHEN il Client_PokeAPI restituisce un Blocco_Elenco con esito positivo, THE Vista_Elenco SHALL aggiungere in coda all'elenco già mostrato ogni Riferimento_Pokemon del blocco con identificatore compreso tra 1 e 151, mostrando per ciascuno almeno numero e nome.
4. WHILE l'Utente scorre l'elenco e non sono ancora stati caricati tutti i Pokémon fino al 151, THE Vista_Elenco SHALL richiedere automaticamente il Blocco_Elenco successivo con `offset` aumentato di 20 quando l'Utente si avvicina alla fine dell'elenco già mostrato.
5. WHEN l'elenco mostrato contiene tutti i Pokémon fino all'identificatore 151, THE Vista_Elenco SHALL cessare di richiedere ulteriori Blocco_Elenco.
6. WHEN l'Utente seleziona un elemento dell'elenco, THE Applicazione SHALL passare alla Vista_Dettaglio del Pokémon corrispondente.

### Requirement 2: Stati di caricamento, errore e vuoto dell'elenco

**User Story:** Come Utente, voglio un riscontro chiaro mentre l'elenco carica o quando qualcosa va storto, così da capire cosa sta succedendo.

#### Acceptance Criteria

1. WHILE il primo Blocco_Elenco è in caricamento e nessun Pokémon è ancora mostrato, THE Vista_Elenco SHALL mostrare un indicatore di Stato_Caricamento.
2. WHILE un Blocco_Elenco successivo al primo è in caricamento, THE Vista_Elenco SHALL mostrare un indicatore di caricamento incrementale in coda all'elenco senza rimuovere i Pokémon già mostrati.
3. IF il Client_PokeAPI restituisce un `PokeApiError` per un Blocco_Elenco, THEN THE Vista_Elenco SHALL mostrare un messaggio di Stato_Errore che riporta la categoria dell'errore, appartenente all'insieme "risorsa non trovata", "risposta HTTP non valida", "parametri non validi", "errore di rete".
4. IF il Client_PokeAPI restituisce un `PokeApiError` per un Blocco_Elenco, THEN THE Vista_Elenco SHALL rendere disponibile un comando per ripetere la richiesta del medesimo Blocco_Elenco.
5. WHEN l'Utente attiva il comando per ripetere la richiesta, THE Vista_Elenco SHALL richiedere nuovamente lo stesso Blocco_Elenco e tornare allo Stato_Caricamento per quel blocco.
6. IF il primo Blocco_Elenco è restituito con esito positivo ma non contiene alcun Riferimento_Pokemon nella Prima_Generazione, THEN THE Vista_Elenco SHALL mostrare un messaggio di Stato_Vuoto.

### Requirement 3: Visualizzazione del dettaglio di un Pokémon

**User Story:** Come Utente, voglio vedere i dati di un singolo Pokémon, così da conoscerne le caratteristiche.

#### Acceptance Criteria

1. WHEN la Vista_Dettaglio viene aperta per un identificatore, THE Vista_Dettaglio SHALL richiedere il Dominio_Pokemon al Client_PokeAPI tramite `get` passando quell'identificatore.
2. WHEN il Client_PokeAPI restituisce un Dominio_Pokemon con esito positivo, THE Vista_Dettaglio SHALL mostrare numero identificativo e nome del Pokémon.
3. WHEN il Client_PokeAPI restituisce un Dominio_Pokemon con esito positivo, THE Vista_Dettaglio SHALL mostrare altezza, peso ed esperienza base del Pokémon.
4. WHEN il Client_PokeAPI restituisce un Dominio_Pokemon con esito positivo, THE Vista_Dettaglio SHALL mostrare l'elenco dei tipi del Pokémon nell'ordine dato dal campo `slot`.
5. WHEN il Client_PokeAPI restituisce un Dominio_Pokemon con esito positivo, THE Vista_Dettaglio SHALL mostrare l'elenco delle abilità del Pokémon.
6. IF il Dominio_Pokemon restituito ha una collezione di tipi o abilità vuota, THEN THE Vista_Dettaglio SHALL mostrare la restante parte del dettaglio senza errori, indicando l'assenza di elementi per la collezione vuota.
7. WHEN l'Utente attiva il comando di ritorno, THE Applicazione SHALL riportare l'Utente alla Vista_Elenco.

### Requirement 4: Stati di caricamento ed errore del dettaglio

**User Story:** Come Utente, voglio un riscontro chiaro mentre il dettaglio carica o quando il Pokémon non esiste, così da non restare davanti a una schermata muta.

#### Acceptance Criteria

1. WHILE una richiesta di Dominio_Pokemon è in corso, THE Vista_Dettaglio SHALL mostrare un indicatore di Stato_Caricamento e mantenerlo visibile fino al completamento della richiesta.
2. WHEN una richiesta di Dominio_Pokemon si completa con esito positivo, THE Vista_Dettaglio SHALL rimuovere l'indicatore di Stato_Caricamento e mostrare i dati del Pokémon.
3. IF il Client_PokeAPI restituisce un `PokeApiError` di categoria "risorsa non trovata", THEN THE Vista_Dettaglio SHALL rimuovere l'indicatore di Stato_Caricamento e mostrare un messaggio che indica che il Pokémon richiesto non esiste, senza mostrare dati parziali.
4. IF il Client_PokeAPI restituisce un `PokeApiError` di categoria diversa da "risorsa non trovata", THEN THE Vista_Dettaglio SHALL rimuovere l'indicatore di Stato_Caricamento e mostrare un messaggio di Stato_Errore che riporta la categoria dell'errore.
5. IF il Client_PokeAPI restituisce un `PokeApiError` per la richiesta di dettaglio, THEN THE Vista_Dettaglio SHALL rendere disponibile un comando per ripetere la richiesta che, WHEN attivato dall'Utente, avvia una nuova richiesta per lo stesso identificatore e ripristina lo Stato_Caricamento.

### Requirement 5: Sistema di temi commutabili al volo

**User Story:** Come Utente, voglio cambiare l'aspetto del Pokédex tra due stili senza ricaricare la pagina, così da scegliere l'estetica che preferisco.

#### Acceptance Criteria

1. THE Gestore_Temi SHALL rendere disponibili esattamente due Temi: il Tema_Rosso e il Tema_Diamante.
2. WHEN l'Applicazione viene aperta senza un Tema precedentemente scelto, THE Gestore_Temi SHALL impostare il Tema_Rosso come Tema attivo predefinito.
3. THE Applicazione SHALL mostrare un Selettore_Tema che permette all'Utente di scegliere tra il Tema_Rosso e il Tema_Diamante.
4. WHEN l'Utente sceglie un Tema tramite il Selettore_Tema, THE Gestore_Temi SHALL impostare quel Tema come attivo senza ricaricare la pagina.
5. WHEN il Tema attivo cambia, THE Applicazione SHALL applicare il nuovo Tema sia alla Vista_Elenco sia alla Vista_Dettaglio.
6. WHEN l'Utente sceglie un Tema, THE Gestore_Temi SHALL persistere il Tema scelto in modo che venga ripristinato come Tema attivo alla successiva apertura dell'Applicazione.
7. IF il Tema persistito non corrisponde a nessuno dei due Temi disponibili, THEN THE Gestore_Temi SHALL impostare il Tema_Rosso come Tema attivo predefinito.

### Requirement 6: Tema Pokémon Rosso (Game Boy, 1ª generazione)

**User Story:** Come Utente, voglio l'aspetto del Pokémon Rosso su Game Boy, così da rivivere l'estetica monocromatica della prima generazione.

#### Acceptance Criteria

1. WHILE il Tema_Rosso è attivo, THE Applicazione SHALL limitare tutti i colori di sfondo, testo e bordo delle viste esclusivamente alle quattro tonalità `#9BBC0F`, `#8BAC0F`, `#306230`, `#0F380F`.
2. WHILE il Tema_Rosso è attivo, THE Applicazione SHALL applicare `#0F380F` come colore del testo e `#9BBC0F` come colore di sfondo predefinito delle viste, garantendo un rapporto di contrasto di almeno 4.5:1 tra testo e sfondo.
3. WHILE il Tema_Rosso è attivo, THE Applicazione SHALL rendere il testo delle viste con una tipografia bitmap/pixel a spaziatura monospazio dichiarata nel tema.
4. IF la tipografia bitmap/pixel non è disponibile o non si carica, THEN THE Applicazione SHALL usare un font monospazio di sistema come fallback mantenendo invariati i colori del tema.
5. WHILE il Tema_Rosso è attivo, THE Applicazione SHALL rendere i contenitori delle viste con angoli squadrati (raggio del bordo pari a 0 px) e un bordo continuo di larghezza compresa tra 2 px e 4 px nel colore `#0F380F`.
6. WHILE il Tema_Rosso è attivo, THE Vista_Elenco SHALL indicare l'elemento attualmente selezionato mostrando un cursore a forma di freccia a sinistra dell'elemento e nessun cursore sugli elementi non selezionati.
7. WHILE il Tema_Rosso è attivo, THE Vista_Elenco SHALL mostrare ogni riga dell'elenco come numero identificativo seguito dal nome del Pokémon.

### Requirement 7: Tema Pokémon Diamante (Nintendo DS, 4ª generazione)

**User Story:** Come Utente, voglio l'aspetto del Pokémon Diamante su Nintendo DS, così da avere un'interfaccia a colori in stile Sinnoh Pokédex.

#### Acceptance Criteria

1. WHILE il Tema_Diamante è attivo, THE Applicazione SHALL usare una palette a colori pieni in cui il colore dominante è un blu applicato allo sfondo principale e agli elementi di intestazione delle viste.
2. WHILE il Tema_Diamante è attivo, THE Applicazione SHALL rendere i pannelli delle viste con angoli arrotondati con raggio compreso tra 8 e 16 pixel su tutti e quattro gli angoli.
3. WHILE il Tema_Diamante è attivo, THE Applicazione SHALL rendere il testo delle viste con antialiasing attivo e dimensione del carattere non inferiore a 14 pixel.
4. WHILE il Tema_Diamante è attivo, THE Vista_Elenco SHALL presentare ogni elemento come una singola riga contenente, nell'ordine, il numero identificativo del Pokémon, il nome e la lista dei tipi.

### Requirement 8: Immagine del Pokémon (dipendenza sul livello api/dominio)

**User Story:** Come Utente, voglio vedere l'immagine del Pokémon nel dettaglio, così da riconoscerlo visivamente in entrambi i temi.

> Nota: il Dominio_Pokemon attuale in `src/types/pokemon.ts` NON include lo Sprite_Pokemon; soddisfare questo requisito richiede di estendere il livello `api/` (parsing/mapping del campo `sprites` delle PokéAPI) e il tipo di dominio, coperto da test in TDD, mantenendo il confine architetturale (solo `api/` conosce la forma grezza della rete).

#### Acceptance Criteria

1. THE Dominio_Pokemon SHALL includere un riferimento allo Sprite_Pokemon come URL immagine valido oppure come valore nullo quando lo sprite non è disponibile nella risposta delle PokéAPI.
2. WHEN il Client_PokeAPI restituisce un Dominio_Pokemon con uno Sprite_Pokemon valorizzato, THE Vista_Dettaglio SHALL mostrare l'immagine caricata dall'URL dello Sprite_Pokemon con un testo alternativo pari al nome del Pokémon.
3. IF il Dominio_Pokemon contiene uno Sprite_Pokemon di valore nullo, THEN THE Vista_Dettaglio SHALL mostrare un segnaposto che occupa lo stesso spazio di layout previsto per l'immagine.
4. IF il caricamento dell'immagine dall'URL dello Sprite_Pokemon non va a buon fine, THEN THE Vista_Dettaglio SHALL mostrare il medesimo segnaposto previsto per lo Sprite_Pokemon nullo, senza mostrare un'immagine interrotta.
5. WHILE il Tema_Rosso è attivo, THE Vista_Dettaglio SHALL rendere lo Sprite_Pokemon applicando la palette a quattro tonalità verdastre del Tema_Rosso definita nel Requirement 6.
6. WHILE il Tema_Diamante è attivo, THE Vista_Dettaglio SHALL rendere lo Sprite_Pokemon a colori pieni senza applicare la palette monocromatica del Tema_Rosso.

### Requirement 9: Determinismo e confini architetturali

**User Story:** Come sviluppatore del workshop, voglio che la logica sia testabile in modo deterministico e che i confini architetturali siano rispettati, così da mantenere il codice pulito e la history TDD coerente.

#### Acceptance Criteria

1. THE Vista_Elenco SHALL ottenere i dati dei Pokémon solo tramite il Client_PokeAPI, ricevendo esclusivamente Tipi_Dominio e mai la forma grezza delle PokéAPI.
2. THE Vista_Dettaglio SHALL ottenere i dati dei Pokémon solo tramite il Client_PokeAPI, ricevendo esclusivamente Tipi_Dominio e mai la forma grezza delle PokéAPI.
3. THE logica di caricamento incrementale dell'elenco (infinite scroll e filtro alla Prima_Generazione) SHALL risiedere in un hook o in una funzione di `lib/`, separata dai componenti di presentazione.
4. THE logica del Gestore_Temi SHALL risiedere in un hook o context, separata dai componenti di presentazione.
5. WHEN i test unitari della logica vengono eseguiti, THE Applicazione SHALL usare un `fetch` mockato senza effettuare alcuna chiamata di rete reale.
6. IF il `fetch` mockato nei test simula un fallimento di rete, THEN la logica di Vista_Elenco e Vista_Dettaglio SHALL produrre uno Stato_Errore osservabile senza sollevare eccezioni non gestite.
