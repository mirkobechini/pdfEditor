# Bug fix: Mobile MVP testing fixes (issue 614)

## Obiettivo

Fixare i bug emersi dai test dell'APK MVP mobile e aggiungere piccole migliorie UX.

## Commit eseguiti (15)

1. ✅ `fix(mobile): add @expo/vector-icons and configure PaperProvider icon settings`
2. ✅ `fix(mobile): add useSafeAreaInsets to FAB position in HomeScreen`
3. ✅ `fix(mobile): add key={pdfId} to PdfViewer to force remount on PDF change`
4. ✅ `fix(mobile): rewrite Scanner convertToPdf with expo-file-system/legacy static import`
5. ✅ `fix(mobile): save guest token in AsyncStorage and handle offline restoreSession`
6. ✅ `fix(mobile): add expo-font peer dependency`
7. ✅ `fix(mobile): add expo-font to app.json plugins`
8. ✅ `fix(mobile): improve error handling in api.ts — extractErrorResponse returns plain detail`
9. ✅ `fix(mobile): always remember login token so offline re-auth works`
10. ✅ `fix(mobile): force Pdf component remount via setTimeout(50ms)`
11. ✅ `feat(mobile): add optional file name input after camera scan`
12. ✅ `fix(mobile): replace dynamic imports with static imports in pdfService`
13. ✅ `feat(mobile): add loading spinner during auth restore and password visibility toggle`
14. ✅ `feat(mobile): replace app icon with desktop branding`
15. ✅ `fix(mobile): real fixes — page_count from pdf-lib, Pdf remount via refreshKey, offline restore real user, split/reorder confirm dialog, icon 1024x1024`
16. ✅ `fix(mobile): increment refreshKey AFTER setting pdfUri`

## Ancora da fixare

- [ ] Icona: cancellare android/ e rifare prebuild per far caricare la nuova icona
- [ ] Login: overlay loading visibile durante login (non solo spinner AppNavigator)
- [ ] Split UI: selezionare pagine da estrarre
- [ ] Reorder UI: riordinare pagine con pulsanti su/giù
- [ ] Secondo PDF: fix refreshKey presente ma non testato

## Build

- [ ] Build APK → test → PR → merge
