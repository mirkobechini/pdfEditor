# Silently prints one PNG per page to the given printer, entirely
# controlled by the app's own print dialog (no Windows/Edge UI shown).
param(
    [Parameter(Mandatory = $true)][string]$PrinterName,
    [Parameter(Mandatory = $true)][int]$Copies,
    # Passed as "1"/"0" rather than [bool]: PowerShell casts ANY non-empty
    # string (including the literal text "false") to $true, so a real [bool]
    # parameter can't be trusted from plain CLI args.
    [Parameter(Mandatory = $true)][string]$Color,
    [Parameter(Mandatory = $true)][string]$Orientation,
    [Parameter(Mandatory = $true)][double]$MarginMm,
    [Parameter(Mandatory = $true)][string[]]$ImagePaths
)

Add-Type -AssemblyName System.Drawing

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = $PrinterName
$doc.PrinterSettings.Copies = [int16]$Copies
$doc.DefaultPageSettings.Color = ($Color -eq "1")
$doc.DefaultPageSettings.Landscape = ($Orientation -eq "landscape")

$marginHundredthsInch = [int]([Math]::Round($MarginMm / 25.4 * 100))
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(
    $marginHundredthsInch, $marginHundredthsInch, $marginHundredthsInch, $marginHundredthsInch
)

$script:pageIndex = 0

$doc.add_PrintPage({
        param($sender, $e)
        $imagePath = $ImagePaths[$script:pageIndex]
        $img = [System.Drawing.Image]::FromFile($imagePath)
        try {
            $bounds = $e.MarginBounds
            $ratio = [Math]::Min($bounds.Width / $img.Width, $bounds.Height / $img.Height)
            $w = [int]($img.Width * $ratio)
            $h = [int]($img.Height * $ratio)
            $x = $bounds.X + [int](($bounds.Width - $w) / 2)
            $y = $bounds.Y + [int](($bounds.Height - $h) / 2)
            $e.Graphics.DrawImage($img, $x, $y, $w, $h)
        }
        finally {
            $img.Dispose()
        }
        $script:pageIndex++
        $e.HasMorePages = ($script:pageIndex -lt $ImagePaths.Count)
    })

$doc.Print()
