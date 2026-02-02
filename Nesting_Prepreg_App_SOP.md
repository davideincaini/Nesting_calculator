# Base di Progetto: Nesting Prepreg App
## Ruolo: Senior Full-Stack Developer & UX Designer

### Obiettivo
Sviluppare una PWA per iPhone che calcoli la lunghezza di un rotolo di prepreg necessaria per N patch.

### Parametri di Input
- `roll_width` (mm): Larghezza del rotolo.
- `patch_length` (mm): Lunghezza patch.
- `patch_width` (mm): Larghezza patch.
- `orientation` (0 or 45): Angolo di taglio.
- `quantity` (int): Numero di patch richieste.

### Requisiti Funzionali
1. Calcolo del nesting ottimizzato:
   - Se 0°, usa griglia standard.
   - Se 45°, calcola l'ingombro diagonale e ottimizza l'incastro tra le patch.
2. Arrotondamento: Il risultato finale della quantità di materiale deve garantire sempre un numero intero di patch complete.
3. Risultato: Mostrare la lunghezza totale del rotolo necessaria in metri e la percentuale di sfrido (waste).

### Estetica (iOS Identity)
- Usa CSS `backdrop-filter: blur()` per le testate.
- Implementa `safe-area-inset` per i display con notch/Dynamic Island.
- Icone: Usa SF Symbols (o SVG equivalenti).