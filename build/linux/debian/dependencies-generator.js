/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDependencies = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = require("path");
const dep_lists_1 = require("./dep-lists");
function getDependencies(buildDir, applicationName) {
    // Get the files for which we want to find dependencies.
    const nativeModulesPath = path.join(buildDir, 'resources', 'app', 'node_modules.asar.unpacked');
    const findResult = (0, child_process_1.spawnSync)('find', [nativeModulesPath, '-name', '*.node']);
    if (findResult.status) {
        console.error('Error finding files:');
        console.error(findResult.stderr.toString());
        return [];
    }
    const files = findResult.stdout.toString().trimEnd().split('\n');
    const appPath = path.join(buildDir, applicationName);
    files.push(appPath);
    // Add chrome sandbox and crashpad handler.
    files.push(path.join(buildDir, 'chrome-sandbox'));
    files.push(path.join(buildDir, 'chrome_crashpad_handler'));
    // Generate the dependencies.
    const dependencies = files.map((file) => calculatePackageDeps(file));
    // Add additional dependencies.
    const additionalDepsSet = new Set(dep_lists_1.additionalDeps);
    dependencies.push(additionalDepsSet);
    // Merge all the dependencies.
    const mergedDependencies = mergePackageDeps(dependencies);
    let sortedDependencies = [];
    for (const dependency of mergedDependencies) {
        sortedDependencies.push(dependency);
    }
    sortedDependencies.sort();
    // Exclude bundled dependencies
    sortedDependencies = sortedDependencies.filter(dependency => {
        return !dep_lists_1.bundledDeps.some(bundledDep => dependency.startsWith(bundledDep));
    });
    return sortedDependencies;
}
exports.getDependencies = getDependencies;
function calculatePackageDeps(binaryPath) {
    // TODO: Do we need this following try-catch check for Debian?
    try {
        if (!((0, fs_1.statSync)(binaryPath).mode & fs_1.constants.S_IXUSR)) {
            throw new Error(`Binary ${binaryPath} needs to have an executable bit set.`);
        }
    }
    catch (e) {
        // The package might not exist. Don't re-throw the error here.
        console.error('Tried to stat ' + binaryPath + ' but failed.');
    }
    // We want to call dpkg-shlibdeps.pl here.
    // That file takes in binary, sysroot, arch
    const sysroot = 'temp';
    const arch = 'x64-temp';
    const dpkgShlibdepsScriptLocation = './dpkg-shlibdeps.pl';
    const cmd = ['--ignore-weak-undefined'];
    switch (arch) {
        case 'x64':
            cmd.push(`-l${sysroot}/usr/lib/x86_64-linux-gnu`, `-l${sysroot}/lib/x84_64-linux-gnu`);
            break;
        case 'x86':
            cmd.push(`-l${sysroot}/usr/lib/i386-linux-gnu`, `-l${sysroot}/lib/i386-linux-gnu`);
            break;
        case 'arm':
            cmd.push(`-l${sysroot}/usr/lib/arm-linux-gnueabihf`, `-l${sysroot}/lib/arm-linux-gnueabihf`);
            break;
        case 'arm64':
            cmd.push(`-l${sysroot}/usr/lib/aarch64-linux-gnu`, `-l${sysroot}/lib/aarch64-linux-gnu`);
            break;
        default:
            throw new Error('Unsupported architecture ' + arch);
    }
    cmd.push(`-l${sysroot}/usr/lib`, '-O', '-e', binaryPath);
    // Attach that file after checking the licence
    const dpkgShlibdepsResult = (0, child_process_1.spawnSync)(dpkgShlibdepsScriptLocation, cmd, { cwd: sysroot });
    if (dpkgShlibdepsResult.status !== 0) {
        throw new Error(`dpkg-shlibdeps failed with exit code ${dpkgShlibdepsResult.status}.\nstderr: ${dpkgShlibdepsResult.stderr}`);
    }
    const shlibsDependsPrefix = 'shlibs:Depends=';
    const requiresList = dpkgShlibdepsResult.stdout.toString('utf-8').trimEnd().split('\n');
    let depsStr = '';
    for (const line of requiresList) {
        if (line.startsWith(shlibsDependsPrefix)) {
            depsStr = line.substring(shlibsDependsPrefix.length);
        }
    }
    const requires = new Set(depsStr.split(', ').sort());
    return requires;
}
// Based on https://source.chromium.org/chromium/chromium/src/+/main:chrome/installer/linux/rpm/merge_package_deps.py
function mergePackageDeps(inputDeps) {
    // For now, see if directly appending the dependencies helps.
    const requires = new Set();
    for (const depSet of inputDeps) {
        for (const dep of depSet) {
            const trimmedDependency = dep.trim();
            if (trimmedDependency.length && !trimmedDependency.startsWith('#')) {
                requires.add(trimmedDependency);
            }
        }
    }
    return requires;
}
