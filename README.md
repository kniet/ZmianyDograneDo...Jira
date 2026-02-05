# ZmianyDograneDo...Jira

Wtyczka przeglądarki, która automatycznie ustawia treść komentarza w Jira w zależności od wybranej wersji naprawy.

## 📋 Wymagania

- Node.js (v14 lub nowszy)
- npm lub yarn
- Przeglądarka Chrome, Edge, Brave lub Firefox

## 🔧 Instalacja - Tryb Deweloperski

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/kniet/ZmianyDograneDo...Jira.git
cd ZmianyDograneDo...Jira
```

### 2. Zainstaluj zależności

```bash
npm install
```

### 3. Zbuduj wtyczkę

```bash
npm run build
```

Po wykonaniu tej komendy, zbudowane pliki wtyczki znajdą się w katalogu `dist/`.

### 4. Załaduj wtyczkę do przeglądarki

#### Chrome / Edge / Brave

1. Otwórz przeglądarkę i przejdź do:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`

2. Włącz **Tryb dewelopera** (przełącznik w prawym górnym rogu)

3. Kliknij przycisk **Załaduj rozpakowane rozszerzenie** (Load unpacked)

4. Wybierz folder `dist/` z projektu

5. Wtyczka zostanie załadowana i powinna być aktywna
