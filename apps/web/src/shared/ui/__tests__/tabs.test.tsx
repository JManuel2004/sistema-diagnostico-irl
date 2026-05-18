import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs (shared/ui)', () => {
  function renderSample(): void {
    render(
      <Tabs defaultValue="trl">
        <TabsList aria-label="Dimensiones">
          <TabsTrigger value="trl">TRL</TabsTrigger>
          <TabsTrigger value="crl">CRL</TabsTrigger>
        </TabsList>
        <TabsContent value="trl">Panel TRL</TabsContent>
        <TabsContent value="crl">Panel CRL</TabsContent>
      </Tabs>,
    );
  }

  it('expone los roles ARIA de Radix (tablist, tab)', () => {
    renderSample();
    expect(screen.getByRole('tablist', { name: 'Dimensiones' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('cambia el panel activo al hacer click en un tab', async () => {
    renderSample();
    expect(screen.getByText('Panel TRL')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'CRL' }));
    expect(screen.getByText('Panel CRL')).toBeInTheDocument();
  });
});
