import _import from 'eslint-plugin-import';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default tseslint.config(
    eslintPluginUnicorn.configs.recommended,
    {
        ignores: [
            '**/node_modules/',
            '**/dist',
            '**/public',
            '**/generated',
            '**/schedule.d.ts',
        ],
    },
    ...fixupConfigRules(
        compat.extends(
            'eslint:recommended',
            'plugin:import/recommended',
            'plugin:import/typescript',
            'prettier',
            'airbnb-base',
            'airbnb-typescript/base',
            'plugin:deprecation/recommended',
        ),
    ),
    {
        plugins: {
            'no-relative-import-paths': noRelativeImportPaths,
            prettier,
            import: fixupPluginRules(_import),
            'simple-import-sort': simpleImportSort,
        },

        languageOptions: {
            ecmaVersion: 5,
            sourceType: 'script',

            parserOptions: {
                project: './tsconfig.json',
            },
        },

        rules: {
            'linebreak-style': ['error', 'unix'],
            'no-nested-ternary': 'off',
            'no-confusing-arrow': 'off',
            'import/prefer-default-export': 'off',
            '@typescript-eslint/no-floating-promises': 'error',

            'prettier/prettier': [
                'error',
                {
                    singleQuote: true,
                    trailingComma: 'all',
                    printWidth: 80,
                    tabWidth: 4,
                    useTabs: false,
                    semi: true,
                    jsxSingleQuote: false,
                    bracketSpacing: true,
                    arrowParens: 'avoid',
                    importOrderSeparation: true,
                },
            ],

            'function-paren-newline': 'off',
            'implicit-arrow-linebreak': 'off',
            'object-curly-newline': 'off',
            'operator-linebreak': 'off',
            'import/no-named-as-default-member': 'off',
            'import/no-named-as-default': 'off',
            'import/first': 'error',
            'import/consistent-type-specifier-style': [
                'error',
                'prefer-top-level',
            ],
            'import/newline-after-import': 'error',
            'import/no-duplicates': 'error',

            'import/extensions': [
                'error',
                'never',
                {
                    json: 'always',
                    svg: 'always',
                    jpg: 'always',
                    png: 'always',
                    css: 'always',
                },
            ],

            'no-relative-import-paths/no-relative-import-paths': [
                'warn',
                {
                    allowSameFolder: true,
                    rootDir: 'src',
                },
            ],

            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'separate-type-imports',
                    disallowTypeAnnotations: true,
                },
            ],

            'simple-import-sort/imports': [
                'error',
                {
                    groups: [
                        [String.raw`\u0000$`],
                        [String.raw`^\w`],
                        ['^@backend'],
                        ['^@/'],
                        [String.raw`^.+\.module\.css$`],
                        ['^[./]'],
                    ],
                },
            ],

            'import/order': 'off',

            'simple-import-sort/exports': 'error',
            indent: 'off',
            '@typescript-eslint/indent': 'off',
            'no-console': 'off',
            'no-restricted-syntax': [
                'error',
                'ForInStatement',
                'LabeledStatement',
                'WithStatement',
            ],
            'max-len': 'off',
            'no-useless-return': 'off',

            'import/no-extraneous-dependencies': [
                'error',
                {
                    devDependencies: true,
                },
            ],

            // disable because now it is in @stylistic/eslint-plugin-ts
            '@typescript-eslint/quotes': 'off',
            '@typescript-eslint/brace-style': 'off',
            '@typescript-eslint/comma-dangle': 'off',
            '@typescript-eslint/comma-spacing': 'off',
            '@typescript-eslint/func-call-spacing': 'off',
            '@typescript-eslint/keyword-spacing': 'off',
            '@typescript-eslint/no-extra-semi': 'off',
            '@typescript-eslint/object-curly-spacing': 'off',
            '@typescript-eslint/semi': 'off',
            '@typescript-eslint/space-before-function-paren': 'off',
            '@typescript-eslint/space-before-blocks': 'off',
            '@typescript-eslint/space-infix-ops': 'off',
            '@typescript-eslint/switch-colon-spacing': 'off',
            '@typescript-eslint/type-annotation-spacing': 'off',
            '@typescript-eslint/no-throw-literal': 'off',

            '@typescript-eslint/lines-between-class-members': 'off',

            '@typescript-eslint/explicit-function-return-type': [
                'error',
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true,
                },
            ],

            'no-continue': 'off',
            'arrow-parens': ['error', 'as-needed'],

            /* "unicorn/filename-case": ["error", {
                cases: {
                    camelCase: true,
                    pascalCase: true,
                    kebabCase: true,
                    snakeCase: true,
                },
            }], */
            'unicorn/no-null': 'off',
            'unicorn/prevent-abbreviations': 'off',
            'unicorn/prefer-global-this': 'off',
            'unicorn/no-typeof-undefined': 'off',
            'unicorn/prefer-add-event-listener': 'off',
            'unicorn/no-process-exit': 'off',
            'unicorn/prefer-module': 'off',
            'unicorn/prefer-top-level-await': 'off',
        },
    },
    {
        // disable type-aware linting on JS files
        files: ['**/*.js'],
        extends: [tseslint.configs.disableTypeChecked],
    },
);
