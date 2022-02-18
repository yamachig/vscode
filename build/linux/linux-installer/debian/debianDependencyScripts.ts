/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { spawnSync } from 'child_process';

export function calculatePackageDeps(binaryPath: string, sysrootPath: string, arch: string): PackageVersionInterval[] {
	const shlibDepsFile = 'third_party/dpkg-shlibdeps/dpkg-shlibdeps.pl';
	const shlibDepsArgs: string[] = [];
	shlibDepsArgs.push(`-l${sysrootPath}/usr/lib`, '-O', '-e', binaryPath);
	const result = spawnSync(shlibDepsFile, shlibDepsArgs);
	if (result.status !== 0) {
		throw new Error(`dpkg-shlibdeps failed with exit code ${result.status}.\nstderr: ${result.stderr}`)
	}

	const stdout = result.stdout.toString('utf-8');
	const SHLIBS_DEPENDS_PREFIX = 'shlibs:Depends=';
	let depsStr = '';
	for (const line of stdout.split('\n')) {
		if (line.startsWith(SHLIBS_DEPENDS_PREFIX)) {
			depsStr = line.substring(SHLIBS_DEPENDS_PREFIX.length);
		}
	}
	const dependencies = depsStr.split(', ');
	const intervals: PackageVersionInterval = [];
	if (depsStr.length) {
		for (const dependency of dependencies) {
			intervals.push(parseInterval(dependency));
		}
	}
	return intervals;
}

export function mergePackageDeps(dependencySets: PackageVersionInterval[][]): PackageVersionInterval[] {
	const mergedIntervals: PackageVersionInterval[] = [];
	for (const dependencySet of dependencySets) {
		for (const dependency of dependencySet) {
			let shouldAppendInterval = true;
			for (let i = 0; i < mergedIntervals.length; i++) {
				if (mergedIntervals[i].implies(dependency)) {
					shouldAppendInterval = false;
					break;
				}
				if (dependency.implies(mergedIntervals[i])) {
					shouldAppendInterval = false;
					mergedIntervals[i] = dependency;
					break;
				}
			}
			if (shouldAppendInterval) {
				mergedIntervals.push(dependency);
			}
		}
	}
	return mergedIntervals;
}
