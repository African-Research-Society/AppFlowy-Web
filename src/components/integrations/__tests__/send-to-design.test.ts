import {
  ARS_HUB_PARENT_KEY,
  arsPostMessageOrigin,
  arsReturnOrigin,
  buildSendToDesignMessage,
  canSendPageToDesign,
  documentViewFromPath,
  firstPartyHubParent,
  isArsParentOrigin,
  recalledHubParent,
  rememberHubParent,
  resolveArsParentOrigin,
  sendToDesignHandoffHref,
  sendToDesignTitle,
  sendToDesignWorkspaceId,
} from '../send-to-design';

describe('buildSendToDesignMessage', () => {
  it('sends ids and title only', () => {
    expect(
      buildSendToDesignMessage({
        viewId: '22222222-2222-4222-8222-222222222222',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        title: 'Launch poster',
      })
    ).toEqual({
      channel: 'ars-app',
      version: 1,
      type: 'send-to-design',
      viewId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '11111111-1111-4111-8111-111111111111',
      title: 'Launch poster',
    });
  });

  it('never includes a brief body', () => {
    const message = buildSendToDesignMessage({
      viewId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '11111111-1111-4111-8111-111111111111',
      title: 'Launch poster',
    });
    expect(Object.keys(message)).toEqual([
      'channel',
      'version',
      'type',
      'viewId',
      'workspaceId',
      'title',
    ]);
    expect(JSON.stringify(message)).not.toMatch(/token|SECRET|prompt|transcript/i);
  });

  it('caps and defaults the title', () => {
    expect(sendToDesignTitle('')).toBe('Untitled brief');
    expect(sendToDesignTitle('   ')).toBe('Untitled brief');
    expect(sendToDesignTitle(`${'A'.repeat(240)} | ARS Workspace`).length).toBeLessThanOrEqual(200);
  });

  it('rejects an invalid view id', () => {
    expect(() => buildSendToDesignMessage({ viewId: 'not-a-view' })).toThrow(/view/i);
  });
});

describe('sendToDesignWorkspaceId', () => {
  const live = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const pathWorkspace = '11111111-1111-4111-8111-111111111111';
  const viewId = '22222222-2222-4222-8222-222222222222';

  it('prefers the live workspace over a stale pathname', () => {
    expect(
      sendToDesignWorkspaceId({
        workspaceId: live,
        pathname: `/app/${pathWorkspace}/${viewId}`,
      })
    ).toBe(live);
    expect(
      sendToDesignWorkspaceId({
        pathname: `/app/${pathWorkspace}/${viewId}`,
      })
    ).toBe(pathWorkspace);
    expect(sendToDesignWorkspaceId({ workspaceId: 'not-a-workspace' })).toBeUndefined();
  });
});

