module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@views': './src/views',
          '@viewmodels': './src/viewmodels',
          '@services': './src/services',
          '@components': './src/components',
          '@models': './src/models',
        },
      },
    ],
  ],
};