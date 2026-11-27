import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
jest.mock('@capacitor/geolocation', () => ({
  Geolocation: { watchPosition: jest.fn(), clearWatch: jest.fn() }
}));

import { captureSurveyLocation, surveyLocationMetadata } from './locationUtils';

describe('survey location capture', () => {
  let onPosition;
  let onError;
  let geolocation;
  let existingGeolocation;

  beforeEach(() => {
    jest.useFakeTimers();
    existingGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    geolocation = {
      watchPosition: jest.fn((success, failure) => {
        onPosition = success;
        onError = failure;
        return 0;
      }),
      clearWatch: jest.fn()
    };
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geolocation });
  });

  afterEach(() => {
    if (existingGeolocation) Object.defineProperty(navigator, 'geolocation', existingGeolocation);
    else delete navigator.geolocation;
    jest.useRealTimers();
  });

  const reading = (accuracy, timestamp) => ({
    coords: { latitude: 21.1458, longitude: 79.0882, accuracy },
    timestamp
  });

  it('uses the Android native provider and releases the native watch', async () => {
    jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    jest.spyOn(Capacitor, 'isPluginAvailable').mockReturnValue(true);
    Geolocation.watchPosition.mockResolvedValue('native-watch');
    Geolocation.clearWatch.mockResolvedValue();
    try {
      const capture = captureSurveyLocation();
      const timestamp = Date.now();
      Geolocation.watchPosition.mock.calls[0][1](reading(8, timestamp));
      expect(surveyLocationMetadata(await capture)).toEqual({
        locationAccuracyMeters: 8,
        locationCapturedAt: new Date(timestamp).toISOString()
      });
      expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: 'native-watch' });
      expect(geolocation.watchPosition).not.toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('ignores a previous fix and preserves the timestamp of the fresh fix', async () => {
    const startedAt = Date.now();
    const capture = captureSurveyLocation();
    expect(geolocation.watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    onPosition(reading(5, startedAt - 60000));
    expect(geolocation.clearWatch).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2000);
    const capturedAt = Date.now();
    onPosition(reading(24, capturedAt));
    expect(surveyLocationMetadata(await capture)).toEqual({
      locationAccuracyMeters: 24,
      locationCapturedAt: new Date(capturedAt).toISOString()
    });
    expect(geolocation.clearWatch).toHaveBeenCalledWith(0);
  });

  it('keeps the most accurate available fix when the capture window ends', async () => {
    const capture = captureSurveyLocation();
    onPosition(reading(60, Date.now()));
    jest.advanceTimersByTime(1000);
    onPosition(reading(90, Date.now()));
    jest.advanceTimersByTime(19000);
    expect(await capture).toMatchObject({ accuracy: 60 });
    expect(geolocation.clearWatch).toHaveBeenCalledTimes(1);
  });

  it('clears the watch and leaves the capture metadata empty on permission denial', async () => {
    const capture = captureSurveyLocation();
    onError({ code: 1 });
    const location = await capture;
    expect(location.fallback).toBe(true);
    expect(surveyLocationMetadata(location)).toEqual({
      locationAccuracyMeters: null,
      locationCapturedAt: null
    });
    expect(geolocation.clearWatch).toHaveBeenCalledWith(0);
  });
});
