import { replaceRootByRole } from '@/utils/replaceByRole';

function mockRouter() {
  const calls: string[] = [];
  return {
    calls,
    router: {
      canDismiss: jest.fn(() => false),
      dismissAll: jest.fn(),
      replace: (href: string) => {
        calls.push(href);
      },
    } as unknown as Pick<import('expo-router').Router, 'replace' | 'dismissAll' | 'canDismiss'>,
  };
}

describe('replaceRootByRole', () => {
  it('redirige admin vers /(admin)/(dashboard)', () => {
    const { router, calls } = mockRouter();
    replaceRootByRole(router, 'admin');
    expect(calls).toEqual(['/(admin)/(dashboard)']);
  });

  it('redirige agence vers /(agence)', () => {
    const { router, calls } = mockRouter();
    replaceRootByRole(router, 'agence');
    expect(calls).toEqual(['/(agence)']);
  });

  it('redirige client ou rôle inconnu vers /(tabs)', () => {
    const { router, calls } = mockRouter();
    replaceRootByRole(router, 'client');
    expect(calls).toEqual(['/(tabs)']);
    calls.length = 0;
    replaceRootByRole(router, null);
    expect(calls).toEqual(['/(tabs)']);
  });
});
