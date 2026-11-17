import { fireEvent, render, screen } from '@testing-library/react-native';

import { ItemPhoto } from '@/components/item-photo';
import { Size } from '@/constants/theme';

// The photo is a decoration (the title beside it names the item), so it is looked up
// among the elements hidden from screen readers.
const hidden = { includeHiddenElements: true };

describe('ItemPhoto', () => {
  it('shows the photo when there is one', async () => {
    await render(<ItemPhoto source={{ uri: 'https://valan.test/photos/front.jpg' }} />);

    expect(screen.getByTestId('item-photo', hidden)).toBeOnTheScreen();
  });

  it('shows a plain square placeholder when there is no photo', async () => {
    await render(<ItemPhoto source={null} />);

    expect(screen.queryByTestId('item-photo', hidden)).not.toBeOnTheScreen();
    expect(screen.getByTestId('item-photo-frame', hidden)).toHaveStyle({
      width: Size.detailPhoto,
      height: Size.detailPhoto,
    });
  });

  it('keeps the proportions of a wide photo, with the long side at the largest size', async () => {
    await render(<ItemPhoto source={{ uri: 'https://valan.test/photos/wide.jpg' }} />);

    await fireEvent(screen.getByTestId('item-photo', hidden), 'load', {
      nativeEvent: { source: { width: 300, height: 150 } },
    });

    expect(screen.getByTestId('item-photo-frame', hidden)).toHaveStyle({
      width: Size.detailPhoto,
      height: Size.detailPhoto / 2,
    });
  });

  it('keeps the proportions of a tall photo', async () => {
    await render(<ItemPhoto source={{ uri: 'https://valan.test/photos/tall.jpg' }} />);

    await fireEvent(screen.getByTestId('item-photo', hidden), 'load', {
      nativeEvent: { source: { width: 100, height: 200 } },
    });

    expect(screen.getByTestId('item-photo-frame', hidden)).toHaveStyle({
      width: Size.detailPhoto / 2,
      height: Size.detailPhoto,
    });
  });

  it('stays square when the photo reports no size', async () => {
    await render(<ItemPhoto source={{ uri: 'https://valan.test/photos/odd.jpg' }} />);

    await fireEvent(screen.getByTestId('item-photo', hidden), 'load', {
      nativeEvent: { source: { width: 0, height: 0 } },
    });

    expect(screen.getByTestId('item-photo-frame', hidden)).toHaveStyle({
      width: Size.detailPhoto,
      height: Size.detailPhoto,
    });
  });

  it('is skipped by screen readers', async () => {
    await render(<ItemPhoto source={null} />);

    expect(screen.queryByTestId('item-photo-frame')).not.toBeOnTheScreen();
  });
});
