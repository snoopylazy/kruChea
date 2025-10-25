import { createI18n } from "vue-i18n";
import en from "../src/languages/en.json";
import km from "../src/languages/kh.json";

const messages = {
  en,
  km,
};

// Get saved locale or fallback to 'en'
const savedLocale = localStorage.getItem("locale") || "en";

const i18n = createI18n({
  legacy: false, // use Composition API
  locale: savedLocale,
  fallbackLocale: "en",
  messages,
});

export default i18n;
