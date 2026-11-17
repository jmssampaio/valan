import { fireEvent, render, screen } from '@testing-library/react-native';

import { OfferCard } from '@/components/offer-card';

const facts = {
  title: 'Noites de Lisboa',
  meta: 'vinil_porto · eBay · Expira em 21 h',
  asking: 'Pedes 28 €',
  price: '24 €',
};

describe('OfferCard', () => {
  it('shows the item, who offered, what is asked and what is offered', async () => {
    await render(<OfferCard {...facts} actions={[]} />);

    expect(screen.getByText('Noites de Lisboa')).toBeOnTheScreen();
    expect(screen.getByText('vinil_porto · eBay · Expira em 21 h')).toBeOnTheScreen();
    expect(screen.getByText('Pedes 28 €')).toBeOnTheScreen();
    expect(screen.getByText('24 €')).toBeOnTheScreen();
  });

  it('leaves out what is asked when there is nothing to say about it', async () => {
    await render(<OfferCard {...facts} asking={null} actions={[]} />);

    expect(screen.queryByText('Pedes 28 €')).not.toBeOnTheScreen();
  });

  it('has no buttons when there is nothing to do', async () => {
    await render(<OfferCard {...facts} actions={[]} />);

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('runs the action of the button that is pressed', async () => {
    const reject = jest.fn();
    const accept = jest.fn();
    await render(
      <OfferCard
        {...facts}
        actions={[
          { label: 'Rejeitar', accessibilityLabel: 'Rejeitar a proposta de 24 €', onPress: reject },
          { label: 'Aceitar', accessibilityLabel: 'Aceitar a proposta de 24 €', onPress: accept, primary: true },
        ]}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar a proposta de 24 €' }));

    expect(accept).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();
  });

  it('does not run an action that is disabled', async () => {
    const accept = jest.fn();
    await render(
      <OfferCard
        {...facts}
        actions={[{ label: 'Aceitar', onPress: accept, primary: true, disabled: true }]}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar' }));

    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeDisabled();
    expect(accept).not.toHaveBeenCalled();
  });

  it('says why there is nothing to do, when there is a reason', async () => {
    await render(<OfferCard {...facts} note="Já não podes responder a esta proposta." actions={[]} />);

    expect(screen.getByText('Já não podes responder a esta proposta.')).toBeOnTheScreen();
  });

  it('can show a tag for the outcome of an answered offer', async () => {
    await render(<OfferCard {...facts} tag={{ label: 'Aceite', tone: 'success' }} actions={[]} />);

    expect(screen.getByText('Aceite')).toBeOnTheScreen();
  });
});
