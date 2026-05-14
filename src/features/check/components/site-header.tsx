import Image from "next/image";
import { useT } from "@/i18n/context";
import { useTheme } from "@/theme/context";

const GITHUB_URL = "https://github.com/dvd117/is-it-blocked";
const LINKEDIN_URL = "https://www.linkedin.com/in/davidaragort/";

export function SiteHeader() {
  const { lang, setLang, t } = useT();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div>
          <h1>
            <Image
              className="site-title-logo"
              src="/logo.svg"
              width={22}
              height={22}
              alt=""
              aria-hidden="true"
              priority
            />
            {t("site.title")}
          </h1>
          <p>{t("site.subtitle")}</p>
        </div>
        <div className="header-actions">
          <div className="header-controls">
            <button
              className="header-btn"
              type="button"
              onClick={() => setLang(lang === "es" ? "en" : "es")}
            >
              {t("lang.toggle")}
            </button>
            <button
              className="header-btn"
              type="button"
              aria-label={t(theme === "dark" ? "theme.light" : "theme.dark")}
              title={t(theme === "dark" ? "theme.light" : "theme.dark")}
              onClick={toggleTheme}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
          <div className="header-links" aria-label="Project links">
            <a className="header-icon-link" href={GITHUB_URL} aria-label="GitHub repository" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.86 8.38 6.84 9.74.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.37 9.37 0 0 1 12 6.98c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.95-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.14 10.14 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
              </svg>
            </a>
            <a className="header-icon-link" href={LINKEDIN_URL} aria-label="LinkedIn profile" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6.94 8.98H3.75v10.27h3.19V8.98ZM5.34 4a1.85 1.85 0 1 0 0 3.7 1.85 1.85 0 0 0 0-3.7Zm13.91 9.55c0-3.09-1.65-4.52-3.85-4.52-1.78 0-2.57.98-3.01 1.67V8.98H9.33v10.27h3.19v-5.08c0-1.36.26-2.68 1.95-2.68 1.66 0 1.68 1.56 1.68 2.77v4.99h3.1v-5.7Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
