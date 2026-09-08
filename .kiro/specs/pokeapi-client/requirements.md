# Requirements Document

## Introduction

Questa feature introduce un **client per le PokéAPI** nel livello `src/api/`. Il
client espone due operazioni di lettura di base: il recupero di una singola
risorsa (GET per id o name) e l'elenco paginato delle risorse (LIST con
`limit`/`offset`). Il client incapsula la conoscenza dell'URL e della forma
grezza delle PokéAPI: il resto dell'applicazione lavora con tipi di dominio
nostri, non con la forma della rete.

Il base URL è configurabile, così lo stesso client può puntare all'API pubblica
(`https://pokeapi.co/api/v2/`) oppure a un'istanza PokéAPI eseguita in locale
(es. `http://localhost/api/v2/`). Questo abilita sia gli unit test con `fetch`
mockato (nessuna rete reale), sia una verifica di integrazione opzionale contro
l'istanza locale.

Le PokéAPI sono un'API REST pubblica, di sola lettura (GET), senza
autenticazione. L'endpoint LIST restituisce `count`, `next`, `previous` e
`results` (array di `{ name, url }`) con paginazione via `limit`/`offset`.
L'endpoint GET restituisce l'oggetto risorsa completo e accetta sia l'id
numerico sia il nome.

## Glossary

- **PokeApiClient**: Il client applicativo, in `src/api/`, che espone le
  operazioni di lettura (GET e LIST) verso le PokéAPI.
- **PokéAPI**: L'API REST pubblica di sola lettura raggiungibile al base URL
  `https://pokeapi.co/api/v2/`, o una sua istanza equivalente eseguita in
  locale.
- **Base_URL**: L'indirizzo di base configurabile a cui il PokeApiClient invia
  le richieste (es. `https://pokeapi.co/api/v2/` oppure
  `http://localhost/api/v2/`).
- **Risorsa**: Una singola entità delle PokéAPI (es. un Pokémon) identificata
  da un id numerico o da un nome.
- **Identificatore**: Il valore usato per recuperare una singola Risorsa; può
  essere un id numerico oppure un nome testuale.
- **Operazione_GET**: L'operazione del PokeApiClient che recupera una singola
  Risorsa dato un Identificatore.
- **Operazione_LIST**: L'operazione del PokeApiClient che recupera un elenco
  paginato di riferimenti a Risorse.
- **Pagina_LIST**: Il risultato di dominio dell'Operazione_LIST, contenente il
  numero totale (`count`), i cursori di navigazione (`next`, `previous`) e
  l'elenco dei riferimenti (`results`).
- **Riferimento_Risorsa**: Un elemento dell'elenco `results`, composto dal nome
  della Risorsa e dal suo URL.
- **Risposta_Raw**: La forma grezza dei dati restituiti dalle PokéAPI sulla
  rete, tipizzata esplicitamente nel livello `src/api/`.
- **Tipo_Dominio**: Il tipo applicativo nostro verso cui viene mappata la
  Risposta_Raw, usato dal resto dell'applicazione.
- **PokeApiError**: Il tipo di errore esposto dal PokeApiClient per segnalare
  fallimenti (risorsa non trovata, risposta HTTP non-2xx, errore di rete).
- **Limit**: Il parametro numerico dell'Operazione_LIST che indica il numero
  massimo di riferimenti da restituire in una pagina.
- **Offset**: Il parametro numerico dell'Operazione_LIST che indica il numero di
  riferimenti da saltare prima di iniziare la pagina.

## Requirements

### Requirement 1: Recupero di una singola risorsa (GET)

**User Story:** Come sviluppatore dell'app Pokédex, voglio recuperare una
singola risorsa PokéAPI per id o per nome, così da poter mostrare i dettagli di
un Pokémon.

#### Acceptance Criteria

