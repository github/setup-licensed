const exec = require('@actions/exec');
const fs = require('fs');
const io = require('@actions/io');
const path = require('path');
const sinon = require('sinon');

const utils = require('../lib/utils');
const releases = require('./fixtures/releases.json');
const dirtyReleases = require('./fixtures/dirty_releases.json');


describe('getReleases', () => {
  let octokit;
  let listReleasesEndpoint;

  beforeEach(() => {
    listReleasesEndpoint = sinon.stub().resolves({ data: dirtyReleases });
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
    expect(utils.getReleases(octokit)).resolves.toBeInstanceOf(Array);
    expect(listReleasesEndpoint.callCount).toEqual(1);
    expect(listReleasesEndpoint.getCall(0).args).toEqual([{ owner: 'github', repo: 'licensed' }]);
  });

  it('filters releases without any assets', async () => {
    const releases = await utils.getReleases(octokit);
    const release = releases.find((release) => release.tag_name === '2.3.1');
    expect(release).toBeUndefined();
  })

  it('filters releases with invalid semver tags', async () => {
    const releases = await utils.getReleases(octokit);
    const release = releases.find((release) => release.tag_name === 'pre-release-disable-bundler-ruby-packer');
    expect(release).toBeUndefined();
  })
});

describe('findReleaseForVersion', () => {

  it('matches a specific version', () => {
    const release = utils.findReleaseForVersion(releases, '2.3.2');
    expect(release).not.toBeNull();
    expect(release.tag_name).toEqual('2.3.2');
  });

  it('matches a major.x version', () => {
    const release = utils.findReleaseForVersion(releases, '2.x');
    expect(release).not.toBeNull();
    expect(release.tag_name).toEqual('2.15.2');
  });

  it('matches a major.minor.x version', () => {
    const release = utils.findReleaseForVersion(releases, '2.9.x');
    expect(release).not.toBeNull();
    expect(release.tag_name).toEqual('2.9.2');
  });

  it('matches an empty string as latest version', () => {
    const release = utils.findReleaseForVersion(releases, '');
    expect(release).not.toBeNull();
    expect(release.tag_name).toEqual('2.15.2');
  });

  it('returns null if a matching release isn\'t found', () => {
    const release = utils.findReleaseForVersion(releases, '1.0.0');
    expect(release).toBeNull();
  });
});

describe('findReleaseAssetForPlatform', () => {
  it('finds a release asset', () => {
    const release = utils.findReleaseForVersion(releases, '2.3.2');
    const asset = utils.findReleaseAssetForPlatform(release, 'darwin');
    expect(asset).not.toBeNull();
  });

  it('filters assets that aren\'t marked as uploaded', () => {
    const release = utils.findReleaseForVersion(releases, '2.3.0');
    const asset = utils.findReleaseAssetForPlatform(release, 'darwin');
    expect(asset).not.toBeNull();
  });

  it('returns null if a release asset for the platform isn\'t found', () => {
    const release = utils.findReleaseForVersion(releases, '2.3.2');
    const asset = utils.findReleaseAssetForPlatform(release, 'aix');
    expect(asset).not.toBeNull();
  });
});

describe('installLicensed', () => {
  const archiveFixture = path.join(__dirname, 'fixtures', 'licensed.tar.gz');
  let archivePath;
  let octokit;
  let requestEndpoint;
  let getReleaseAssetOptions;

  beforeEach(() => {    
    requestEndpoint = sinon.stub();
    getReleaseAssetOptions = { merge: sinon.stub().returns('merged') };
    octokit = {
      request: requestEndpoint,
      repos: {
        getReleaseAsset: {
          endpoint: getReleaseAssetOptions
        }
      }
    };

    archivePath = path.join('testTmpDir', 'licensed.tar.gz');
    sinon.stub(fs.promises, 'mkdtemp').resolves('testTmpDir');
    sinon.stub(fs.promises, 'writeFile').resolves();
    sinon.stub(fs.promises, 'access').resolves();
    sinon.stub(fs.promises, 'unlink').resolves();
    sinon.stub(exec, 'exec').resolves();
    sinon.stub(io, 'which').resolves('testTar');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('installs licensed from an asset', async () => {
    archive = await fs.promises.readFile(archiveFixture, { encoding: "utf-8" });
    requestEndpoint.resolves({ status: 200, data: archive });
    
    await utils.installLicensedFromReleaseAsset(octokit, { id: 1 }, 'path/to/licensed');

    expect(getReleaseAssetOptions.merge.callCount).toEqual(1);
    expect(getReleaseAssetOptions.merge.getCall(0).args).toEqual([
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
    expect(fs.promises.writeFile.getCall(0).args).toEqual([archivePath, Buffer.from(archive)])
    
    expect(io.which.callCount).toEqual(1);
    expect(io.which.getCall(0).args).toEqual(['tar', true]);
    expect(fs.promises.access.callCount).toEqual(1);
    expect(fs.promises.access.getCall(0).args).toEqual(['path/to/licensed', fs.constants.W_OK]);
    expect(exec.exec.callCount).toEqual(1);
    expect(exec.exec.getCall(0).args).toEqual([
      'testTar',
      ['xzv', '-f', archivePath, '-C', 'path/to/licensed', './licensed']
    ]);

    expect(fs.promises.unlink.callCount).toEqual(1);
    expect(fs.promises.unlink.getCall(0).args).toEqual([archivePath]);
  });

  it('raises an error when downloading a release asset fails', async () => {
    requestEndpoint.resolves({ status: 500 });
    
    const promise = utils.installLicensedFromReleaseAsset(octokit, { id: 1 }, 'path/to/licensed');
    expect(promise).rejects.toThrow('Unable to download licensed');
  });
});
