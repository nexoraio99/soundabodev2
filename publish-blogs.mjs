/**
 * Bulk publish 5 SEO-optimized blogs to Soundabode backend
 * Usage: node publish-blogs.mjs
 */

const BACKEND = process.env.BACKEND_URL || 'https://soundabodev2-server.onrender.com';
const PASSWORD = 'admin';

const blogs = [
  //  BLOG 1 
  {
    heading: "Best Music Production Course in Pune 2026: The Complete Guide",
    subheading: "Everything you need to know about music production training in Pune - from course structure and tools to career paths and fees.",
    category: "Academy News",
    author: "Soundabode",
    metaTitle: "Best Music Production Course in Pune 2026 | Soundabode Academy",
    metaDescription: "Looking for the best music production course in Pune? Discover Soundabode Academy's 4-level program - Ableton Live, real studios & internships. Enroll now.",
    metaImage: "https://soundabode.com/Assets/og-music-production-pune.jpg",
    geoTarget: "IN-MH",
    content: `If you have been searching for the best music production course in Pune, you are already one step closer to a career you will love. Pune has quietly become one of India's fastest-growing cities for music and audio education - and for good reason. Between its thriving live music culture, the rise of independent artists, and a booming demand for OTT and gaming audio, the timing to start learning has never been better.

This guide breaks down everything you need to know: what to look for in a course, what topics are covered, career paths available, and why Soundabode Academy in Pimple Saudagar is consistently regarded as Pune's most hands-on music production school.

Why Pune Is a Hub for Music Production Education

Maharashtra has the highest number of music production colleges in India, and Pune sits at the heart of that ecosystem. The city combines a large student population with access to the entertainment industry - from Bollywood-adjacent production houses to independent studios working on Marathi cinema and commercial jingles.

More importantly, Pune's music producers are increasingly working in areas that have nothing to do with film: gaming audio, podcast production, brand films, live electronic music, and social media content. This diversity of demand means a well-trained graduate from Pune can find opportunities both locally and across India.

What to Look for in a Music Production Course

Before enrolling anywhere, evaluate a course against these non-negotiable criteria:
• Real studio training: You should be practicing on acoustically treated rooms and industry-standard monitors - not just headphones at home.
• Curriculum depth: A quality course goes from DAW basics all the way through sound design, mixing, and mastering. Avoid programs that stop at beginner level.
• Industry-relevant tools: Ableton Live, Kontakt, Serum, Ozone, and Waves are used in the real world. Make sure your course teaches these.
• Internship or project exposure: Theory without practice is incomplete. Look for programs that include actual client projects or studio internships.
• Certified instructors: Your teachers should be active producers or engineers, not just academics.

Soundabode Academy: Pune's Most Hands-On Music Production Program

Located at Vision 9 Mall, Pimple Saudagar, Soundabode Academy offers a structured 4-level program that takes students from absolute beginner to professional-grade producer and audio engineer.

Level 1 - Beginner: Music Production & Audio Workstation (3 + 1 months)
This level introduces Ableton Live 11, music theory fundamentals, beat-making, sampling techniques, and full song structure. By the end, students produce their first complete track. No prior experience required. Fee: ₹60,000.

Level 2 - Intermediate: Pre-Degree in Electronic Music Production (3 + 1 months)
Students go deeper into advanced arrangement, professional sound layering, and creative synthesis using Serum, Massive, and the Arturia V Collection. This level separates hobbyists from developing professionals. Fee: ₹60,000.

Level 3 - Expert: Diploma in Audio Engineering (4 months)
Studio-grade training on Kontakt instruments, Moog and Nord synthesizers, and modular setups. Students develop the engineer's ear - understanding signal flow, studio routing, and advanced processing. Fee: ₹60,000.

Level 4 - Advanced Mixing & Mastering (3 + 1 months)
The professional finish. Students master their tracks using Ozone, Waves, and RX7 - the same tools used in commercial release pipelines. Graduates leave ready to deliver release-quality audio. Fee: ₹60,000.

📌 Seats are limited. Pay ₹35,000 to reserve your place. Visit soundabode.com/enroll or call 997-501-6189.

What Tools Will You Learn?

Soundabode's curriculum covers the full professional toolkit:
• Ableton Live 12 Suite (industry standard for electronic music)
• Kontakt & Reaktor (Native Instruments flagship samplers)
• Spectrasonics Omnisphere (industry's premier synthesis workstation)
• Arturia V Collection (classic synth emulations)
• Moog & Nord hardware synthesizers
• Ozone, Waves, and iZotope RX7 (mastering and restoration)
• SoundGym and Syntorial (ear training tools)

Career Paths After a Music Production Course in Pune

Completing a structured music production program opens doors across multiple industries:
• Music Producer: Create and develop original tracks for artists, labels, streaming, and sync licensing.
• Audio Engineer: Work in recording studios, post-production houses, or as a freelance mixer.
• Sound Designer: Create audio assets for gaming, apps, installations, and video content.
• Film & TV Composer: Score original music for OTT series, films, and advertisements.
• Live Sound Engineer: Manage audio for concerts, events, and corporate productions.
• Content Creator: Produce music for your own YouTube, Instagram, or podcast channels.

Music Production Course Fees in Pune: What to Expect

Courses in Pune range from short certificate programs (₹15,000–30,000) to comprehensive diplomas (₹60,000–2,40,000 for full multi-level paths). At Soundabode, each level is ₹60,000 - and includes internship components in three of the four levels, giving you real-world credit that is hard to put a price on.

Flexible installment plans are available. You can start with as little as ₹35,000 to secure your seat.

Frequently Asked Questions

Do I need to know music theory to start?
No. Soundabode's Level 1 is designed for absolute beginners. You will learn everything from scratch, including basic music theory as it applies to production.

Which DAW does Soundabode teach?
The core DAW is Ableton Live - the industry's preferred tool for electronic music production and live performance. Students also gain exposure to other professional software throughout the program.

Is there a certificate at the end?
Yes. Upon completing all four levels, students receive the Soundabode Diploma in Audio Engineering - a credential recognized within Pune's music and production community.

Can I join from Level 2 or 3 if I already have experience?
Absolutely. You can enter at any level based on your existing skillset. Soundabode's team will assess your background and recommend the right entry point.

📌 Ready to start? Visit soundabode.com or WhatsApp +91 99750 16189 to book your free demo session.`
  },

  //  BLOG 2 
  {
    heading: "How to Become a DJ in India in 2026: Step-by-Step Guide for Beginners",
    subheading: "The complete roadmap from zero experience to your first paid gig - equipment, training, branding, and earning potential.",
    category: "DJ Performance",
    author: "Soundabode",
    metaTitle: "How to Become a DJ in India 2026 - Complete Beginner's Guide | Soundabode",
    metaDescription: "Want to become a DJ in India? Learn the exact steps, equipment, training, and career path to go from beginner to performing DJ. Soundabode's guide covers it all.",
    metaImage: "https://soundabode.com/Assets/og-dj-india.jpg",
    geoTarget: "IN",
    content: `DJing in India is no longer a niche hobby - it is a legitimate, well-paying career path. From rooftop parties in Mumbai to massive festival stages, the demand for skilled DJs has exploded over the last five years. Yet most beginners have no idea where to start. Should you buy gear first? Watch YouTube tutorials? Join a course?

This guide walks you through exactly how to become a DJ in India - from zero to your first paid gig - with honest advice on what works and what is a waste of time and money.

Step 1: Understand What DJing Actually Involves

Before investing in gear or courses, know what you are getting into. A DJ's job is to read a crowd and create a seamless musical journey - not just press play on tracks. The core skills you need to develop are:
• Beatmatching: Aligning the beats of two tracks so they blend without clashing.
• EQing: Adjusting bass, mid, and treble frequencies as tracks mix together so the overall sound remains balanced.
• Harmonic mixing: Blending tracks that are musically compatible in key, so transitions sound musical rather than jarring.
• Crowd reading: Knowing when to build energy, drop the beat, or take the room in a new direction.
• Track selection: Building a library of music and knowing which songs work in which moments.

Step 2: Choose Your Equipment Path

You do not need to spend a fortune on gear before you can learn. Here is how the equipment ladder works in India:

Starter Setup (₹20,000–50,000)
A MIDI controller like the Pioneer DDJ-200 or DDJ-400 connected to a laptop running rekordbox or Traktor. This is the right starting point for learning fundamentals at home.

Intermediate Setup (₹1,00,000+)
Moving to a Pioneer CDJ-2000 and DJM mixer setup - the industry standard in clubs worldwide. Learning on CDJs is essential if you plan to perform at professional venues.

Live Performance Setup
Many professional DJs integrate Ableton Live with their CDJ setup for advanced mashups, live remixing, and original production playback.

📌 At Soundabode Academy in Pune, all training is conducted on Pioneer CDJ-2000s and professional DJM mixers - the same gear you will find in clubs across India.

Step 3: Learn the Fundamentals - Properly

YouTube can teach you the theory of beatmatching. But it cannot give you the repetition, feedback, and structured progression that turns a beginner into a confident performer.

What to Cover in a DJ Beginner Course:
• Basic DJ setup and signal flow
• Beatmatching by ear - without sync button as a crutch
• EQ mixing and gain staging
• Track structure: drops, breakdowns, intros, outros
• Looping and hot cues for live creativity
• Pioneer rekordbox for library management and preparation
• Reading BPM, key, and waveform displays
• Your first 30-minute live set

Step 4: Enroll in a Structured DJ Course in Pune

If you are based in or near Pune, Soundabode Academy offers India's most performance-focused DJ training program.

Level 1 - Basic DJ Training (2 months | ₹35,000)
Fundamentals: beatmatching, EQing, track structure, and your first live set on Pioneer gear. Start with ₹20,000 to secure your seat.

Level 2 - Pro DJ Training (4 months | ₹60,000)
Advanced mixing, harmonic blending, digital DJ setups, and performance techniques that separate working DJs from hobbyists.

Level 3 - Professional Performance Path (Mentored | Included)
Artist profile development, mixtape creation, press kit preparation, and gig strategy. Students perform at Soundabode's partner venues in Pune.

Step 5: Build Your DJ Identity

Becoming a DJ in India is not just about technical skills - it is about becoming an artist with a recognizable identity.
• Pick your genre: House, techno, hip-hop, Bollywood remixes, commercial pop - find the sound you love deeply.
• Build a DJ name: Short, memorable, easy to pronounce in Hindi and English.
• Create mixes: Regular SoundCloud or Mixcloud uploads show promoters your sound.
• Photograph and video: Even basic smartphone content from your practice sessions builds your social proof.

Step 6: Get Your First Gig

• College events and private parties: Great first gigs. Low stakes, good practice.
• Local restaurants and lounges: Many Pune venues run DJ nights and actively look for new talent.
• Festival and club circuit: Requires reputation and consistency - where Soundabode's venue network helps.

How Much Does a DJ Earn in India?

• Beginner DJ (local parties, college events): ₹3,000–10,000 per gig
• Mid-level DJ (lounges, corporate events): ₹15,000–50,000 per gig
• Professional club DJ (city circuit): ₹50,000–2,00,000+ per gig
• Festival headliner (NH7 Weekender, Sunburn scale): ₹5,00,000+

📌 Ready to start DJing? Book your free demo session at Soundabode Academy, Pimple Saudagar, Pune. Call +91 99750 16189 or visit soundabode.com.`
  },

  //  BLOG 3 
  {
    heading: "Music Producer Salary in India 2026: What You Can Realistically Earn",
    subheading: "Honest, level-wise salary data for freelancers, studio producers, and film composers across Indian cities.",
    category: "Production",
    author: "Soundabode",
    metaTitle: "Music Producer Salary in India 2026: Realistic Earnings at Every Level",
    metaDescription: "How much does a music producer earn in India in 2026? Get honest, level-wise salary data for freelancers, studio producers, and film composers across Indian cities.",
    metaImage: "https://soundabode.com/Assets/og-producer-salary.jpg",
    geoTarget: "IN",
    content: `One of the first questions anyone considers before pursuing a career in music production is: can I actually make money doing this? The honest answer in 2026 is yes - but your earnings depend heavily on your skill level, specialization, city, and the clients you target.

India's music industry is valued at over ₹2,600 crores and growing at approximately 15% annually, fueled by OTT content, independent music, gaming audio, brand films, and a booming podcast landscape.

Music Producer Salary in India: Level-by-Level Breakdown

Beginner / Fresher Music Producer (0–2 years experience)
• Freelance jingles and social media content: ₹5,000–20,000 per project
• Studio assistant / junior producer: ₹15,000–25,000 per month
• Content creation music (YouTube, reels): ₹10,000–30,000 per month (volume-based)

The key at this stage is building your portfolio and getting real credits on published work, even if the pay is modest.

Mid-Level Music Producer (2–5 years experience)
• Independent artist projects: ₹30,000–80,000 per track
• Corporate audio and brand films: ₹50,000–1,50,000 per project
• Television and OTT background scoring: ₹40,000–1,20,000 per episode
• Studio producer (employed): ₹35,000–60,000 per month

Senior / Professional Music Producer (5+ years)
• Bollywood film scores: ₹2,00,000–15,00,000+ per project
• International sync licensing: ₹1,00,000–5,00,000+ per placement
• Live events and concert production: ₹1,00,000–5,00,000+ per event
• Senior employed producer: ₹80,000–2,00,000 per month

How Location Affects Music Producer Earnings in India

• Mumbai: Highest earning potential. Direct access to Bollywood, advertising agencies, and major studios.
• Bangalore: Strong market for gaming audio, tech brand content, and indie music.
• Pune: Growing hub with proximity to Mumbai. Strong local demand for event audio, Marathi content, and independent music.
• Delhi: Strong corporate and live events market.
• Chennai / Hyderabad: Regional film industries offer significant opportunities.

Specializations That Command Higher Pay

1. Mixing & Mastering Engineer - Skilled mastering engineers charge ₹5,000–50,000 per track.
2. Film and OTT Composer - Established composers earn ₹5,00,000–25,00,000 per season.
3. Gaming Audio Producer - ₹3,00,000–12,00,000 annually at established studios.
4. Live Electronic Music (DJ-Producer) - ₹50,000–5,00,000+ per performance.

Freelance vs. Employed: Which Path Pays More?

A realistic progression for a Soundabode graduate:
• Year 1: Studio assistant or part-time freelance. ₹20,000–35,000/month.
• Year 2–3: Mix of employment and freelance. ₹40,000–80,000/month.
• Year 4–5: Full freelance or senior role. ₹80,000–1,50,000+/month.
• Year 6+: Premium clients, sync deals. Significant income growth.

How to Increase Your Earnings as a Music Producer in India
• Specialize: Mixing engineers and composers are paid more than generalists.
• Build in public: Post work on SoundCloud, YouTube, and Instagram.
• Get on sync licensing platforms: Musicbed, Artlist, and Pond5 generate passive income.
• Serve the OTT boom: Develop relationships with post-production houses.
• Teach: Supplement income through private coaching or workshops.

Is a Music Production Course Worth the Investment?

At Soundabode, each level costs ₹60,000. The full 4-level program totals ₹2,40,000. Compare this to potential first-year freelance income of ₹2,40,000–4,80,000 and the long-term ceiling - the math is straightforward for someone committed to the career.

📌 Invest in your music production career. Start at Soundabode Academy, Pimple Saudagar, Pune. Call +91 99750 16189 or visit soundabode.com/enroll.`
  },

  //  BLOG 4 
  {
    heading: "How to Learn Ableton Live in India 2026: The Beginner's Complete Guide",
    subheading: "A structured learning path for India's most popular DAW - from first install to your first finished track.",
    category: "Production",
    author: "Soundabode",
    metaTitle: "How to Learn Ableton Live in India 2026: Beginner's Complete Guide",
    metaDescription: "New to Ableton Live? Learn how to get started, what to study, and how professional training in Pune gives you a structured path from beginner to working producer.",
    metaImage: "https://soundabode.com/Assets/og-ableton-live.jpg",
    geoTarget: "IN",
    content: `Ableton Live is the world's most popular DAW for electronic music production and live performance. Whether you want to produce EDM, hip-hop, ambient music, or film scores, Ableton Live is the tool professionals trust - and it is the core DAW taught at Soundabode Academy in Pune.

But getting started with Ableton can feel overwhelming. There are two views (Session and Arrangement), an ocean of clips, racks, effects, MIDI editors, and automation lanes. Where do you even begin?

Why Ableton Live Is the Right DAW to Learn in India

• Industry standard for electronic music: House, techno, hip-hop, and experimental genres are almost universally produced in Ableton.
• Session View: Ableton's unique clip-launching grid is used by live performers, DJs, and producers.
• Max for Live integration: Access to thousands of community-built devices.
• Cross-platform: Available on both Mac and Windows.
• Industry employment: Virtually every music production studio lists Ableton as a required skill.

The Two Views of Ableton Live

Session View - A grid of clips arranged in tracks and scenes. Used for improvisation, live performance, beat-making, and experimenting with ideas. Think of it as a musical sandbox.

Arrangement View - A traditional linear timeline. Used for completing a track, arranging sections, and preparing for export or release.

Professional workflow: Most producers develop ideas in Session View, then move them into Arrangement View to finish the track.

Core Ableton Live Concepts to Learn (In Order)

Stage 1: Setup and Navigation (Week 1–2)
• Installing Ableton Live Suite
• Understanding the interface: Mixer, Clip Editor, Device view
• Setting up your audio interface and MIDI keyboard
• Basic MIDI and audio recording

Stage 2: Beat Making and Sound Design (Week 3–6)
• Drum rack for beat programming
• Synthesis: Wavetable and Operator
• Sampling: chop, pitch, and layer audio
• MIDI effects: Arpeggiator, Chord, Scale
• Building a complete 16-bar groove

Stage 3: Song Structure and Arrangement (Week 7–10)
• Moving clips from Session to Arrangement View
• Automation - volume, filter, effects
• Song sections: intro, build, drop, breakdown
• Creating transitions
• Finishing your first complete track

Stage 4: Mixing in Ableton Live (Week 11–14)
• Gain staging
• EQ Eight: cutting and boosting frequencies
• Compression with Compressor and Glue Compressor
• Reverb and delay: space and depth
• Sidechain compression
• Creating a cohesive mix

Stage 5: Advanced Tools and Export (Week 15+)
• Max for Live
• Third-party VST plugins (Serum, etc.)
• Exporting stems for collaboration
• Preparing release-ready WAV files

Can You Learn Ableton Live on YouTube Alone?

Yes - up to a point. The problem is that self-teaching typically produces:
• Knowledge gaps you don't know exist
• Bad workflow habits that slow you down later
• No feedback on whether your mixes sound good
• No structured progression

This is where structured, studio-based training like Soundabode's program changes the outcome.

Learning Ableton Live at Soundabode Academy, Pune

• Level 1: Ableton fundamentals, Session View, beat-making, first complete track.
• Level 2: Advanced sound design with Serum and Arturia, arrangement, complex automation.
• Level 3: Professional signal chains, studio-grade processing, Kontakt integration.
• Level 4: Final mixdown and mastering with Ozone and Waves from within Ableton sessions.

Frequently Asked Questions

Is Ableton Live good for beginners?
Yes - but it has a steeper learning curve than FL Studio. The investment is worth it for both production and live performance.

Which version should I get?
Ableton Live Suite is the professional choice - it includes all instruments, effects, and Max for Live.

Can Ableton be used for Bollywood music production?
Absolutely. Ableton handles orchestral arrangement, Indian instrument sampling via Kontakt, and hybrid electronic-acoustic production.

How long does it take to learn professionally?
With consistent practice and structured training, expect 3–6 months to reach professional beginner level and 1–2 years for genuine professional-grade skills.

📌 Learn Ableton Live on professional studio equipment with certified trainers. Visit soundabode.com or call +91 99750 16189 to book your demo session.`
  },

  //  BLOG 5 
  {
    heading: "Audio Engineering Course in India 2026: Career Scope, Skills & How to Get Started",
    subheading: "Everything you need to know about audio engineering careers, skills, and India's best diploma program in Pune.",
    category: "Academy News",
    author: "Soundabode",
    metaTitle: "Audio Engineering Course India 2026: Career, Scope & How to Start | Soundabode",
    metaDescription: "Thinking about an audio engineering course in India? Discover the career scope, salary potential, top skills to learn, and Pune's best diploma program at Soundabode.",
    metaImage: "https://soundabode.com/Assets/og-audio-engineering.jpg",
    geoTarget: "IN",
    content: `India's entertainment and media industries are creating a surge in demand for trained audio engineers - and yet the supply of genuinely skilled professionals remains far short of what the market needs. If you are considering an audio engineering course in India, the timing and the opportunity are both excellent.

What Is Audio Engineering?

Audio engineering is the technical and creative discipline of capturing, shaping, mixing, and delivering sound. An audio engineer's job spans every stage of the production pipeline.

Audio engineers work in:
• Recording studios: Setting up and operating recording sessions.
• Post-production houses: Editing, mixing, and mastering audio for films, OTT series, and advertisements.
• Live sound: Operating PA systems and monitoring for concerts and events.
• Broadcast: Managing audio for television, radio, and live streaming.
• Gaming: Creating and implementing sound assets for video games.

Why the Demand for Audio Engineers in India Is Growing

• OTT explosion: Netflix, Amazon Prime, Hotstar, and 10+ major platforms producing original Indian content.
• Independent music boom: Artists releasing music without labels need engineers.
• Podcast industry: Growing at over 30% annually in India.
• Gaming industry: Projected to reach $5 billion by 2027.
• Live events recovery: Post-pandemic rebound with increased production quality investment.

Core Skills Covered in a Professional Audio Engineering Course

Acoustics and Signal Flow - Understanding how sound behaves in a room and through a signal chain is fundamental.

Microphone Technique - Different microphones have different characteristics. Knowing which to use and where to place it is one of the highest-leverage recording skills.

Digital Audio Workstations (DAWs) - Ableton Live, Pro Tools, Logic Pro, or Cubase. Ableton Live, taught at Soundabode, is valuable for its versatility.

Mixing - Balancing multiple tracks using EQ, compression, reverb, delay, stereo imaging, and automation. The most in-demand audio skill in the Indian market.

Mastering - The final stage: optimizing loudness, tonal balance, and stereo field. Tools like iZotope Ozone are the industry standard.

Studio Outboard and Hardware - Understanding analog processors - compressors, EQs, preamps, converters - separates academy-trained engineers from self-taught DAW users.

Soundabode's Diploma in Audio Engineering

Soundabode Academy's Level 3 program - 4 months of intensive studio-based training in Pimple Saudagar, Pune.

Curriculum Highlights:
• Advanced synthesizers: Moog, Nord, and modular setups
• Kontakt and Reaktor for sample-based sound design
• Studio signal chain construction
• Advanced microphone placement and recording
• Professional mixing methodology
• Integration of hardware and software

Fee: ₹60,000. Duration: 4 months.

Audio Engineering vs. Music Production

• Music producers focus on the creative side - composition, arrangement, sound selection.
• Audio engineers focus on the technical side - capturing, processing, mixing, and delivering sound.

In practice, the roles often overlap. Soundabode's full 4-level program develops exactly this dual capability.

Audio Engineering Career Paths and Salaries in India

• Recording Engineer: ₹20,000–60,000/month or ₹5,000–30,000/session
• Mixing Engineer: ₹10,000–50,000/track - highest-paid specialization
• Mastering Engineer: ₹5,000–40,000/track - few specialists, high demand
• Live Sound Engineer: ₹15,000–75,000/show
• Post-Production Audio Engineer (OTT/Film): ₹30,000–1,50,000/month
• Game Audio Designer: ₹3,00,000–12,00,000/year

How to Choose the Right Audio Engineering Course

• Studio access: Real-world training in acoustically treated rooms is irreplaceable.
• Curriculum breadth: Recording, mixing, mastering, live sound - not just one vertical.
• Industry tools: Ableton, Pro Tools, Ozone, Waves, Kontakt.
• Instructors: Active engineers with real credits.
• Location: Proximity to a music market matters for networking and internships.

Why Pune Is Excellent for Audio Engineering

Pune offers lower cost of living than Mumbai while maintaining proximity to India's largest music and film market, a vibrant independent music scene, and growing infrastructure for media production.

Soundabode's location in Pimple Saudagar - within Vision 9 Mall - means students have access to a professional studio environment without traveling to Mumbai.

Frequently Asked Questions

Do I need to know music to study audio engineering?
Basic music literacy helps but is not mandatory. Soundabode begins with DAW fundamentals and applied music theory.

Is audio engineering a good career in India in 2026?
Yes - especially in mixing, mastering, and post-production for OTT.

Can I study audio engineering online?
You can learn concepts online, but real audio engineering requires studio-based training with professional monitoring, gear, and mentor feedback.

📌 Start your audio engineering journey at Soundabode Academy, Pune. Book a free demo at soundabode.com or WhatsApp +91 99750 16189.`
  }
];

//  Publish function 
async function publishBlog(blog, index) {
  const payload = { ...blog, password: PASSWORD };
  
  try {
    const res = await fetch(`${BACKEND}/api/blogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Blog ${index + 1} published: "${blog.heading}"`);
      console.log(`   SEO Title: ${blog.metaTitle}`);
      console.log(`   GEO: ${blog.geoTarget}`);
    } else {
      console.error(`❌ Blog ${index + 1} failed: ${data.message}`);
    }
  } catch (err) {
    console.error(`❌ Blog ${index + 1} error: ${err.message}`);
  }
}

//  Main 
async function main() {
  console.log('');
  console.log(''.repeat(60));
  console.log('  SOUNDABODE - Publishing 5 SEO Blog Posts');
  console.log(`  Backend: ${BACKEND}`);
  console.log(''.repeat(60));
  console.log('');

  for (let i = 0; i < blogs.length; i++) {
    await publishBlog(blogs[i], i);
    // Small delay between posts
    if (i < blogs.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('');
  console.log(''.repeat(60));
  console.log('  ✅ All done! Check /blog or /blog-admin to verify.');
  console.log(''.repeat(60));
}

main();
