const core = require('@actions/core');
const sinon = require('sinon');

const run = require('../lib/setup-licensed');
const installers = require('../lib/installers');

describe('setup-licensed', () => {
  const version = '2.3.2';

  const processEnv = process.env;

  beforeEach(() => {
    sinon.stub(core, 'setFailed');
    sinon.stub(core, 'addPath');
    sinon.stub(core, 'info');

    sinon.stub(installers, 'exe').resolves();

    process.env = {
      ...process.env,
      INPUT_VERSION: version,
    };
  });

  afterEach(() => {
    process.env = processEnv;
    sinon.restore();
  });

  it('sets a failure when a version is not given', async () => {
    delete process.env['INPUT_VERSION'];

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual(['Input required and not supplied: version']);
  });

  it('sets a failure when the version is invalid', async () => {
    process.env.INPUT_VERSION = 'abc';

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual(['abc is not a valid semantic version input']);
  });

  it('installs licensed as a standalone executable', async () => {
    await run();
    expect(core.setFailed.callCount).toEqual(0);

    expect(installers.exe.callCount).toEqual(1);
    expect(installers.exe.getCall(0).args).toEqual([version]);
  });

  it('sets a failure when installation raises an error', async () => {
    installers.exe.rejects(new Error('test failure'));

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual(['test failure']);
  });
});
