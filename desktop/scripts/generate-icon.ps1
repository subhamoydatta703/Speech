Add-Type -AssemblyName System.Drawing

function Build-Icon([string]$outDir) {
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir | Out-Null
    }

    $sizes = @(16, 24, 32, 48, 64, 128, 256)
    $pngStreams = @()

    foreach ($sz in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap $sz, $sz, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $g.Clear([System.Drawing.Color]::Transparent)

        # Draw circle #25392e
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 57, 46))
        $g.FillEllipse($brush, 0, 0, $sz, $sz)
        $brush.Dispose()

        # Draw rotated text #d3ed9a
        $center = $sz / 2.0
        $g.TranslateTransform($center, $center)
        $g.RotateTransform(-12)
        
        $fontSize = [float]($sz * 0.65)
        $font = New-Object System.Drawing.Font 'Arial', $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
        $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 211, 237, 154))
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

        $yOffset = [float]($sz * 0.02)
        $g.DrawString([char]0x25A5, $font, $textBrush, 0.0, $yOffset, $sf)

        $sf.Dispose()
        $textBrush.Dispose()
        $font.Dispose()
        $g.Dispose()

        # Save 256 size as PNG
        if ($sz -eq 256) {
            $pngPath = Join-Path $outDir "icon.png"
            $bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }

        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        $pngStreams += ,@($sz, $ms.ToArray())
        $ms.Dispose()
    }

    # Now write standard Windows ICO file with PNG streams
    # ICO Header: 6 bytes (2 reserved, 2 type=1, 2 count)
    $icoPath = Join-Path $outDir "icon.ico"
    $fs = [System.IO.File]::Create($icoPath)
    $bw = New-Object System.IO.BinaryWriter($fs)

    $count = $pngStreams.Count
    $bw.Write([uint16]0)     # Reserved
    $bw.Write([uint16]1)     # Type: 1 = ICO
    $bw.Write([uint16]$count)

    # Calculate offset after directory entries: 6 + 16 * count
    $offset = 6 + (16 * $count)

    foreach ($item in $pngStreams) {
        $sz = $item[0]
        $bytes = $item[1]

        $w = if ($sz -ge 256) { 0 } else { [byte]$sz }
        $h = if ($sz -ge 256) { 0 } else { [byte]$sz }
        $bw.Write([byte]$w)       # Width
        $bw.Write([byte]$h)       # Height
        $bw.Write([byte]0)        # Color count
        $bw.Write([byte]0)        # Reserved
        $bw.Write([uint16]1)      # Planes
        $bw.Write([uint16]32)     # Bit count
        $bw.Write([uint32]$bytes.Length) # Image size
        $bw.Write([uint32]$offset)       # Image offset

        $offset += $bytes.Length
    }

    # Write image data
    foreach ($item in $pngStreams) {
        $bytes = $item[1]
        $bw.Write($bytes)
    }

    $bw.Flush()
    $bw.Close()
    $fs.Close()

    Write-Output "Successfully created $icoPath and $(Join-Path $outDir 'icon.png')"
}

Build-Icon "e:\speech\desktop\resources"
Build-Icon "e:\speech\desktop\build"
