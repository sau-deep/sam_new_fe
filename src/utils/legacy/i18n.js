import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { LANGUAGES } from "constants";
import { translationEN, translationHI, translationODI, translationTEL } from 'assets/i18n';

const languages = LANGUAGES.map(e => e.code)

// The translations
const resources = {
    en: {
        translation: translationEN
    },
    hi: {
        translation: translationHI
    },
    odi: {
        translation: translationODI
    },
    tel: {
        translation: translationTEL
    }
};

i18n
    .use(LanguageDetector) // Use the language detector
    .use(initReactI18next)
    .init({
        detection: {
            order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
            caches: ['localStorage', 'cookie']
        },
        lookupLocalStorage: 'i18nextLng',
        fallbackLng: 'en', // default language
        resources,
        whitelist: languages,
        interpolation: {
            escapeValue: false // react already safe from XSS
        }
    });

export default i18n;
