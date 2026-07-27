# 🚀 DevPulse Launch Social Media Scripts

Copy-paste ready posts for LinkedIn, Reddit, Twitter/X, and Hacker News.

---

## ⚡ READY TO POST — Launch Day (July 2026)

> Live stats as of 2026-07-27: **6,037 items · 256 sources · 58 topics**. Attach `demo/devpulse-demo.mp4` to the LinkedIn post (native upload, not GIF).

### LinkedIn — Launch Post (primary)
```
I missed having one place that just tells me what matters in AI. So I built it.

DevPulse is live: devpulse.tatsatpandey.com

Every day there is more AI and engineering news than anyone can keep up with.
DevPulse pulls from 256 sources — arXiv, GitHub Trending, Hacker News, Reddit,
Hugging Face, YouTube, engineering blogs — and ranks everything by signal:
recency × engagement × relevance. Not clicks. Not outrage.

What's inside:

1. Today — the ranked front page. Open it, scan it, close it.
2. Brief — a daily AI-written digest of the top stories.
3. Models — frontier model releases + a live benchmark leaderboard.
4. Chat — ask questions about the news, with citations.
5. Topics — 58 lanes from LLM infra to DSA, follow what you care about.
6. RSS, dark mode, keyboard search (⌘K), installable as an app.

No login required. No feed to doomscroll. 6,000+ items ranked so far.

I want this to be the tab that stays open on your second monitor —
your agents run on one side, you stay caught up on the other.

Kick the tires and tell me what's broken. Suggestions become features fast :)

#AI #MachineLearning #DevTools #BuildInPublic #OpenSource
```

### X / Twitter — Launch Thread
```
1/ Shipped: DevPulse — a ranked signal feed for AI engineers.

256 sources (arXiv, GitHub, HN, Reddit, HF, YouTube) → one ranked page.
No login. No algorithmic rage-bait. Just signal.

devpulse.tatsatpandey.com

2/ How ranking works: recency × engagement × topic relevance.
An LLM classifies every item into 58 topics; keyword fallback when
the LLM is down. Dedup by URL. 6,000+ items ranked so far.

3/ Bonus features I use daily:
• /brief — AI daily digest
• /models — frontier releases + benchmark leaderboard
• /chat — ask the news questions, get cited answers
• ⌘K search, RSS, PWA install

4/ Built with Bun + Express + Postgres + React 19. Single container on EC2.
Fetch pipeline degrades gracefully when LLM keys run out of quota.

Feedback → features. Try it: devpulse.tatsatpandey.com
```

### Hacker News — Show HN
```
Title: Show HN: DevPulse – A ranked feed of AI papers, repos, and discussions

I was drowning in AI news spread across arXiv, HN, Reddit, GitHub Trending,
and a dozen newsletters, so I built a single ranked front page.

How it works: a cron fetches from 256 sources, scores each item by
recency + platform engagement, classifies it into topics with an LLM
(keyword fallback when quota runs out), dedups by canonical URL, and
serves a ranked feed. There's also a daily AI-written brief, a frontier
model release tracker with a benchmark leaderboard (Artificial Analysis
API), and a chat that answers questions about the news with citations.

Stack: Bun + Express + Postgres, React 19 + Vite, one Docker container.
No login needed for anything above. RSS at /api/rss.

https://devpulse.tatsatpandey.com

Happy to answer questions about the scoring/classification pipeline —
the LLM failover (Groq → Gemini → OpenAI with token buckets) was the
most fun part to build.
```

---

## 📱 LINKEDIN (Thread Strategy)

### Post 1 — Hook (Main Post)
```
Spent the last 3 months building DevPulse.

It started with a problem: I was drowning in AI news.

Newsletters were too slow. Twitter was too noisy. Reddit was scattered.
So I built a ranked feed that pulls from 10+ sources — arXiv, GitHub Trending, 
Hacker News, Reddit, HuggingFace, YouTube — and surfaces what actually matters.

No account needed. No algorithm. Just signal.

It's live now: tatsatpandey.dev

Here's why I think this matters (thread 🧵 below):

#AI #MachineLearning #Startup #ProductDevelopment #DevTools #OpenSource
```

---

