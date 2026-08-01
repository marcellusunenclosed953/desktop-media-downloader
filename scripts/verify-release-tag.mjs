import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const expectedTag = `v${packageJson.version}`;
const actualTag = process.env.GITHUB_REF_NAME || process.argv[2];

if (!actualTag) {
  console.error('Release tag is unavailable. Set GITHUB_REF_NAME or pass the tag as the first argument.');
  process.exit(1);
}

if (actualTag !== expectedTag) {
  console.error(`Release tag ${actualTag} does not match package version ${packageJson.version} (expected ${expectedTag}).`);
  process.exit(1);
}

console.log(`Release tag ${actualTag} matches package version ${packageJson.version}.`);
