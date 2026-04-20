import { useEffect } from 'react';

export const useDocumentFocusChange = (onChange: (focus: boolean) => void) => {
  useEffect(() => {
    const handleFocus = () => {
      onChange(true);
    };
    
    const handleBlur = () => {
      onChange(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onChange]);
};
