import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { EvenGrid } from '@/components/even-grid';

describe('EvenGrid', () => {
  it('shows every cell, including those of a short last row', async () => {
    await render(
      <EvenGrid columns={3}>
        {['um', 'dois', 'três', 'quatro', 'cinco'].map((word) => (
          <Text key={word}>{word}</Text>
        ))}
      </EvenGrid>,
    );

    for (const word of ['um', 'dois', 'três', 'quatro', 'cinco']) {
      expect(screen.getByText(word)).toBeOnTheScreen();
    }
  });
});
