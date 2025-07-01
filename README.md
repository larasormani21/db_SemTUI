# 📊 SemTUI Database – PostgreSQL + Node.js

> Sistema relazionale a supporto del tool **SemTUI** per l’arricchimento semantico di dati tabellari.

## 🔍 Obiettivo

Questo progetto estende il tool SemTUI, aggiungendo un **database relazionale** in PostgreSQL, progettato per sostituire l’originaria gestione a file JSON.  
Il sistema supporta:
- operazioni CRUD complete su utenti, dataset, tabelle, colonne e celle,
- memorizzazione di informazioni ricavate dall'arricchimento semantico tramite campi `JSONB`,
- trigger per aggiornamenti automatici,
- integrazione facilitata con il backend `Node.js` del tool SemTUI.

## 🗂 Struttura del database

Il modello dati segue una struttura **gerarchica**:
- `users` → `datasets` → `tables` → `columns` → `cells`

Ogni livello ha vincoli di integrità e **relazioni 1:N** con i successivi e l'eliminazione dell'uno comporta l'eliminazione delle tabelle in relazione.

La visualizzazione completa e le query per la creazione dello schema sono disponibili nel file [schema.sql](/schema.sql).

### 📦 Tabelle principali

| Entità     | Descrizione |
|------------|-------------|
| `users`    | Autenticazione e profili utente |
| `datasets` | Collezioni di tabelle associate a un utente |
| `tables`   | Tabelle contenenti i dati tabellari (con metadati statistici) |
| `columns`  | Colonne arricchite con status, metadati, relazioni e flag `is_entity` |
| `cells`    | Celle individuali con valori, candidati, URI e score di riconciliazione |

### 🛠 Trigger

- Aggiornano automaticamente:
  - numero colonne e righe
  - celle totali e riconciliate
  - data di modifica
  - ripristinato l’output RDF quando una tabella viene alterata

### 🧮 Indici

Sono definiti per:
- relazioni tra entità (`user_id`, `dataset_id`, etc.)
- campi JSONB per query sui candidati (`GIN index`)
- lookup rapidi su `columns`, `cells` e `tables`

## ⚙️ Integrazione con il backend Node.js

La cartella [db](/db/) è così composta:

├── .env
├── users.js
├── datasets.js
├── index.js
├── tables.js
├── columns.js
├── cells.js


### 📄 `.env`
File da compilare all'avvio contenente le variabili di connessione a PostgreSQL.

### 🔧 `index.js`
Punto d’ingresso del modulo database. Si occupa di:

- caricare le variabili d’ambiente da `.env` tramite `dotenv`,
- creare una connessione PostgreSQL con `pg.Pool`,
- esportare `pool` per l’uso diretto se necessario,
- esportare tutti i moduli (`users.js`, `datasets.js`, `tables.js`, `column.js`, `cells.js`).

###📦 Moduli dedicati
Ogni entità ha un modulo dedicato con metodi per l'esecuzione di query e funzioni di supporto.

## 🧪 Testing e benchmark

Nella cartella ['test'](/test/) sono inclusi **3 use cases** con benchmark automatici:
1. **Small table** – tabella semplice con alcune colonne arricchite ed estese. Corrisponde ai file ['1.json'](/test/data/1.json) e ['1.extension.response.json'](/test/data/1.extension.response.json), quest'ultimo contiene le risposte di operazioni di estensioni come previste dal formato ['W3C'](https://www.w3.org/community/reports/reconciliation/CG-FINAL-specs-0.2-20230410/#data-extension-responses)
2. **Tabella con null** – confronto tra dati grezzi e arricchiti. Corrisponde ai file ['2.json'](/test/data/2.json) e ['3.json'](/test/data/3.json),
3. **Big table (10.000 righe)** – test su grandi volumi e impatto sulle performance. Non è direttamente presente nella repository ma è generabile tramite ['generate_big_json.js'](/test/generate_big_json.js).

I risultati mostrano ottime performance su ogni tipologia di query, eccetto per delle criticità sull'inserimento massivo di grandi quantità di dati.

## 🚀 Prerequisiti e installazione

### Prerequisiti

- **Node.js** (versione ≥ 18 consigliata)
- **PostgreSQL** (versione ≥ 13 consigliata)
- **npm** (incluso con Node.js)

### Installazione

1. **Clona la repository**
   ```
   git clone https://github.com/larasormani21/db_SemTUI
   cd db_SemTUI
   ```
2. **Installa le dipendenze Node.js**
   ```
    npm install
   ```
   ```
3. **Configura correttamente il file .env**
   ```
    PGUSER=postgres
    PGPASSWORD=yourpassword
    PGHOST=localhost
    PGPORT=5432
    PGDATABASE=semtui_db
   ```
4. **Crea lo schema del database**
   ```
    psql -U <utente> -d <database> -f db_SemTUI/schema.sql
   ```
