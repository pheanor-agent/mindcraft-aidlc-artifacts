Unicode true
RequestExecutionLevel user
Name "MindCraft"
OutFile "..\dist\MindCraft-0.1.0-win-x64-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\MindCraft"
InstallDirRegKey HKCU "Software\MindCraft" "InstallDir"
ShowInstDetails show
ShowUninstDetails show

Page directory
Page components
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles

Section "MindCraft (required)" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"
  File "..\dist\windows-package\MindCraft.exe"
  SetOutPath "$INSTDIR\current"
  File /r "..\dist\windows-package\current\*"
  WriteRegStr HKCU "Software\MindCraft" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MindCraft" "DisplayName" "MindCraft"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MindCraft" "DisplayVersion" "0.1.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MindCraft" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\MindCraft"
  CreateShortcut "$SMPROGRAMS\MindCraft\MindCraft.lnk" "$INSTDIR\MindCraft.exe"
  CreateShortcut "$SMPROGRAMS\MindCraft\Uninstall MindCraft.lnk" "$INSTDIR\Uninstall.exe"
SectionEnd

Section /o "Desktop shortcut" SecDesktop
  CreateShortcut "$DESKTOP\MindCraft.lnk" "$INSTDIR\MindCraft.exe"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\MindCraft.lnk"
  Delete "$SMPROGRAMS\MindCraft\MindCraft.lnk"
  Delete "$SMPROGRAMS\MindCraft\Uninstall MindCraft.lnk"
  RMDir "$SMPROGRAMS\MindCraft"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MindCraft"
  DeleteRegKey HKCU "Software\MindCraft"
  RMDir /r "$INSTDIR\current"
  Delete "$INSTDIR\MindCraft.exe"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  ; Intentionally preserve $LOCALAPPDATA\MindCraft and every workspace.
SectionEnd
