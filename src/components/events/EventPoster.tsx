import { useEffect, useState } from "react";
import { getEventPoster } from "../../api/events";
import { useLanguage } from "../../i18n/LanguageContext";

export function EventPoster({
  posterUrl,
  authenticated = false,
  className,
  alt,
}: {
  posterUrl?: string | null;
  authenticated?: boolean;
  className: string;
  alt?: string;
}) {
  const { t } = useLanguage();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!posterUrl) {
      setImageUrl(null);
      return;
    }
    if (!authenticated) {
      setImageUrl(posterUrl);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setImageUrl(null);
    void getEventPoster(posterUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [posterUrl, authenticated]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-surface text-center text-muted ${className}`}>
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={alt ?? t("eventPoster")}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="px-3 text-sm">{failed ? t("posterFailed") : t("poster")}</span>
      )}
    </div>
  );
}
