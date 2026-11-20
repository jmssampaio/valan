import { render, screen } from '@testing-library/react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';

describe('Screen', () => {
  it('shows its title as the screen heading', async () => {
    await render(<Screen title="Anúncios" />);

    expect(screen.getByRole('header', { name: 'Anúncios' })).toBeOnTheScreen();
  });

  it('shows an action beside the title', async () => {
    await render(
      <Screen title="Anúncios" titleAction={<Button label="Criar anúncio" onPress={jest.fn()} />} />,
    );

    expect(screen.getByRole('header', { name: 'Anúncios' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Criar anúncio' })).toBeOnTheScreen();
  });

  it('shows a header above the title and a footer below the content', async () => {
    await render(
      <Screen
        title="Estado e fotos"
        scroll
        header={<Button label="Voltar" variant="link" onPress={jest.fn()} />}
        footer={<Button label="Continuar" onPress={jest.fn()} />}
      />,
    );

    expect(screen.getByRole('header', { name: 'Estado e fotos' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeOnTheScreen();
  });
});
