#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Define the packages to be published
const PACKAGES = [
  { path: 'app/intrig', name: '@intrig-core/intrig' },
  { path: 'lib/next-client', name: '@intrig/next' },
  { path: 'lib/react-client', name: '@intrig/react' }
];

// Parse command line arguments
const args = process.argv.slice(2);
const releaseType = args[0] || 'patch'; // Default to patch if no release type is provided
const dryRun = args.includes('--dry-run');

if (!['major', 'minor', 'patch'].includes(releaseType)) {
  console.error('Error: Release type must be one of: major, minor, patch');
  process.exit(1);
}

if (dryRun) {
  console.log('Dry run mode: No changes will be published');
}

// Function to read package.json
function readPackageJson(packagePath) {
  const filePath = path.join(process.cwd(), packagePath, 'package.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Function to write package.json
function writePackageJson(packagePath, content) {
  const filePath = path.join(process.cwd(), packagePath, 'package.json');
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
}

// Function to bump version
function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return version;
  }
}

// Main function
async function main() {
  try {
    console.log(`Starting ${releaseType} release process...`);

    // Build the project first
    console.log('Building the project...');
    execSync('npx nx run-many -t build', { stdio: 'inherit' });

    // Read current versions
    const packageVersions = PACKAGES.map(pkg => {
      const packageJson = readPackageJson(pkg.path);
      return {
        ...pkg,
        currentVersion: packageJson.version
      };
    });

    // Determine the highest version
    let highestVersion = '0.0.0';
    for (const pkg of packageVersions) {
      if (pkg.currentVersion > highestVersion) {
        highestVersion = pkg.currentVersion;
      }
    }

    // Bump the highest version
    const newVersion = bumpVersion(highestVersion, releaseType);
    console.log(`Bumping version from ${highestVersion} to ${newVersion}`);

    // Update all package versions to the new version
    for (const pkg of PACKAGES) {
      const packageJson = readPackageJson(pkg.path);
      packageJson.version = newVersion;
      writePackageJson(pkg.path, packageJson);
      console.log(`Updated ${pkg.name} to version ${newVersion}`);
    }

    // Publish packages
    if (!dryRun) {
      console.log('Publishing packages...');
      for (const pkg of PACKAGES) {
        console.log(`Publishing ${pkg.name}...`);
        try {
          execSync(`cd ${pkg.path} && npm publish --access public`, { stdio: 'inherit' });
          console.log(`Successfully published ${pkg.name}@${newVersion}`);
        } catch (error) {
          console.error(`Failed to publish ${pkg.name}: ${error.message}`);
          // Continue with other packages even if one fails
        }
      }
    } else {
      console.log('Dry run: Skipping package publishing');
    }

    console.log(`Release process completed successfully! New version: ${newVersion}`);
  } catch (error) {
    console.error(`Error during release process: ${error.message}`);
    process.exit(1);
  }
}

main();
