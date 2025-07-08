
import React from "react";

export const PageStyles: React.FC = () => {
  return (
    <style>{`
      /* Form Grid Layout */
      .account-request-form-container {
        width: 100%;
      }
      
      .form-grid {
        display: grid;
        grid-template-areas: 
          "fields"
          "actions";
        gap: 1.5rem;
      }
      
      .form-fields {
        grid-area: fields;
        display: grid;
        gap: 1.5rem;
      }
      
      .form-actions {
        grid-area: actions;
      }

      @media (min-width: 768px) {
        .form-grid {
          grid-template-areas: 
            "fields fields"
            "actions actions";
          grid-template-columns: 1fr 1fr;
        }
        
        .form-fields {
          grid-column: span 2;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        
        .form-fields > *:nth-child(7),
        .form-fields > *:nth-child(8) {
          grid-column: span 2;
        }
      }

      /* AI Tech Font Styles */
      .imperial-tech-font {
        font-family: 'Orbitron', 'Courier New', monospace;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        background: linear-gradient(135deg, #e6d3b3, #c09a58);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: 0 0 20px rgba(192, 154, 88, 0.4);
        position: relative;
      }

      .imperial-tech-font::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(192, 154, 88, 0.3), transparent);
        animation: tech-scan 3s infinite;
        pointer-events: none;
      }

      @keyframes tech-scan {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      /* Load Orbitron font */
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
    `}</style>
  );
};
