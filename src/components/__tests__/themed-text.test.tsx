import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';

describe('ThemedText', () => {
  it('renders the text it is given', async () => {
    await render(<ThemedText>Hello, Valan</ThemedText>);

    expect(screen.getByText('Hello, Valan')).toBeOnTheScreen();
  });
});
