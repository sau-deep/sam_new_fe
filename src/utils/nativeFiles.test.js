const mockOpen = jest.fn();
const mockCap = { native: false, plugin: false };

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockCap.native,
    isPluginAvailable: (name) => mockCap.plugin && name === 'SamFiles',
  },
  registerPlugin: () => ({ openBundledFile: (...args) => mockOpen(...args) }),
}));

// eslint-disable-next-line import/first
import { bundledPath, canOpenBundledFiles, openBundledFile } from './nativeFiles';

beforeEach(() => {
  mockOpen.mockReset();
  mockCap.native = false;
  mockCap.plugin = false;
});

describe('nativeFiles (P04)', () => {
  it('is only available in an app build that has the SamFiles plugin', () => {
    expect(canOpenBundledFiles()).toBe(false);
    mockCap.native = true;
    expect(canOpenBundledFiles()).toBe(false); // Android 1.0.10 and older
    mockCap.plugin = true;
    expect(canOpenBundledFiles()).toBe(true);
  });

  it('accepts only files of this app', () => {
    expect(bundledPath('/Mobile_SoP_Routine_Monitoring.pptx')).toBe('/Mobile_SoP_Routine_Monitoring.pptx');
    expect(bundledPath('CMAM_Concurrent_Assessment_Questionnaire.pdf')).toBe('/CMAM_Concurrent_Assessment_Questionnaire.pdf');
    expect(bundledPath(`${window.location.origin}/privacy-policy.pdf?v=2`)).toBe('/privacy-policy.pdf');
    expect(bundledPath('/BiAnnual_Questionnaire 1.pdf')).toBe('/BiAnnual_Questionnaire%201.pdf');
    expect(bundledPath('https://example.org/file.pdf')).toBeNull();
    expect(bundledPath('')).toBeNull();
  });

  it('passes the path and the file type to the plugin', async () => {
    mockCap.native = true;
    mockCap.plugin = true;
    mockOpen.mockResolvedValue({ action: 'view' });
    await expect(openBundledFile('/Mobile_SoP_Routine_Monitoring.pptx', { title: 'SOP' })).resolves.toEqual({ action: 'view' });
    expect(mockOpen).toHaveBeenCalledWith({
      path: '/Mobile_SoP_Routine_Monitoring.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      title: 'SOP',
    });
    await openBundledFile('/CMAM_Concurrent_Assessment_Questionnaire.pdf');
    expect(mockOpen).toHaveBeenLastCalledWith(expect.objectContaining({ mimeType: 'application/pdf' }));
  });

  it('rejects without calling the plugin when it is missing or the file is elsewhere', async () => {
    await expect(openBundledFile('/x.pdf')).rejects.toMatchObject({ code: 'UNIMPLEMENTED' });
    mockCap.native = true;
    mockCap.plugin = true;
    await expect(openBundledFile('https://example.org/x.pdf')).rejects.toMatchObject({ code: 'BAD_PATH' });
    expect(mockOpen).not.toHaveBeenCalled();
  });
});
