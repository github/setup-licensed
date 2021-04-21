const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const io = require('@actions/io');
const os = require('os');
const path = require('path');
const sinon = require('sinon');

const installer = require('../../lib/installers/exe');
const utils = require('../../lib/utils');
const releases = require('../fixtures/releases.json');

describe('getReleases', () => {
  let octokit;
  let listReleasesEndpoint;

  beforeEach(() => {
    listReleasesEndpoint = sinon.stub().resolves({ data: releases });
    octokit = {
      repos: {
        listReleases: listReleasesEndpoint
      }
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('lists releases from github/licensed', () => {
    expect(installer.getReleases(octokit)).resolves.toBeInstanceOf(Array);
    expect(listReleasesEndpoint.callCount).toEqual(1);
    expect(listReleasesEndpoint.getCall(0).args).toEqual([{ owner: 'github', repo: 'licensed' }]);
  });

  it('filters releases without any assets', async () => {
    const releases = await installer.getReleases(octokit);
    const release = releases.find((release) => release.tag_name === '2.3.1');
    expect(release).toBeUndefined();
  })
});

describe('findReleaseForVersion', () => {
  beforeEach(() => {
    sinon.spy(utils, 'findVersion');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('finds a release matching a version', () => {
    const expectedRelease = releases.find(r => r.tag_name === '2.3.2');
    expect(installer.findReleaseForVersion(releases, '2.3.x')).toEqual(expectedRelease);
    expect(utils.findVersion.callCount).toEqual(1);
    expect(utils.findVersion.getCall(0).args).toEqual([releases.map(r => r.tag_name), '2.3.x']);
  });

  it('returns null if a matching release isn\'t found', () => {
    expect(installer.findReleaseForVersion(releases, 'abc')).toEqual(null);
    expect(utils.findVersion.callCount).toEqual(1);
    expect(utils.findVersion.getCall(0).args).toEqual([releases.map(r => r.tag_name), 'abc']);
  });
});

describe('findReleaseAssetForPlatform', () => {
  it('finds a release asset', () => {
    const release = installer.findReleaseForVersion(releases, '2.3.2');
    const asset = installer.findReleaseAssetForPlatform(release, 'darwin');
    expect(asset).not.toBeNull();
  });

  it('filters assets that aren\'t marked as uploaded', () => {
    const release = installer.findReleaseForVersion(releases, '2.3.0');
    const asset = installer.findReleaseAssetForPlatform(release, 'darwin');
    expect(asset).not.toBeNull();
  });

  it('returns null if a release asset for the platform isn\'t found', () => {
    const release = installer.findReleaseForVersion(releases, '2.3.2');
    const asset = installer.findReleaseAssetForPlatform(release, 'aix');
    expect(asset).not.toBeNull();
  });
});

describe('downloadLicensedArchive', () => {
  let archivePath;
  let octokit;
  let requestEndpoint;
  let endpointMerge;

  beforeEach(() => {    
    requestEndpoint = sinon.stub();
    endpointMerge = sinon.stub().returns('merged');
    octokit = {
      request: requestEndpoint,
      repos: {
        getReleaseAsset: {
          endpoint: {
            merge: endpointMerge
          }
        }
      }
    };

    archivePath = path.join('testTmpDir', 'licensed.tar.gz');
    sinon.stub(fs.promises, 'mkdtemp').resolves('testTmpDir');
    sinon.stub(fs.promises, 'writeFile').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('downloads a release asset', async () => {
    requestEndpoint.resolves({ status: 200, data: 'archive' });
    
    const downloadedArchivePath = await installer.downloadLicensedArchive(octokit, { id: 1 });
    expect(downloadedArchivePath).toEqual(archivePath);

    expect(endpointMerge.callCount).toEqual(1);
    expect(endpointMerge.getCall(0).args).toEqual([
      {   
        headers: {
          Accept: "application/octet-stream"
        },
        owner: 'github',
        repo: 'licensed',
        asset_id: 1
      }
    ]);
    expect(requestEndpoint.callCount).toEqual(1);
    expect(requestEndpoint.getCall(0).args).toEqual(['merged']);

    expect(fs.promises.mkdtemp.callCount).toEqual(1);
    expect(fs.promises.writeFile.callCount).toEqual(1);
    expect(fs.promises.writeFile.getCall(0).args).toEqual([archivePath, Buffer.from('archive')])
  });

  it('raises an error when downloading a release asset fails', async () => {
    requestEndpoint.resolves({ status: 500 });
    
    const promise = installer.downloadLicensedArchive(octokit, { id: 1 }, 'path/to/licensed');
    await expect(promise).rejects.toThrow('Unable to download licensed');
  });
});

describe('extractLicensedArchive', () => {
  let archivePath;

  beforeEach(() => {    
    archivePath = path.join('testTmpDir', 'licensed.tar.gz');
    sinon.stub(fs.promises, 'access').resolves();
    sinon.stub(fs.promises, 'unlink').resolves();
    sinon.stub(exec, 'exec').resolves();
    sinon.stub(io, 'which').resolves('testTar');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('extracts a licensed archive', async () => {
    await installer.extractLicensedArchive(archivePath, 'path/to/licensed');

    expect(io.which.callCount).toEqual(1);
    expect(io.which.getCall(0).args).toEqual(['tar', true]);
    expect(fs.promises.access.callCount).toEqual(1);
    expect(fs.promises.access.getCall(0).args).toEqual(['path/to/licensed', fs.constants.W_OK]);
    expect(exec.exec.callCount).toEqual(1);
    expect(exec.exec.getCall(0).args).toEqual([
      'testTar',
      ['xzv', '-f', archivePath, '-C', 'path/to/licensed', './licensed']
    ]);
  });

  it('removes the archive after extraction', async () => {
    await installer.extractLicensedArchive(archivePath, 'path/to/licensed');

    expect(fs.promises.unlink.callCount).toEqual(1);
    expect(fs.promises.unlink.getCall(0).args).toEqual([archivePath]);
  });

  it('uses sudo if the user doesn\'t have root access', async () => {
    fs.promises.access.rejects();

    await installer.extractLicensedArchive(archivePath, 'path/to/licensed');

    expect(exec.exec.callCount).toEqual(1);
    expect(exec.exec.getCall(0).args).toEqual([
      'sudo testTar',
      ['xzv', '-f', archivePath, '-C', 'path/to/licensed', './licensed']
    ]);
  });
});

describe('install', () => {
  const token = 'token';
  const installDir = path.join(__dirname, 'install_dir');
  const version = '2.3.2';
  const release = releases.find(r => r.tag_name === version);
  const asset = release.assets.find(a => a.name.includes(os.platform()));

  const processEnv = process.env;
  let archivePath;

  beforeEach(() => {
    archivePath = path.join('testTmpDir', 'licensed.tar.gz');
    sinon.stub(core, 'setFailed');
    sinon.stub(core, 'addPath');
    sinon.stub(core, 'info');

    sinon.stub(installer, 'getReleases').resolves(releases);
    sinon.stub(installer, 'findReleaseForVersion').resolves(release);
    sinon.stub(installer, 'findReleaseAssetForPlatform').resolves(asset);
    sinon.stub(installer, 'downloadLicensedArchive').resolves(archivePath);
    sinon.stub(installer, 'extractLicensedArchive').resolves();

    sinon.stub(io, 'mkdirP').resolves();

    process.env = {
      ...process.env,
      'INPUT_INSTALL-DIR': installDir,
      INPUT_GITHUB_TOKEN: token
    };
  });

  afterEach(() => {
    process.env = processEnv;
    sinon.restore();
  });

  it('returns null when an installation directory is not given', async () => {
    delete process.env['INPUT_INSTALL-DIR'];

    await expect(installer.install(version)).resolves.toEqual(null);
    expect(core.info.callCount).toEqual(1);
    expect(core.info.getCall(0).args).toEqual(['Input required and not supplied to install licensed executable: install-dir']);
  });

  it('returns null if a release is not found', async() => {
    installer.findReleaseForVersion.resolves(null);

    await expect(installer.install(version)).resolves.toEqual(null);
    expect(core.info.callCount).toEqual(1);
    expect(core.info.getCall(0).args).toEqual(['github/licensed (2.3.2) release was not found']);
  });

  it('returns null if a release asset is not found', async () => {
    installer.findReleaseAssetForPlatform.resolves(null);

    await expect(installer.install(version)).resolves.toEqual(null);
    expect(core.info.callCount).toEqual(1);
    expect(core.info.getCall(0).args).toEqual([`github/licensed (2.3.2-${os.platform()}) package was not found`]);
  });

  it('runs', async () => {
    await installer.install(version);
    expect(core.info.callCount).toEqual(0);

    expect(installer.getReleases.callCount).toEqual(1);
    expect(installer.getReleases.getCall(0).args).toMatchObject([
      {
        // TODO: how to test that this octokit object uses token auth?
        // request: { endpoint: expect.objectContaining({ auth: token }) },
        repos: { listReleases: expect.any(Function) }
      }
    ]);

    expect(installer.findReleaseForVersion.callCount).toEqual(1);
    expect(installer.findReleaseForVersion.getCall(0).args).toEqual([releases, version]);

    expect(installer.findReleaseForVersion.callCount).toEqual(1);
    expect(installer.findReleaseAssetForPlatform.getCall(0).args).toEqual([release, os.platform()]);

    expect(io.mkdirP.callCount).toEqual(1);
    expect(io.mkdirP.getCall(0).args).toEqual([installDir]);

    expect(installer.downloadLicensedArchive.callCount).toEqual(1);
    expect(installer.downloadLicensedArchive.getCall(0).args).toMatchObject([
      { repos: { getReleaseAsset: expect.any(Function) }},
      asset
    ]);

    expect(installer.extractLicensedArchive.callCount).toEqual(1);
    expect(installer.extractLicensedArchive.getCall(0).args).toMatchObject([archivePath, installDir]);
  });

  it('adds the install directory to the path if needed', async () => {
    await installer.install(version);
    expect(core.addPath.callCount).toEqual(1);
    expect(core.addPath.getCall(0).args).toEqual([installDir]);
  });

  it('does not add the install directory to the path if already found', async () => {
    process.env['PATH'] = `${installDir};${process.env['PATH']}`;

    await installer.install(version);
    expect(core.addPath.callCount).toEqual(0);
  });
});
