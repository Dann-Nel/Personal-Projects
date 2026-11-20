/* =====================================================================
   EVERYTHING YOU NEED TO EDIT LIVES IN THIS FILE.
   Replace the text between the quotes. Keep the quotes and commas.
   Photos and videos: drop the files into the "photos" folder and list
   them in "media". One frame can hold as many as you like, in the order
   you want them shown, for example:
     media: ["photos/beach1.jpg", "photos/beach2.jpg", "photos/beach.mp4"]
   Videos should be .mp4 so they play on every phone.
   ===================================================================== */
window.CONTENT = {
  yourName: "Me",
  partnerName: "My Love",
  startDate: "2025-12-01", // the day you became a couple, as YEAR-MONTH-DAY. CHANGE THIS to your real date.

  // The two doodle characters. "a" is you, "b" is him. Make them look like the two of you:
  //   face:      a head cut-out with a see-through background, for example "photos/face-her.webp", shown instead of the drawn face.
  //              Remove the face line to go back to the drawn face and the hair, glasses and beard options below.
  //   faceY:     where the eye line sits in the cut-out, 0 (top) to 1 (bottom). Keep 0.4599 for the supplied cut-outs.
  //   outfit:    "dress" or "tee", for the stickman body that goes under a face photo
  //   color:     body colour (the colour of the outfit)
  //   hair:      "long", "short", "curly", "bun", "tuft" or "none"
  //   hairColor: any colour, for example "#6b4a3a" brown, "#2b2b2b" black, "#e8c36a" blonde, "#b5532a" ginger
  //   glasses:   true or false
  //   beard:     true or false
  //   bow:       true or false (a little bow on the head)
  //   sprout:    true or false (a little heart growing from the head)
  //   height:    1 is normal, 1.1 is a bit taller, 0.92 a bit shorter
  characters: {
    a: { face: "photos/face-her.webp", outfit: "dress", faceY: 0.4599, color: "#ffc2d1", hair: "long", hairColor: "#1d1a22", glasses: false, beard: false, bow: false, sprout: false, height: 1 },
    b: { face: "photos/face-him.webp", outfit: "tee", faceY: 0.4599, color: "#bde0fe", hair: "short", hairColor: "#6b4a3a", glasses: true, beard: true, bow: false, sprout: false, height: 1.12 },
  },

  // Background song. It starts when the envelope is opened and pauses while a video plays.
  // file: a song file you put in this folder, for example "music/song.mp3". Leave "" to use YouTube.
  // youtubeId: the part after "v=" in a YouTube link. Used when there is no file.
  // volume: 0 to 100.
  music: { file: "music/postcards.mp3", youtubeId: "DB7jsjt4Uec", volume: 60 },

  opening: {
    title: "Happy 1 Year",
    hint: "tap the envelope",
    letterLine1: "To my favourite person,",
    letterLine2: "365 days of us.",
    button: "Read our story",
  },

  // ---------- How it all started ----------
  // doodle options: heart, star, sun, cup, moon, chat, camera, flower
  // Each chapter is a card he can tap to open and read in full, so write as much as you like.
  // A chapter can also show photos and videos when opened: add  media: ["photos/a.jpg", "photos/b.mp4"]
  story: [
    { title: "How we met", doodle: "star", media: ["photos/wa0030.jpg", "photos/wa0031.jpg"], text: "Write how you met here. Where were you? What was the day like?" },
    { title: "First photos together", doodle: "camera", media: ["photos/wa0032.jpg", "photos/wa0033.jpg"], text: "Our first photos together. Tell the story behind them: where you were, what the day was for, and how it felt to finally have a picture of the two of you." },
    { title: "Our first conversation", doodle: "chat", text: "What did you talk about? Who spoke first?" },
    { title: "Our first impressions", doodle: "sun", text: "What you thought of him, and what he thought of you." },
    { title: "How we started talking", doodle: "moon", text: "The messages, the late nights, the moment it became every day." },
    { title: "Our first date", doodle: "cup", text: "Where you went, what you wore, what you remember most." },
    { title: "Our first kiss", doodle: "heart", text: "Where it happened and how it felt." },
    { title: "When we became official", doodle: "flower", text: "The day you became a couple and how it happened." },
    { title: "When I realised I loved you", doodle: "heart", text: "The exact moment you knew." },
  ],
  beginningMessage: "A special message about your beginning goes here. Tell him what that start means to you now.",
  storyBubbles: [["a", "hi."], ["b", "hi :)"], ["a", "so... coffee?"], ["b", "thought you'd never ask"]],

  // ---------- Big lines between sections ----------
  // One for each gap, in order: after the story, after the timeline, after the memories, after wrapped.
  // Each can also show photos and videos: add  media: ["photos/a.jpg", "photos/b.mp4"]  and an optional caption.
  // Use { quote: "" } to leave a gap empty.
  interludes: [
    { quote: "And that was only the beginning." },
    { quote: "365 days, and I would not trade a single one." },
    { quote: "Now for the numbers." },
    { quote: "One more thing, in my own words." },
  ],

  // ---------- Our 365 days together ----------
  // The photos are in the order they were sent, which may not be the order they happened.
  // Set each date (for example "March 2026") and change any caption.
  timeline: [
    { date: "Add the month", caption: "First photos together", media: ["photos/wa0032.jpg", "photos/wa0033.jpg"] },
    { date: "Add the month", caption: "A sunny afternoon", media: ["photos/wa0034.jpg", "photos/wa0037.jpg"] },
    { date: "Add the month", caption: "Out in the fresh air", media: ["photos/wa0035.jpg"] },
    { date: "Add the month", caption: "Mountains and big skies", media: ["photos/wa0036.jpg"] },
    { date: "Add the month", caption: "Sunset with the dog", media: ["photos/wa0038.jpg"] },
    { date: "Add the month", caption: "A night out", media: ["photos/wa0039.jpg"] },
    { date: "Add the month", caption: "Matching reds", media: ["photos/wa0041.jpg"] },
    { date: "Add the month", caption: "Green jumper days", media: ["photos/wa0042.jpg", "photos/wa0045.jpg"] },
    { date: "Add the month", caption: "Silly us", media: ["photos/wa0043.jpg", "photos/wa0046.jpg"] },
    { date: "Add the month", caption: "All dressed up", media: ["photos/wa0044.jpg"] },
    { date: "Add the month", caption: "By the sea", media: ["photos/wa0047.jpg", "photos/wa0049.jpg", "photos/wa0050.jpg"] },
    { date: "Add the month", caption: "Bowling night", media: ["photos/wa0051.jpg"] },
  ],

  // ---------- If I could relive it all ----------
  // Titles and photos are matched from what the pictures show. Add the date and your own words.
  relive: [
    {
      title: "Sunset with the dog",
      date: "Date of the memory",
      what: "What happened that day.",
      special: "Why it was special.",
      relive: "Why you would relive it.",
      media: ["photos/wa0038.jpg"],
      doodle: "sun",
    },
    {
      title: "A day by the sea",
      date: "Date of the memory",
      what: "What happened that day.",
      special: "Why it was special.",
      relive: "Why you would relive it.",
      media: ["photos/wa0049.jpg", "photos/wa0050.jpg"],
      doodle: "moon",
    },
    {
      title: "Bowling night",
      date: "Date of the memory",
      what: "What happened that day.",
      special: "Why it was special.",
      relive: "Why you would relive it.",
      media: ["photos/wa0051.jpg"],
      doodle: "star",
    },
  ],

  // ---------- Our relationship wrapped ----------
  // Total days and months are counted automatically from startDate.
  // Before the anniversary they show the full first year (365 days, 12 months); after it they keep counting.
  wrapped: {
    favouriteDate: { answer: "Your favourite date", note: "A line about why." },
    funniestMemory: { answer: "Your funniest memory", note: "A line about why you still laugh." },
    nickname: { answer: "Your nickname", note: "Said roughly a million times." },
    song: { answer: "Song title", note: "by Artist" },
    conversation: { answer: "Your most memorable conversation", note: "A line about what it meant." },
    adventure: { answer: "Your best adventure", note: "A line about it." },
    achievement: { answer: "Your biggest achievement as a couple", note: "A line about it." },
    unforgettable: { answer: "Your most unforgettable moment", note: "A line about it." },
  },

  // ---------- Final love letter ----------
  letter: {
    greeting: "My love,",
    parts: [
      { heading: "Thank you for our first year", text: "Thank him for the year, and tell him what this year has meant to you." },
      { heading: "What loving you has taught me", text: "What you have learned from loving him, and what you appreciate most about him." },
      { heading: "What comes next", text: "What you look forward to, and why you would choose him again." },
    ],
    finalMessage: "I love you. Today, tomorrow, and every day after.",
    signOff: "Forever yours,",
    hugBubbles: [["a", "i love you"], ["b", "i love you more"]],
  },
};
