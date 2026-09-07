import { useEffect } from "react";

interface PageMeta {
  title: string;
  description: string;
}

/**
 * Actualiza <title> y <meta name="description"> + og tags por página.
 * No usa librerías externas para no conflictuar con otras IAs/dependencias.
 * Seguro para SPA Vite: solo toca document en cliente.
 */
export function usePageMeta({ title, description }: PageMeta) {
  useEffect(() => {
    const fullTitle = `${title} | Club Social y Deportivo José Hernández`;
    document.title = fullTitle;

    // description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    // og:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", fullTitle);

    // og:description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);

    // og:url dinámico
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", window.location.href);
  }, [title, description]);
}
