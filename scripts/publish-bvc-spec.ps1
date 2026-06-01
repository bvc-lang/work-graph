# One-shot: set npm token (hidden input) and publish @bvc-lang/spec
# Run in YOUR PowerShell — token stays local, not sent to chat/agent.
$ErrorActionPreference = 'Stop'

Write-Host 'Paste npm granular token (with Bypass 2FA enabled), then Enter:'
$secure = Read-Host -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if (-not $token) {
  Write-Error 'Empty token'
}

npm config set "//registry.npmjs.org/:_authToken=$token"
Write-Host "npm whoami: $(npm whoami)"

Set-Location "$PSScriptRoot\..\packages\bvc-spec"
npm publish --access public
npm view "@bvc-lang/spec" version
