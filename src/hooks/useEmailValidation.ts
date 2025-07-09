
// This hook has been removed - email validation is no longer needed
export const useEmailValidation = () => {
  return {
    validationResult: { status: 'idle' as const, message: '' },
    validateEmail: () => Promise.resolve({ status: 'idle' as const, message: '' }),
    clearValidation: () => {}
  };
};
