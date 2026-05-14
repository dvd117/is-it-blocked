"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import messages, { type Lang } from "./messages";

type Params = Record<string, string | number>;
type DocumentLike = {
  documentElement: { lang: string };
  title: string;
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Params) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function interpolateMessage(message: string, params: Params = {}): string {
  return message.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function applyLanguageToDocument(target: DocumentLike, lang: Lang) {
  target.documentElement.lang = lang;
  target.title = messages[lang]["site.htmlTitle"];
}

function isLang(value: string | null): value is Lang {
  return value === "es" || value === "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const saved = window.localStorage.getItem("lang");
    if (isLang(saved)) {
      queueMicrotask(() => setLangState(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", lang);
    applyLanguageToDocument(document, lang);
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang: setLangState,
    t: (key, params) => interpolateMessage(messages[lang][key] ?? key, params),
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useT must be used inside LanguageProvider");
  return context;
}
