
import { Toaster as Sonner, toast } from "sonner"
import { useTheme } from "@/contexts/SafeThemeProvider"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white/10 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:backdrop-saturate-150 group-[.toaster]:backdrop-brightness-110 group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-white/20 group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.3)] group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-white/80",
          actionButton:
            "group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:backdrop-blur-sm group-[.toast]:border-white/20",
          cancelButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-white/70 group-[.toast]:backdrop-blur-sm",
          success: "group-[.toaster]:border-emerald-400/40 group-[.toaster]:shadow-[0_8px_32px_rgba(16,185,129,0.2)]",
          error: "group-[.toaster]:border-red-400/40 group-[.toaster]:shadow-[0_8px_32px_rgba(239,68,68,0.2)]",
          warning: "group-[.toaster]:border-yellow-400/40 group-[.toaster]:shadow-[0_8px_32px_rgba(234,179,8,0.2)]",
          info: "group-[.toaster]:border-blue-400/40 group-[.toaster]:shadow-[0_8px_32px_rgba(59,130,246,0.2)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
