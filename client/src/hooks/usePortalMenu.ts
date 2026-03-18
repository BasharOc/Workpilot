import { useEffect, useRef, useState } from "react";

export function usePortalMenu() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!openKey) return;
    function handleOutside() {
      setOpenKey(null);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openKey]);

  function toggle(key: string) {
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    const rect = refs.current[key]?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
    setOpenKey(key);
  }

  function close() {
    setOpenKey(null);
  }

  function isOpen(key: string) {
    return openKey === key;
  }

  return { isOpen, toggle, close, pos, refs };
}
