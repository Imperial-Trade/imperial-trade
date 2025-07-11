
import React from "react";

export const FormInputStyles: React.FC = () => {
  return (
    <style>{`
      /* Force input text visibility with higher specificity */
      .account-request-form-container input[type="text"],
      .account-request-form-container input[type="email"],
      .account-request-form-container input[type="tel"],
      .account-request-form-container textarea {
        color: #1f2937 !important;
        background-color: #ffffff !important;
        border-color: #d1d5db !important;
        font-weight: 500 !important;
      }
      
      .account-request-form-container input::placeholder,
      .account-request-form-container textarea::placeholder {
        color: #6b7280 !important;
        opacity: 1 !important;
      }
      
      .account-request-form-container input:focus,
      .account-request-form-container textarea:focus {
        color: #1f2937 !important;
        background-color: #ffffff !important;
        border-color: #3b82f6 !important;
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
      }
      
      /* Enhanced Select field styling with maximum specificity */
      .account-request-form-container [data-radix-select-trigger],
      .account-request-form-container button[role="combobox"] {
        color: #1f2937 !important;
        background-color: #ffffff !important;
        border-color: #d1d5db !important;
        font-weight: 500 !important;
      }
      
      .account-request-form-container [data-radix-select-trigger]:focus,
      .account-request-form-container button[role="combobox"]:focus {
        color: #1f2937 !important;
        background-color: #ffffff !important;
        border-color: #3b82f6 !important;
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
      }
      
      .account-request-form-container [data-radix-select-value],
      .account-request-form-container [data-radix-select-trigger] span {
        color: #1f2937 !important;
        font-weight: 500 !important;
      }
      
      .account-request-form-container [data-radix-select-content] {
        background-color: #ffffff !important;
        border-color: #d1d5db !important;
        z-index: 50 !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
      }
      
      .account-request-form-container [data-radix-select-item],
      .account-request-form-container [data-radix-select-content] div[role="option"] {
        color: #1f2937 !important;
        font-weight: 500 !important;
        background-color: #ffffff !important;
      }
      
      .account-request-form-container [data-radix-select-item]:hover,
      .account-request-form-container [data-radix-select-item]:focus,
      .account-request-form-container [data-radix-select-content] div[role="option"]:hover,
      .account-request-form-container [data-radix-select-content] div[role="option"]:focus {
        background-color: #f3f4f6 !important;
        color: #1f2937 !important;
      }
      
      .account-request-form-container [data-radix-select-item][data-state="checked"],
      .account-request-form-container [data-radix-select-content] div[role="option"][data-state="checked"] {
        background-color: #e5e7eb !important;
        color: #1f2937 !important;
        font-weight: 600 !important;
      }
      
      /* Additional select field text overrides */
      .account-request-form-container select,
      .account-request-form-container select option {
        color: #1f2937 !important;
        background-color: #ffffff !important;
        font-weight: 500 !important;
      }
      
      /* Form labels */
      .account-request-form-container label {
        color: #ffffff !important;
        font-weight: 500 !important;
        margin-bottom: 0.5rem !important;
        display: block !important;
      }
      
      /* Character counter */
      .account-request-form-container .text-xs {
        color: #d1d5db !important;
        font-weight: 500 !important;
      }
      
      /* Validation feedback */
      .account-request-form-container .text-red-500,
      .account-request-form-container .text-destructive {
        color: #ef4444 !important;
        font-weight: 500 !important;
      }
      
      .account-request-form-container .text-green-500 {
        color: #10b981 !important;
        font-weight: 500 !important;
      }
      
      /* Button styling */
      .account-request-form-container button[type="submit"] {
        background-color: #10b981 !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        border: none !important;
      }
      
      .account-request-form-container button[type="submit"]:hover:not(:disabled) {
        background-color: #059669 !important;
      }
      
      .account-request-form-container button[type="submit"]:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }
      
      /* Override any theme conflicts for select components */
      .account-request-form-container * {
        box-sizing: border-box;
      }
      
      .account-request-form-container [role="combobox"] * {
        color: inherit !important;
      }
    `}</style>
  );
};
