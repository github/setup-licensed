const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const os = require('os');

const utils = require('../utils');

async function getReleases(github) {
  const data = await github.paginate(github.rest.repos.listReleases, {
    owner: 'github',
    repo: 'licensed'
  });

  const releases = data.map((release) => ({
    tag_name: release.tag_name,
    assets: release.assets.map((asset) => ({ id: asset.id, name: asset.name, state: asset.state }))
  }));

  return releases.filter((release) => release.assets.length > 0);
}

function findReleaseForVersion(releases, version) {
  const found = utils.findVersion(releases.map(r => r.tag_name), version);
  if (!found) {
    return null;
  }

  return releases.find(r => r.tag_name === found);
}

function findReleaseAssetForPlatform(release, platform) {
  return release.assets.filter((asset) => asset.state === 'uploaded')
                       .find((asset) => asset.name.includes(platform));
}

async function downloadLicensedArchive(github, asset) {
  const options = github.rest.repos.getReleaseAsset.endpoint.merge({
    headers: {
       Accept: "application/octet-stream"
    },
    owner: 'github',
    repo: 'licensed',
    asset_id: asset.id
  });

  const { data, status } = await github.request(options);

  if (status != 200) {
    throw new Error(`Unable to download licensed`);
  }

  const tempDir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
  const archivePath = path.join(tempDir, 'licensed.tar.gz');
  await fs.promises.writeFile(archivePath, Buffer.from(data));
  return archivePath;
}

async function extractLicensedArchive(archive, installDir) {
  try {
    let tar = await io.which('tar', true);
    await fs.promises.access(installDir, fs.constants.W_OK).catch(() => {
      tar = `sudo ${tar}`
    });
    await exec.exec(tar, ['xzv', '-f', archive, '-C', installDir, './licensed']);
  } finally {
    await fs.promises.unlink(archive);
  }
}

async function install(version) {
  const installDir = core.getInput('install-dir', { required: false });
  if (!installDir) {
    core.info('Input required and not supplied to install licensed executable: install-dir');
    return null;
  }

  const token = core.getInput('github_token', { required: false });
  const platform = os.platform();

  // splitting up requests to an authenticated and unauthenticated client
  // due to downloading a release asset using an authenticated client
  // raising errors.  see https://github.com/octokit/rest.js/issues/967
  const authenticatedGithub = new Octokit({ auth: token });
  const unauthenticatedGitHub = new Octokit();

  // using module.exports here so that these references are the same ones that
  // get used by tests, making stubbing possible
  const releases = await module.exports.getReleases(authenticatedGithub);
  const releaseForVersion = await module.exports.findReleaseForVersion(releases, version);
  if (!releaseForVersion) {
    core.info(`github/licensed (${version}) release was not found`);
    return null;
  }

  const licensedReleaseAsset = await module.exports.findReleaseAssetForPlatform(releaseForVersion, platform);
  if (!licensedReleaseAsset) {
    core.info(`github/licensed (${version}-${platform}) package was not found`);
    return null;
  }

  await io.mkdirP(installDir);
  const archivePath = await module.exports.downloadLicensedArchive(unauthenticatedGitHub, licensedReleaseAsset);
  await module.exports.extractLicensedArchive(archivePath, installDir);
  
  if (!process.env['PATH'].includes(installDir)) {
    core.addPath(installDir);
  }

  return releaseForVersion.tag_name;
}

module.exports = {
  getReleases,
  findReleaseForVersion,
  findReleaseAssetForPlatform,
  downloadLicensedArchive,
  extractLicensedArchive,
  install
};
