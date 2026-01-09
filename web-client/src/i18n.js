import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from './components/i18n/messages_en.json';
import ru from './components/i18n/messages_ru.json';
import de from './components/i18n/messages_de.json'; // German
import zh from './components/i18n/messages_zh.json'; // Chinese

const resources = {
  en: {
    translation: en
  },
  ru: {
    translation: ru
  },
  de: {
    translation: de
  },
  zh: {
    translation: zh
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;