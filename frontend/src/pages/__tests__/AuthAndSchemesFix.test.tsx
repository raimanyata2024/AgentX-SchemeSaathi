// @vitest-environment jsdom
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// Mock state holders
const mockAuthState = {
  user: null as any,
  profile: null as any,
  token: null as string | null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshProfile: vi.fn(),
  updateProfileState: vi.fn(),
};

const mockApiModeState = {
  isMockMode: false,
  setMockMode: vi.fn(),
  apiBaseUrl: 'https://api.example.test/api/v1',
};

const mockGetSchemes = vi.fn();
const mockGetSchemeById = vi.fn();
const mockGetSchemeDocuments = vi.fn();
const mockEvaluateAll = vi.fn();
const mockGetApplications = vi.fn();
const mockGetNotifications = vi.fn();
const mockGetUserDocuments = vi.fn();

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/context/AuthContext')>();
  return {
    ...actual,
    useAuth: () => mockAuthState,
  };
});

vi.mock('@/context/ApiModeContext', () => ({
  ApiModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useApiMode: () => mockApiModeState,
}));

vi.mock('@/services/api/schemeService', () => ({
  schemeService: {
    getSchemes: (...args: any[]) => mockGetSchemes(...args),
    getSchemeById: (...args: any[]) => mockGetSchemeById(...args),
  },
}));

vi.mock('@/services/api/documentService', () => ({
  documentService: {
    getSchemeDocuments: (...args: any[]) => mockGetSchemeDocuments(...args),
    getUserDocuments: (...args: any[]) => mockGetUserDocuments(...args),
  },
}));

vi.mock('@/services/api/eligibilityService', () => ({
  eligibilityService: {
    evaluateAll: (...args: any[]) => mockEvaluateAll(...args),
    checkEligibility: vi.fn(),
  },
}));

vi.mock('@/services/api/applicationService', () => ({
  applicationService: {
    getApplications: (...args: any[]) => mockGetApplications(...args),
  },
}));

vi.mock('@/services/api/notificationService', () => ({
  notificationService: {
    getNotifications: (...args: any[]) => mockGetNotifications(...args),
  },
}));

import { LanguageProvider } from '@/context/LanguageContext';
import { SchemesPage } from '@/pages/SchemesPage';
import { SchemeDetailsPage } from '@/pages/SchemeDetailsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EligiblePage } from '@/pages/EligiblePage';
import { apiClient } from '@/services/api/client';

let container: HTMLDivElement;
let root: Root;

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

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
  });
}

