import { useEffect } from "react";

export default function Comments() {
  useEffect(() => {
    const currentTheme = () => document.firstElementChild?.getAttribute("data-theme") === "dark" ? "dark_dimmed" : "light";

    function updateGiscusTheme(theme: string) {
      const message = {
        setConfig: {
          theme,
        },
      };

      const iframe = document.querySelector("iframe.giscus-frame") as HTMLIFrameElement;
      if (!iframe) return;
      iframe.contentWindow?.postMessage(
        { giscus: message },
        "https://giscus.app",
      );
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        updateGiscusTheme(currentTheme());
      });
    });

    observer.observe(document.firstElementChild!, { attributeFilter: ["data-theme"] });

    const script = document.createElement("script");
    const attributes = {
      "data-repo": "audacioustux/audacioustux",
      "data-repo-id": "MDEwOlJlcG9zaXRvcnkyNzgzMzkzNjM=",
      "data-category": "Announcements",
      "data-category-id": "DIC_kwDOEJcfI84CZaLP",
      "data-mapping": "og:title",
      "data-strict": "1",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": currentTheme(),
      "data-lang": "en",
      "data-loading": "lazy",
    };

    script.src = "https://giscus.app/client.js";
    script.async = true;

    Object.entries(attributes).forEach(([key, value]) => {
      script.setAttribute(key, value);
    });

    document.body.appendChild(script);
  }, []);

  return (
    <div className="giscus mb-8" />
  )
}