import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Contact from '../pages/Contact';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => ({ authService: { session: vi.fn() } }));

describe('Contact page', () => {
  it('fills in the signed-in user once the session finishes loading', async () => {
    let resolve;
    authService.session.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<MemoryRouter><AuthProvider><Contact /></AuthProvider></MemoryRouter>);
    const name = screen.getByRole('textbox', { name: /your name/i });
    expect(name).toHaveValue('');
    resolve({ data: { user: { name: 'Asha Rao', email: 'asha@example.com', phone: '9876543210' } } });
    expect(await screen.findByDisplayValue('Asha Rao')).toBe(name);
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('asha@example.com');
  });
});
