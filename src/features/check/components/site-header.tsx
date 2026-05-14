import Image from "next/image";
import { useT } from "@/i18n/context";
import { useTheme } from "@/theme/context";

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
      </div>
    </header>
  );
}
