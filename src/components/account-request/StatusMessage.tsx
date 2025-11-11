import { CheckCircle, AlertTriangle } from "lucide-react";

interface StatusMessageProps {
  type: "success" | "error" | "";
  message: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ type, message }) => {
  if (!message) return null;

  return (
    <div
      className={`p-3 rounded-md flex items-center gap-2 text-sm mb-6 ${
        type === "success"
          ? "bg-green-50 border border-green-200 text-green-800"
          : "bg-red-50 border border-red-200 text-red-800"
      }`}
    >
      {type === "success" ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <AlertTriangle className="w-5 h-5" />
      )}
      {message}
    </div>
  );
};
