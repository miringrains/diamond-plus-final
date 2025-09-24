// Test the exact same playback ID with a generated token in the browser
const playbackId = 'tKRSmXUmgpYKdkhpEcR4QWM9BIUP3xwH5DIHSluByQs';

// This token was generated and tested to work (200 response)
const workingToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldHVWQwMXR5VzAwMVRPOXp6QzZ0N0pITTE5aW9HUW90MDJEUkcwMkZScDZjZm9vIn0.eyJzdWIiOiJ0S1JTbVhVbWdwWUtka2hwRWNSNFFXTTlCSVVQM3h3SDVESUhTbHVCeVFzIiwiYXVkIjoidiIsImV4cCI6MTc1NTIxNjk1OCwidmlld2VyX2lkIjoidGVzdC11c2VyIn0.QlBWsvODOJlGkdSZrypguxxNh0pRvv7mfMJtoYANgteRVR9CrY1slGR-_P9nwJZiLDTFcT_XzBY1JDYYhfdKU_Sppp4Hppmc76G1pQrJoLRksEBgekPeFBzR4jyoBPnazlXYo2f3DAU7mwCdvw0DQXyujEuQhfh6QbQjCCMo3ZldcO3qLU8BpE1Ql5Ea3SZyxDv1bGn39jM05AJ2ueo9fgspuvV6UL5GdIc6OPHrcNsWQL59gjlxihz6vuZ1P6oxq-0fG49I01BSzpdgDsf3xOiIWWiSEDiYEeo5iy0TS382rt-SqjDstgNiyGalyWBY3w_wMnN20l_KZTVdyGSrjQ';

console.log(`
To test in browser console:

1. Create a test element:
document.body.innerHTML = '<div id="test-player" style="width:800px;height:450px;"></div>';

2. Import React and MuxPlayer:
const React = window.React;
const MuxPlayer = window.MuxPlayerReact.default;

3. Mount the player with token:
const container = document.getElementById('test-player');
const root = ReactDOM.createRoot(container);
root.render(
  React.createElement(MuxPlayer, {
    playbackId: '${playbackId}',
    tokens: { playback: '${workingToken}' },
    accentColor: '#17ADE9',
    streamType: 'on-demand',
    metadata: {
      videoId: 'test',
      videoTitle: 'Test Video',
      viewerUserId: 'test-user'
    }
  })
);

This should work if the token is valid.
`);
