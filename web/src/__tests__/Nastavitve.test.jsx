import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Nastavitve from '../pages/Nastavitve';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ vloga: 2, handleLogout: vi.fn() }),
}));

vi.mock('../store/authStore', () => ({
  default: () => ({ vloga: 2 }),
}));

import api from '../api/client';

const mockUser = { id_uporabnik: 1, ime: 'Ana', priimek: 'Novak', email: 'ana@test.si', dostop: 2 };

function renderPage() {
  return render(
    <MemoryRouter>
      <Nastavitve />
    </MemoryRouter>
  );
}

describe('Nastavitve – nalaganje profila', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: mockUser });
  });

  it('predizpolni obrazec s podatki uporabnika', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Novak')).toBeInTheDocument();
    });
  });

  it('prikaže e-pošto v glavi', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ana@test.si')).toBeInTheDocument();
    });
  });
});

describe('Nastavitve – validacija obrazca', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: mockUser });
  });

  it('prikaže napako ko gesli se ne ujemata', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Ana'));

    await user.type(screen.getByPlaceholderText('Pustite prazno, če ne menjate'), 'novoGeslo123');
    await user.type(screen.getByPlaceholderText('Ponovite novo geslo'), 'drugoGeslo123');
    await user.click(screen.getByText('Shrani spremembe'));

    await waitFor(() => {
      expect(screen.getByText('Gesli se ne ujemata.')).toBeInTheDocument();
    });
  });

  it('prikaže napako za geslo krajše od 6 znakov', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Ana'));

    await user.type(screen.getByPlaceholderText('Pustite prazno, če ne menjate'), 'abc');
    await user.type(screen.getByPlaceholderText('Ponovite novo geslo'), 'abc');
    await user.click(screen.getByText('Shrani spremembe'));

    await waitFor(() => {
      expect(screen.getByText('Geslo mora imeti vsaj 6 znakov.')).toBeInTheDocument();
    });
  });

  it('uspešno shrani spremembe', async () => {
    const user = userEvent.setup();
    api.put.mockResolvedValue({ data: { ...mockUser, ime: 'Maja' } });
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Ana'));

    const imeInput = screen.getByDisplayValue('Ana');
    await user.clear(imeInput);
    await user.type(imeInput, 'Maja');
    await user.click(screen.getByText('Shrani spremembe'));

    await waitFor(() => {
      expect(screen.getByText('Profil uspešno posodobljen.')).toBeInTheDocument();
    });
  });

  it('prikaže napako strežnika pri neuspešnem shranjevanju', async () => {
    const user = userEvent.setup();
    api.put.mockRejectedValue({ response: { data: { error: 'Napaka na strežniku' } } });
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Ana'));

    await user.click(screen.getByText('Shrani spremembe'));

    await waitFor(() => {
      expect(screen.getByText('Napaka na strežniku')).toBeInTheDocument();
    });
  });
});
