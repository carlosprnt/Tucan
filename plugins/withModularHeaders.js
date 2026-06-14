const { withPodfile } = require('@expo/config-plugins');

/**
 * Adds `use_modular_headers!` to the iOS Podfile. Required because the Google
 * Sign-In pods (AppCheckCore → GoogleUtilities / RecaptchaInterop) don't define
 * modules, and our Swift widget extension forces static-library integration,
 * which then fails without modular headers.
 */
module.exports = function withModularHeaders(config) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('use_modular_headers!')) {
      if (/platform :ios.*\n/.test(contents)) {
        contents = contents.replace(/(platform :ios.*\n)/, '$1use_modular_headers!\n');
      } else {
        contents = `use_modular_headers!\n${contents}`;
      }
      cfg.modResults.contents = contents;
    }
    return cfg;
  });
};
