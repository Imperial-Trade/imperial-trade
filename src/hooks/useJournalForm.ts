
import { useCallback, useReducer } from 'react';

interface JournalFormState {
  asset_ticker: string;
  pnl: string;
  notes: string;
}

type JournalFormAction = 
  | { type: 'UPDATE_FIELD'; field: keyof JournalFormState; value: string }
  | { type: 'RESET_FORM' }
  | { type: 'SET_ASSET'; value: string };

const initialState: JournalFormState = {
  asset_ticker: '',
  pnl: '',
  notes: '',
};

const formReducer = (state: JournalFormState, action: JournalFormAction): JournalFormState => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_ASSET':
      return { ...state, asset_ticker: action.value };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
};

export const useJournalForm = () => {
  const [formState, dispatch] = useReducer(formReducer, initialState);

  const updateField = useCallback((field: keyof JournalFormState, value: string) => {
    dispatch({ type: 'UPDATE_FIELD', field, value });
  }, []);

  const setAsset = useCallback((value: string) => {
    dispatch({ type: 'SET_ASSET', value });
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateField(name as keyof JournalFormState, value);
  }, [updateField]);

  return {
    formState,
    updateField,
    setAsset,
    resetForm,
    handleInputChange,
  };
};
