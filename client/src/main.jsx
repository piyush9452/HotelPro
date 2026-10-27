import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4500,
            style: { borderRadius: '12px', background: '#0b1630', color: '#fff', fontSize: '14px' },
            success: { iconTheme: { primary: '#c9a227', secondary: '#0b1630' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
