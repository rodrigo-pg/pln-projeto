import { useState } from 'react';

export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);

  const withLoading = async <T>(promise: Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      const result = await promise;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    withLoading
  }
};