1. WHEN l'Operazione_GET viene invocata con un Identificatore numerico intero compreso tra 1 e 100000, THE PokeApiClient SHALL inviare una richiesta HTTP GET a `{Base_URL}pokemon/{Identificatore}` e restituire il Tipo_Dominio corrispondente alla Risorsa.
2. WHEN l'Operazione_GET viene invocata con un Identificatore testuale non vuoto di lunghezza compresa tra 1 e 100 caratteri, THE PokeApiClient SHALL normalizzare l'Identificatore in minuscolo, inviare una richiesta HTTP GET a `{Base_URL}pokemon/{Identificatore}` e restituire il Tipo_Dominio corrispondente alla Risorsa.
3. WHEN l'Operazione_GET riceve una Risposta_Raw con stato HTTP 200, THE PokeApiClient SHALL mappare la Risposta_Raw in un Tipo_Dominio che include i campi `id`, `name`, `height`, `weight`, `baseExperience`, `abilities` e `types`.
4. IF l'Operazione_GET riceve una risposta HTTP con stato 404, THEN THE PokeApiClient SHALL restituire un PokeApiError che indica che la Risorsa non è stata trovata e include l'Identificatore richiesto.
5. IF l'Operazione_GET viene invocata con un Identificatore che non è un intero compreso tra 1 e 100000 né una stringa non vuota di lunghezza compresa tra 1 e 100 caratteri, THEN THE PokeApiClient SHALL restituire un PokeApiError che indica un Identificatore non valido, senza inviare alcuna richiesta HTTP.
6. IF l'Operazione_GET riceve una risposta HTTP con stato diverso da 200 e da 404, THEN THE PokeApiClient SHALL restituire un PokeApiError che indica un errore di risposta e include lo stato HTTP ricevuto.
7. IF la richiesta HTTP GET fallisce per errore di rete o non riceve risposta entro 10 secondi, THEN THE PokeApiClient SHALL restituire un PokeApiError che indica un errore di rete o di timeout.

### Requirement 2: Elenco paginato di risorse (LIST)

**User Story:** Come sviluppatore dell'app Pokédex, voglio elencare le risorse
PokéAPI in modo paginato, così da poter mostrare la lista dei Pokémon a blocchi.

#### Acceptance Criteria

1. WHEN l'Operazione_LIST viene invocata con Limit e Offset, THE PokeApiClient SHALL inviare una richiesta HTTP GET a `{Base_URL}pokemon` con i parametri di query `limit={Limit}` e `offset={Offset}`.
2. WHEN l'Operazione_LIST riceve una Risposta_Raw con esito positivo, THE PokeApiClient SHALL restituire una Pagina_LIST in cui `count` è un intero maggiore o uguale a 0, `next` e `previous` sono ciascuno un URL oppure nullo, e `results` contiene al massimo un numero di elementi pari a Limit.
3. THE PokeApiClient SHALL rappresentare ogni Riferimento_Risorsa nella Pagina_LIST con il nome della Risorsa (stringa non vuota) e il relativo URL (stringa non vuota).
4. WHERE Limit e Offset non vengono forniti all'Operazione_LIST, THE PokeApiClient SHALL usare i valori predefiniti `limit=20` e `offset=0`.
5. IF l'Operazione_LIST viene invocata con un Limit minore di 1 o maggiore di 100, oppure con un Offset minore di 0, THEN THE PokeApiClient SHALL restituire un PokeApiError che indica parametri di paginazione non validi, senza inviare alcuna richiesta HTTP.
6. IF una richiesta dell'Operazione_LIST fallisce per errore di rete o riceve una risposta HTTP non-2xx, THEN THE PokeApiClient SHALL restituire un PokeApiError senza restituire una Pagina_LIST parziale.
7. IF l'Operazione_LIST riceve una risposta con esito positivo il cui corpo non è conforme alla struttura attesa della Pagina_LIST, THEN THE PokeApiClient SHALL restituire un PokeApiError che indica una risposta non valida.

### Requirement 3: Base URL configurabile

**User Story:** Come sviluppatore, voglio configurare il Base URL del client,
così da poter usare lo stesso client contro l'API pubblica o contro un'istanza
PokéAPI locale.

#### Acceptance Criteria

1. WHEN il PokeApiClient viene creato con un Base_URL esplicito non vuoto, THE PokeApiClient SHALL inviare tutte le richieste successive usando quel Base_URL.
2. WHERE nessun Base_URL viene fornito alla creazione del PokeApiClient, THE PokeApiClient SHALL usare il Base_URL predefinito `https://pokeapi.co/api/v2/`.
3. WHEN il PokeApiClient compone l'URL di una richiesta, THE PokeApiClient SHALL unire il Base_URL e il percorso della risorsa inserendo esattamente un singolo carattere `/` come separatore, indipendentemente dalla presenza o assenza di `/` finale nel Base_URL e di `/` iniziale nel percorso.
4. IF alla creazione del PokeApiClient viene fornito un Base_URL vuoto, composto solo da spazi, o non conforme al formato di un URL assoluto (schema `http` o `https` seguito da un host), THEN THE PokeApiClient SHALL rifiutare la creazione sollevando un errore che indica che il Base_URL non è valido, senza creare un'istanza utilizzabile.

### Requirement 4: Gestione degli errori

