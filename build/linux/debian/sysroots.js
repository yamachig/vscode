"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.sysrootInfo = void 0;
// Based on https://source.chromium.org/chromium/chromium/src/+/main:build/linux/sysroot_scripts/sysroots.json.
exports.sysrootInfo = {
    'bullseye_amd64': {
        'Sha1Sum': '60354520bb7001d8d0288a2ab82cec7efec9fa3d',
        'SysrootDir': 'debian_bullseye_amd64-sysroot',
        'Tarball': 'debian_bullseye_amd64_sysroot.tar.xz'
    },
    'bullseye_arm64': {
        'Sha1Sum': 'ff05a16c779e383fab73cec872f748eee00986d9',
        'SysrootDir': 'debian_bullseye_arm64-sysroot',
        'Tarball': 'debian_bullseye_arm64_sysroot.tar.xz'
    },
    'bullseye_armel': {
        'Sha1Sum': '6c15d3d598eb7535a8b7188967b3f20107d968a1',
        'SysrootDir': 'debian_bullseye_armel-sysroot',
        'Tarball': 'debian_bullseye_armel_sysroot.tar.xz'
    }
};
