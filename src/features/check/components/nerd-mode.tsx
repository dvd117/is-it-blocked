"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/context";

interface NerdModeProps {
  domain: string;
}

export default function NerdMode({ domain }: NerdModeProps) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current);
      }
    };
  }, []);

  if (!domain) return null;

  const commands = [
    `dig ${domain}`,
    `dig @1.1.1.1 ${domain}`,
    `dig @8.8.8.8 ${domain}`,
    `curl -I --connect-timeout 10 https://${domain}`,
    `traceroute ${domain}`,
  ];

  const descriptions = [
    t("nerd.desc.0"),
    t("nerd.desc.1"),
    t("nerd.desc.2"),
    t("nerd.desc.3"),
    t("nerd.desc.4"),
  ];

  async function copyCommand(command: string, index: number) {
    await navigator.clipboard.writeText(command);
    setCopiedIndex(index);

    if (copyResetTimeout.current) {
      clearTimeout(copyResetTimeout.current);
    }

    copyResetTimeout.current = setTimeout(() => {
      setCopiedIndex(null);
      copyResetTimeout.current = null;
    }, 1500);
  }

  return (
    <section className="nerd-mode">
      <button
        className="nerd-mode-toggle"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        {t("nerd.toggle")}
      </button>

      {expanded && (
        <div className="nerd-mode-content">
          {commands.map((command, index) => (
            <div className="nerd-mode-item" key={command}>
              <div className="nerd-mode-command-block">
                <code>{command}</code>
                <button
                  className="nerd-mode-copy"
                  type="button"
                  onClick={() => void copyCommand(command, index)}
                >
                  {copiedIndex === index ? t("nerd.copied") : t("nerd.copy")}
                </button>
              </div>
              <p className="nerd-mode-description">{descriptions[index]}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
