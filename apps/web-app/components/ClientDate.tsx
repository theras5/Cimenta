"use client";

import React, { useEffect, useState } from "react";

interface ClientDateProps {
  iso?: string | null;
  options?: Intl.DateTimeFormatOptions;
  locale?: string;
  fallback?: string;
}

export default function ClientDate({ iso, options, locale, fallback = "" }: ClientDateProps) {
  const [formatted, setFormatted] = useState<string>(fallback);

  useEffect(() => {
    if (!iso) {
      setFormatted(fallback);
      return;
    }
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) {
        setFormatted(fallback);
        return;
      }
      const fmt = d.toLocaleDateString(locale || navigator.language || undefined, options);
      setFormatted(fmt);
    } catch (e) {
      setFormatted(fallback);
    }
  }, [iso, options, locale, fallback]);

  return <>{formatted}</>;
}
