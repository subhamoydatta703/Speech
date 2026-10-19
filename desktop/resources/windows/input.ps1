$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class SpeechInput {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr handle, out uint processId);
  [DllImport("user32.dll", SetLastError=true)] static extern uint SendInput(uint count, INPUT[] inputs, int size);
  [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public UNION value; }
  [StructLayout(LayoutKind.Explicit)] struct UNION { [FieldOffset(0)] public KEYBOARD keyboard; [FieldOffset(0)] public MOUSE mouse; }
  [StructLayout(LayoutKind.Sequential)] struct KEYBOARD { public ushort key, scan; public uint flags, time; public UIntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] struct MOUSE { public int x,y; public uint data,flags,time; public UIntPtr extra; }
  static INPUT Key(ushort key, bool up) { return new INPUT { type=1, value=new UNION { keyboard=new KEYBOARD { key=key, flags=up ? 2u : 0u } } }; }
  public static bool Paste(long target) {
    if (GetForegroundWindow().ToInt64()!=target) return false;
    INPUT[] keys = { Key(0x11,false), Key(0x56,false), Key(0x56,true), Key(0x11,true) };
    return SendInput(4, keys, Marshal.SizeOf(typeof(INPUT)))==4;
  }
}
'@
while ($line = [Console]::ReadLine()) {
  try {
    $request = $line | ConvertFrom-Json
    if ($request.action -eq 'capture') {
      $handle = [SpeechInput]::GetForegroundWindow()
      [uint32]$owner = 0
      [void][SpeechInput]::GetWindowThreadProcessId($handle, [ref]$owner)
      $result = @{ handle = $handle.ToInt64().ToString(); processId = $owner }
    } elseif ($request.action -eq 'paste') {
      $result = @{ inserted = [SpeechInput]::Paste([long]$request.handle) }
    } else { throw 'Invalid input action' }
    [Console]::WriteLine((@{ id=$request.id; result=$result } | ConvertTo-Json -Compress))
  } catch { [Console]::WriteLine((@{ id=$request.id; error='Windows input is unavailable.' } | ConvertTo-Json -Compress)) }
}
