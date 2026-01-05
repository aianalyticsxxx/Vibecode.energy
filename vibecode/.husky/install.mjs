// Skip Husky install in production/CI environments
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true' || process.env.VERCEL === '1' || process.env.HUSKY === '0') {
  process.exit(0)
}

try {
  const { execSync } = await import('child_process')
  execSync('npx husky install', { stdio: 'inherit' })
} catch (e) {
  console.log('Husky install skipped')
}