### Post 2 — Problem (Reply to thread)
```
Thread: Why I built DevPulse

1/ The problem is real.

I follow 15+ newsletters. Check HN daily. Browse Reddit. Scan arXiv.
By the time I've consumed all this, it's 8am and I've already wasted 2 hours.

Most of it is duplicates. The interesting stuff is buried.

There has to be a better way.
```

---

### Post 3 — Solution (Reply to thread)
```
2/ So here's what DevPulse does differently:

Instead of one person's editorial opinion (newsletters), it aggregates 6 sources:
• Papers (arXiv cs.AI, cs.CL, cs.LG)
• Code (GitHub Trending AI repos)
• Discussions (HN threads, Reddit)
• Models (HuggingFace trending)
• News (Google News AI beat)

Then it ranks by signal: recency × engagement × topic relevance.

No noise. No hype cycle. Just what's actually moving the needle.
```

---

### Post 4 — Tech (Reply to thread)
```
3/ On the tech side:

Built with React 19 + Vite (frontend), Bun + Express (backend), PostgreSQL + Groq LLM.

Deployed on Render. Free tier works great.

Why? Speed matters when you're pulling from 6 sources every 2-6 hours. 
Bun's TypeScript runtime cuts out the build step entirely.

Open to hiring or learning — reply if interested in collab.
```

---

### Post 5 — CTA (Reply to thread)
```
4/ If you're an AI/ML dev, researcher, or founder drowning in the noise:

Give it 5 minutes. No signup needed.

tatsatpandey.dev

Feed it to your community. Share feedback. I'm reading every message.

Thanks for being here from day one 🙏

#SideProject #BuildInPublic
```

---

---

## 🔗 REDDIT Posts

### r/MachineLearning (High Priority — 700k members)
```
Title:
DevPulse — The ranked feed of AI papers, repos, and discussions you actually need (No account required)

Body:
Hi r/MachineLearning,

I built DevPulse after getting burned by newsletters and losing track of important papers 
because of Twitter noise.

**What it does:**
Pulls from arXiv (cs.AI, cs.CL, cs.LG), GitHub Trending, Hacker News, Reddit threads, 
HuggingFace models, and Google News. Ranks by signal (recency × engagement), not by time posted.

**Why it matters:**
- No newsletter fatigue (it's always fresh)
- No algorithm (see everything, ranked by what's actually moving the needle)
- No account needed (just open and browse)
- New topics auto-detected from trending papers

**Tech:**
Bun + React 19 + PostgreSQL + Groq LLM. Open source vibes (considering opensourcing after launch).

**Link:** tatsatpandey.dev

Been lurking here for 2 years. This is my contribution back. 

Feedback appreciated. What am I missing?

---
**Tags:** #MachineLearning #AI #Aggregator #Startup #OpenSource #DevTools
```

---

### r/LocalLLaMA (High Priority — 100k members)
```
Title:
DevPulse: Stay on top of open-source AI without the noise

Body:
Built a simple tool to track the best open-source AI developments in one place.

Since r/LocalLLaMA exploded, it's been hard to catch the signal through the noise.
So I aggregated:
- GitHub trending LLM/AI repos
- HuggingFace trending models & spaces
- arXiv papers (with LLM summaries)
- Reddit discussions (including this sub!)
- HN threads

Everything ranked by what people actually care about.

**Link:** tatsatpandey.dev

No sign-up. No tracking. No ads. Just a ranked feed.

If you're tracking open-source AI progress, this might save you an hour a day.

Would love feedback from this community 🙏

---
**Tags:** #LocalLLaMA #OpenSourceAI #Aggregator #DevTools
```

---

### r/programming (Broader Audience — 2M members)
```
Title:
DevPulse: AI/ML news aggregator built with Bun, React, and PostgreSQL (No account needed)

Body:
Just launched DevPulse — a ranked feed for AI/ML developers.

**Problem I solved:**
Newsletters are slow. Twitter is noise. Reddit is scattered. There's no single place 
to find what's actually happening in AI development.

**Solution:**
Aggregates 6 sources (arXiv, GitHub, HN, Reddit, HuggingFace, Google News).
Ranks by signal, not recency.
Auto-categorizes with LLM + keyword fallback.
Updates every 2-6 hours.

**Tech stack (for devs interested):**
- Frontend: React 19 + Vite + Tailwind CSS
- Backend: Bun + Express + PostgreSQL
- Deploy: Docker on Render
- AI: Groq (llama-3.1-8b) for classification & summarization

**Link:** tatsatpandey.dev

No account required. Open to feedback and feature requests.

If you're building an AI/ML startup, this might be useful for competitive intel 👀

---
**Tags:** #Programming #AI #Startup #OpenSource #Bun #React #PostgreSQL
```

