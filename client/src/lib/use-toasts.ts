import { useState } from "react";
import type { IToast } from "./panel-types";

export type TipoToast = IToast["type"];

export function useToasts() {
  const [toasts, setToasts] = useState<IToast[]>([]);
  const [counter, setCounter] = useState(0);

  const mostrarToast = (message: string, type: TipoToast = "info") => {
    const id = counter + 1;
    setCounter(id);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return { toasts, mostrarToast };
}