describe('documentViewFromPath', () => {
  it('reads a document page', () => {
    expect(
      documentViewFromPath('/app/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222')
    ).toEqual({
      workspaceId: '11111111-1111-4111-8111-111111111111',
      viewId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('ignores trash and workspace-only paths', () => {
    expect(documentViewFromPath('/app/trash')).toBeNull();
    expect(documentViewFromPath('/app/11111111-1111-4111-8111-111111111111')).toBeNull();
    expect(
      documentViewFromPath('/app/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/extra')
    ).toBeNull();
    expect(
      documentViewFromPath('/app/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/')
    ).toEqual({
      workspaceId: '11111111-1111-4111-8111-111111111111',
      viewId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('treats a freshly published notes path as a document when the outline misses', () => {
    const viewId = '22222222-2222-4222-8222-222222222222';
    const pathname = `/app/11111111-1111-4111-8111-111111111111/${viewId}`;
    expect(
      canSendPageToDesign({
        parentOrigin: 'https://africanresearchsociety.org',
        viewId,
        pathname,
      })
    ).toBe(true);
    expect(
      canSendPageToDesign({
        parentOrigin: 'https://africanresearchsociety.org',
        viewId,
        isDocument: false,
        pathname,
      })
    ).toBe(false);
    expect(
      canSendPageToDesign({
        parentOrigin: 'https://africanresearchsociety.org',
        viewId,
        pathname: '/app/11111111-1111-4111-8111-111111111111',
      })
    ).toBe(false);
    expect(
      canSendPageToDesign({
        parentOrigin: null,
        viewId,
        pathname,
      })
    ).toBe(false);
  });
});

describe('resolveArsParentOrigin', () => {
  it('accepts an iframe referrer from the ARS hub', () => {
    expect(
      resolveArsParentOrigin({
        isIframe: true,
        referrer: 'https://africanresearchsociety.org/dashboard/workspace',
        search: '',
      })
    ).toBe('https://africanresearchsociety.org');
  });

  it('waits for a parent hello when the referrer is stripped', () => {
    expect(
      resolveArsParentOrigin({
        isIframe: true,
        referrer: '',
        search: '?ars_embed=1',
      })
    ).toBeNull();
    expect(isArsParentOrigin('https://www.africanresearchsociety.org')).toBe(true);
    expect(isArsParentOrigin('https://evil.example')).toBe(false);
  });

  it('keeps www for postMessage after handshake and refuses an unknown parent', () => {
    expect(arsPostMessageOrigin('https://www.africanresearchsociety.org')).toBe(
      'https://www.africanresearchsociety.org'
    );
    expect(arsPostMessageOrigin('https://evil.example')).toBeNull();
    expect(arsReturnOrigin('https://www.africanresearchsociety.org')).toBe(
      'https://www.africanresearchsociety.org'
    );
    expect(arsReturnOrigin('https://evil.example')).toBe('https://africanresearchsociety.org');
  });

  it('accepts a top-level ARS referrer so flags-off notes can Send to Design', () => {
    expect(
      resolveArsParentOrigin({
        isIframe: false,
        referrer: 'https://africanresearchsociety.org/',
        search: '?ars_notes=1',
      })
    ).toBe('https://africanresearchsociety.org');
    expect(
      resolveArsParentOrigin({
        isIframe: true,
        referrer: '::not-a-url',
        search: '',
      })
    ).toBeNull();
  });
});

describe('sendToDesignHandoffHref', () => {
  const viewId = '22222222-2222-4222-8222-222222222222';
  const workspaceId = '11111111-1111-4111-8111-111111111111';

  it('returns to the hub with page ids and an optional title', () => {
    expect(
      sendToDesignHandoffHref({
        parentOrigin: 'https://www.africanresearchsociety.org',
        viewId,
        workspaceId,
        title: 'Launch poster',
      })
    ).toBe(
      `https://www.africanresearchsociety.org/dashboard?view=${viewId}&workspace=${workspaceId}&title=Launch+poster`
    );
    expect(
      sendToDesignHandoffHref({
        parentOrigin: 'https://evil.example',
        viewId,
      })
    ).toBeNull();
    expect(
      sendToDesignHandoffHref({
        parentOrigin: 'https://africanresearchsociety.org',
        viewId: 'not-a-view',
      })
    ).toBeNull();
    expect(
      sendToDesignHandoffHref({
        parentOrigin: 'https://africanresearchsociety.org',
        viewId: viewId.toUpperCase(),
        workspaceId: workspaceId.toUpperCase(),
      })
    ).toBe(
      `https://africanresearchsociety.org/dashboard?view=${viewId}&workspace=${workspaceId}`
    );
    const href = sendToDesignHandoffHref({
      parentOrigin: 'https://africanresearchsociety.org',
      viewId,
      workspaceId,
    });
    expect(href).not.toMatch(/token|SECRET|prompt|transcript/i);
  });

  it('remembers only an allowlisted hub parent', () => {
    const store = new Map<string, string>();
    rememberHubParent('https://www.africanresearchsociety.org', {
      setItem: (key, value) => store.set(key, value),
    });
    rememberHubParent('https://evil.example', {
      setItem: (key, value) => store.set(key, value),
    });
    expect(store.get(ARS_HUB_PARENT_KEY)).toBe('https://www.africanresearchsociety.org');
    expect(recalledHubParent(store.get(ARS_HUB_PARENT_KEY))).toBe(
      'https://www.africanresearchsociety.org'
    );
    expect(recalledHubParent('https://evil.example')).toBeNull();
  });

  it('keeps first-party Send to Design pointed at the hub', () => {
    expect(firstPartyHubParent({})).toBe('https://africanresearchsociety.org');
    expect(
      firstPartyHubParent({
        referrer: 'https://www.africanresearchsociety.org/workspace',
      })
    ).toBe('https://www.africanresearchsociety.org');
    expect(
      firstPartyHubParent({
        stored: 'https://www.africanresearchsociety.org',
      })
    ).toBe('https://www.africanresearchsociety.org');
    expect(firstPartyHubParent({ referrer: 'https://evil.example' })).toBe(
      'https://africanresearchsociety.org'
    );
  });
});
