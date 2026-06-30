import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "zh" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LANGUAGE_STORAGE_KEY = "riversoft-language";
const DEFAULT_LANGUAGE: Language = "en";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "zh" || storedLanguage === "en" ? storedLanguage : DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}
