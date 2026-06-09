import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { PatternStreamThemeProvider } from "@/components/pattern-stream/theme/PatternStreamThemeProvider";
import { PsHeader } from "@/components/pattern-stream/discovery/PsHeader";
import { QrScannerSheet } from "@/components/pattern-stream/discovery/QrScannerSheet";
import { ConnectionBanner } from "@/components/pattern-stream/indicators/ConnectionBanner";
import { PsBottomNav } from "@/components/pattern-stream/PsBottomNav";
import { useScrollHideNav } from "@/hooks/pattern-stream/useScrollHideNav";

/**
 * Standalone Pattern Stream shell.
 *
 * Mirrors the Orderflow home-feed structure:
 *   div.min-h-screen bg-background flex w-full
 *     div.flex-1 min-w-0 flex flex-col
 *       div.relative flex min-h-0 w-full flex-1 flex-col bg-background
 *         div.flex min-h-0 flex-1 flex-col
 *           div.flex flex-1 min-h-0 w-full max-w-[1400px] mx-auto pb-8 pt-0 gap-6 justify-center items-stretch md:px-6 max-md:px-0
 *             main.flex w-full flex-1 min-h-0 flex-col gap-6 max-w-lg mx-auto md:max-w-[640px] ...
 *
 * Key behaviors (matches the orderflow-feed-search-keyboard rule):
 *   - Document/window scroll (no nested overflow-y-auto trap on the main column).
 *   - Header is `position: fixed`; `main` uses `padding-top: var(--ps-header-height)` (no spacer div).
 *   - Mobile bottom nav fixed to bottom edge, auto-hides on scroll-down.
 *   - When inside a chat room (RoomLayout sets `data-ps-in-room` on body), the
 *     discover header and bottom nav are hidden — the room provides its own chrome.
 */
export default function PatternStreamLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const collapsed = useScrollHideNav();

  const view: "public" | "private" | "my-rooms" | "console" | "in-room" =
    location.pathname.includes("/discover/private")
      ? "private"
      : location.pathname.includes("/discover/public")
      ? "public"
      : location.pathname.includes("/my-rooms")
      ? "my-rooms"
      : location.pathname.includes("/console")
      ? "console"
      : location.pathname.includes("/room/")
      ? "in-room"
      : "public";

  // Reset search when changing public/private/my-rooms/console
  useEffect(() => {
    setSearch("");
  }, [view]);

  const handleQrScan = (token: string) => {
    try {
      const url = new URL(token);
      const m = url.pathname.match(/\/pattern-stream\/room\/([^/]+)/);
      if (m) {
        navigate(`/dashboard/pattern-stream/room/${m[1]}`);
        return;
      }
    } catch {
      // Not a URL — assume it's a code or invite token.
    }
    navigate(`/dashboard/pattern-stream/discover/private?code=${encodeURIComponent(token)}`);
  };

  const inRoom = view === "in-room";
  /**
   * Console "Create" routes (`/console/create`, `/console/create-...`) render their own
   * Insight-styled chrome (FeedComposerStrip header + embedded bottom nav) so the
   * Pattern Stream global header/nav are hidden here to avoid double-stacking and
   * to let the page sit flush at top: 0.
   */
  const isCreateRoomFlow = location.pathname.startsWith(
    "/dashboard/pattern-stream/console/create",
  );
  const isInsightChatRoom =
    inRoom &&
    new URLSearchParams(location.search).get("from") === "insight" &&
    !location.pathname.match(/\/room\/[^/]+\/(signals|requests|members|settings)/);
  const hideOuterChrome = inRoom || isCreateRoomFlow;
  const hideMainConnectionBanner = isInsightChatRoom || isCreateRoomFlow;

  /**
   * Insight chat shell renders its own full-bleed sidebar + chat layout
   * (`RoomLayout` → `ChatTab` → `InsightStitchSidebar` + Stitch composer).
   * It must NOT be nested inside the standard `max-w-[1400px]` /
   * `max-w-lg / md:max-w-[640px]` column + `pb-8` because:
   *   - the column compresses the desktop sidebar (`hidden md:flex w-[300px]`),
   *   - the `pb-8` stacks below the fixed composer on mobile, and
   *   - the duplicate `bg-background` makes the layout debug noisy.
   * In that case we bypass the column wrapper entirely and let RoomLayout
   * own the full viewport between top and bottom safe-area insets.
   */
  if (isInsightChatRoom) {
    return (
      <PatternStreamThemeProvider>
        <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-background">
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <Outlet context={{ search, setSearch }} />
          </div>
        </div>
        <QrScannerSheet open={qrOpen} onClose={() => setQrOpen(false)} onScan={handleQrScan} />
      </PatternStreamThemeProvider>
    );
  }

  return (
    <PatternStreamThemeProvider>
      <div className="min-h-screen bg-background flex w-full">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="relative flex min-h-0 w-full flex-1 flex-col bg-background">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-1 min-h-0 w-full max-w-[1400px] mx-auto pb-8 pt-0 gap-6 justify-center items-stretch md:px-6 max-md:px-0">
                <div className="flex w-full flex-1 min-h-0 flex-col max-w-lg mx-auto md:max-w-[640px] md:mx-0 md:pl-0 md:pr-0 max-md:pl-[max(0.25rem,env(safe-area-inset-left))] max-md:pr-[max(0.25rem,env(safe-area-inset-right))]">
                  {!hideOuterChrome && (
                    <PsHeader
                      view={view as "public" | "private" | "my-rooms" | "console" | "in-room"}
                      search={search}
                      onSearchChange={setSearch}
                      onCreateRoom={() => navigate("/dashboard/pattern-stream/console/create")}
                      onScanQr={() => setQrOpen(true)}
                      collapsed={collapsed}
                    />
                  )}
                  <main
                    className="flex w-full flex-1 min-h-0 flex-col gap-6"
                    data-ps-main
                    style={
                      !hideOuterChrome
                        ? { paddingTop: "var(--ps-header-height, 7rem)" }
                        : undefined
                    }
                  >
                    {!hideMainConnectionBanner && <ConnectionBanner status="online" />}

                    <Outlet context={{ search, setSearch }} />
                  </main>
                </div>
              </div>
            </div>
          </div>

          {!hideOuterChrome && <PsBottomNav />}
        </div>
      </div>

      <QrScannerSheet open={qrOpen} onClose={() => setQrOpen(false)} onScan={handleQrScan} />
    </PatternStreamThemeProvider>
  );
}

export interface PsLayoutContext {
  search: string;
  setSearch: (value: string) => void;
}
