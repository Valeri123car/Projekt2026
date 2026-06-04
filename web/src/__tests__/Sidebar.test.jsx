import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';

function renderSidebar(vloga) {
  useAuth.mockReturnValue({ handleLogout: vi.fn(), vloga });
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar – prikaz postavk glede na vlogo', () => {
  it('voznik (vloga 1) vidi samo Nadzorno ploščo in Vožnje', () => {
    renderSidebar(1);
    expect(screen.getByText('Nadzorna plošča')).toBeInTheDocument();
    expect(screen.getByText('Vožnje')).toBeInTheDocument();
    expect(screen.queryByText('Vozniki')).not.toBeInTheDocument();
    expect(screen.queryByText('Računi')).not.toBeInTheDocument();
    expect(screen.queryByText('Prevozi')).not.toBeInTheDocument();
    expect(screen.queryByText('Dnevnik revizije')).not.toBeInTheDocument();
    expect(screen.queryByText('Uporabniki')).not.toBeInTheDocument();
    expect(screen.queryByText('Vozila')).not.toBeInTheDocument();
  });

  it('vodstvo (vloga 3) vidi skupne strani, ne pa adminskih', () => {
    renderSidebar(3);
    expect(screen.getByText('Nadzorna plošča')).toBeInTheDocument();
    expect(screen.getByText('Vožnje')).toBeInTheDocument();
    expect(screen.getByText('Vozniki')).toBeInTheDocument();
    expect(screen.getByText('Računi')).toBeInTheDocument();
    expect(screen.getByText('Prevozi')).toBeInTheDocument();
    expect(screen.queryByText('Dnevnik revizije')).not.toBeInTheDocument();
    expect(screen.queryByText('Uporabniki')).not.toBeInTheDocument();
    expect(screen.queryByText('Vozila')).not.toBeInTheDocument();
  });

  it('admin (vloga 2) vidi vse postavke', () => {
    renderSidebar(2);
    expect(screen.getByText('Nadzorna plošča')).toBeInTheDocument();
    expect(screen.getByText('Vožnje')).toBeInTheDocument();
    expect(screen.getByText('Vozniki')).toBeInTheDocument();
    expect(screen.getByText('Računi')).toBeInTheDocument();
    expect(screen.getByText('Prevozi')).toBeInTheDocument();
    expect(screen.getByText('Dnevnik revizije')).toBeInTheDocument();
    expect(screen.getByText('Uporabniki')).toBeInTheDocument();
    expect(screen.getByText('Vozila')).toBeInTheDocument();
  });
});
