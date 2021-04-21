const semver = require('semver');

function findVersion(versions, wanted) {
  const found = versions.find(v => v == wanted);
  if (found) {
    return found;
  }

  if (!semver.validRange(wanted)) {
    return null;
  }

  return semver.maxSatisfying(
    versions.filter(v => semver.valid(v)),
    wanted
  );
}

module.exports = {
  findVersion
};
