const mockGet = jest.fn();

jest.mock('../core', () => ({
  getAxios: () => ({ get: mockGet }),
  executeAPIRequest: async (request: () => Promise<{ data: { data: unknown } }>) => {
    const response = await request();

    return response.data.data;
  },
}));
jest.mock('@/utils/log', () => ({ Log: { warn: jest.fn() } }));

import { getAppOutline, getView, getViewNavigation } from '../view-api';
import { getWorkspaceFolder } from '../workspace-api';

const tree = {
  view_id: 'workspace-1',
  name: 'Workspace',
  children: [],
  folder_rid: 'folder-1',
};

describe('legacy Cloud folder compatibility', () => {
  beforeEach(() => mockGet.mockReset());

  it('uses the modern route without a fallback when supported', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: tree } });
    await expect(getView('workspace-1', 'view-1', 2)).resolves.toEqual(tree);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/api/workspace/workspace-1/view/view-1?depth=2');
  });

  it('loads the outline from the legacy folder route after a route-level 404', async () => {
    mockGet.mockRejectedValueOnce({ httpStatus: 404 }).mockResolvedValueOnce({ data: { data: tree } });
    await expect(getAppOutline('workspace-1')).resolves.toEqual({ outline: [], folderRid: 'folder-1' });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/workspace/workspace-1/folder?depth=6&root_view_id=workspace-1');
  });

  it('preserves the requested view and depth when navigation routes are unavailable', async () => {
    mockGet
      .mockRejectedValueOnce({ httpStatus: 405 })
      .mockRejectedValueOnce({ httpStatus: 404 })
      .mockResolvedValueOnce({ data: { data: tree } });
    await expect(getViewNavigation('workspace-1', 'view-1', 3)).resolves.toEqual(tree);
    expect(mockGet).toHaveBeenNthCalledWith(3, '/api/workspace/workspace-1/folder?depth=3&root_view_id=view-1');
  });

  it('converts a legacy workspace tree into the folder model', async () => {
    mockGet.mockRejectedValueOnce({ httpStatus: 404 }).mockResolvedValueOnce({ data: { data: tree } });
    await expect(getWorkspaceFolder('workspace-1', 8)).resolves.toMatchObject({
      id: 'workspace-1', name: 'Workspace', children: [], isSpace: false,
    });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/workspace/workspace-1/folder?depth=8&root_view_id=workspace-1');
  });

  it.each([
    { httpStatus: 401 },
    { httpStatus: 403 },
    { httpStatus: 500 },
    { httpStatus: 404, code: 1001 },
  ])('does not mask authentication, server, or application errors: %j', async (error) => {
    for (const request of [
      () => getView('workspace-1', 'view-1'),
      () => getViewNavigation('workspace-1', 'view-1'),
      () => getWorkspaceFolder('workspace-1'),
    ]) {
      mockGet.mockReset().mockRejectedValueOnce(error);
      await expect(request()).rejects.toEqual(error);
      expect(mockGet).toHaveBeenCalledTimes(1);
    }
  });
});
