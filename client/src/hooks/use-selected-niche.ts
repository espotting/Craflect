import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "craflect_selected_niche_id";

const listeners = new Set<(id: string | null) => void>();

function notify(id: string | null) {
  listeners.forEach((fn) => fn(id));
}

export function useSelectedNiche() {
  const [selectedNicheId, setLocal] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handler = (id: string | null) => setLocal(id);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const setSelectedNicheId = useCallback((id: string | null) => {
    setLocal(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    notify(id);
  }, []);

  return { selectedNicheId, setSelectedNicheId };
}
