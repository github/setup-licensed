const core = require('@actions/core');
const io = require('@actions/io');
const Octokit = require('@octokit/rest');
const os = require('os');
const semver = require('semver');

const utils = require('./utils');

async function run() {
  try {
    const version = core.getInput('version', { required: true });
    const installDir = core.getInput('install-dir', { required: true });
    const token = core.getInput('github_token', { required: false });
    const platform = os.platform();

    const github = new Octokit({ auth: token });

    if (!semver.validRange(version)) {
      throw new Error(`${version} is not a valid semantic version input`);
    }

    const releases = await utils.getReleases(github);
    const releaseForVersion = await utils.findReleaseForVersion(releases, version);
    if (!releaseForVersion) {
      throw new Error(`github/licensed (${version}) release was not found`);
    }

    const licensedReleaseAsset = await utils.findReleaseAssetForPlatform(releaseForVersion, platform);
    if (!licensedReleaseAsset) {
      throw new Error(`github/licensed (${version}-${platform}) package was not found`);
    }

    await io.mkdirP(installDir);
    await utils.installLicensedFromReleaseAsset(github, licensedReleaseAsset, installDir);

    if (!process.env['PATH'].includes(installDir)) {
      core.addPath(installDir);
    }

    console.log(`github/licensed (${version}-${platform}) installed to ${installDir}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
