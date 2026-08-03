Set WshShell = WScript.CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut(WScript.Arguments(0))
oShellLink.TargetPath = WScript.Arguments(1)
oShellLink.WorkingDirectory = WScript.Arguments(2)
oShellLink.WindowStyle = 1
oShellLink.Description = "财务工具启动器"
oShellLink.Save
