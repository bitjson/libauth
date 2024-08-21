export default {
  files: ['src/lib/vmb-tests/benchmark-bch-vmb-tests.spec.ts'],
  timeout: '180m',
  typescript: {
    compile: false,
    rewritePaths: {
      'src/': 'build/',
    },
  },
};
