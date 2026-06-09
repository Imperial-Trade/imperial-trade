import { motion } from "framer-motion";

interface SystemMessageProps {
  summary: string;
  category?: string;
}

export function SystemMessage({ summary }: SystemMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="ps-system-message"
      role="status"
    >
      <span>{summary}</span>
    </motion.div>
  );
}