---

### r/startups (Engagement-Focused — 500k members)
```
Title:
I got burned by AI newsletters. So I built my own aggregator in 3 months.

Body:
**The Problem:**
3 months ago, I was signed up to 12 AI newsletters. Every morning = 30+ unread emails.
By the time I read them, the insights were stale. And 90% was duplicates.

Meanwhile, the real breakthroughs were getting buried on HN, Reddit, and arXiv.

I realized: there's no single source of truth for AI development. So I built one.

**The Solution: DevPulse**
A ranked feed that pulls from:
✓ arXiv (academic papers)
✓ GitHub (trending repos)
✓ Hacker News (tech discussions)
✓ Reddit (community debates)
✓ HuggingFace (new models)
✓ Google News (media coverage)

Then it scores by: recency + engagement + topic relevance.

**Key Insight:**
Most people don't care about what's newest—they care what matters most. 
A 2-week-old paper with 5k upvotes is more valuable than a yesterday's quiet release.

**Launch Stats:**
- 45 topics tracked
- 1,800+ items indexed
- 197 sources configured
- Built with Bun (cuts 70% dev time)
- Hosted on Render (stays in free tier 🎉)

**Link:** tatsatpandey.dev

No account. No ads. No bullshit.

This is indie hacker month 1. Happy to share lessons learned if you're building something similar.

---
**Tags:** #Startup #Indie #SideProject #BuildInPublic #ProductDevelopment
```

---

---

## 🐦 TWITTER/X (Atomic Posts — Can be tweeted individually)

### Tweet 1 — Hook (Main Post)
```
I built DevPulse because I was drowning in AI news.

Newsletters too slow.
Twitter too noisy.
Reddit too scattered.

So I aggregated 6 sources into one ranked feed.

No account needed.
No algorithm.
Just signal.

tatsatpandey.dev

#AI #BuildInPublic #Dev
```

---

### Tweet 2 — Problem
```
Real talk: there's no way to stay on top of AI development without losing 2 hours a day.

Newsletters are yesterday's news.
Twitter is chaos.
HN is technical but incomplete.
Reddit has the community takes but hard to scan.
GitHub repos are hard to discover.

We need one feed. I built it.
```

---

### Tweet 3 — Tech Stack
```
DevPulse stack:

Frontend: React 19 + Vite
Backend: Bun + Express  
Database: PostgreSQL
AI: Groq (llama-3.1-8b)
Deploy: Docker on Render

Total cost/month: ~$7
Uptime: 99.9%
Setup time: 3 months (first build)

Open to hiring or learning 🚀
```

---

### Tweet 4 — Social Proof
```
45 topics tracked
1,800+ items indexed
197 sources live
6 sources + LLM ranking

arXiv + GitHub + HN + Reddit + HuggingFace + Google News

In one feed. Ranked by signal.

tatsatpandey.dev
```

---

### Tweet 5 — CTA
```
If you're tired of newsletters, here's the alternative:

DevPulse.dev — one ranked feed of what actually matters in AI.

No signup. No algorithm. No noise.

Give it 5 minutes. I'm on 24/7 for feedback.

tatsatpandey.dev
```

---

---

## 📰 HACKER NEWS

### Title:
```
DevPulse – One ranked feed of what matters in AI dev
```

### URL:
```
https://tatsatpandey.dev
```

### Comment (Post immediately after submission):
```
Hi HN! I'm Tatsat, built this after getting frustrated with newsletters and Twitter noise.

The core idea: aggregating signals is better than any single source.

arXiv has the papers, but missing the tools built around them.
GitHub Trending shows the code, but not the context.
HN catches some of it, but Reddit/Twitter have the community insights.

So I built a system that:
1. Pulls from 6 sources every 2-6 hours
2. Classifies with LLM (+ keyword fallback if LLM fails)
3. Ranks by: recency × engagement × topic relevance
4. Surfaces in a single feed

Tech: Bun + React + PostgreSQL + Groq. Runs on Render free tier.

Open to feedback, feature requests, or hiring conversations.

Ask me anything!
```

