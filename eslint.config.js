
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "no-undef": "error",
      // Prevent usage of deprecated functions
      "no-restricted-syntax": [
        "error",
        {
          "selector": "Literal[value='trading-journal-ai-coach-gemini']",
          "message": "DEPRECATED: Use 'journal-coach' instead of 'trading-journal-ai-coach-gemini'"
        },
        {
          "selector": "Literal[value='trading-journal-ai-coach-gemeni']", 
          "message": "DEPRECATED: Use 'journal-coach' instead of 'trading-journal-ai-coach-gemeni'"
        },
        {
          "selector": "MemberExpression[property.name='getCoachFeedback']",
          "message": "DEPRECATED: Use useCoachInvocation().invokeCoach(entryId) instead of getCoachFeedback()"
        }
      ]
    },
  },
  // Supabase edge functions - allow Deno globals but keep no-undef for safety
  {
    files: ["supabase/functions/**/*.ts"],
    languageOptions: {
      globals: {
        Deno: "readonly",
      },
    },
    rules: {
      // Allow deprecated function names in their own shim files
      "no-restricted-syntax": "off"
    }
  }
);
