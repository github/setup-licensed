module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete installedModules[moduleId];
/******/ 		}
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(526);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 22:
/***/ (function(module, __unusedexports, __webpack_require__) {

const core = __webpack_require__(990);
const exec = __webpack_require__(952);
const io = __webpack_require__(679);

const { findVersion } = __webpack_require__(611);

async function getGemExecutable() {
  return await io.which('gem', false);
}

async function availableGemVersions(gemExe) {
  const listOutput = await exec(gemExe, ['list', 'licensed', '--exact', '--remote', '--all', '--quiet']);
  // eslint-disable-next-line no-useless-escape
  const versionsMatch = listOutput.match(/\((?<versions>([\d\.]+(,\s)?)*)\)/g);
  if (!versionsMatch || !versionsMatch.groups.versions) {
    core.warn('no versions found from gem list licensed');
    core.debug(listOutput);
    return [];
  }

  return versionsMatch.groups.versions.split(',').map(v => v.trim());
}

async function install(gemExe, version) {
  core.info('rubygems environment detected, installing licensed gem');

  const gemVersions = await availableGemVersions(gemExe);
  const gemVersion = findVersion(gemVersions, version);
  if (!gemVersion) {
    throw new Error(`github/licensed (${version}) gem was not found`);
  }

  await exec(gemExe, ['install', 'licensed', '-v', version]);

  core.info(`github/licensed (${version}) gem installed`);
}

module.exports = {
  getGemExecutable,
  availableGemVersions,
  install
};


/***/ }),

/***/ 87:
/***/ (function(module) {

module.exports = require("os");

/***/ }),

/***/ 130:
/***/ (function(module, __unusedexports, __webpack_require__) {

const core = __webpack_require__(990);
const installers = __webpack_require__(480);

async function run() {
  try {
    const version = core.getInput('version', { required: true });

    // prefer installing licensed as a gem.  if that doesn't work, install the exe
    installers.gem(version) || installers.exe(version);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;


/***/ }),

/***/ 429:
/***/ (function(module) {

module.exports = eval("require")("semver");


/***/ }),

/***/ 480:
/***/ (function(module, __unusedexports, __webpack_require__) {

const { install: gemInstaller } = __webpack_require__(22);
const { install: exeInstaller } = __webpack_require__(793);

module.exports = {
  gem: gemInstaller,
  exe: exeInstaller
};


/***/ }),

/***/ 526:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const run = __webpack_require__(130);

run();


/***/ }),

/***/ 611:
/***/ (function(module, __unusedexports, __webpack_require__) {

const semver = __webpack_require__(429);

function findVersion(versions, wanted) {
  const found = versions.find(v => v == wanted);
  if (found) {
    return found;
  }

  return semver.maxSatisfying(
    versions.filter(v => semver.valid(v)),
    wanted
  );
}

module.exports = {
  findVersion
};


/***/ }),

/***/ 622:
/***/ (function(module) {

module.exports = require("path");

/***/ }),

/***/ 679:
/***/ (function(module) {

module.exports = eval("require")("@actions/io");


/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 793:
/***/ (function(module, __unusedexports, __webpack_require__) {

const core = __webpack_require__(990);
const exec = __webpack_require__(952);
const io = __webpack_require__(679);
const fs = __webpack_require__(747);
const path = __webpack_require__(622);
const os = __webpack_require__(87);
const semver = __webpack_require__(429);

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
};


/***/ }),

/***/ 952:
/***/ (function(module) {

module.exports = eval("require")("@actions/exec");


/***/ }),

/***/ 990:
/***/ (function(module) {

module.exports = eval("require")("@actions/core");


/***/ })

/******/ });