/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'TucanWidgets',
  // Configurable + interactive widgets (App Intents) need iOS 17.
  deploymentTarget: '17.0',
  // Shared App Group so the widget can read the data the app writes.
  entitlements: {
    'com.apple.security.application-groups': ['group.com.carlosprnt.tucan'],
  },
};
