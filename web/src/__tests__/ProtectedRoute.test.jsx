import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

vi.mock('../store/authStore', () => ({
  default: vi.fn(),
}));

import useAuthStore from '../store/authStore';

function renderWithRoute(token, vloga, vlogaRequired) {
  useAuthStore.mockReturnValue({ token, vloga });

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Prijava</div>} />
        <Route path="/" element={<div>Domov</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute vlogaRequired={vlogaRequired}>
              <div>Zaščitena vsebina</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('preusmeri na /login brez žetona', () => {
    renderWithRoute(null, null, undefined);
    expect(screen.getByText('Prijava')).toBeInTheDocument();
  });

  it('prikaže vsebino z veljavnim žetonom brez zahtevane vloge', () => {
    renderWithRoute('token123', 1, undefined);
    expect(screen.getByText('Zaščitena vsebina')).toBeInTheDocument();
  });

  it('prikaže vsebino ko vloga ustreza zahtevani', () => {
    renderWithRoute('token123', 2, 2);
    expect(screen.getByText('Zaščitena vsebina')).toBeInTheDocument();
  });

  it('preusmeri na / ko vloga ne ustreza', () => {
    renderWithRoute('token123', 1, 2);
    expect(screen.getByText('Domov')).toBeInTheDocument();
  });

  it('sprejme seznam vlog – ustrezna vloga dovoli dostop', () => {
    renderWithRoute('token123', 3, [2, 3]);
    expect(screen.getByText('Zaščitena vsebina')).toBeInTheDocument();
  });

  it('sprejme seznam vlog – neustrezna vloga zavrne dostop', () => {
    renderWithRoute('token123', 1, [2, 3]);
    expect(screen.getByText('Domov')).toBeInTheDocument();
  });

  it('admin (vloga 2) dostopa do strani samo za admina', () => {
    renderWithRoute('token123', 2, [2]);
    expect(screen.getByText('Zaščitena vsebina')).toBeInTheDocument();
  });
});
