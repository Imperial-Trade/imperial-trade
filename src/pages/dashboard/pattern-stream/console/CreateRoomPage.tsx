import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Globe,
  ImagePlus,
  Loader2,
  Lock,
  Coins,
  Search as SearchIcon,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisualKeyboardInset } from "@/hooks/useVisualKeyboardInset";
import { useCompactOrderflowNav } from "@/hooks/use-mobile";
import { FeedComposerStrip } from "@/insight/FeedComposerStrip";
import { INSIGHT_FEED_COMPOSER_STRIP_FIXED_Z } from "@/insight/orderflowChrome";
import { InsightLiquidGlassBackdropFilter } from "@/insight/InsightLiquidGlassBackdropFilter";
import { PsBottomNav } from "@/components/pattern-stream/PsBottomNav";
import {
  INSIGHT_CARD_CLASS,
  INSIGHT_FOCUS_RING,
} from "@/insight/insightCardTokens";
import {
  inviteRoomMembers,
  useInviteSuggestions,
  type InviteSuggestion,
} from "@/hooks/pattern-stream/useInviteSuggestions";

type Step = "details" | "invite";
type RoomType = "public" | "private";
type Monetization = "free" | "paid";
type AvatarUploadStatus = "idle" | "uploading" | "done" | "error";

const INSIGHT_ORDERFLOW_THEME_CLASS = "insight-orderflow-theme";

