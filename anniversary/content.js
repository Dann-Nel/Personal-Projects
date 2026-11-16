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

  // Doodle character colours. "a" is you, "b" is him.
  characters: {
    a: { color: "#ffc2d1" },
    b: { color: "#bde0fe" },
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
  story: [
    { title: "How we met", doodle: "star", text: "Write how you met here. Where were you? What was the day like?" },
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

  // ---------- Our 365 days together ----------
  timeline: [
    { date: "December 2025", caption: "Where it all began", media: ["photos/01.jpg", "photos/01b.jpg", "photos/01.mp4"] },
    { date: "January 2026", caption: "New year, same us", media: ["photos/02.jpg"] },
    { date: "February 2026", caption: "Our first Valentine's", media: ["photos/03.jpg"] },
    { date: "March 2026", caption: "Add a caption", media: ["photos/04.jpg"] },
    { date: "April 2026", caption: "Add a caption", media: ["photos/05.jpg"] },
    { date: "May 2026", caption: "Add a caption", media: ["photos/06.jpg"] },
    { date: "June 2026", caption: "Add a caption", media: ["photos/07.jpg"] },
    { date: "July 2026", caption: "Add a caption", media: ["photos/08.jpg"] },
    { date: "August 2026", caption: "Add a caption", media: ["photos/09.jpg"] },
    { date: "September 2026", caption: "Add a caption", media: ["photos/10.jpg"] },
    { date: "October 2026", caption: "Add a caption", media: ["photos/11.jpg"] },
    { date: "November 2026", caption: "Add a caption", media: ["photos/12.jpg"] },
  ],

  // ---------- If I could relive it all ----------
  relive: [
    {
      title: "Memory title",
      date: "Date of the memory",
      what: "What happened that day.",
      special: "Why it was special.",
      relive: "Why you would relive it.",
      media: ["photos/memory1.jpg"],
      doodle: "star",
    },
    {
      title: "Memory title",
      date: "Date of the memory",
      what: "What happened that day.",
      special: "Why it was special.",
      relive: "Why you would relive it.",
      media: ["photos/memory2.jpg"],
      doodle: "sun",
    },
    {
      title: "Memory title",
      date: "Date of the memory",
      what: "What happened that day.",
      special: "Why it was special.",
      relive: "Why you would relive it.",
      media: ["photos/memory3.jpg"],
      doodle: "moon",
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
