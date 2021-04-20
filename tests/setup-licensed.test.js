const core = require('@actions/core');
const io = require('@actions/io');
const path = require('path');
const Octokit = require('@octokit/rest');
const os = require('os');
const sinon = require('sinon');

const run = require('../lib/setup-licensed');
const utils = require('../lib/utils');

describe('setup-licensed', () => {
  const token = 'token';
  const installDir = path.join(__dirname, 'install_dir');
  const releases = require('./fixtures/releases');
  const version = '2.3.2';
  const release = releases.find(r => r.tag_name === version);
  const asset = release.assets.find(a => a.name.includes(os.platform()));

  const processEnv = process.env;

  beforeEach(() => {
    sinon.stub(core, 'setFailed');
    sinon.stub(core, 'addPath');
    sinon.stub(core, 'info');

    sinon.stub(utils, 'getReleases').resolves(releases);
    sinon.stub(utils, 'findReleaseForVersion').resolves(release);
    sinon.stub(utils, 'findReleaseAssetForPlatform').resolves(asset);
    sinon.stub(utils, 'installLicensedFromReleaseAsset').resolves();

    sinon.stub(io, 'mkdirP').resolves();

    process.env = {
      ...process.env,
      INPUT_VERSION: version,
      'INPUT_INSTALL-DIR': installDir,
      INPUT_GITHUB_TOKEN: token
    };
  });

  afterEach(() => {
    process.env = processEnv;
    sinon.restore();
  });

  it('raises an error when a version is not given', async () => {
    delete process.env['INPUT_VERSION'];

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual(['Input required and not supplied: version']);
  });

  it('raises an error when an installation directory is not given', async () => {
    delete process.env['INPUT_INSTALL-DIR'];

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual(['Input required and not supplied: install-dir']);
  });

  it('throws when version is invalid', async () => {
    process.env.INPUT_VERSION = 'abc';

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual(['abc is not a valid semantic version input']);
  });

  it('throws when a release is not found', async() => {
    utils.findReleaseForVersion.resolves(null);

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual(['github/licensed (2.3.2) release was not found']);
  });

  it('throws when a release asset is not found', async () => {
    utils.findReleaseAssetForPlatform.resolves(null);

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual([`github/licensed (2.3.2-${os.platform()}) package was not found`]);
  });

  it('runs', async () => {
    await run();
    expect(core.setFailed.callCount).toEqual(0);

    expect(utils.getReleases.callCount).toEqual(1);
    expect(utils.getReleases.getCall(0).args).toMatchObject([
      {
        // TODO: how to test that this octokit object uses token auth?
        // request: { endpoint: expect.objectContaining({ auth: token }) },
        repos: { listReleases: expect.any(Function) }
      }
    ]);

    expect(utils.findReleaseForVersion.callCount).toEqual(1);
    expect(utils.findReleaseForVersion.getCall(0).args).toEqual([releases, version]);

    expect(utils.findReleaseForVersion.callCount).toEqual(1);
    expect(utils.findReleaseAssetForPlatform.getCall(0).args).toEqual([release, os.platform()]);

    expect(io.mkdirP.callCount).toEqual(1);
    expect(io.mkdirP.getCall(0).args).toEqual([installDir]);

    expect(utils.installLicensedFromReleaseAsset.callCount).toEqual(1);
    expect(utils.installLicensedFromReleaseAsset.getCall(0).args).toMatchObject([
      { repos: { getReleaseAsset: expect.any(Function) }},
      asset,
      installDir
    ]);

    expect(core.info.callCount).toEqual(1);
    expect(core.info.getCall(0).args).toEqual([`github/licensed (2.3.2-${os.platform()}) installed to ${installDir}`]);
  });

  it('adds the install directory to the path if needed', async () => {
    await run();
    expect(core.addPath.callCount).toEqual(1);
    expect(core.addPath.getCall(0).args).toEqual([installDir]);
  });

  it('does not add the install directory to the path if already found', async () => {
    process.env['PATH'] = `${installDir};${process.env['PATH']}`;

    await run();
    expect(core.addPath.callCount).toEqual(0);
  });
});
