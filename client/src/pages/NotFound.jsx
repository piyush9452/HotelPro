import { Compass } from 'lucide-react';
import Button from '../components/common/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound({ title = 'Page not found', message = 'The page you’re looking for doesn’t exist or has moved.' }) {
  useDocumentTitle(title);
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-serif text-8xl font-semibold text-gold-500/80" aria-hidden="true">404</p>
      <Compass className="mt-2 h-8 w-8 text-navy-300" aria-hidden="true" />
      <h1 className="mt-4 text-3xl text-navy-950">{title}</h1>
      <p className="mt-2 max-w-md text-navy-600">{message}</p>
      <div className="mt-8 flex gap-3">
        <Button to="/">Go home</Button>
        <Button variant="outline" to="/rooms">Browse rooms</Button>
      </div>
    </div>
  );
}
