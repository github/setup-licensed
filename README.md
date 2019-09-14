# setup-licensed

This action sets up [github/licensed](https://github.com/github/licensed) for use in actions by installing a version of github/licensed and adding it to PATH.  Note that this action will overwrite any version of the github/licensed executable already installed at the `install-dir` input.

The action will fail if a github/licensed executable isn't found for the specified version or target platform.

# Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- uses: actions/checkout@master
- uses: jonabc/setup-licensed@v1
  with:
    version: '2.x' # required: must be valid semver
    install-dir: /path/to/install/at # optional: defaults to /usr/local/bin
- run: licensed list
```

For an end-to-end solution to cache and check dependency metadata using GitHub Actions, see [update_licenses.yaml](.github/workflows/update_licenses.yaml)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!
