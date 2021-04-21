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

    sinon.stub(installers, 'gem').resolves(version);
    sinon.stub(installers, 'exe').resolves(version);

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

  it('installs licensed from a gem', async () => {
    await run();
    expect(core.setFailed.callCount).toEqual(0);

    expect(core.info.callCount).toEqual(2);
    expect(core.info.getCall(0).args).toEqual([`attempting to install licensed gem matching "${version}"`]);
    expect(core.info.getCall(1).args).toEqual([`licensed (${version}) gem installed`]);

    expect(installers.gem.callCount).toEqual(1);
    expect(installers.gem.getCall(0).args).toEqual([version]);

    expect(installers.exe.callCount).toEqual(0);
  });

  it('installs licensed as a standalone executable if gem install failed', async () => {
    installers.gem.resolves(null);

    await run();
    expect(core.setFailed.callCount).toEqual(0);

    expect(core.info.callCount).toEqual(3);
    expect(core.info.getCall(0).args).toEqual([`attempting to install licensed gem matching "${version}"`]);
    expect(core.info.getCall(1).args).toEqual([`attempting to install licensed executable matching "${version}"`]);
    expect(core.info.getCall(2).args).toEqual([`licensed (${version}) executable installed`]);

    expect(installers.gem.callCount).toEqual(1);

    expect(installers.exe.callCount).toEqual(1);
    expect(installers.exe.getCall(0).args).toEqual([version]);
  });

  it('sets a failure when installation raises an error', async () => {
    installers.gem.rejects(new Error('test failure'));

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual(['test failure']);
  });

  it('sets a failure when installation fails', async () => {
    installers.gem.resolves(null);
    installers.exe.resolves(null);

    await run();
    expect(core.setFailed.callCount).toEqual(1);
    expect(core.setFailed.getCall(0).args).toEqual([`unable to install licensed matching "${version}"`]);
    expect(core.info.callCount).toEqual(2);
    expect(core.info.getCall(0).args).toEqual([`attempting to install licensed gem matching "${version}"`]);
    expect(core.info.getCall(1).args).toEqual([`attempting to install licensed executable matching "${version}"`]);
  });
});