---

---

## 📊 POSTING SCHEDULE (Recommended)

| Platform | Day | Time | Post | Notes |
|----------|-----|------|------|-------|
| Hacker News | Wednesday | 6:00 AM EST | Single submission | Peak engagement window |
| Reddit r/ML | Wednesday | 9:00 AM EST | Main post | Wait 30 min, engage comments |
| Reddit r/LocalLLaMA | Wednesday | 11:00 AM EST | Main post | Targeted audience |
| Reddit r/programming | Thursday | 9:00 AM EST | Main post | Broader reach |
| Twitter | Wednesday | 8:30 AM EST | Tweet 1 (Hook) | Start engagement |
| Twitter | Wednesday | 10:00 AM EST | Tweet 2 (Problem) | Keep momentum |
| LinkedIn | Wednesday | 1:00 PM EST | Post 1 (Thread start) | Professional audience ready |
| LinkedIn | Wednesday | 1:15 PM EST | Post 2-5 (Replies) | Thread engagement |
| Twitter | Thursday | 9:00 AM EST | Tweet 3 (Tech) | Secondary wave |
| Twitter | Friday | 8:30 AM EST | Tweet 4 (Social proof) | Weekend prep |

---

---

## 🎯 HASHTAG BUNDLES

### LinkedIn Hashtags
```
#AI #MachineLearning #Startup #ProductDevelopment #DevTools #OpenSource 
#BuildInPublic #SideProject #Indie #TechStartup #SoftwareEngineering
```

### Reddit Tags (in post body)
```
#MachineLearning #AI #Aggregator #Startup #OpenSource #DevTools 
#Bun #React #PostgreSQL #Programming
```

### Twitter Hashtags
```
#AI #MachineLearning #Startup #BuildInPublic #Dev #OpenSource 
#React #PostgreSQL #Bun #DevTools
```

### Hacker News Tags (in comments)
```
None needed — just engage authentically in comments
```

---

---

## 💡 TIPS FOR EACH PLATFORM

### LinkedIn
- **Tone:** Professional but personal. Share the journey, not just the product.
- **Engagement:** Reply to every comment in first 2 hours.
- **Timing:** Wednesday afternoon peaks (people checking news after meetings).
- **Length:** 100-300 chars per post in thread (mobile-first reading).

### Reddit
- **Tone:** Honest, humble. Admit what you don't know.
- **Engagement:** Respond to top 10 comments within 1 hour.
- **Timing:** Wednesday 9-11am EST (peak US workday morning).
- **Length:** Detailed but not wall-of-text (use line breaks).

### Twitter/X
- **Tone:** Punchy, conversational. Use data to back claims.
- **Engagement:** Like/reply to every mention and reply.
- **Timing:** Morning (6-9am EST) and lunch (12-1pm EST).
- **Length:** Use threads (but keep tweets <280 chars for snappiness).

### Hacker News
- **Tone:** Technical, humble, helpful. Show you care about the community.
- **Engagement:** Be online for first 2-3 hours after submission.
- **Timing:** Wednesday 6am EST (peak HN traffic).
- **Comment Style:** Long-form, detailed, address community concerns upfront.

---

## ⚠️ What NOT to do

❌ Don't post the same text everywhere (customize per platform)
❌ Don't ignore comments in first 24 hours (show you're listening)
❌ Don't be overly promotional (share the journey, not just the link)
❌ Don't post on weekends (mid-week peaks for all tech platforms)
❌ Don't oversell or make false claims (let the product speak)

---

## ✅ Success Metrics (First Week)

| Metric | Target | Platform |
|--------|--------|----------|
| Comments/Replies | 50+ | Reddit |
| Upvotes | 500+ | Reddit r/ML |
| HN Rank | Top 10 | Hacker News |
| LinkedIn Engagement | 100+ likes | LinkedIn |
| Twitter Impressions | 5k+ | Twitter |
| Unique Visitors | 2k-5k | Direct from posts |

---

**Good luck! 🚀 Reply to every comment. Share feedback. Build in public.**
