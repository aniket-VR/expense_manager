import {
  AppOpenAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
// prod one
// const adUnitId = __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-4789655646781697/8928669225';
 const adUnitId = __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-3940256099942544/9257395915';


let appOpenAd = null;
let isLoaded = false;

export const loadAppOpenAd = () => {
  appOpenAd = AppOpenAd.createForAdRequest(adUnitId);

  appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
    console.log('Ad Loaded');
    isLoaded = true;
  });

  appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
    console.log('Ad Closed');

    isLoaded = false;

    // preload next ad
    loadAppOpenAd();
  });

  appOpenAd.addAdEventListener(AdEventType.ERROR, error => {
    console.log('Ad Error', error);
    isLoaded = false;
  });

  appOpenAd.load();
};

export const showAppOpenAd = () => {
  if (isLoaded && appOpenAd) {
    appOpenAd.show();
  } else {
    console.log('Ad not ready');
    loadAppOpenAd();
  }
};


