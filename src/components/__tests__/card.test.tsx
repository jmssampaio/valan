import { render, screen } from '@testing-library/react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { BorderWidth, Colors, Radius } from '@/constants/theme';

const dividers = () => screen.queryAllByTestId('card-divider', { includeHiddenElements: true });

describe('Card', () => {
  it('is a white surface with a 1-point line around it and rounded corners', async () => {
    await render(
      <Card testID="card">
        <AppText>Discogs</AppText>
      </Card>,
    );

    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: Colors.surface,
      borderWidth: BorderWidth.hairline,
      borderColor: Colors.line,
      borderRadius: Radius.card,
    });
  });

  it('separates its rows with a 1-point line, and has none above the first or below the last', async () => {
    await render(
      <Card>
        <AppText>Discogs</AppText>
        <AppText>eBay</AppText>
        <AppText>Reverb</AppText>
      </Card>,
    );

    expect(dividers()).toHaveLength(2);
  });

  it('draws no line for a row that is not there', async () => {
    const showsEbay = false;
    await render(
      <Card>
        <AppText>Discogs</AppText>
        {showsEbay ? <AppText>eBay</AppText> : null}
      </Card>,
    );

    expect(dividers()).toHaveLength(0);
  });

  it('holds one block of content, without lines, when it has room inside', async () => {
    await render(
      <Card padding="x4">
        <AppText>Recebes em novembro</AppText>
        <AppText>412,40 €</AppText>
      </Card>,
    );

    expect(dividers()).toHaveLength(0);
  });
});
