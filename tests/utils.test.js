const fs = require('fs').promises;
const nock = require('nock');
const Octokit = require('@octokit/rest');
const path = require('path');
const semver = require('semver');

const utils = require('../lib/utils');
const releases = require('./fixtures/releases.json');
const dirtyReleases = require('./fixtures/dirty_releases.json');

const github = new Octokit();

describe('getReleases', () => {
  beforeEach(() => {
    nock('https://api.github.com')
      .get('/repos/github/licensed/releases')
      .reply(200, dirtyReleases);
  });

  it('lists releases from github/licensed', () => {
    return expect(utils.getReleases(github)).resolves.toBeInstanceOf(Array);
  });

  it('filters releases without any assets', async () => {
    const releases = await utils.getReleases(github);
    const release = releases.find((release) => release.tag_name === '2.3.1');
    expect(release).toBeUndefined();
  })

  it('filters releases with invalid semver tags', async () => {
    const releases = await utils.getReleases(github);
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
  const licensed = path.join(__dirname, 'licensed');
  const archiveFixture = path.join(__dirname, 'fixtures', 'licensed.tar.gz');
  let asset;

  beforeEach(() => {
    const release = utils.findReleaseForVersion(releases, '2.3.2');
    asset = utils.findReleaseAssetForPlatform(release, 'darwin');
  });

  afterEach(() => {
    fs.access(licensed)
      .then(() => fs.unlink(licensed))
      .catch(() => {});
  });

  it('installs licensed from an asset', async () => {
    nock('https://api.github.com')
      .get(`/repos/github/licensed/releases/assets/${asset.id}`)
      .replyWithFile(200, archiveFixture, { 'Content-Type': 'application/octet-stream' });

    await utils.installLicensedFromReleaseAsset(github, asset, path.dirname(licensed));
    await fs.access(licensed);
  });
});
