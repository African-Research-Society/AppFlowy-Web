import { buildSendToDesignMessage, documentViewFromPath } from '../send-to-design';

describe('buildSendToDesignMessage', () => {
  it('sends viewId and title only', () => {
    expect(
      buildSendToDesignMessage({
        viewId: '22222222-2222-4222-8222-222222222222',
        title: 'Launch brief',
      })
    ).toEqual({
      channel: 'ars-app',
      version: 1,
      type: 'send-to-design',
      viewId: '22222222-2222-4222-8222-222222222222',
      title: 'Launch brief',
    });
  });

  it('never includes a brief body', () => {
    const message = buildSendToDesignMessage({
      viewId: '22222222-2222-4222-8222-222222222222',
      title: 'Launch poster',
    });
    expect(Object.keys(message)).toEqual([
      'channel',
      'version',
      'type',
      'viewId',
      'title',
    ]);
    expect(JSON.stringify(message)).not.toMatch(/token|SECRET|prompt/i);
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
});
