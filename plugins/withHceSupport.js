const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withHceManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

    // Ensure uses-feature for HCE exists
    if (!androidManifest.manifest['uses-feature']) {
      androidManifest.manifest['uses-feature'] = [];
    }
    const hasFeature = androidManifest.manifest['uses-feature'].some(
      (f) => f.$['android:name'] === 'android.hardware.nfc.hce'
    );
    if (!hasFeature) {
      androidManifest.manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.nfc.hce',
          'android:required': 'true',
        },
      });
    }

    // Ensure the CardService exists
    if (!mainApplication.service) {
      mainApplication.service = [];
    }
    const hasService = mainApplication.service.some(
      (s) => s.$['android:name'] === 'com.reactnativehce.services.CardService'
    );
    
    if (!hasService) {
      mainApplication.service.push({
        $: {
          'android:name': 'com.reactnativehce.services.CardService',
          'android:exported': 'true',
          'android:enabled': 'false',
          'android:permission': 'android.permission.BIND_NFC_SERVICE',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.nfc.cardemulation.action.HOST_APDU_SERVICE' } }],
            category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.nfc.cardemulation.host_apdu_service',
              'android:resource': '@xml/aid_list',
            },
          },
        ],
      });
    }

    return config;
  });
}

function withHceResXml(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
      
      if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir, { recursive: true });
      }

      const aidListPath = path.join(resDir, 'aid_list.xml');
      const aidListContent = `<?xml version="1.0" encoding="utf-8"?>
<host-apdu-service xmlns:android="http://schemas.android.com/apk/res/android"
                   android:description="@string/app_name"
                   android:requireDeviceUnlock="false">
  <aid-group android:category="other"
             android:description="@string/app_name">
    <aid-filter android:name="D2760000850101" />
  </aid-group>
</host-apdu-service>`;

      fs.writeFileSync(aidListPath, aidListContent);
      return config;
    },
  ]);
}

module.exports = function withHceSupport(config) {
  config = withHceManifest(config);
  config = withHceResXml(config);
  return config;
};
