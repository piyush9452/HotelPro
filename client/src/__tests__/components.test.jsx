import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PriceSummary from '../components/booking/PriceSummary';
import GuestSelector from '../components/booking/GuestSelector';
import RoomCard from '../components/rooms/RoomCard';
import Pagination from '../components/common/Pagination';
import { ConfirmDialog } from '../components/common/Modal';
import { PasswordInput } from '../components/common/FormControls';

const room = {
  _id: 'r1', name: 'Deluxe City View King', category: 'deluxe', pricePerNight: 7200, maxAdults: 2, maxChildren: 1,
  bedType: 'king', beds: 1, size: 380, amenities: ['Free Wi-Fi', 'Smart TV'], images: [{ url: 'https://example.com/a.jpg' }],
};

describe('PriceSummary', () => {
  it('renders the server quote line by line', () => {
    render(<PriceSummary quote={{ nightlyRate: 7200, nights: 3, rooms: 1, subtotal: 21600, taxRate: 0.12, taxes: 2592, serviceFeeRate: 0.03, serviceFee: 648, total: 24840, currency: 'INR' }} />);
    expect(screen.getByText(/× 3 nights/)).toBeInTheDocument();
    expect(screen.getByText('Taxes (12%)')).toBeInTheDocument();
    expect(screen.getByText('₹24,840.00')).toBeInTheDocument();
  });
});

describe('GuestSelector', () => {
  it('keeps at least one adult per room', async () => {
    const onChange = vi.fn();
    render(<GuestSelector adults={1} children={0} rooms={1} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /1 adult/ }));
    expect(screen.getByRole('button', { name: 'Increase rooms' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decrease adults' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Increase children' }));
    expect(onChange).toHaveBeenCalledWith({ adults: 1, children: 1, rooms: 1 });
  });
});

describe('RoomCard', () => {
  it('shows price and links to the room with the stay query', () => {
    render(<MemoryRouter><RoomCard room={room} search="?checkIn=2026-11-20&checkOut=2026-11-23" /></MemoryRouter>);
    expect(screen.getByText('₹7,200')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Deluxe City View King' })).toHaveAttribute('href', '/rooms/r1?checkIn=2026-11-20&checkOut=2026-11-23');
  });

  it('reflects live availability', () => {
    const quote = { total: 24840, nights: 3, currency: 'INR' };
    const { rerender } = render(<MemoryRouter><RoomCard room={{ ...room, availability: { isAvailable: true, availableUnits: 1, quote } }} /></MemoryRouter>);
    expect(screen.getByText('Only 1 left')).toBeInTheDocument();
    rerender(<MemoryRouter><RoomCard room={{ ...room, availability: { isAvailable: false, availableUnits: 0, quote } }} /></MemoryRouter>);
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('navigates pages and disables at the edges', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={5} total={45} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('ConfirmDialog', () => {
  it('passes the reason to onConfirm and can be dismissed with Escape', async () => {
    const onConfirm = vi.fn().mockResolvedValue();
    const onClose = vi.fn();
    render(<ConfirmDialog open title="Cancel booking?" reasonLabel="Reason" confirmLabel="Yes" onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Cancel booking?' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Reason'), 'Plans changed');
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onConfirm).toHaveBeenCalledWith('Plans changed');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('PasswordInput', () => {
  it('toggles visibility', async () => {
    render(<PasswordInput label="Password" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});
