import { Plus, MagnifyingGlass, QrCode, Sparkle } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef } from "react";

interface PsHeaderProps {
  view: "public" | "private" | "my-rooms" | "console" | "in-room";
  search: string;
  onSearchChange: (value: string) => void;
  onCreateRoom: () => void;
  onScanQr: () => void;
  collapsed?: boolean;
}

/**
 * Pattern Stream discover header — fixed to the top of the viewport (Orderflow-style).
 * No in-flow spacer: `PatternStreamLayout` applies `padding-top: var(--ps-header-height)` on `main`
 * so the feed clears the bar without an extra DOM block.
 */
export function PsHeader({
  view,
  search,
  onSearchChange,
  onCreateRoom,
  onScanQr,
  collapsed = false,
}: PsHeaderProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const sync = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--ps-header-height", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      document.documentElement.style.removeProperty("--ps-header-height");
    };
  }, [collapsed, view]);

  const goPublic = () => navigate("/dashboard/pattern-stream/discover/public");
  const goPrivate = () => navigate("/dashboard/pattern-stream/discover/private");
  const isPublic = view === "public";
  const isPrivate = view === "private";

  return (
    <motion.header
      ref={headerRef}
      animate={{ paddingBottom: collapsed ? 6 : 12 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="liquid-glass ps-header-shell fixed left-0 right-0 top-0 z-40"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
      }}
      role="banner"
    >
      <div className="mx-auto w-full max-w-lg md:max-w-[640px] px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/pattern-stream/discover/public"
            className="flex items-center gap-2 flex-shrink-0"
            aria-label="Pattern Stream"
          >
            <div
              className="liquid-glass--green flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "var(--ps-glass-bg-elev)",
                border: "1px solid var(--ps-green)",
                boxShadow: "var(--ps-green-glow)",
              }}
            >
              <Sparkle size={18} weight="fill" style={{ color: "var(--ps-green)" }} />
            </div>
            {!collapsed && (
              <span
                className="hidden sm:inline-block"
                style={{ fontSize: 15, fontWeight: 600, color: "var(--ps-text)" }}
              >
                Pattern Stream
              </span>
            )}
          </Link>

          <div className="flex-1 flex items-center justify-center">
            <div
              className="liquid-glass inline-flex p-1 gap-1"
              style={{ borderRadius: 9999 }}
              role="tablist"
              aria-label="Room type"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isPublic}
                onClick={goPublic}
                className="ps-active-pill"
                data-active={isPublic}
                style={{ padding: "6px 14px", height: 34 }}
              >
                Public
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isPrivate}
                onClick={goPrivate}
                className="ps-active-pill"
                data-active={isPrivate}
                style={{ padding: "6px 14px", height: 34 }}
              >
                Private
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onScanQr}
              className="ps-btn ps-btn-secondary ps-btn-icon"
              aria-label="Scan QR"
              title="Scan QR"
            >
              <QrCode size={18} />
            </button>
            <button
              type="button"
              onClick={onCreateRoom}
              className="ps-btn ps-btn-primary"
              style={{ height: 40, padding: collapsed ? "0 12px" : "0 16px" }}
              aria-label="Create room"
            >
              <Plus size={18} weight="bold" />
              {!collapsed && <span className="hidden sm:inline">Create</span>}
            </button>
          </div>
        </div>

        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-2"
          >
            <div className="liquid-glass flex items-center gap-2 px-3" style={{ height: 42, borderRadius: 9999 }}>
              <MagnifyingGlass size={16} style={{ color: "var(--ps-text-tertiary)" }} />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={isPrivate ? "Search code, name, or tag" : "Search rooms, providers, #tags"}
                className="flex-1 bg-transparent outline-none border-none"
                style={{ color: "var(--ps-text)", fontSize: 14 }}
                aria-label="Search rooms"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="ps-btn-ghost px-2"
                  style={{ fontSize: 12 }}
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
