/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { sysrootInfo } from './sysroots';

const DEFAULT_TARGET_VERSION = 'bullseye';
const URL_PREFIX = 'https://msftelectron.blob.core.windows.net';
const URL_PATH = 'sysroots/toolchain';
const VALID_ARCH_LIST = ['arm64', 'i386', 'amd64'];

function getSha(filename: fs.PathLike): string {
	const hash = createHash('sha1');
	// Read file 1 MB at a time
	const fd = fs.openSync(filename, 'r');
	const buffer = Buffer.alloc(1024 * 1024);
	let position = 0;
	let bytesRead = 0;
	while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, position)) === buffer.length) {
		hash.update(buffer);
		position += bytesRead;
	}
	hash.update(buffer.slice(0, bytesRead));
	return hash.digest('hex');
}

type SysrootDictEntry = {
	Sha1Sum: string;
	SysrootDir: string;
	Tarball: string;
};

function getSysrootDict(arch: string, versionName: string): SysrootDictEntry {
	if (!VALID_ARCH_LIST.includes(arch)) {
		throw new Error('Unknown arch ' + arch);
	}

	const sysroot_key = versionName + '_' + arch;
	if (!sysrootInfo[sysroot_key]) {
		throw new Error(`No sysroot for: ${versionName} ${arch}`);
	}
	return sysrootInfo[sysroot_key] as SysrootDictEntry;
}

export async function getSysroot(arch: string, versionName: string = DEFAULT_TARGET_VERSION): Promise<string> {
	const sysrootDict = getSysrootDict(arch, versionName);
	const tarballFilename = sysrootDict['Tarball'];
	const tarballSha = sysrootDict['Sha1Sum'];
	const sysroot = path.join(__dirname, sysrootDict['SysrootDir']);
	const url = [URL_PREFIX, URL_PATH, tarballSha, tarballFilename].join('/');
	const stamp = path.join(sysroot, '.stamp');
	if (fs.existsSync(stamp) && fs.readFileSync(stamp).toString() === url) {
		return sysroot;
	}

	console.log(`Installing Debian ${versionName} ${arch} root image: ${sysroot}`);
	if (fs.statSync(sysroot).isDirectory()) {
		console.log(sysroot);
		console.log('We\'re support to remove it at this point');
		// fs.rmSync(sysroot, { recursive: true, force: true });
	}
	fs.mkdirSync(sysroot);
	const tarball = path.join(sysroot, tarballFilename);
	console.log(`Downloading ${url}`);
	let downloadSuccess = false;
	for (let i = 0; i < 3; i++) {
		try {
			const response = new Promise<string>((c) => {
				http.get(url, (res) => {
					let chunkData = '';
					res.on('data', (chunk) => {
						chunkData += chunk.toString();
					});
					res.on('end', () => {
						c(chunkData);
					});
				});
			});
			fs.writeFileSync(tarball, await response);
			downloadSuccess = true;
		} catch (_) {
			// ignore
		}
	}
	if (!downloadSuccess) {
		throw new Error('Failed to download ' + url);
	}
	const sha = getSha(tarball);
	if (sha !== tarballSha) {
		throw new Error(`Tarball sha1sum is wrong. Expected ${tarballSha}, actual ${sha}`);
	}

	const proc = spawnSync('tar', ['xf', tarball, '-C', sysroot]);
	if (proc.status) {
		throw new Error('Tarball extraction failed with code ' + proc.status);
	}
	fs.rmSync(tarball);
	fs.writeFileSync(stamp, url);
	return sysroot;
}
