const path = require('path');
const nock = require('nock');
const archiveFixture = path.join(__dirname, 'licensed.tar.gz');
const releases = require('./releases.json');

// wrapper script exists solely to mock http calls
nock('https://api.github.com')
  .get(/\/repos\/github\/licensed\/releases\/assets\/\d+/)
  .replyWithFile(200, archiveFixture, { 'Content-Type': 'application/octet-stream' })
  .get('/repos/github/licensed/releases')
  .reply(200, releases);

require('../../lib/index');
