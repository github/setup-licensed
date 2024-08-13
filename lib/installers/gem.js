const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');

const utils = require('../utils');

async function getGemExecutable() {
  return await io.which('gem', false);
}

async function availableGemVersions(gemExe) {
  let listOutput = '';
  const options = {
    listeners: {
      stdout: data => listOutput += data.toString()
    }
  };

  await exec.exec(gemExe, ['list', 'licensed', '--exact', '--remote', '--all', '--quiet'], options);

  // Ensure that versions is not long enough to cause a timeout
  // See https://github.com/github/setup-licensed/security/code-scanning/1
  if (listOutput.length > 10000) {
    core.warning('`gem list licensed` output is too long');
    core.debug(listOutput);
    return [];
  }
  const versionsMatch = listOutput.match(/\((?<versions>([^,)]+(,\s)?)*)\)/);
  if (!versionsMatch || !versionsMatch.groups || !versionsMatch.groups.versions) {
    core.warning('no versions found from `gem list licensed`');
    core.debug(listOutput);
    return [];
  }

  return versionsMatch.groups.versions.split(',').map(v => v.trim());
}

async function install(version) {
  const gemExe = await module.exports.getGemExecutable();
  if (!gemExe) {
    core.info('rubygems environment not available');
    return null;
  }

  const gemVersions = await module.exports.availableGemVersions(gemExe);
  const gemVersion = utils.findVersion(gemVersions, version);
  if (!gemVersion) {
    core.info(`github/licensed (${version}) gem was not found`);
    return null;
  }

  try {
    await exec.exec(gemExe, ['install', 'licensed', '-v', gemVersion]);
    return gemVersion;
  } catch (e) {
    core.debug(e.message);
    return null;
  }
}

module.exports = {
  getGemExecutable,
  availableGemVersions,
  install
};
