export default {
  client: 'pnpm',
  // Package names to exclude from updates.
  ignore: ['react', 'react-dom'],
  // Target versions for dependencies.
  lockDeps: {
    chalk: '4.1.2',
  },
  // Target versions for devDependencies.
  lockDevDeps: {
    typescript: '~5.9.0',
  },
};
