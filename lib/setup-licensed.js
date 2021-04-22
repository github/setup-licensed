const core = require('@actions/core');
const installers = require('./installers');

async function run() {
  try {
    const version = core.getInput('version', { required: true });

    // prefer installing licensed as a gem, otherwise install an exe
    core.info(`attempting to install licensed gem matching "${version}"`);
    let installedVersion = await installers.gem(version);
    if (installedVersion) {
      core.info(`licensed (${installedVersion}) gem installed`);
      return;
    }
    core.info('gem installation was not successful');

    core.info(`attempting to install licensed executable matching "${version}"`);
    installedVersion = await installers.exe(version);
    if (installedVersion) {
      core.info(`licensed (${installedVersion}) executable installed`);
      return;
    }
    core.info('exe installation was not successful');

    throw new Error(`unable to install licensed matching "${version}"`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
