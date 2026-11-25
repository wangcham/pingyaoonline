// Links and attribution displayed in the project are also listed in README.md.
const dialog = document.querySelector('#details');
document.querySelector('#sources').addEventListener('click', () => dialog.showModal());
document.querySelector('#scan').addEventListener('click', event => {
  const frame = document.createElement('iframe');
  frame.title = '平遥古城西南角楼航拍模型 · Lionel';
  frame.src = 'https://sketchfab.com/models/8e09151d99a148159599fbb37589d05b/embed';
  frame.allow = 'fullscreen; xr-spatial-tracking';
  frame.allowFullscreen = true;
  document.querySelector('#scan-view').replaceChildren(frame);
  event.currentTarget.hidden = true;
});
