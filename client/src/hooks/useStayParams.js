import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isDateOnly, nightsBetween } from '../utils/dates';

/** Reads/writes the stay (dates, guests, rooms) from the URL query string. */
export function useStayParams() {
  const [params, setParams] = useSearchParams();
  const stay = useMemo(() => {
    const n = (key, fallback, min) => {
      const v = Number(params.get(key));
      return Number.isInteger(v) && v >= min ? v : fallback;
    };
    const checkIn = params.get('checkIn') || '';
    const checkOut = params.get('checkOut') || '';
    const nights = nightsBetween(checkIn, checkOut);
    return {
      checkIn,
      checkOut,
      adults: n('adults', 2, 1),
      children: n('children', 0, 0),
      rooms: n('rooms', 1, 1),
      nights,
      valid: isDateOnly(checkIn) && isDateOnly(checkOut) && nights > 0,
    };
  }, [params]);

  const setStay = (patch) => {
    const next = { ...stay, ...patch };
    const out = new URLSearchParams();
    for (const key of ['checkIn', 'checkOut', 'adults', 'children', 'rooms']) if (next[key] !== '' && next[key] !== undefined) out.set(key, String(next[key]));
    setParams(out, { replace: true });
  };

  const query = new URLSearchParams({ checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, children: stay.children, rooms: stay.rooms }).toString();
  return { stay, setStay, query };
}
