# setup-licensed

Set up [github/licensed](https://github.com/github/licensed) for use in action workflows, at the specified `version` input and target platform.. The action will install the licensed gem in environments that support rubygems, or an executable when rubygems isn't available.

The action will fail if licensed isn't available for the specified version and target platform.  Licensed is currently supported on macOS and linux platforms.

**Note**: When installing a licensed executable, this action will overwrite any version of the executable already installed at the `install-dir` input.

## Usage

See [action.yml](action.yml)

list dependencies:

```yaml
steps:
- uses: actions/checkout@v2
  with:
    fetch-depth: 0 # prefer to use a full fetch for licensed workflows
- uses: jonabc/setup-licensed@v1
  with:
    version: '2.x' # required: supports matching based on string equivalence or node-semver range
    install-dir: /path/to/install/at # optional: defaults to /usr/local/bin
    github_token: # optional: allows users to make authenticated requests to GitHub's APIs
- run: npm install # install dependencies in local environment
- run: licensed list
```

For an end-to-end solution to cache and check dependency metadata using GitHub Actions, see [update_licenses.yaml](.github/workflows/update_licenses.yaml)

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

## Contributions

Contributions are welcome!
