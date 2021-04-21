const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');
const sinon = require('sinon');

const installer = require('../../lib/installers/gem');
const utils = require('../../lib/utils');

const gemVersions = ['1', '2.1', '3.2.1', 'pre-release_test+1'];

describe('getGemExe', () => {
  beforeEach(() => {
    sinon.stub(io, 'which');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns the results of searching for a gem executable', async () => {
    io.which.resolves('testGem');
    const gemExe = await installer.getGemExecutable();
    expect(gemExe).toEqual('testGem');
    expect(io.which.callCount).toEqual(1);
    expect(io.which.getCall(0).args).toEqual(['gem', false]);
  });
});

describe('availableGemVersions', () => {
  beforeEach(() => {
    sinon.stub(exec, 'exec');
    sinon.stub(core, 'warning');
    sinon.stub(core, 'debug');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('finds all remote licensed gem versions', async () => {
    exec.exec.callsFake((exe, args, options) => {
      options.listeners.stdout(Buffer.from(`licensed (${gemVersions.join(', ')})`));
      return Promise.resolve(0);
    });
    const versions = await installer.availableGemVersions('gem');
    expect(versions).toEqual(gemVersions);
    expect(exec.exec.callCount).toEqual(1);
    expect(exec.exec.getCall(0).args).toEqual([
      'gem',
      ['list', 'licensed', '--exact', '--remote', '--all', '--quiet'],
      expect.objectContaining({ listeners: { stdout: expect.any(Function) }})
    ]);
  });

  it('returns null if no gem versions are found', async () => {
    exec.exec.callsFake((exe, args, options) => {
      options.listeners.stdout(Buffer.from('licensed ()'));
      return Promise.resolve(0);
    });
    const versions = await installer.availableGemVersions('gem');
    expect(versions).toEqual([]);

    expect(core.warning.callCount).toEqual(1);
    expect(core.warning.getCall(0).args).toEqual(['no versions found from `gem list licensed`']);
    expect(core.debug.callCount).toEqual(1);
    expect(core.debug.getCall(0).args).toEqual(['licensed ()']);
  });
});

describe('install', () => {
  const version = gemVersions[0];

  beforeEach(() => {
    sinon.stub(core, 'info');
    sinon.stub(installer, 'getGemExecutable').resolves('gem');
    sinon.stub(installer, 'availableGemVersions').resolves(gemVersions);
    sinon.stub(utils, 'findVersion').returns(version);
    sinon.stub(exec, 'exec').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns null if a gem executable isn\'t available', async () => {
    installer.getGemExecutable.resolves('');

    await expect(installer.install(version)).resolves.toEqual(null);
    expect(installer.getGemExecutable.callCount).toEqual(1);
    expect(exec.exec.callCount).toEqual(0);
    expect(core.info.callCount).toEqual(1);
    expect(core.info.getCall(0).args).toEqual(['rubygems environment not available']);
  });

  it('returns null when a matching gem version isn\'t found', async() => {
    utils.findVersion.returns(null);

    await expect(installer.install(version)).resolves.toEqual(null);
    expect(exec.exec.callCount).toEqual(0);
    expect(core.info.callCount).toEqual(1);
    expect(core.info.getCall(0).args).toEqual([`github/licensed (${version}) gem was not found`]  );
  });

  it('installs a licensed gem', async () => {
    await expect(installer.install(version)).resolves.toEqual('1');
    expect(installer.availableGemVersions.callCount).toEqual(1);
    expect(installer.availableGemVersions.getCall(0).args).toEqual(['gem']);
    expect(utils.findVersion.callCount).toEqual(1);
    expect(utils.findVersion.getCall(0).args).toEqual([gemVersions, version]);
    expect(exec.exec.callCount).toEqual(1);
    expect(exec.exec.getCall(0).args).toEqual([
      'gem',
      ['install', 'licensed', '-v', version]
    ]);
    expect(core.info.callCount).toEqual(0);
  });
});
