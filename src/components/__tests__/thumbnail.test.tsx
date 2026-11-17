import { render, screen } from '@testing-library/react-native';

import { Thumbnail } from '@/components/thumbnail';

// The thumbnail is a decoration (the row's title names the item), so it is looked up
// among the elements hidden from screen readers.
const hidden = { includeHiddenElements: true };

describe('Thumbnail', () => {
  it('shows the photo when there is one', async () => {
    await render(<Thumbnail source={{ uri: 'https://valan.test/photos/front.jpg' }} />);

    expect(screen.getByTestId('thumbnail-photo', hidden)).toBeOnTheScreen();
  });

  it('shows a plain placeholder when there is no photo', async () => {
    await render(<Thumbnail source={null} />);

    expect(screen.queryByTestId('thumbnail-photo', hidden)).not.toBeOnTheScreen();
    expect(screen.getByTestId('thumbnail-placeholder', hidden)).toBeOnTheScreen();
  });

  it('is skipped by screen readers', async () => {
    await render(<Thumbnail source={null} />);

    expect(screen.queryByTestId('thumbnail-placeholder')).not.toBeOnTheScreen();
  });
});
