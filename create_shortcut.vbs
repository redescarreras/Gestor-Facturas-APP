' Acceso Directo para Gestor de Facturas
' Haz doble clic en este archivo para crear acceso directo en el escritorio

Set oWS = WScript.CreateObject("WScript.Shell")
sDesktop = oWS.SpecialFolders("Desktop")
sAppData = oWS.SpecialFolders("AppData")
sInstallDir = sAppData & "\..\..\GestorFacturas"

Set oLnk = oWS.CreateShortcut(sDesktop & "\Gestor de Facturas.lnk")
oLnk.TargetPath = sInstallDir & "\index.html"
oLnk.WorkingDirectory = sInstallDir
oLnk.Description = "Gestor de Facturas - Control Financiero"
oLnk.Save

MsgBox "Acceso directo creado en el escritorio!", 0, "Gestor de Facturas"
