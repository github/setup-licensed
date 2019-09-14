const core = require('@actions/core');
const { exec } = require('@actions/exec');
const fs = require('fs').promises;
const io = require('@actions/io');
const path = require('path');
const os = require('os');
const stream = require('stream');

const wrapperScript = path.join(__dirname, 'fixtures', 'wrapper.js');

describe('setup-licensed', () => {
  const installDir = path.join(__dirname, 'install_dir');
  let outString;
  let options;

  beforeEach(() => {
    outString = '';
    options = {
      env: { ...process.env },
      ignoreReturnCode: true,
      listeners: {
        stdout: data => outString += data.toString() + os.EOL
      },
      outStream: new stream.Writable({ write: data => outString += data + os.EOL})
    };
  });

  afterEach(async () => {
    try {
      await io.rmRF(installDir)
    } catch { }
  });

  it('raises an error when a version is not given', async () => {
    options.env['INPUT_INSTALL-DIR'] = installDir;

    const exitCode = await exec('node', [wrapperScript], options);
    expect(exitCode).toEqual(core.ExitCode.Failure);
    expect(outString).toMatch('Input required and not supplied: version');
  });

  it('raises an error when an installation directory is not given', async () => {
    options.env['INPUT_VERSION'] = '2.3.2';

    const exitCode = await exec('node', [wrapperScript], options);
    expect(exitCode).toEqual(core.ExitCode.Failure);
    expect(outString).toMatch('Input required and not supplied: install-dir');
  });

  it('throws when version is invalid', async () => {
    options.env['INPUT_VERSION'] = 'abc';
    options.env['INPUT_INSTALL-DIR'] = installDir;

    const exitCode = await exec('node', [wrapperScript], options);
    expect(exitCode).toEqual(core.ExitCode.Failure);
    expect(outString).toMatch('abc is not a valid semantic version input');
  });

  it('throws when a release is not found', async() => {
    options.env['INPUT_VERSION'] = '0.0.1';
    options.env['INPUT_INSTALL-DIR'] = installDir;

    const exitCode = await exec('node', [wrapperScript], options);
    expect(exitCode).toEqual(core.ExitCode.Failure);
    expect(outString).toMatch('github/licensed (0.0.1) release was not found');
  });

  it('throws when a release asset is not found', async () => {
    options.env['INPUT_VERSION'] = '2.3.0';
    options.env['INPUT_INSTALL-DIR'] = installDir;

    const exitCode = await exec('node', [wrapperScript], options);
    expect(exitCode).toEqual(core.ExitCode.Failure);
    expect(outString).toMatch(`github/licensed (2.3.0-${os.platform()}) package was not found`);
  });

  it('runs', async () => {
    options.env['INPUT_VERSION'] = '2.3.2';
    options.env['INPUT_INSTALL-DIR'] = installDir;

    const exitCode = await exec('node', [wrapperScript], options);
    expect(exitCode).toEqual(core.ExitCode.Success);
    expect(outString).toMatch(`github/licensed (2.3.2-${os.platform()}) installed to ${installDir}`);
    await fs.access(path.join(installDir, 'licensed'));
  });
});
