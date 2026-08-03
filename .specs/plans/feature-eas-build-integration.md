# Feature: EAS Build Integration with GitHub Actions

## Obiettivo

Collegare EAS Build alla CI/CD di GitHub Actions (release.yml) in modo che quando viene creato un tag `v*`, l'APK mobile venga buildato automaticamente e caricato sulla stessa GitHub Release del desktop.

## Dipendenze

- Feature mobile completata (issue #611)
- Account Expo configurato con access token
- GitHub Actions funzionante (release.yml esistente)

## Stack

- EAS Build (Expo Application Services)
- GitHub Actions
- Expo Access Token per autenticazione headless

## Passaggi

1. **Ottenere EXPO_TOKEN**: Generare un access token da https://expo.dev/settings/access-tokens
2. **Aggiungere EXPO_TOKEN ai GitHub secrets**: `gh secret set EXPO_TOKEN` (nella repo)
3. **Aggiornare release.yml**: Aggiungere job `build-mobile` che:
   - Viene eseguito dopo `wait-for-ci`
   - Usa `expo/expo-github-action@v9` per autenticazione
   - Esegue `eas build --platform android --profile release --non-interactive`
   - Scarica l'APK e lo allega alla GitHub Release già creata

## Output atteso

- Ogni release `v*` genera automaticamente un APK Android su EAS Build
- L'APK è disponibile nella stessa GitHub Release degli installer desktop

## Note

- `eas.json` già configurato con profile `preview` e `release`
- Il job deve usare `--no-wait` per evitare timeout CI, oppure aspettare il completamento

## Status

[ ] Non iniziata
