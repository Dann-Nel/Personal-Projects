/* =====================================================================
   EVERYTHING YOU NEED TO EDIT LIVES IN THIS FILE.
   Replace the text between the quotes. Keep the quotes and commas.
   Photos: drop image files into the "photos" folder and use the same
   file names you see below (or change the names here to match yours).
   ===================================================================== */
window.CONTENT = {
  yourName: "Me",
  partnerName: "My Love",
  startDate: "2025-11-16", // the day you became a couple, as YEAR-MONTH-DAY

  // Doodle character colours. "a" is you, "b" is him.
  characters: {
    a: { color: "#ffc2d1" },
    b: { color: "#bde0fe" },
  },

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
    { date: "November 2025", caption: "Where it all began", photo: "photos/01.jpg" },
    { date: "December 2025", caption: "Our first holidays", photo: "photos/02.jpg" },
    { date: "January 2026", caption: "New year, same us", photo: "photos/03.jpg" },
    { date: "February 2026", caption: "Our first Valentine's", photo: "photos/04.jpg" },
    { date: "March 2026", caption: "Add a caption", photo: "photos/05.jpg" },
    { date: "April 2026", caption: "Add a caption", photo: "photos/06.jpg" },
    { date: "May 2026", caption: "Add a caption", photo: "photos/07.jpg" },
    { date: "June 2026", caption: "Add a caption", photo: "photos/08.jpg" },
    { date: "July 2026", caption: "Add a caption", photo: "photos/09.jpg" },
    { date: "August 2026", caption: "Add a caption", photo: "photos/10.jpg" },
    { date: "September 2026", caption: "Add a caption", photo: "photos/11.jpg" },
    { date: "October 2026", caption: "Add a caption", photo: "photos/12.jpg" },
  ],

  // ---------- If I could relive it all ----------
  relive: [
    {
      title: "Memory title",
      date: "Date of the memory",
      what: "What happened that day.",
      special: "Why it was special.",
      relive: "Why you would relive it.",
      photo: "photos/memory1.jpg",
      doodle: "star",
    },
    {
      title: "Memory title",
      date: "Date of the memory",
      what: "What happened that day.",
      special: "Why it was special.",
      relive: "Why you would relive it.",
      photo: "photos/memory2.jpg",
      doodle: "sun",
    },
    {
      title: "Memory title",
      date: "Date of the memory",
      what: "What happened that day.",
      special: "Why it was special.",
      relive: "Why you would relive it.",
      photo: "photos/memory3.jpg",
      doodle: "moon",
    },
  ],

  // ---------- Our relationship wrapped ----------
  // Total days and months are counted automatically from startDate.
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
