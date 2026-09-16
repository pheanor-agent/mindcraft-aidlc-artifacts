#define UNICODE
#define _UNICODE
#include <windows.h>
#include <wincred.h>
#include <io.h>
#include <fcntl.h>
#include <wchar.h>
#include <stdio.h>
#include <stdlib.h>

static int valid_target(const wchar_t *target) {
  return target && wcsncmp(target, L"MindCraft/profile/", 18) == 0 && wcslen(target) < 256;
}

static int fail(DWORD code) {
  fwprintf(stderr, L"WINCRED_ERROR:%lu\n", code);
  return code ? (int)(code & 0xff) : 1;
}

int wmain(int argc, wchar_t **argv) {
  if (argc != 3 || !valid_target(argv[2])) return fail(ERROR_INVALID_PARAMETER);
  const wchar_t *op = argv[1], *target = argv[2];
  if (wcscmp(op, L"put") == 0) {
    _setmode(_fileno(stdin), _O_BINARY);
    unsigned char *blob = malloc(CRED_MAX_CREDENTIAL_BLOB_SIZE);
    if (!blob) return fail(ERROR_OUTOFMEMORY);
    size_t size = fread(blob, 1, CRED_MAX_CREDENTIAL_BLOB_SIZE, stdin);
    if (!size || !feof(stdin)) { SecureZeroMemory(blob, CRED_MAX_CREDENTIAL_BLOB_SIZE); free(blob); return fail(ERROR_INVALID_DATA); }
    CREDENTIALW cred = {0};
    cred.Type = CRED_TYPE_GENERIC; cred.TargetName = (LPWSTR)target; cred.CredentialBlobSize = (DWORD)size;
    cred.CredentialBlob = blob; cred.Persist = CRED_PERSIST_LOCAL_MACHINE; cred.UserName = L"MindCraft";
    BOOL ok = CredWriteW(&cred, 0); DWORD code = ok ? ERROR_SUCCESS : GetLastError();
    SecureZeroMemory(blob, CRED_MAX_CREDENTIAL_BLOB_SIZE); free(blob);
    return ok ? 0 : fail(code);
  }
  if (wcscmp(op, L"get") == 0) {
    PCREDENTIALW cred = NULL;
    if (!CredReadW(target, CRED_TYPE_GENERIC, 0, &cred)) return fail(GetLastError());
    _setmode(_fileno(stdout), _O_BINARY);
    size_t wrote = fwrite(cred->CredentialBlob, 1, cred->CredentialBlobSize, stdout);
    BOOL ok = wrote == cred->CredentialBlobSize;
    CredFree(cred);
    return ok ? 0 : fail(ERROR_WRITE_FAULT);
  }
  if (wcscmp(op, L"delete") == 0) {
    if (!CredDeleteW(target, CRED_TYPE_GENERIC, 0)) {
      DWORD code = GetLastError(); if (code != ERROR_NOT_FOUND) return fail(code);
    }
    return 0;
  }
  return fail(ERROR_INVALID_PARAMETER);
}
