module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-control-regex': 'off',
    'no-constant-condition': 'off',
    'no-async-promise-executor': 'off',
    'no-empty': 'off',
    'prefer-const': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react-refresh/only-export-components': [
      'off',
      { allowConstantExport: true },
    ],
  },
}
