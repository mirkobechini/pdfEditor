/**
 * Dynamic app config (issue #923, T0-backend — opzione 2, decisa da Mirko 04/10).
 *
 * Serve un'unica eccezione: su Android 9+ il traffico HTTP in chiaro è
 * bloccato nei release build, ma gli e2e (Maestro) usano il backend locale
 * su http://10.0.2.2:8000 (loopback host dell'emulatore). Quindi si abilita
 * `usesCleartextTraffic` SOLO quando EXPO_PUBLIC_API_URL è un URL http di
 * sviluppo/e2e. I build di produzione (release-mobile.yml) non impostano
 * la variabile -> comportamento invariato, nessun cleartext.
 */
module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "";
  const needsCleartext =
    apiUrl.startsWith("http://10.0.2.2") ||
    apiUrl.startsWith("http://localhost") ||
    apiUrl.startsWith("http://127.0.0.1");

  if (needsCleartext) {
    config.plugins = config.plugins || [];
    if (!config.plugins.some((p) => Array.isArray(p) && p[0] === "expo-build-properties")) {
      config.plugins.push([
        "expo-build-properties",
        { android: { usesCleartextTraffic: true } },
      ]);
    }
  }
  return config;
};