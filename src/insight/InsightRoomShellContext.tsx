import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export interface InsightReplyHeaderState {
  active: boolean;
  subtitle?: string | null;
}

interface InsightRoomShellContextValue {
  roomNavOpen: boolean;
  setRoomNavOpen: Dispatch<SetStateAction<boolean>>;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  replyHeader: InsightReplyHeaderState;
  setReplyHeader: (state: InsightReplyHeaderState) => void;
}

const InsightRoomShellContext = createContext<InsightRoomShellContextValue | null>(null);

export function InsightRoomShellProvider({ children }: { children: ReactNode }) {
  const [roomNavOpen, setRoomNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyHeader, setReplyHeader] = useState<InsightReplyHeaderState>({ active: false });

  const openSearch = useCallback(() => {
    setRoomNavOpen(false);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const value = useMemo(
    () => ({
      roomNavOpen,
      setRoomNavOpen,
      searchOpen,
      openSearch,
      closeSearch,
      searchQuery,
      setSearchQuery,
      replyHeader,
      setReplyHeader,
    }),
    [roomNavOpen, searchOpen, openSearch, closeSearch, searchQuery, replyHeader],
  );

  return (
    <InsightRoomShellContext.Provider value={value}>{children}</InsightRoomShellContext.Provider>
  );
}

export function useInsightRoomShell() {
  const ctx = useContext(InsightRoomShellContext);
  if (!ctx) {
    throw new Error("useInsightRoomShell must be used within InsightRoomShellProvider");
  }
  return ctx;
}

/** Safe optional access for tabs that may render outside the insight shell. */
export function useInsightRoomShellOptional() {
  return useContext(InsightRoomShellContext);
}
