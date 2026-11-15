import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}
test('domínio e aplicação não dependem de React, Expo, dados ou apresentação', () => {
  for (const file of [...files('src/domain'), ...files('src/application')]) {
    const imports = [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    for (const source of imports) {
      assert.ok(!/react|expo|presentation|composition|data\//.test(source), `${file}: ${source}`);
    }
  }
});
test('telas não acessam armazenamento nem implementações externas', () => {
  for (const file of files('src/presentation')) {
    const source = readFileSync(file, 'utf8');
    assert.ok(!/from\s+['"][^'"]*(async-storage|\/data\/|\/composition\/)/.test(source), file);
  }
});
