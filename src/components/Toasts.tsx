"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

interface Toast {
  id: number;
  icon?: string;
  title: string;
  body?: string;
  tone?: "default" | "success" | "error" | "achievement";
}

const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(Ctx);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts((list) => [...list, { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.tone === "achievement" ? 4500 : 3000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed top-16 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto glass rounded-2xl px-4 py-3 flex items-center gap-3 max-w-sm w-full shadow-xl ${
                t.tone === "achievement"
                  ? "border-volt/60 shadow-[0_0_30px_-5px_var(--volt)]"
                  : t.tone === "error"
                    ? "border-bad/60"
                    : t.tone === "success"
                      ? "border-good/60"
                      : ""
              }`}
            >
              {t.icon && <span className="text-2xl">{t.icon}</span>}
              <div className="min-w-0">
                <p className="font-bold text-sm">{t.title}</p>
                {t.body && <p className="text-xs text-muted">{t.body}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
