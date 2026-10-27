import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AdminRoute, ProtectedRoute } from '../components/common/RouteGuards';
import Login from '../pages/Login';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => ({
  authService: { session: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/my-bookings" element={<ProtectedRoute><p>Secret bookings</p></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><p>Admin area</p></AdminRoute>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe('route guards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends anonymous visitors to the login page', async () => {
    authService.session.mockResolvedValue({ data: { user: null } });
    renderAt('/my-bookings');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByText('Secret bookings')).not.toBeInTheDocument();
  });

  it('keeps non-admins out of the admin area', async () => {
    authService.session.mockResolvedValue({ data: { user: { name: 'Guest', role: 'user' } } });
    renderAt('/admin');
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it('lets admins in', async () => {
    authService.session.mockResolvedValue({ data: { user: { name: 'Boss', role: 'admin' } } });
    renderAt('/admin');
    expect(await screen.findByText('Admin area')).toBeInTheDocument();
  });
});

describe('login form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.session.mockResolvedValue({ data: { user: null } });
  });

  it('validates before calling the API', async () => {
    renderAt('/login');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('shows the server error for bad credentials', async () => {
    authService.login.mockRejectedValue({ response: { data: { error: { message: 'Invalid email or password' } } } });
    renderAt('/login');
    await userEvent.type(await screen.findByRole('textbox', { name: /email/i }), 'a@b.co');
    await userEvent.type(document.querySelector('input[name=password]'), 'Wrong1234');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('signs in and redirects', async () => {
    authService.login.mockResolvedValue({ data: { user: { name: 'Asha', role: 'user' } }, message: 'Welcome back' });
    renderAt('/login');
    await userEvent.type(await screen.findByRole('textbox', { name: /email/i }), 'asha@example.com');
    await userEvent.type(document.querySelector('input[name=password]'), 'Secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText('Home page')).toBeInTheDocument());
    expect(authService.login).toHaveBeenCalledWith({ email: 'asha@example.com', password: 'Secret123' });
  });
});
