# Our First Year

A one-year anniversary website. Open `index.html` in a browser to view it.

## Making it yours

1. Open `content.js` and replace the placeholder text with your own words, names and dates.
2. Put your photos and videos in the `photos` folder and list them in each entry's `media` list in `content.js`.
   An entry can hold several, for example `media: ["photos/a.jpg", "photos/b.jpg", "photos/clip.mp4"]`,
   and they become a strip you can swipe through. Use `.mp4` for videos.
   Any file that is missing shows a placeholder naming the file it expects.
3. Add or remove timeline entries, memories and story chapters by copying or deleting a `{ ... }` block.

Total days and months in the "wrapped" section are counted from `startDate`.

## Background song

The song starts when the envelope is opened, pauses while any video plays and resumes afterwards.
The round button in the corner switches it off and on. Set it in `content.js` under `music`:
put a song file in the `music` folder and set `file: "music/song.mp3"`, or leave `file` empty to use `youtubeId`.
Some songs cannot be played from YouTube on other websites; a file always works.
