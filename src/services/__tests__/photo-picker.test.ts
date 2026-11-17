import * as ImagePicker from 'expo-image-picker';

import { pickPhotos, takePhoto } from '../photo-picker';

// The system photo picker and camera are the boundary.
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const library = jest.mocked(ImagePicker.launchImageLibraryAsync);
const camera = jest.mocked(ImagePicker.launchCameraAsync);
const cameraPermission = jest.mocked(ImagePicker.requestCameraPermissionsAsync);

function picked(...uris: string[]) {
  return { canceled: false, assets: uris.map((uri) => ({ uri })) } as ImagePicker.ImagePickerResult;
}

const cancelled = { canceled: true, assets: null } as ImagePicker.ImagePickerResult;

function permission(granted: boolean) {
  return { granted } as ImagePicker.CameraPermissionResponse;
}

// Call counts would otherwise leak from one test into the next.
beforeEach(() => jest.clearAllMocks());

describe('pickPhotos', () => {
  it('returns the photos chosen from the library, in order', async () => {
    library.mockResolvedValue(picked('file:///a.jpg', 'file:///b.jpg'));

    expect(await pickPhotos(5)).toEqual({
      status: 'picked',
      photos: [{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }],
    });
  });

  it('lets the seller choose only as many photos as still fit', async () => {
    library.mockResolvedValue(cancelled);

    await pickPhotos(3);

    expect(library).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 3 }),
    );
  });

  it('says so when the seller closes the library without choosing', async () => {
    library.mockResolvedValue(cancelled);

    expect(await pickPhotos(5)).toEqual({ status: 'cancelled' });
  });
});

describe('takePhoto', () => {
  it('returns the photo taken with the camera', async () => {
    cameraPermission.mockResolvedValue(permission(true));
    camera.mockResolvedValue(picked('file:///shot.jpg'));

    expect(await takePhoto()).toEqual({ status: 'picked', photos: [{ uri: 'file:///shot.jpg' }] });
  });

  it('does not open the camera when the seller refuses access to it', async () => {
    cameraPermission.mockResolvedValue(permission(false));

    expect(await takePhoto()).toEqual({ status: 'denied' });
    expect(camera).not.toHaveBeenCalled();
  });

  it('says so when the seller closes the camera without a photo', async () => {
    cameraPermission.mockResolvedValue(permission(true));
    camera.mockResolvedValue(cancelled);

    expect(await takePhoto()).toEqual({ status: 'cancelled' });
  });
});
