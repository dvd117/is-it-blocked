import type { FormEvent } from "react";
import { useT } from "@/i18n/context";

const demoExamples = ["x.com", "signal.org", "runrun.es"];
const signalKeys = ["csv", "ooni", "server", "browser"] as const;

interface SearchFormProps {
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export function SearchForm({ query, loading, onQueryChange, onSubmit }: SearchFormProps) {
  const { t } = useT();

  return (
    <section className="search-section">
      <div className="intro-panel">
        <p className="intro-eyebrow">{t("intro.title")}</p>
        <h2 className="intro-headline">{t("intro.headline")}</h2>
        <p className="intro-body">{t("intro.body")}</p>
        <p className="intro-note">{t("intro.note")}</p>
        <div className="signal-strip" aria-label={t("signals.label")}>
          <span className="signal-strip-label">{t("signals.prefix")}</span>
          {signalKeys.map((key) => (
            <span className="signal-pill" key={key}>
              {t(`signals.${key}`)}
            </span>
          ))}
        </div>
      </div>
      <form className="search-form" onSubmit={onSubmit}>
        <input
          className="search-input"
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("search.placeholder")}
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
        />
        <button className="search-btn" type="submit" disabled={loading || !query.trim()}>
          {loading ? t("search.loading") : t("search.button")}
        </button>
      </form>
      <div className="demo-examples" aria-label={t("examples.label")}>
        <span>{t("examples.prefix")}</span>
        {demoExamples.map((example) => (
          <button
            className="example-chip"
            disabled={loading}
            key={example}
            type="button"
            onClick={() => onQueryChange(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </section>
  );
}
