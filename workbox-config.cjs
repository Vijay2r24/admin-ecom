module.exports = {
  // The directory to look for files to precache (Vite build output)
  globDirectory: 'dist/',

  // File patterns to precache
  globPatterns: [
    '**/*.{html,js,css,png,svg,jpg,gif,json,woff,woff2,eot,ico,webmanifest,map}'
  ],

  // Output service worker file
  swDest: 'dist/sw.js',

  // Activate SW immediately without waiting for old SW to be released
  skipWaiting: true,

  // Take control of all open clients immediately after activation
  clientsClaim: true,

  // Ignore common analytics URL parameters
  ignoreURLParametersMatching: [
    /^utm_/,
    /^fbclid$/
  ]
};
