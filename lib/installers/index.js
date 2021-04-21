const { install: gemInstaller } = require('./gem');
const { install: exeInstaller } = require('./exe');

module.exports = {
  gem: gemInstaller,
  exe: exeInstaller
};
