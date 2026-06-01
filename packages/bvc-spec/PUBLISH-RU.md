# Публикация @bvc-lang/spec — пошагово (аккаунт diflux)

Org **`bvc`** на npm занята → используем **`bvc-lang`** (совпадает с GitHub org).

## 1. Токен (вы уже почти сделали)

На https://www.npmjs.com/settings/diflux/tokens:

- **Packages:** Read and write  
- **Organizations:** Read and write → **`bvc-lang`** ✓  
- **Generate token** → скопировать (один раз)

## 2. Терминал (токен не в чат)

```powershell
npm config set //registry.npmjs.org/:_authToken=ВАШ_ТОКЕН
npm whoami
```

Должно: `diflux`

## 3. Publish

```powershell
cd "D:\Work\IDE\work graph"
npm run verify:bvc-publish

cd packages\bvc-spec
npm publish --access public
npm view "@bvc-lang/spec" version
```

Ожидается: `0.0.0`

Проверка в браузере: https://www.npmjs.com/package/@bvc-lang/spec

## 4. GitHub bvc-lang/spec

```powershell
cd "D:\Work\IDE\work graph"
npm run export:bvc-spec-github
cd dist\bvc-spec-github
git init
git add .
git commit -m "chore: initial @bvc-lang/spec placeholder v0.0.0"
git branch -M main
git remote add origin https://github.com/bvc-lang/spec.git
git push -u origin main
```

## Частые ошибки

| Ошибка | Решение |
|--------|---------|
| `ENEEDAUTH` | Шаг 2 — токен в терминал |
| `402` | Добавьте `--access public` |
| `403` … **2FA** / **bypass 2fa** | Пересоздайте granular token с галочкой **Bypass two-factor authentication** или включите 2FA и `npm publish --access public --otp=КОД` |

После успеха напишите «опубликовал» — закроем work items в бэклоге.
