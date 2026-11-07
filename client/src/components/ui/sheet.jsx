import * as React from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform
} from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SheetContext = React.createContext({
  open: false,
  onOpenChange: () => {}
});

function Sheet({ open = false, onOpenChange = () => {}, children }) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

const SheetTrigger = React.forwardRef(({ children, onClick, ...props }, ref) => {
  const { onOpenChange } = React.useContext(SheetContext);
  if (!React.isValidElement(children)) return null;

  return React.cloneElement(children, {
    ref,
    onClick: (e) => {
      children.props.onClick?.(e);
      onClick?.(e);
      onOpenChange(true);
    },
    ...props
  });
});
SheetTrigger.displayName = "SheetTrigger";

const SheetClose = React.forwardRef(({ className, onClick, children, ...props }, ref) => {
  const { onOpenChange } = React.useContext(SheetContext);
  return (
    <button
      ref={ref}
      type="button"
      className={className}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
SheetClose.displayName = "SheetClose";

function SheetPortal({ children }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const SheetContent = React.forwardRef(
  ({ side = "right", className, children, onOpenAutoFocus, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(SheetContext);
    const onOpenChangeRef = React.useRef(onOpenChange);
    React.useEffect(() => {
      onOpenChangeRef.current = onOpenChange;
    });
    const dragControls = useDragControls();
    const y = useMotionValue(0);
    const [isDragging, setIsDragging] = React.useState(false);
    // Smooth dynamic backdrop fade as the sheet is pulled down
    const dragBackdropOpacity = useTransform(y, [0, 300], [1, 0.2], { clamp: true });
    const shouldReduceMotion = useReducedMotion();
    const isBottom = side === "bottom";

    const panelRef = React.useRef(null);
    const setRefs = React.useCallback(
      (node) => {
        panelRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    React.useEffect(() => {
      if (open) {
        y.set(0);
        setIsDragging(false);
      }
    }, [open, y]);

    // Track visual viewport to cleanly follow the virtual keyboard on mobile without layout stutter
    React.useEffect(() => {
      if (!open || !isBottom) return;
      const vv = window.visualViewport;
      if (!vv) return;
      let raf = 0;
      const sync = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
          panelRef.current?.style.setProperty("--kb", `${kb}px`);
        });
      };
      sync();
      vv.addEventListener("resize", sync);
      vv.addEventListener("scroll", sync);
      return () => {
        cancelAnimationFrame(raf);
        panelRef.current?.style.removeProperty("--kb");
        vv.removeEventListener("resize", sync);
        vv.removeEventListener("scroll", sync);
      };
    }, [open, isBottom]);

    // Lock body and document scroll while sheet is open to prevent background panning on mobile
    React.useEffect(() => {
      if (!open) return;
      const scrollY = window.scrollY;
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyPosition = document.body.style.position;
      const originalBodyTop = document.body.style.top;
      const originalBodyWidth = document.body.style.width;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.documentElement.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.position = originalBodyPosition;
        document.body.style.top = originalBodyTop;
        document.body.style.width = originalBodyWidth;
        document.documentElement.style.overflow = originalHtmlOverflow;
        window.scrollTo(0, scrollY);
      };
    }, [open]);

    // Android hardware back button integration (push dummy state, popstate closes sheet)
    React.useEffect(() => {
      if (!open) return;
      const stateObj = { splixSheetOpen: true };
      window.history.pushState(stateObj, "");

      let isPoppedByBackButton = false;

      function handlePopState() {
        isPoppedByBackButton = true;
        onOpenChangeRef.current?.(false);
      }

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        // If closed via UI gesture/button rather than hardware back, rewind the pushed history entry
        if (!isPoppedByBackButton && window.history.state?.splixSheetOpen) {
          window.history.back();
        }
      };
    }, [open]);

    // Escape key listener
    React.useEffect(() => {
      if (!open) return;
      function handleKeyDown(e) {
        if (e.key === "Escape") {
          onOpenChangeRef.current?.(false);
        }
      }
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    const springTransition = {
      type: "spring",
      damping: 32,
      stiffness: 320,
      mass: 0.9
    };

    const motionProps = shouldReduceMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.15 }
        }
      : isBottom
      ? {
          initial: { y: "100%" },
          animate: { y: 0 },
          exit: { y: "100%", transition: { duration: 0.22, ease: "easeIn" } },
          transition: springTransition
        }
      : {
          initial: { x: "100%" },
          animate: { x: 0 },
          exit: { x: "100%", transition: { duration: 0.2, ease: "easeIn" } },
          transition: { type: "spring", damping: 30, stiffness: 300 }
        };

    return (
      <SheetPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              key="sheet-backdrop"
              style={{ opacity: isBottom && isDragging ? dragBackdropOpacity : 1 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-50 bg-ink-950/60"
              onClick={() => onOpenChangeRef.current?.(false)}
            />
          )}
          {open && (
            <motion.div
              key="sheet-panel"
              ref={setRefs}
              role="dialog"
              aria-modal="true"
              style={isBottom ? { y } : undefined}
              drag={isBottom ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={(_, info) => {
                setIsDragging(false);
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  onOpenChangeRef.current?.(false);
                } else {
                  animate(y, 0, springTransition);
                }
              }}
              className={cn(
                "fixed z-50 bg-white shadow-2xl",
                isBottom
                  ? "inset-x-0 bottom-[var(--kb,0px)] rounded-t-[1.75rem] border-t border-ink-200"
                  : "inset-y-0 right-0 h-full w-full sm:max-w-lg border-l border-ink-200 overflow-y-auto",
                className
              )}
              {...motionProps}
              {...props}
            >
              {isBottom && (
                <div
                  className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div className="h-1.5 w-12 rounded-full bg-ink-300 hover:bg-ink-400 transition-colors" />
                </div>
              )}
              {children}
              <button
                type="button"
                onClick={() => onOpenChangeRef.current?.(false)}
                className="absolute right-4 top-3.5 rounded-xl p-1.5 text-ink-500 hover:text-ink-800 hover:bg-ink-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 z-20"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetPortal>
    );
  }
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg sm:text-xl font-semibold text-ink-900 font-sans", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm text-ink-500 font-sans", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetPortal,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription
};
