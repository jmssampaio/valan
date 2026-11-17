import { fireEvent, render, screen } from '@testing-library/react-native';

import { FlowHeader } from '@/components/flow-header';

const secondOfFour = {
  step: 2,
  steps: 4,
  stepLabel: '2/4',
  stepAccessibilityLabel: 'Passo 2 de 4',
};

describe('FlowHeader', () => {
  it('says how far along the flow is, once', async () => {
    await render(<FlowHeader {...secondOfFour} />);

    expect(screen.getByRole('progressbar', { name: 'Passo 2 de 4' })).toHaveAccessibilityValue({
      min: 0,
      max: 4,
      now: 2,
    });
    expect(screen.queryByText('2/4')).not.toBeOnTheScreen();
    expect(screen.getByText('2/4', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('runs its leading action when pressed', async () => {
    const onPress = jest.fn();
    await render(<FlowHeader {...secondOfFour} leading={{ label: '‹ Voltar', onPress }} />);

    await fireEvent.press(screen.getByRole('button', { name: '‹ Voltar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no button on a step that cannot be left', async () => {
    await render(<FlowHeader {...secondOfFour} />);

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});
