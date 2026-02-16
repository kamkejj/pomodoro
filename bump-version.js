#!/usr/bin/env node
/**
 * Bump version across all project files
 * Usage: node bump-version.js [major|minor|patch]
 * Default: patch
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FILES = [
	{ path: 'package.json', pattern: /"version":\s*"([0-9]+\.[0-9]+\.[0-9]+)"/ },
	{ path: 'src-tauri/Cargo.toml', pattern: /^version\s*=\s*"([0-9]+\.[0-9]+\.[0-9]+)"/m },
	{ path: 'src-tauri/tauri.conf.json', pattern: /"version":\s*"([0-9]+\.[0-9]+\.[0-9]+)"/ }
];

function parseVersion(version) {
	const parts = version.split('.').map(Number);
	return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function formatVersion({ major, minor, patch }) {
	return `${major}.${minor}.${patch}`;
}

function bumpVersion(version, type) {
	const v = parseVersion(version);
	switch (type) {
		case 'major':
			v.major++;
			v.minor = 0;
			v.patch = 0;
			break;
		case 'minor':
			v.minor++;
			v.patch = 0;
			break;
		case 'patch':
		default:
			v.patch++;
		}
	return formatVersion(v);
}

function bumpFile(filePath, pattern, newVersion) {
	const fullPath = join(__dirname, filePath);
	const content = readFileSync(fullPath, 'utf-8');
	const match = content.match(pattern);
	
	if (!match) {
		console.error(`Could not find version in ${filePath}`);
		process.exit(1);
	}
	
	const oldVersion = match[1];
	const replacement = match[0].replace(oldVersion, newVersion);
	const newContent = content.replace(pattern, replacement);
	writeFileSync(fullPath, newContent, 'utf-8');
	
	return oldVersion;
}

const bumpType = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(bumpType)) {
	console.error('Usage: node bump-version.js [major|minor|patch]');
	process.exit(1);
}

const packageJsonPath = join(__dirname, 'package.json');
const packageContent = readFileSync(packageJsonPath, 'utf-8');
const currentVersionMatch = packageContent.match(/"version":\s*"([0-9]+\.[0-9]+\.[0-9]+)"/);

if (!currentVersionMatch) {
	console.error('Could not find version in package.json');
	process.exit(1);
}

const currentVersion = currentVersionMatch[1];
const newVersion = bumpVersion(currentVersion, bumpType);

console.log(`Bumping version: ${currentVersion} -> ${newVersion} (${bumpType})`);

for (const file of FILES) {
	const oldVersion = bumpFile(file.path, file.pattern, newVersion);
	console.log(`  ✓ ${file.path} (${oldVersion} -> ${newVersion})`);
}

console.log('\nDone! Run `git diff` to review changes.');
