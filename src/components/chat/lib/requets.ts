import axios, { InternalAxiosRequestConfig } from 'axios';

import { getTokenParsed } from '@/application/session/token';

/* Create an axios instance with the default configuration
 * **Note**: This function is used to create the initial instance of axios, it's used in development mode
 */
export function createInitialInstance() {
  return axios.create({
    baseURL: 'https://beta.appflowy.cloud',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function getAccessToken() {
  return getTokenParsed()?.access_token ?? null;
}

export function requestInterceptor(config: InternalAxiosRequestConfig) {

  const access_token = getAccessToken();

  if(access_token) {
    Object.assign(config.headers, {
      Authorization: `Bearer ${access_token}`,
    });
  }

  return config;
}

export function readableStreamToAsyncIterator(reader: ReadableStreamDefaultReader<Uint8Array>) {
  return {
    async * [Symbol.asyncIterator]() {
      try {
        while(true) {
          const { done, value } = await reader.read();

          if(done) return;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}