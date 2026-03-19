import { useEffect, useRef, useState } from "react";

export function usePortalMenu() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>(
    { top: 0, right: 0 },
  );
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!openKey) return;

    function updatePos() {
      const rect = refs.current[openKey!]?.getBoundingClientRect();
      if (rect)
        setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }

    function handleOutside() {
      setOpenKey(null);
    }

    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [openKey]);

  function toggle(key: string) {
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    const rect = refs.current[key]?.getBoundingClientRect();
    if (rect)
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
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
