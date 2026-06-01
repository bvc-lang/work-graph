# Publish @bvc-lang/spec and bvc-lang/spec (manual)

npm org **`bvc`** занят → scope **`@bvc-lang/spec`** (org `bvc-lang` on npm).

## 1. npm `@bvc-lang/spec@0.0.0`

```bash
cd packages/bvc-spec
npm pack          # smoke: tarball bvc-lang-spec-0.0.0.tgz
npm login         # one-time, or granular token for org bvc-lang
npm publish --access public
npm view @bvc-lang/spec version
```

Проверка из корня репо: `npm run pack:bvc-spec`

## 2. GitHub `bvc-lang/spec`

1. Создать org **bvc-lang** (или user repo `bvc-lang/spec`).
2. Экспорт bundle из Work Graph:

```bash
npm run export:bvc-spec-github
```

3. В новом repo:

```bash
cd dist/bvc-spec-github
git init
git add .
git commit -m "chore: initial @bvc/spec placeholder v0.0.0"
git remote add origin git@github.com:bvc-lang/spec.git
git push -u origin main
```

4. Включить Discussions для RFC.
5. Обновить `repository.url` в `package.json` если URL отличается.

## 3. После публикации

- Закрыть work items: `reserve-bvc-spec-npm-package`, `reserve-bvc-github-org`
- Отметить чеклисты в `docs/plan-step-to-bvc-migration.md` фаза 0
- Обновить `docs/adr-bvc-format-naming.md` критерии v1
