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
});