describe('Auth token lifecycle, unauthenticated gating, and trilingual safety', () => {
  beforeEach(() => {
    ensureLocalStoragePolyfill();
    apiClient.setToken(null);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockAuthState.user = null;
    mockAuthState.profile = null;
    mockAuthState.token = null;
    mockAuthState.isAuthenticated = false;
    mockAuthState.isLoading = false;
    mockApiModeState.isMockMode = false;

    mockGetSchemes.mockReset();
    mockGetSchemeById.mockReset();
    mockGetSchemeDocuments.mockReset();
    mockEvaluateAll.mockReset();
    mockEvaluateAll.mockResolvedValue({
      total_evaluated: 0,
      eligible_count: 0,
      ineligible_count: 0,
      unknown_count: 0,
      results: [],
    });
    mockGetApplications.mockReset();
    mockGetNotifications.mockReset();
    mockGetUserDocuments.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('SchemesPage shows localized Sign In prompt (not No Schemes Found) when unauthenticated', async () => {
    for (const [lang, expected] of [
      ['en', 'Citizen Sign In Required'],
      ['hi', 'नागरिक लॉगिन आवश्यक है'],
      ['mr', 'नागरिक लॉगिन आवश्यक आहे'],
    ] as const) {
      await act(async () => {
        root.render(
          <MemoryRouter key={lang} initialEntries={['/schemes']}>
            <LanguageProvider initialLanguage={lang}>
              <SchemesPage />
            </LanguageProvider>
          </MemoryRouter>
        );
      });
      await flushEffects();

      expect(mockGetSchemes).not.toHaveBeenCalled();
      expect(container.textContent).toContain(expected);
      expect(container.textContent).not.toContain('No Schemes Found');
      expect(container.textContent).not.toContain('कोई योजना नहीं मिली');
    }
  });

  it('SchemesPage shows Sign In prompt on HTTP 401 and Retry prompt on network error', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'stale-token';

    mockGetSchemes.mockRejectedValueOnce({
      code: 'UNAUTHORIZED',
      message: 'Authentication token is missing. Please log in.',
    });

    await act(async () => {
      root.render(
        <MemoryRouter key="auth" initialEntries={['/schemes']}>
          <LanguageProvider initialLanguage="en">
            <SchemesPage />
          </LanguageProvider>
        </MemoryRouter>
      );
    });
    await flushEffects();

    expect(container.textContent).toContain('Citizen Sign In Required');
    expect(container.textContent).not.toContain('No Schemes Found');

    mockGetSchemes.mockRejectedValueOnce({
      code: 'NETWORK_ERROR',
      message: 'Failed to reach backend service.',
    });

    await act(async () => {
      root.render(
        <MemoryRouter key="network" initialEntries={['/schemes?q=kisan']}>
          <LanguageProvider initialLanguage="en">
            <SchemesPage />
          </LanguageProvider>
        </MemoryRouter>
      );
    });
    await flushEffects();

    expect(container.textContent).toContain('Unable to Reach Server');
    expect(container.textContent).toContain('Retry');
    expect(container.textContent).not.toContain('No Schemes Found');
  });

  it('SchemesPage renders backend SchemeSummaryResponse items cleanly when description/benefits are omitted', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'valid-token';
    mockGetSchemes.mockResolvedValueOnce([
      {
        id: '80ad3246-dd26-4108-a530-1bee5eab72e3',
        scheme_code: 'PM-KISAN',
        name: 'Pradhan Mantri Kisan Samman Nidhi',
        category: 'agriculture',
        ministry: 'Ministry of Agriculture',
        scheme_status: 'active',
        benefit_type: 'cash',
      },
    ]);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/schemes']}>
          <LanguageProvider initialLanguage="en">
            <SchemesPage />
          </LanguageProvider>
        </MemoryRouter>
      );
    });
    await flushEffects();

    expect(container.textContent).toContain('Pradhan Mantri Kisan Samman Nidhi');
    expect(container.textContent).not.toContain('undefined');
    expect(container.textContent).not.toContain('No Schemes Found');
  });

  it('SchemesPage renders empty state only when authenticated and backend genuinely returns []', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'valid-token';
    mockGetSchemes.mockResolvedValueOnce([]);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/schemes?q=nonexistent-xyz']}>
          <LanguageProvider initialLanguage="en">
            <SchemesPage />
          </LanguageProvider>
        </MemoryRouter>
      );
    });
    await flushEffects();

    expect(container.textContent).toContain('No Schemes Found');
  });

  it('SchemeDetailsPage shows Sign In prompt on unauthenticated/401 access and resolves legacy slugs to UUID', async () => {
    // 1. Unauthenticated access must prompt sign in instead of "Scheme not found."
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/schemes/scheme-pm-kisan-01']}>
          <LanguageProvider initialLanguage="en">
            <Routes>
              <Route path="/schemes/:id" element={<SchemeDetailsPage />} />
            </Routes>
          </LanguageProvider>
        </MemoryRouter>
      );
    });
    await flushEffects();

    expect(container.textContent).toContain('Citizen Sign In Required');
    expect(container.textContent).not.toContain('Scheme not found.');

    // 2. Authenticated legacy slug resolution via scheme_code search -> getSchemeById(uuid)
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'valid-token';
    const realUuid = '80ad3246-dd26-4108-a530-1bee5eab72e3';

    mockGetSchemes.mockResolvedValueOnce([
      {
        id: realUuid,
        scheme_code: 'PM-KISAN',
        name: 'PM Kisan Samman Nidhi',
        category: 'agriculture',
        ministry: 'Ministry of Agriculture',
        scheme_status: 'active',
        benefit_type: 'cash',
      },
    ]);
    mockGetSchemeById.mockResolvedValueOnce({
      id: realUuid,
      scheme_code: 'PM-KISAN',
      name: 'PM Kisan Samman Nidhi',
      category: 'agriculture',
      ministry: 'Ministry of Agriculture',
      description: 'Direct income support to landholding farmer families.',
      benefits: 'Rs. 6,000 per year in three installments.',
      scheme_status: 'active',
      benefit_type: 'cash',
      documents: [],
      sources: [],
    });
    mockGetSchemeDocuments.mockResolvedValueOnce([]);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/schemes/scheme-pm-kisan-01']}>
          <LanguageProvider initialLanguage="en">
            <Routes>
              <Route path="/schemes/:id" element={<SchemeDetailsPage />} />
            </Routes>
          </LanguageProvider>
        </MemoryRouter>
      );
    });
    await flushEffects();

    expect(mockGetSchemes).toHaveBeenCalledWith({
      q: 'PM-KISAN',
      limit: 10,
      include_pending: true,
    });
    expect(mockGetSchemeById).toHaveBeenCalledWith(realUuid);
    expect(container.textContent).toContain('PM Kisan Samman Nidhi');
    expect(container.textContent).not.toContain('Scheme not found.');
  });

  it('DashboardPage and EligiblePage show Marathi auth prompt instead of silently showing empty data', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <LanguageProvider initialLanguage="mr">
            <DashboardPage />
          </LanguageProvider>
        </MemoryRouter>
      );
    });
    await flushEffects();

    expect(mockGetApplications).not.toHaveBeenCalled();
    expect(container.textContent).toContain('नागरिक लॉगिन आवश्यक आहे');

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/eligible']}>
          <LanguageProvider initialLanguage="mr">
            <EligiblePage />
          </LanguageProvider>
        </MemoryRouter>
      );
    });
    await flushEffects();

    expect(mockEvaluateAll).not.toHaveBeenCalled();
    expect(container.textContent).toContain('तुमची वैयक्तिक योजना पात्रता तपासा');
  });
});
