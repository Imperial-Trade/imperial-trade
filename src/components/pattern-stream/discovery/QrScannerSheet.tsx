import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { QrCode, X } from "@phosphor-icons/react";

interface QrScannerSheetProps {
  open: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
}

/**
 * Lightweight QR scanner sheet. Uses BarcodeDetector when available
 * (modern Chrome, Android), otherwise renders a friendly fallback that
 * lets the user paste a code or invite link.
 */
export function QrScannerSheet({ open, onClose, onScan }: QrScannerSheetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const detectorRef = useRef<unknown>(null);
  const animFrame = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setScanned(false);
    const w = window as unknown as { BarcodeDetector?: new (init: { formats: string[] }) => unknown };
    const isSupported = typeof w.BarcodeDetector === "function";
    setSupported(isSupported);

    if (!isSupported) return;

    let cancelled = false;

    (async () => {
      try {
        const Detector = w.BarcodeDetector!;
        detectorRef.current = new Detector({ formats: ["qr_code"] });
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play();
          loop();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera access denied");
      }
    })();

    function loop() {
      if (cancelled || !videoRef.current || !detectorRef.current) return;
      const detector = detectorRef.current as { detect: (s: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
      detector
        .detect(videoRef.current)
        .then((results) => {
          if (results.length > 0) {
            const value = results[0].rawValue;
            handleScan(value);
            return;
          }
          animFrame.current = requestAnimationFrame(loop);
        })
        .catch(() => {
          animFrame.current = requestAnimationFrame(loop);
        });
    }

    return () => {
      cancelled = true;
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [open]);

  const handleScan = (value: string) => {
    setScanned(true);
    setTimeout(() => {
      onScan(value);
      onClose();
    }, 320);
  };

  const handleManual = () => {
    if (!manual.trim()) return;
    onScan(manual.trim());
    setManual("");
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="liquid-glass" style={{ background: "var(--ps-surface-popover)", border: "1px solid var(--ps-border-subtle)" }}>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="flex items-center gap-2" style={{ color: "var(--ps-text)" }}>
            <QrCode size={20} weight="duotone" />
            Scan room QR
          </DrawerTitle>
          <button onClick={onClose} className="ps-btn-icon ps-btn-ghost" aria-label="Close">
            <X size={18} />
          </button>
        </DrawerHeader>
        <div className="px-4 pb-6">
          {supported ? (
            <div
              className="relative overflow-hidden"
              style={{ borderRadius: 16, aspectRatio: "1 / 1", maxWidth: 380, margin: "0 auto" }}
            >
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <AnimatePresence>
                {scanned && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.32 }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(34,197,94,0.30)" }}
                  >
                    <span style={{ color: "var(--ps-yellow-green)", fontWeight: 600 }}>
                      Got it
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div
                className="absolute inset-6 border rounded-2xl"
                style={{ borderColor: "var(--ps-green)", borderWidth: 2, borderRadius: 18 }}
              />
            </div>
          ) : (
            <div className="text-center py-6" style={{ color: "var(--ps-text-secondary)" }}>
              QR scanner not supported on this device. Paste a code or invite link below.
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Paste room code or invite link"
              className="ps-input"
            />
            <button onClick={handleManual} className="ps-btn ps-btn-primary">
              Continue
            </button>
            {error && (
              <div className="text-center mt-1" style={{ color: "var(--ps-negative)", fontSize: 12 }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
