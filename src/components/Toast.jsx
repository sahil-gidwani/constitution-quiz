import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';

const Ctx = createContext(() => {});
const ICON = { success: CheckCircle2, info: Info, error: TriangleAlert };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const id = useRef(0);
  const push = useCallback((message, kind = 'info') => {
    const n = ++id.current;
    setItems((l) => [...l.slice(-2), { n, message, kind }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.n !== n)), 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const I = ICON[t.kind] || Info;
            return (
              <motion.div key={t.n} className={`toast toast--${t.kind}`} layout
                initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
                <I size={18} aria-hidden="true" /> <span>{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
