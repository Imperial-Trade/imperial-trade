
import React from "react";
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
          ? "bg-green-500/10 border border-green-500/20 text-green-300"
          : "bg-red-500/10 border border-red-500/20 text-red-300"
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
