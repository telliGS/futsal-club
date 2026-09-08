import { useRef, useState } from "react";
import type { IToast } from "./panel-types";

export type TipoToast = IToast["type"];

export function useToasts() {
  const [toasts, setToasts] = useState<IToast[]>([]);
  // Contador en ref: dos toasts en el mismo batch comparten el estado del
  // render actual, así que el id debe salir de un ref (no de `counter`).
  const nextId = useRef(0);

  const mostrarToast = (message: string, type: TipoToast = "info") => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return { toasts, mostrarToast };
}