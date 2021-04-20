const core = require('@actions/core');
const installers = require('./installers');
const semver = require('semver');

async function run() {
  try {
    const version = core.getInput('version', { required: true });
    if (!semver.validRange(version)) {
      throw new Error(`${version} is not a valid semantic version input`);
    }

    // prefer installing licensed as a gem.  if that doesn't work, install the exe
    await installers.exe(version);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
