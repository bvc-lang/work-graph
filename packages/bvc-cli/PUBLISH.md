# Publish @bvc-lang/cli

## Pre-flight

From repo root:

```bash
npm run sync:bvc-cli-lib
npm run verify:bvc-cli-publish
node --test tests/bvcFormatCli.test.mjs
```

## npm

```bash
cd packages/bvc-cli
npm publish --access public
```

Requires npm login with access to org **bvc-lang**.

## GitHub (bvc-lang/cli)

```bash
npm run export:bvc-cli-github
```

Push contents of `dist/bvc-cli-github/` to https://github.com/bvc-lang/cli (create repo in org if missing — or `npm run export:bvc-cli-github` then push).

Tag: `v0.1.3` aligned with `package.json` version.

## Verify after publish

```bash
npm view @bvc-lang/cli version
npx @bvc-lang/cli lint --help
```
