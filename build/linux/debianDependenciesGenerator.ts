import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { calculatePackageDeps, mergePackageDeps } from './linux-installer/debian/debianDependencyScripts';

export function getDebianDependencies(arch: string): string[] {
	// Find the files that we want to generate the dependencies for.
	const findResult = spawnSync('find', ['.', '-name', '*.node']);
	if (findResult.status) {
		console.error('Error finding files:');
		console.error(findResult.stderr.toString('utf-8'));
		return [];
	}
	const files: string[] = findResult.stdout.toString('utf-8').split('\n').filter(file => {
		return !file.includes('obj.target') && file.includes('build/Release');
	});
	files.push(`.build/electron/code-oss`);

	// We want the sysroot
	// Use Electron's URI, download it with curl
	// and then ref it

	// Generate the dependencies.
	const dependencyFiles = files.map(file => calculatePackageDeps(file, arch));
	const additionalFileDepsString = readFileSync(resolve(__filename, 'linux-installer/debian/additional_deps')).toString('utf-8').trim();
	const additionalFileDeps = additionalFileDepsString.split('\n')
		.filter(dependency => {
			return dependency.trim().length && !dependency.startsWith('#')
		})
		.map(dependency => parsePackageIntervalSet(dependency));
	dependencyFiles.push(additionalFileDeps);

	// Merge and stringify the dependencies.
	const mergedDependencies = mergePackageDeps(dependencyFiles);
	const stringDependencies = mergedDependencies.map(dependency => dependency.toString()).sort();
	return stringDependencies;
}
