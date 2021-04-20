const exec = require('@actions/exec');
const io = require('@actions/io');
const fs = require('fs');
const path = require('path');
const os = require('os');
const semver = require('semver');

async function getReleases(github) {
  const { data } = await github.repos.listReleases({
    owner: 'github',
    repo: 'licensed'
  });

  const releases = data.map((release) => ({
    tag_name: release.tag_name,
    assets: release.assets.map((asset) => ({ id: asset.id, name: asset.name, state: asset.state }))
  }));

  return releases.filter((release) => release.assets.length > 0 && semver.valid(release.tag_name));
}

function findReleaseForVersion(releases, version) {
  const versions = releases.map((release) => release.tag_name);
  const foundVersion = semver.maxSatisfying(versions, version);
  if (!foundVersion) {
    return null;
  }

  return releases.find((release) => release.tag_name === foundVersion);
}

function findReleaseAssetForPlatform(release, platform) {
  return release.assets.filter((asset) => asset.state === 'uploaded')
                       .find((asset) => asset.name.includes(platform));
}

async function _downloadLicensedArchive(github, asset) {
  const options = github.repos.getReleaseAsset.endpoint.merge({
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

async function _extractLicensedArchive(archive, installDir) {
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

async function installLicensedFromReleaseAsset(github, asset, installDir) {
  const archivePath = await _downloadLicensedArchive(github, asset);
  await _extractLicensedArchive(archivePath, installDir);
}

module.exports = {
  getReleases,
  findReleaseForVersion,
  findReleaseAssetForPlatform,
  installLicensedFromReleaseAsset
}
