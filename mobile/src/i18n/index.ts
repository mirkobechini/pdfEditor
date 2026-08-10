import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "./en.json";
import it from "./it.json";

const systemLocale = getLocales()?.[0]?.languageCode || "en";
const supportedLanguages = ["en", "it"] as const;
type SupportedLang = (typeof supportedLanguages)[number];

function getSystemLanguage(): SupportedLang {
  if (supportedLanguages.includes(systemLocale as SupportedLang)) {
    return systemLocale as SupportedLang;
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
  },
  lng: getSystemLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
export type { SupportedLang };
export { supportedLanguages, getSystemLanguage };
