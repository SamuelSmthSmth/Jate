import { useState, useEffect } from "react";

export default function LoadingScreen() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExpanded(true), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="size-full flex items-center justify-center bg-background">
      <div className={`h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${expanded ? "w-24" : "w-10"}`}>
        <div className="flex items-center justify-center select-none font-bold text-base text-primary-foreground">
          <span>J</span>
          <div className={`flex items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${expanded ? "max-w-[60px] opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-4"}`}>
            <span className="tracking-tight pl-0.5">ATE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
