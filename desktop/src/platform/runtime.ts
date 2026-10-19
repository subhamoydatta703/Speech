import { access } from 'node:fs/promises';
import { join } from 'node:path';

/** The upstream Windows engine uses Microsoft's standard VC++ runtime. */
export async function windowsRuntimePresent() {
  const directory = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32');
  try {
    await Promise.all(['msvcp140.dll', 'vcruntime140.dll', 'vcruntime140_1.dll'].map(name => access(join(directory, name))));
    return true;
  } catch { return false; }
}
