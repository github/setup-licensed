# setup-licensed

**Please note: This action is deprecated and should no longer be used. The team at GitHub has ceased making and accepting code contributions or maintaining issues tracker. Please migrate your workflows to the [licensee/setup-licensed](https://github.com/licensee/setup-licensed) action, which is maintained by the community.**

A GitHub Action to set up [github/licensed](https://github.com/github/licensed) for use in action workflows, at the specified `version` input and target platform.  The action will fail if licensed isn't available for the specified version and target platform.

## Installing licensed as a Ruby gem

Installing licensed as a Ruby gem requires an Actions environment that supports `gem install`.  The default system Ruby installation that is available in GitHub Actions runners does not support user-installed gems.  Please use [ruby/setup-ruby](https://github.com/ruby/setup-ruby) or a similar action in your workflow before using this action in order to install licensed as a Ruby gem.

## Installing licensed as an executable

**Licensed is not available as an executable for any version >= 4.0.  Please install licensed as a Ruby gem for these versions**

Licensed executables are provided for macOS and linux platforms.  When installing a licensed executable, this action will overwrite any version of the executable already installed at the `install-dir` input.

Installing licensed as an executable requires making API calls to GitHub which can be rate limited and significantly slow down a GitHub Action workflow run.  Rate limiting is more likely to happen when using `${{ secrets.GITHUB_TOKEN }}` for the `github_token` input or when leaving the `github_token` input empty.  If you are hitting frequent rate limiting and long action runtimes, please set `github_token` to a user PAT or install licensed as a Ruby gem.

## Usage

See [action.yml](action.yml)

list dependencies:

```yaml
steps:
- uses: actions/checkout@v3

# setup application environment
- uses: actions/setup-node@v3
- run: npm install # install dependencies in local environment

# setup ruby environment before running github/setup-licensed
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: ruby

- uses: github/setup-licensed@v1
  with:
    version: '4.x' # required: supports matching based on string equivalence or node-semver range
    install-dir: /path/to/install/at # optional: defaults to /usr/local/bin
    github_token: # optional: allows users to make authenticated requests to GitHub's APIs

- run: licensed list
```

For an end-to-end solution to cache and check dependency metadata using GitHub Actions, see [licensed-ci.yaml](.github/workflows/licensed-ci.yaml)

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

## Maintainers

- @ajhenry
- @lumaxis

## Support

You can expect the following support.  See [SUPPORT](SUPPORT.md) for more information.

- bug fixes
- review of feature request issues
- review of questions in [github/licensed Discussions](https://github.com/github/licensed/discussions)

## Contributions

Contributions are welcome!  See [CONTRIBUTING.md](./CONTRIBUTING.md) for more information on how to get involved.

## Acknowledgement

Huge thank you and appreciation to @jonabc for championing license compliance and maintaining licensed over the years.
