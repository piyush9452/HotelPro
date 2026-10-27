import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | HotelPro` : 'HotelPro — Luxury Hotel & Suites';
  }, [title]);
}
