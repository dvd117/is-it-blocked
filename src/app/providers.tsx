"use client";

import { LanguageProvider } from "@/i18n/context";
import { ThemeProvider } from "@/theme/context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </LanguageProvider>
  );
}
