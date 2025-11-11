import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

interface CheckAccountRequestButtonProps {
  email?: string;
}

export const CheckAccountRequestButton: React.FC<CheckAccountRequestButtonProps> = ({ email }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/account-request-status', { 
      state: { prefilledEmail: email } 
    });
  };

  return (
    <button
      onClick={handleClick}
      className="w-full mt-6 rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.08)'
      }}
    >
      <style>
        {`
          .dark button {
            background: rgba(15, 15, 20, 0.3) !important;
            backdrop-filter: blur(30px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.3) !important;
          }
        `}
      </style>
      <div className="flex items-center justify-center gap-3">
        <Search className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
        <span className="text-base font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
          Check Account Request Status
        </span>
      </div>
    </button>
  );
};
