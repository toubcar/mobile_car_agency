jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

import apiClient from '../services/api';
import { profileService } from '../services/profile.service';

const mockedApi = apiClient as jest.Mocked<typeof apiClient>;

describe('profileService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getPreferences appelle GET /profile/preferences', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { mobile: { news: true } } } });
    const prefs = await profileService.getPreferences();
    expect(mockedApi.get).toHaveBeenCalledWith('/profile/preferences');
    expect(prefs.mobile).toEqual({ news: true });
  });

  it('updatePreferences appelle PATCH /profile/preferences', async () => {
    mockedApi.patch.mockResolvedValue({ data: { data: { mobile: { news: false } } } });
    await profileService.updatePreferences({ mobile: { news: false } });
    expect(mockedApi.patch).toHaveBeenCalledWith('/profile/preferences', { mobile: { news: false } });
  });
});
