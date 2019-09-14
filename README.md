# setup-licensed

Set up [github/licensed](https://github.com/github/licensed) for use in actions.  Installs an executable for the specified `version` input and target platform.

The action will fail if an licensed package isn't available for the specified version and target platform.  Licensed is currently supported on macOS and linux platforms.

**Note**: this action will overwrite any version of the github/licensed executable already installed at the `install-dir` input.

# Usage

See [action.yml](action.yml)

list dependencies:
```yaml
steps:
- uses: actions/checkout@master
- uses: jonabc/setup-licensed@v1
  with:
    version: '2.x' # required: must satisfy semver.validRange
    install-dir: /path/to/install/at # optional: defaults to /usr/local/bin
- run: npm install # install dependencies in local environment
- run: licensed list
```

For an end-to-end solution to cache and check dependency metadata using GitHub Actions, see [update_licenses.yaml](.github/workflows/update_licenses.yaml)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!
