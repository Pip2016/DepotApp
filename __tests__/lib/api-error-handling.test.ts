import { fetchData } from '../lib/api';
import { logError } from '../lib/logger';

describe('API Error Handling', () => {
  test('should handle API rate limit (429 errors)', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.reject({ status: 429 }));

    const response = await fetchData();
    expect(response).toEqual({ error: 'Rate limit exceeded, please try again later.' });

    global.fetch = originalFetch;
  });
  
  test('should fallback to default values when APIs fail', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.reject());

    const response = await fetchData();
    expect(response).toEqual({ data: 'default value' });

    global.fetch = originalFetch;
  });
  
  test('should log errors when API calls fail', async () => {
    const originalFetch = global.fetch;
    const logSpy = jest.spyOn(console, 'log');
    global.fetch = jest.fn(() => Promise.reject('API Error'));

    await fetchData();
    expect(logSpy).toHaveBeenCalledWith('API Error');

    logSpy.mockRestore();
    global.fetch = originalFetch;
  });
  
  test('should implement retry logic for failed API calls', async () => {
    const retryFetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: 'success' });
    global.fetch = retryFetch;

    const response = await fetchData();
    expect(retryFetch).toHaveBeenCalledTimes(2);
    expect(response).toEqual({ data: 'success' });
  });
  
  test('should check for cache availability before making API calls', async () => {
    const isCacheAvailable = jest.fn(() => true);
    global.isCacheAvailable = isCacheAvailable;

    const response = await fetchData();
    expect(isCacheAvailable).toHaveBeenCalled();
    expect(response).toEqual({ data: 'data from cache' });
  });
});
