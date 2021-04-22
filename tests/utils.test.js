const utils = require('../lib/utils');

describe('findVersion', () => {
  const versions = [
    '2.3.2',
    'test-pre-release-version',
    '2.15.2',
    '2.9.2'
  ];

  it('matches a specific version', () => {
    expect(utils.findVersion(versions, '2.3.2')).toEqual('2.3.2');
  });

  it('matches a specific invalid semver version', () => {
    expect(utils.findVersion(versions, 'test-pre-release-version')).toEqual('test-pre-release-version');
  });

  it('matches a major.x version', () => {
    expect(utils.findVersion(versions, '2.x')).toEqual('2.15.2');
  });

  it('matches a major.minor.x version', () => {
    expect(utils.findVersion(versions, '2.9.x')).toEqual('2.9.2');
  });

  it('matches an empty string as latest version', () => {
    expect(utils.findVersion(versions, '')).toEqual('2.15.2');
  });

  it('returns null if a matching version isn\'t found', () => {
    expect(utils.findVersion(versions, '1.0.0')).toBeNull();
  });

  it('returns null if a matching invalid semver version isn\'t found', () => {
    expect(utils.findVersion(versions, 'invalid-semver-not-found')).toBeNull();
  });
});
