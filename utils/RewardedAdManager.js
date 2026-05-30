import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// const adUnitId = __DEV__
//   ? TestIds.REWARDED
//   : 'ca-app-pub-4789655646781697/2145288931';

  const adUnitId = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-3940256099942544/5224354917';

let rewarded = null;
let isLoaded = false;
let rewardCallback = null;

const createAd = () => {
  rewarded = RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  rewarded.addAdEventListener(AdEventType.LOADED, () => {
    console.log('Rewarded Ad Loaded');
    isLoaded = true;

    // If user already clicked export, show immediately
    if (rewardCallback) {
      rewarded.show();
    }
  });

  rewarded.addAdEventListener(AdEventType.ERROR, error => {
    console.log('Rewarded Ad Error:', error);
    isLoaded = false;
  });

  rewarded.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    reward => {
      console.log('Reward earned:', reward);

      if (rewardCallback) {
        rewardCallback();
        rewardCallback = null;
      }
    }
  );

  rewarded.addAdEventListener(AdEventType.CLOSED, () => {
    console.log('Rewarded Ad Closed');

    isLoaded = false;

    // preload next ad
    createAd();
    rewarded.load();
  });
};

export const loadRewardedAd = () => {
  createAd();
  rewarded.load();
};

export const showRewardedAd = (onRewardEarned) => {
  rewardCallback = onRewardEarned;

  if (isLoaded && rewarded) {
    rewarded.show();
  } else {
    console.log('Ad not ready, loading now...');
    loadRewardedAd();
  }
};

