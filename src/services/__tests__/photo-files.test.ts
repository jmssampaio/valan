import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { preparePhoto } from '../photo-files';

// The native code that redraws and re-encodes a photo is the boundary.
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: { manipulate: jest.fn() },
}));

type Size = { width: number; height: number };

/** A stand-in for a photo of the given size; records how it was resized and saved. */
function photoOf(original: Size) {
  const resizes: Size[] = [];
  const saves: unknown[] = [];

  jest.mocked(ImageManipulator.manipulate).mockImplementation(() => {
    let size = original;
    const context = {
      resize: (next: Size) => {
        size = next;
        resizes.push(next);
        return context;
      },
      renderAsync: async () => ({
        ...size,
        saveAsync: async (options: unknown) => {
          saves.push(options);
          // "AQID" is the bytes 1, 2, 3.
          return { uri: 'file:///out.jpg', ...size, base64: 'AQID' };
        },
      }),
    };
    return context as unknown as ReturnType<typeof ImageManipulator.manipulate>;
  });

  return { resizes, saves };
}

describe('preparePhoto', () => {
  it('makes a full version of at most 1600 px and a small one of at most 320 px, keeping the proportions', async () => {
    const { resizes } = photoOf({ width: 4000, height: 3000 });

    await preparePhoto('file:///photo.heic');

    expect(resizes).toEqual([
      { width: 1600, height: 1200 },
      { width: 320, height: 240 },
    ]);
  });

  it('measures the longest side, so an upright photo is as tall as a wide one is wide', async () => {
    const { resizes } = photoOf({ width: 3000, height: 4000 });

    await preparePhoto('file:///photo.jpg');

    expect(resizes[0]).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges a photo that is already smaller', async () => {
    const { resizes } = photoOf({ width: 800, height: 600 });

    await preparePhoto('file:///photo.jpg');

    expect(resizes).toEqual([
      { width: 800, height: 600 },
      { width: 320, height: 240 },
    ]);
  });

  it('saves both as new JPEG files, which is what drops the location the camera wrote', async () => {
    const { saves } = photoOf({ width: 4000, height: 3000 });

    await preparePhoto('file:///photo.heic');

    expect(saves).toEqual([
      expect.objectContaining({ format: SaveFormat.JPEG, base64: true }),
      expect.objectContaining({ format: SaveFormat.JPEG, base64: true }),
    ]);
  });

  it('hands back the bytes of each version', async () => {
    photoOf({ width: 4000, height: 3000 });

    const { full, small } = await preparePhoto('file:///photo.jpg');

    expect([...new Uint8Array(full)]).toEqual([1, 2, 3]);
    expect([...new Uint8Array(small)]).toEqual([1, 2, 3]);
  });
});
