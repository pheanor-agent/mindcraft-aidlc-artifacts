#define UNICODE
#define _UNICODE
#include <windows.h>
#include <wchar.h>
#include <stdio.h>

#define MAX_CMD 32768

static int append_quoted(wchar_t *dst, size_t cap, const wchar_t *arg) {
  size_t n = wcslen(dst), slashes = 0;
  if (n + 3 >= cap) return 0;
  dst[n++] = L'"';
  for (; *arg; ++arg) {
    if (*arg == L'\\') { slashes++; continue; }
    if (*arg == L'"') {
      while (slashes--) { if (n + 2 >= cap) return 0; dst[n++] = L'\\'; dst[n++] = L'\\'; }
      if (n + 2 >= cap) return 0; dst[n++] = L'\\'; dst[n++] = L'"';
    } else {
      while (slashes--) { if (n + 1 >= cap) return 0; dst[n++] = L'\\'; }
      if (n + 1 >= cap) return 0; dst[n++] = *arg;
    }
    slashes = 0;
  }
  while (slashes--) { if (n + 2 >= cap) return 0; dst[n++] = L'\\'; dst[n++] = L'\\'; }
  if (n + 2 >= cap) return 0; dst[n++] = L'"'; dst[n] = 0;
  return 1;
}

static int exists_file(const wchar_t *path) {
  DWORD a = GetFileAttributesW(path);
  return a != INVALID_FILE_ATTRIBUTES && !(a & FILE_ATTRIBUTE_DIRECTORY);
}

static void show_error(const wchar_t *message, DWORD code) {
  wchar_t body[1024];
  _snwprintf(body, 1024, L"%ls\n\nError code: %lu\nReinstall MindCraft or run diagnostics.", message, code);
  fwprintf(stderr, L"MindCraft launcher: %ls (%lu)\n", message, code);
  if (GetConsoleWindow() == NULL) MessageBoxW(NULL, body, L"MindCraft launcher", MB_OK | MB_ICONERROR);
}

int wmain(int argc, wchar_t **argv) {
  wchar_t launcher[MAX_PATH], root[MAX_PATH], runtime[MAX_PATH], entry[MAX_PATH], manifest[MAX_PATH];
  DWORD len = GetModuleFileNameW(NULL, launcher, MAX_PATH);
  if (!len || len == MAX_PATH) { show_error(L"Cannot locate launcher", GetLastError()); return 10; }
  wcscpy(root, launcher);
  wchar_t *slash = wcsrchr(root, L'\\');
  if (!slash) { show_error(L"Invalid launcher path", 0); return 11; }
  *slash = 0;
  _snwprintf(runtime, MAX_PATH, L"%ls\\current\\runtime\\node.exe", root);
  _snwprintf(entry, MAX_PATH, L"%ls\\current\\app\\src\\cli.mjs", root);
  _snwprintf(manifest, MAX_PATH, L"%ls\\current\\release-manifest.json", root);
  if (!exists_file(manifest)) { show_error(L"release-manifest.json is missing", ERROR_FILE_NOT_FOUND); return 12; }
  if (!exists_file(runtime)) { show_error(L"Bundled node.exe is missing", ERROR_FILE_NOT_FOUND); return 13; }
  if (!exists_file(entry)) { show_error(L"MindCraft application entry is missing", ERROR_FILE_NOT_FOUND); return 14; }

  wchar_t command[MAX_CMD] = L"";
  if (!append_quoted(command, MAX_CMD, runtime) || wcscat_s(command, MAX_CMD, L" ") != 0 || !append_quoted(command, MAX_CMD, entry)) {
    show_error(L"Launcher command is too long", ERROR_BUFFER_OVERFLOW); return 15;
  }
  for (int i = 1; i < argc; ++i) {
    if (wcslen(command) + 2 >= MAX_CMD || wcscat_s(command, MAX_CMD, L" ") != 0 || !append_quoted(command, MAX_CMD, argv[i])) {
      show_error(L"Launcher arguments are too long", ERROR_BUFFER_OVERFLOW); return 16;
    }
  }

  STARTUPINFOW si = {0}; PROCESS_INFORMATION pi = {0};
  si.cb = sizeof(si);
  HANDLE job = CreateJobObjectW(NULL, NULL);
  if (!job) { show_error(L"Cannot create process Job Object", GetLastError()); return 17; }
  JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = {0};
  limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
  if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, &limits, sizeof(limits))) {
    show_error(L"Cannot configure process Job Object", GetLastError()); CloseHandle(job); return 18;
  }
  if (!CreateProcessW(runtime, command, NULL, NULL, TRUE, CREATE_UNICODE_ENVIRONMENT | CREATE_SUSPENDED, NULL, root, &si, &pi)) {
    show_error(L"Cannot start bundled runtime", GetLastError()); CloseHandle(job); return 19;
  }
  if (!AssignProcessToJobObject(job, pi.hProcess)) {
    show_error(L"Cannot attach runtime to Job Object", GetLastError()); TerminateProcess(pi.hProcess, 20); CloseHandle(pi.hThread); CloseHandle(pi.hProcess); CloseHandle(job); return 20;
  }
  ResumeThread(pi.hThread); CloseHandle(pi.hThread);
  WaitForSingleObject(pi.hProcess, INFINITE);
  DWORD exit_code = 1;
  GetExitCodeProcess(pi.hProcess, &exit_code);
  CloseHandle(pi.hProcess); CloseHandle(job);
  return (int)exit_code;
}
