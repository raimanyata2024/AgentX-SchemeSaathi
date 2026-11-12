// @vitest-environment jsdom
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { profileService } from '@/services/api/profileService';
import { apiClient } from '@/services/api/client';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function ensureLocalStoragePolyfill() {
  const existing = (window as any).localStorage;
  if (existing && typeof existing.clear === 'function' && typeof existing.setItem === 'function') {
    existing.clear();
    return;
  }
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true, writable: true });
}

let container: HTMLDivElement;
let root: Root;

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
  });
}

const AuthProbe: React.FC = () => {
  const { isAuthenticated, isLoading, token, profile } = useAuth();
  return (
    <div data-testid="auth-probe">
      {isLoading ? 'loading' : isAuthenticated ? 'authed' : 'anon'}|{token ?? 'null'}|{profile?.full_name ?? 'no-profile'}
    </div>
  );
};

describe('Real AuthProvider token lifecycle', () => {
  beforeEach(() => {
    ensureLocalStoragePolyfill();
    apiClient.setToken(null);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('clears expired JWT token and resets real isAuthenticated to false on 401 UNAUTHORIZED', async () => {
    apiClient.setToken('expired-jwt-token');
    const setTokenSpy = vi.spyOn(apiClient, 'setToken');
    vi.spyOn(apiClient, 'isMockMode').mockReturnValue(false);
    const profileSpy = vi
      .spyOn(profileService, 'getProfile')
      .mockRejectedValueOnce({ code: 'UNAUTHORIZED', message: 'HTTP 401: Invalid or expired token' });

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      );
    });
    await flushEffects();

    expect(profileSpy).toHaveBeenCalledTimes(1);
    expect(setTokenSpy).toHaveBeenCalledWith(null);
    expect(window.localStorage.getItem('scheme_saathi_jwt')).toBeNull();
    expect(container.textContent).toBe('anon|null|no-profile');
  });

  it('preserves JWT token and authenticated state on transient non-auth network errors', async () => {
    apiClient.setToken('valid-jwt-token');
    const setTokenSpy = vi.spyOn(apiClient, 'setToken');
    vi.spyOn(apiClient, 'isMockMode').mockReturnValue(false);
    vi.spyOn(profileService, 'getProfile').mockRejectedValueOnce({
      code: 'NETWORK_ERROR',
      message: 'Temporary timeout',
    });

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      );
    });
    await flushEffects();

    expect(setTokenSpy).not.toHaveBeenCalledWith(null);
    expect(window.localStorage.getItem('scheme_saathi_jwt')).toBe('valid-jwt-token');
    expect(container.textContent).toBe('authed|valid-jwt-token|no-profile');
  });

  it('hydrates profile when valid JWT token succeeds', async () => {
    apiClient.setToken('good-jwt-token');
    vi.spyOn(apiClient, 'isMockMode').mockReturnValue(false);
    vi.spyOn(profileService, 'getProfile').mockResolvedValueOnce({
      user_id: 'user-1',
      full_name: 'Ramesh Kumar',
    } as any);

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      );
    });
    await flushEffects();

    expect(container.textContent).toBe('authed|good-jwt-token|Ramesh Kumar');
  });
});
