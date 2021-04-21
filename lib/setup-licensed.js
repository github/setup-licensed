const core = require('@actions/core');
const installers = require('./installers');
const semver = require('semver');

async function run() {
  try {
    const version = core.getInput('version', { required: true });
    if (!semver.validRange(version)) {
      throw new Error(`${version} is not a valid semantic version input`);
    }

    // prefer installing licensed as a gem, otherwise install an exe
    core.info(`attempting to install licensed gem matching "${version}"`);
    let installedVersion = await installers.gem(version);
    if (installedVersion) {
      core.info(`licensed (${installedVersion}) gem installed`);
      return;
    }

    core.info(`attempting to install licensed executable matching "${version}"`);
    installedVersion = await installers.exe(version);
    if (installedVersion) {
      core.info(`licensed (${installedVersion}) executable installed`);
      return;
    }

    throw new Error(`unable to install licensed matching "${version}"`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