**User Story:** Come sviluppatore, voglio che il client segnali i fallimenti con
un tipo di errore chiaro, così da poter gestire in modo esplicito gli stati di
errore nell'interfaccia.

#### Acceptance Criteria

1. IF una richiesta del PokeApiClient riceve una risposta HTTP con stato pari a 404, THEN THE PokeApiClient SHALL restituire un PokeApiError con categoria "risorsa non trovata" che include lo stato HTTP ricevuto.
2. IF una richiesta del PokeApiClient riceve una risposta HTTP con stato non compreso tra 200 e 299 e diverso da 404, THEN THE PokeApiClient SHALL restituire un PokeApiError con categoria "risposta HTTP non valida" che include lo stato HTTP ricevuto.
3. IF una richiesta del PokeApiClient fallisce per un errore di rete o per timeout prima di ricevere una risposta HTTP, THEN THE PokeApiClient SHALL restituire un PokeApiError con categoria "errore di rete".
4. IF una richiesta del PokeApiClient riceve una risposta HTTP con stato compreso tra 200 e 299 il cui corpo non è deserializzabile nel tipo di dominio atteso, THEN THE PokeApiClient SHALL restituire un PokeApiError con categoria "risposta HTTP non valida".
5. THE PokeApiError SHALL esporre un campo categoria il cui valore appartiene esattamente all'insieme composto da "risorsa non trovata", "risposta HTTP non valida", "parametri non validi" ed "errore di rete".
6. THE PokeApiError SHALL esporre un messaggio descrittivo in italiano, di lunghezza compresa tra 1 e 200 caratteri, che riassume la causa del fallimento.
7. WHERE la categoria dell'errore è "risorsa non trovata" o "risposta HTTP non valida", THE PokeApiError SHALL esporre lo stato HTTP ricevuto come intero compreso tra 100 e 599.

### Requirement 5: Tipizzazione dei confini di rete e mappatura al dominio

**User Story:** Come sviluppatore, voglio tipi espliciti per le risposte grezze
delle PokéAPI e una mappatura verso i tipi di dominio, così da isolare la forma
della rete dal resto dell'applicazione senza usare `any`.

#### Acceptance Criteria

1. THE PokeApiClient SHALL definire, nel livello `src/api/`, tipi espliciti per ogni Risposta_Raw ricevuta dalle PokéAPI, in cui ogni campo consumato è dichiarato con un tipo concreto (non `any`, e non `unknown` senza narrowing).
2. THE PokeApiClient SHALL restituire ai chiamanti soltanto Tipi_Dominio.
3. THE PokeApiClient SHALL non esporre il tipo Risposta_Raw all'esterno del livello `src/api/`.
4. WHEN il PokeApiClient riceve una Risposta_Raw valida, THE PokeApiClient SHALL mapparla in un Tipo_Dominio traducendo i campi grezzi nei campi di dominio corrispondenti.
5. IF una Risposta_Raw è priva di un campo obbligatorio o presenta un campo con tipo diverso da quello atteso, THEN THE PokeApiClient SHALL restituire un PokeApiError, senza restituire un Tipo_Dominio parziale.
6. THE PokeApiClient SHALL essere implementato senza l'uso del tipo `any` (esplicito o implicito) e senza direttive di soppressione dei controlli di tipo.

### Requirement 6: Testabilità con fetch mockato e verifica opzionale contro istanza locale

**User Story:** Come sviluppatore del workshop, voglio testare il client in unit
test con `fetch` mockato e poterlo verificare opzionalmente contro un'istanza
PokéAPI locale, così da avere test deterministici senza rete reale e una
verifica di integrazione quando serve.

#### Acceptance Criteria

1. WHILE gli unit test del PokeApiClient sono in esecuzione, THE PokeApiClient SHALL effettuare tutte le richieste HTTP tramite una funzione `fetch` iniettabile (dependency injection) sostituibile con un mock, senza aprire alcuna connessione di rete reale.
2. THE PokeApiClient SHALL essere configurabile con un Base_URL, il cui valore predefinito è l'endpoint dell'API pubblica (`https://pokeapi.co/api/v2/`), sostituibile con l'URL di un'istanza PokéAPI locale per l'esecuzione di test o verifiche di integrazione.
3. WHEN il PokeApiClient viene configurato con il Base_URL di un'istanza PokéAPI locale, THE PokeApiClient SHALL eseguire le Operazione_GET e Operazione_LIST producendo lo stesso comportamento osservabile (struttura dei tipi di dominio restituiti e gestione degli errori) previsto per l'API pubblica.
