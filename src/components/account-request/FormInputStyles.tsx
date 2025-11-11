import { FC } from "react";

export const FormInputStyles: React.FC = () => {
  return (
    <style>{`
      /* Clean form input styling */
      .account-request-form-container input[type="text"],
      .account-request-form-container input[type="email"],
      .account-request-form-container input[type="tel"],
      .account-request-form-container textarea {
        color: #1f2937 !important;
        background-color: #ffffff !important;
        border-color: #d1d5db !important;
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
      
      /* Select field styling */
      .account-request-form-container [data-radix-select-trigger] {
        color: #1f2937 !important;
        background-color: #ffffff !important;
        border-color: #d1d5db !important;
      }
      
      .account-request-form-container [data-radix-select-trigger]:focus {
        color: #1f2937 !important;
        background-color: #ffffff !important;
        border-color: #3b82f6 !important;
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
      }
      
      .account-request-form-container [data-radix-select-content] {
        background-color: #ffffff !important;
        border-color: #d1d5db !important;
        z-index: 50 !important;
      }
      
      .account-request-form-container [data-radix-select-item] {
        color: #1f2937 !important;
        background-color: #ffffff !important;
      }
      
      .account-request-form-container [data-radix-select-item]:hover {
        background-color: #f3f4f6 !important;
      }
      
      /* Form labels */
      .account-request-form-container label {
        color: #ffffff !important;
        font-weight: 500 !important;
        margin-bottom: 0.5rem !important;
      }
      
      /* Validation feedback */
      .account-request-form-container .text-red-400 {
        color: #f87171 !important;
        font-weight: 500 !important;
      }
      
      /* Button styling */
      .account-request-form-container button[type="submit"] {
        font-weight: 600 !important;
      }
      
      .account-request-form-container button[type="submit"]:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }
    `}</style>
  );
};
