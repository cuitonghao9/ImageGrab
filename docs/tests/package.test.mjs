import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(docs, '..');
const archive = readFileSync(path.join(docs, 'assets', 'ImageGrab.zip'));

function entriesFromZip(bytes) {
  let end = -1;
  for (let cursor = bytes.length - 22; cursor >= Math.max(0, bytes.length - 65557); cursor -= 1) {
    if (bytes.readUInt32LE(cursor) === 0x06054b50) { end = cursor; break; }
  }
  assert.notEqual(end, -1, 'ZIP end-of-central-directory record exists');
  const entryCount = bytes.readUInt16LE(end + 10);
  const centralOffset = bytes.readUInt32LE(end + 16);
  const output = new Map();
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(bytes.readUInt32LE(cursor), 0x02014b50, 'central-directory entry signature');
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    cursor += 46 + nameLength + extraLength + commentLength;

    assert.ok(!output.has(name), `no duplicate ZIP entry: ${name}`);
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
    const contents = method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed) : null;
    assert.ok(contents, `supported compression method for ${name}`);
    assert.equal(contents.length, uncompressedSize, `valid uncompressed length for ${name}`);
    output.set(name, contents);
  }
  return output;
}

function filesInDirectory(directory, relative = '') {
  return readdirSync(path.join(directory, relative)).flatMap((name) => {
    const item = path.join(relative, name);
    const absolute = path.join(directory, item);
    return statSync(absolute).isDirectory() ? filesInDirectory(directory, item) : [item.replaceAll('\\', '/')];
  });
}

test('下载 ZIP 在根目录包含 manifest 和全部 dist 文件', () => {
  assert.equal(archive.toString('ascii', 0, 2), 'PK');
  const entries = entriesFromZip(archive);
  assert.ok(entries.has('manifest.json'), 'manifest.json is at the archive root');

  const manifest = JSON.parse(entries.get('manifest.json').toString('utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.ok(entries.has(manifest.background.service_worker));
  for (const contentScript of manifest.content_scripts ?? []) {
    for (const filename of contentScript.js) assert.ok(entries.has(filename), filename);
  }

  const dist = path.join(root, 'dist');
  const files = filesInDirectory(dist);
  assert.deepEqual([...entries.keys()].sort(), files.sort());
  for (const filename of files) {
    const local = readFileSync(path.join(dist, filename));
    assert.equal(createHash('sha256').update(entries.get(filename)).digest('hex'), createHash('sha256').update(local).digest('hex'), filename);
  }
});
