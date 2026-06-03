# Publish @bvc-lang/spec and bvc-lang/spec

npm org **`bvc`** занят → scope **`@bvc-lang/spec`** (org `bvc-lang` on npm).

## 1. Prepare a patch release

Update:

- `package.json` version
- `index.js` `BVC_SPEC_VERSION`
- package docs (`README.md`, `spec/overview.md`) when public pages change
- `tests/bvcSpecPackage.test.mjs` expected version in Work Graph source

Run from the Work Graph repo root:

```bash
npm test -- tests/bvcConformance.test.mjs tests/bvcSpecPackage.test.mjs tests/bvcDualExtension.test.mjs
```

Then smoke the package:

```bash
cd packages/bvc-spec
npm pack --dry-run
```

## 2. npm publish

```bash
npm whoami
npm publish --access public
npm view @bvc-lang/spec version
```

## 3. GitHub `bvc-lang/spec`

Export the package mirror:

```bash
npm run export:bvc-spec-github
```

Copy or commit `dist/bvc-spec-github` into `github.com/bvc-lang/spec`, then push `main`.

```bash
git clone https://github.com/bvc-lang/spec.git ../bvc-lang-spec-publish
# copy exported files into the clone
cd ../bvc-lang-spec-publish
git add .
git commit -m "chore: release @bvc-lang/spec vX.Y.Z"
git push origin main
```

Create and push the tag:

```bash
git tag -a vX.Y.Z -m "@bvc-lang/spec vX.Y.Z"
git push origin vX.Y.Z
```

Create a GitHub Release from that tag and mark it as **Latest**.

## 4. Verify

```bash
npm view @bvc-lang/spec version
```

Check:

- https://www.npmjs.com/package/@bvc-lang/spec
- https://github.com/bvc-lang/spec/releases/latest