/** 5 MB cap on room avatars — keeps uploads snappy and stays well under the public_uploads bucket policy. */
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function avatarStoragePath(userId: string, file: File): string {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const rand = Math.random().toString(36).slice(2, 8);
  return `room-avatars/${userId}/${Date.now()}-${rand}.${ext}`;
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

/**
 * Two-step Messenger-style create flow, styled to match the Insight inbox.
 *
 *   1. "details" — name / description / type / monetization
 *   2. "invite"  — Messenger-style "To:" chips + suggested people list
 *
 * The `rooms` INSERT is deferred until step 2 finalizes (Skip or Create) so
 * backing out of the picker never orphans an empty room.
 */
export default function CreateRoomPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const compactNav = useCompactOrderflowNav();
  const keyboardInsetPx = useVisualKeyboardInset(true);

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<RoomType>("public");
  const [monetization, setMonetization] = useState<Monetization>("free");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Optional room photo. We keep both a local object-URL preview (immediate UI)
   * and the eventual public URL once the upload to `public_uploads` resolves,
   * so the user sees their pick instantly and we don't block "Next".
   */
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const [avatarUploadStatus, setAvatarUploadStatus] =
    useState<AvatarUploadStatus>("idle");

  const [selected, setSelected] = useState<InviteSuggestion[]>([]);
  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.user_id)),
    [selected],
  );

  /**
   * Apply Orderflow theme tokens on `html` while this flow is mounted so the
   * FeedComposerStrip + glass tab pill render with the same chrome family as
   * Insight Discover/Messages.
   */
  useEffect(() => {
    document.documentElement.classList.add(INSIGHT_ORDERFLOW_THEME_CLASS);
    return () => {
      document.documentElement.classList.remove(INSIGHT_ORDERFLOW_THEME_CLASS);
    };
  }, []);

  /** Revoke any outstanding object URL when the avatar is replaced or the page unmounts. */
  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  /**
   * Validate + show instant preview, then upload to `public_uploads` in the
   * background. We don't block "Next" — only "Create" waits if upload is still
   * in flight (UX matches Messenger/WhatsApp create-group).
   */
  const handleAvatarPick = useCallback(
    async (file: File) => {
      if (!user) return;
      if (!AVATAR_ACCEPTED_MIME.includes(file.type)) {
        toast({
          title: "Unsupported image",
          description: "Choose a JPG, PNG, WEBP, or GIF.",
          variant: "destructive",
        });
        return;
      }
      if (file.size > AVATAR_MAX_BYTES) {
        toast({
          title: "Image too large",
          description: "Pick a photo under 5 MB.",
          variant: "destructive",
        });
        return;
      }

      // Swap preview immediately, revoke any previous object URL.
      const nextPreview = URL.createObjectURL(file);
      setAvatarPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextPreview;
      });
      setAvatarFile(file);
      setAvatarPublicUrl(null);
      setAvatarUploadStatus("uploading");

      try {
        const path = avatarStoragePath(user.id, file);
        const { error: upErr } = await supabase.storage
          .from("public_uploads")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("public_uploads")
          .getPublicUrl(path);
        setAvatarPublicUrl(pub.publicUrl);
        setAvatarUploadStatus("done");
      } catch (err) {
        setAvatarUploadStatus("error");
        // Supabase storage errors come back as plain objects, not Error
        // instances — surface their `.message` so the user can see e.g. an
        // RLS or bucket-missing failure instead of a generic fallback.
        const reason =
          (err instanceof Error && err.message) ||
          (typeof err === "object" && err && "message" in err
            ? String((err as { message?: unknown }).message ?? "")
            : "") ||
          (typeof err === "string" ? err : "") ||
          "Couldn't upload that photo. Try again.";
        toast({
          title: "Upload failed",
          description: reason,
          variant: "destructive",
        });
      }
    },
    [user, toast],
  );

  const handleAvatarClear = useCallback(() => {
    setAvatarPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAvatarFile(null);
    setAvatarPublicUrl(null);
    setAvatarUploadStatus("idle");
  }, []);

  const isNameValid = name.trim().length > 0;

  const handleNext = () => {
    if (!isNameValid) {
      toast({
        title: "Name required",
        description: "Give your chat a name before continuing.",
        variant: "destructive",
      });
      return;
    }
    setStep("invite");
  };

  const onBackChevron = () => {
    if (step === "invite") {
      setStep("details");
      return;
    }
    navigate(-1);
  };

  /**
   * Creates the `rooms` row, immediately invites any selected users, then
   * routes into the new chat. The owner is auto-inserted into `room_members`
   * by the existing room schema trigger.
   */
  const createRoomAndInvite = async (alsoInvite: boolean) => {
    if (!user) return;
    if (!isNameValid) {
      toast({
        title: "Name required",
        description: "Give your chat a name.",
        variant: "destructive",
      });
      return;
    }
    if (avatarUploadStatus === "uploading") {
      toast({
        title: "Photo still uploading",
        description: "Hang on a sec while your photo finishes uploading.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const slug = slugify(name);
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          slug,
          description: description.trim() || null,
          type,
          monetization,
          avatar_url: avatarPublicUrl,
          background_config: { tint: "default" },
        })
        .select("id, code")
        .single();
      if (error) throw error;
      const roomId = data!.id as string;
      const code = (data as { code?: string | null } | null)?.code ?? null;

      let invitedCount = 0;
      if (alsoInvite && selected.length > 0) {
        try {
          invitedCount = await inviteRoomMembers(
            roomId,
            selected.map((s) => s.user_id),
          );
        } catch (invErr) {
          toast({
            title: "Chat created — invites failed",
            description:
              invErr instanceof Error ? invErr.message : String(invErr),
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Chat created",
        description:
          invitedCount > 0
            ? `Invited ${invitedCount} ${
                invitedCount === 1 ? "person" : "people"
              }.`
            : type === "private" && code
              ? `Share code ${code} or invite link.`
              : "Your chat is live in Discover.",
      });
      navigate(`/dashboard/pattern-stream/room/${roomId}/chat?from=insight`);
    } catch (err) {
      toast({
        title: "Could not create chat",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePerson = (p: InviteSuggestion) => {
    setSelected((prev) =>
      prev.some((s) => s.user_id === p.user_id)
        ? prev.filter((s) => s.user_id !== p.user_id)
        : [...prev, p],
    );
  };

  const removePerson = (userId: string) => {
    setSelected((prev) => prev.filter((s) => s.user_id !== userId));
  };

  const headerTitle = step === "details" ? "New chat" : "Add people";
  const headerSubtitle =
    step === "details"
      ? "Step 1 of 2 · Set up your chat"
      : `Step 2 of 2 · ${
          selected.length > 0
            ? `${selected.length} selected`
            : "Optional — invite later from settings"
        }`;

  return (
    <>
      <div className="shrink-0">
        <FeedComposerStrip
          variant="feed"
          behavior="fixed"
          stripSurface="flat"
          headerLayout="stretch"
          fixedClassName={INSIGHT_FEED_COMPOSER_STRIP_FIXED_Z}
        >
          <div className="flex min-w-0 w-full items-center gap-2 pb-1">
            <button
              type="button"
              onClick={onBackChevron}
              className={cn(
                "shrink-0 self-center rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted/25 hover:text-foreground",
                INSIGHT_FOCUS_RING,
              )}
              aria-label={step === "invite" ? "Back to chat details" : "Back"}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {headerTitle}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {headerSubtitle}
              </p>
            </div>
            {step === "details" ? (
              <Sparkles
                className="h-5 w-5 shrink-0 text-muted-foreground"
                aria-hidden
                strokeWidth={1.75}
              />
            ) : (
              <Users
                className="h-5 w-5 shrink-0 text-muted-foreground"
                aria-hidden
                strokeWidth={1.75}
              />
            )}
          </div>
        </FeedComposerStrip>
      </div>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain",
          compactNav
            ? "pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+4.5rem))]"
            : "pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset,0px)+1.5rem))]",
        )}
        style={
          {
            "--keyboard-inset": `${keyboardInsetPx}px`,
          } as React.CSSProperties
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {step === "details" ? (
            <StepDetails
              key="details"
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              type={type}
              setType={setType}
              monetization={monetization}
              setMonetization={setMonetization}
              avatarPreviewUrl={avatarPreviewUrl}
              avatarUploadStatus={avatarUploadStatus}
              onAvatarPick={handleAvatarPick}
              onAvatarClear={handleAvatarClear}
              onCancel={() => navigate(-1)}
              onNext={handleNext}
            />
          ) : (
            <StepInvite
              key="invite"
              selected={selected}
              selectedIds={selectedIds}
              onTogglePerson={togglePerson}
              onRemovePerson={removePerson}
              onSkip={() => createRoomAndInvite(false)}
              onCreate={() => createRoomAndInvite(true)}
              submitting={submitting}
              avatarUploading={avatarUploadStatus === "uploading"}
            />
          )}
        </AnimatePresence>
      </div>

      {compactNav ? (
        <>
          <InsightLiquidGlassBackdropFilter aspectWidthOverHeight={10.5} />
          <PsBottomNav
            variant="embedded"
            slim
            embeddedNavigationAriaLabel="Insight mobile tools"
          />
        </>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Chat details
// ---------------------------------------------------------------------------

interface StepDetailsProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  type: RoomType;
  setType: (v: RoomType) => void;
  monetization: Monetization;
  setMonetization: (v: Monetization) => void;
  avatarPreviewUrl: string | null;
  avatarUploadStatus: AvatarUploadStatus;
  onAvatarPick: (file: File) => void | Promise<void>;
  onAvatarClear: () => void;
  onCancel: () => void;
  onNext: () => void;
}

function StepDetails({
  name,
  setName,
  description,
  setDescription,
  type,
  setType,
  monetization,
  setMonetization,
  avatarPreviewUrl,
  avatarUploadStatus,
  onAvatarPick,
  onAvatarClear,
  onCancel,
  onNext,
}: StepDetailsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="px-3 pt-3 pb-2 sm:px-4 space-y-4"
    >
      <RoomAvatarPicker
        previewUrl={avatarPreviewUrl}
        status={avatarUploadStatus}
        onPick={onAvatarPick}
        onClear={onAvatarClear}
        fallbackInitial={name.trim().charAt(0).toUpperCase() || null}
      />

      <FormField label="Chat name" hint={`${name.length}/64`}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gold Scalpers"
          maxLength={64}
          autoFocus
          className={cn(
            "w-full rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-0",
          )}
        />
      </FormField>

      <FormField label="Description" hint={`${description.length}/280`}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell traders what to expect"
          maxLength={280}
          rows={3}
          className={cn(
            "w-full rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground resize-none",
            "focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-0",
          )}
        />
      </FormField>

      <FormField label="Chat type">
        <div className="grid grid-cols-2 gap-2">
          <ChoiceCard
            active={type === "public"}
            onClick={() => setType("public")}
            icon={<Globe className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
            title="Public"
            hint="Anyone can join and chat."
          />
          <ChoiceCard
            active={type === "private"}
            onClick={() => setType("private")}
            icon={<Lock className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
            title="Private"
            hint="Code + approval required."
          />
        </div>
      </FormField>

      <FormField label="Monetization">
        <div className="grid grid-cols-2 gap-2">
          <ChoiceCard
            active={monetization === "free"}
            onClick={() => setMonetization("free")}
            icon={
              <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            }
            title="Free"
            hint="Open to all approved members."
          />
          <ChoiceCard
            active={monetization === "paid"}
            onClick={() => setMonetization("paid")}
            icon={<Coins className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
            title="Paid"
            hint="Stripe-powered subscriptions."
            disabled={type === "public"}
          />
        </div>
        {monetization === "paid" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Plans (monthly/quarterly/yearly) and discounts can be set after
            creation.
          </p>
        ) : null}
      </FormField>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "flex-1 rounded-full border border-border/60 bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/30",
            INSIGHT_FOCUS_RING,
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onNext}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90",
            INSIGHT_FOCUS_RING,
          )}
        >
          Next
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Invite people
// ---------------------------------------------------------------------------

interface StepInviteProps {
  selected: InviteSuggestion[];
  selectedIds: Set<string>;
  onTogglePerson: (p: InviteSuggestion) => void;
  onRemovePerson: (userId: string) => void;
  onSkip: () => void;
  onCreate: () => void;
  submitting: boolean;
  /** Photo from Step 1 is still uploading — block Create until it lands. */
  avatarUploading: boolean;
}

function StepInvite({
  selected,
  selectedIds,
  onTogglePerson,
  onRemovePerson,
  onSkip,
  onCreate,
  submitting,
  avatarUploading,
}: StepInviteProps) {
  const [query, setQuery] = useState("");
  const { suggestions, isLoading, isFetching, error } = useInviteSuggestions({
    query,
    excludeUserIds: selectedIds,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-0 flex-1 flex-col px-3 pt-3 sm:px-4"
    >
      <div
        className={cn(
          "mb-3 flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2",
        )}
      >
        <span className="select-none text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          To:
        </span>
        {selected.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Search and pick people, or skip for now
          </span>
        ) : (
          selected.map((p) => (
            <button
              key={p.user_id}
              type="button"
              onClick={() => onRemovePerson(p.user_id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-muted/60 pl-1 pr-2 py-0.5 text-[13px] font-medium text-foreground ring-1 ring-border/60 transition-colors hover:bg-muted/80",
                INSIGHT_FOCUS_RING,
              )}
              aria-label={`Remove ${p.display_name ?? "user"}`}
            >
              <Avatar
                url={p.avatar_url}
                name={p.display_name}
                size={20}
                ringSize={1}
              />
              <span className="truncate max-w-[140px]">
                {p.display_name ?? "User"}
              </span>
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))
        )}
      </div>

      <div className="relative mb-2">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          autoFocus
          className={cn(
            "w-full rounded-full border border-border/60 bg-muted/40 py-2.5 pl-9 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-0",
          )}
        />
      </div>

      <p className="px-2 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
        Suggested
      </p>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        role="listbox"
        aria-label="Suggested people"
      >
        {error ? (
          <p className="px-2 py-4 text-sm text-rose-600 dark:text-rose-400">
            Couldn't load suggestions. Try again in a moment.
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-3 px-2 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SuggestionRowSkeleton key={i} />
            ))}
          </div>
        ) : null}

        {!isLoading && suggestions.length === 0 ? (
          <div className={cn(INSIGHT_CARD_CLASS, "mx-2 mt-3 px-5 py-8 text-center")}>
            <p className="text-sm font-medium text-foreground">
              {query.trim() ? `No matches for "${query.trim()}"` : "Nobody to suggest yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              You can invite people via the share link after creating the chat.
            </p>
          </div>
        ) : null}

        {!isLoading &&
          suggestions.map((p) => {
            const isSelected = selectedIds.has(p.user_id);
            return (
              <SuggestionRow
                key={p.user_id}
                person={p}
                isSelected={isSelected}
                onToggle={() => onTogglePerson(p)}
              />
            );
          })}

        {isFetching && !isLoading ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">Updating…</p>
        ) : null}
      </div>

      <div className="flex gap-2 pt-3">
        <button
          type="button"
          onClick={onSkip}
          disabled={submitting || avatarUploading}
          className={cn(
            "flex-1 rounded-full border border-border/60 bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-60",
            INSIGHT_FOCUS_RING,
          )}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={submitting || avatarUploading}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60",
            INSIGHT_FOCUS_RING,
          )}
        >
          {submitting
            ? "Creating…"
            : avatarUploading
              ? "Uploading photo…"
              : selected.length > 0
                ? `Create & invite ${selected.length}`
                : "Create chat"}
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Row + form primitives
// ---------------------------------------------------------------------------

function SuggestionRow({
  person,
  isSelected,
  onToggle,
}: {
  person: InviteSuggestion;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border/50 py-3 text-left transition-colors",
        "hover:bg-muted/25 active:bg-muted/35",
        INSIGHT_FOCUS_RING,
      )}
    >
      <Avatar url={person.avatar_url} name={person.display_name} size={48} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-foreground">
          {person.display_name ?? "User"}
        </div>
        <div className="mt-0.5 truncate text-sm text-muted-foreground">
          {person.is_provider
            ? "Provider"
            : person.shared_rooms > 0
              ? `${person.shared_rooms} shared room${
                  person.shared_rooms === 1 ? "" : "s"
                }`
              : "Suggested"}
        </div>
      </div>
      <div
        className={cn(
          "shrink-0 flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
          isSelected
            ? "border-emerald-500 bg-emerald-500 text-background"
            : "border-border/60 bg-transparent text-transparent",
        )}
        aria-hidden
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </div>
    </button>
  );
}

function SuggestionRowSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-muted/60" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-2/5 animate-pulse rounded bg-muted/60" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted/40" />
      </div>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          {label}
        </span>
        {hint ? (
          <span className="text-[11px] tabular-nums text-muted-foreground/60">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

function ChoiceCard({
  active,
  onClick,
  icon,
  title,
  hint,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className={cn(
        "rounded-2xl border p-3 text-left transition-colors",
        active
          ? "border-foreground/80 bg-muted/50 ring-1 ring-border/80"
          : "border-border/60 bg-card/40 hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-40 hover:bg-card/40",
        INSIGHT_FOCUS_RING,
      )}
      aria-pressed={active}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          active ? "text-foreground" : "text-foreground",
        )}
      >
        {icon}
        <span>{title}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Room avatar picker — Messenger/WhatsApp-style centered circle + camera badge
// ---------------------------------------------------------------------------

interface RoomAvatarPickerProps {
  previewUrl: string | null;
  status: AvatarUploadStatus;
  onPick: (file: File) => void | Promise<void>;
  onClear: () => void;
  /** Single letter to show before any image is picked (matches inbox avatar fallback). */
  fallbackInitial: string | null;
}

/**
 * Centered, tappable circular avatar picker for the create-chat flow. Optional —
 * the chat can be created without one, in which case the inbox falls back to an
 * initial circle.
 */
function RoomAvatarPicker({
  previewUrl,
  status,
  onPick,
  onClear,
  fallbackInitial,
}: RoomAvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasImage = !!previewUrl;
  const isUploading = status === "uploading";
  const hasError = status === "error";

  const openPicker = () => {
    fileInputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input value so picking the same file again still fires onChange.
    e.target.value = "";
    if (file) await onPick(file);
  };

  return (
    <div className="flex flex-col items-center pt-1">
      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          aria-label={hasImage ? "Change chat photo" : "Add a chat photo"}
          className={cn(
            "relative h-24 w-24 overflow-hidden rounded-full transition-colors",
            "border border-border/60 bg-muted/60 text-muted-foreground",
            "hover:bg-muted/50 active:bg-muted/40",
            hasError && "border-rose-500/60",
            INSIGHT_FOCUS_RING,
          )}
        >
          {hasImage ? (
            <img
              src={previewUrl!}
              alt=""
              className={cn(
                "h-full w-full object-cover transition-opacity",
                isUploading && "opacity-70",
              )}
            />
          ) : fallbackInitial ? (
            <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-foreground">
              {fallbackInitial}
            </span>
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <ImagePlus className="h-7 w-7" strokeWidth={1.5} aria-hidden />
            </span>
          )}

          {isUploading ? (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40"
              aria-hidden
            >
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            </span>
          ) : null}
        </button>

        <span
          className={cn(
            "pointer-events-none absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full",
            "border-2 border-background bg-foreground text-background shadow-sm",
          )}
          aria-hidden
        >
          <Camera className="h-4 w-4" strokeWidth={2} />
        </span>

        {hasImage && !isUploading ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove chat photo"
            className={cn(
              "absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full",
              "border border-border/60 bg-background text-muted-foreground shadow-sm transition-colors",
              "hover:text-foreground hover:bg-muted/60",
              INSIGHT_FOCUS_RING,
            )}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground">
        {isUploading
          ? "Uploading photo…"
          : hasError
            ? "Upload failed — tap to try again"
            : hasImage
              ? "Tap to change · optional"
              : "Add a photo (optional)"}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={AVATAR_ACCEPTED_MIME.join(",")}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

function Avatar({
  url,
  name,
  size,
  ringSize = 1,
}: {
  url: string | null;
  name: string | null;
  size: number;
  ringSize?: number;
}) {
  return (
    <div
      className={cn(
        "shrink-0 inline-flex items-center justify-center overflow-hidden rounded-full bg-muted/60 text-sm font-semibold text-foreground",
        ringSize === 1 && "ring-1 ring-border/60",
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span style={{ fontSize: Math.max(10, Math.round(size * 0.4)) }}>
          {(name ?? "?").charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
