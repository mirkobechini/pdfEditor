Add-Type -AssemblyName System.Drawing
[System.Drawing.Printing.PrinterSettings]::InstalledPrinters | ForEach-Object { Write-Output $_ }
Write-Output "---DEFAULT---"
(New-Object System.Drawing.Printing.PrinterSettings).PrinterName
