import { motion } from "framer-motion";

const LETTERS = ["J", "A", "T", "E"];

export default function LoadingScreen() {
  return (
    <div className="size-full flex flex-col items-center justify-center gap-6 bg-background">
      {/* Logo mark with a soft pulsing glow */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <motion.div
          className="absolute -inset-4 rounded-full bg-primary/25 blur-2xl"
          animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-primary-foreground text-2xl font-bold leading-none"
          >
            J
          </motion.span>
        </div>
      </motion.div>

      {/* Staggered wordmark */}
      <div className="flex items-center overflow-hidden">
        {LETTERS.map((ch, i) => (
          <motion.span
            key={i}
            initial={{ y: 18, opacity: 0, filter: "blur(6px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {ch}
          </motion.span>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="text-[11px] text-muted-foreground font-mono"
      >
        Loading your applications…
      </motion.p>

      {/* Progress bar */}
      <div className="w-28 h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.1, delay: 0.2, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
