// Post Library & Templates Vault for LinkedIn and Instagram
import { supabase } from "@/integrations/supabase/client";
import { getApiCredentials, isSupabaseConfigured } from "./supabase-config";
import type { Platform } from "./platform-constraints";

export interface PostTemplate {
  id: string;
  title: string;
  category:
    | "Founder & Thought Leadership"
    | "Product & Feature Launches"
    | "Visual Storytelling"
    | "Engagement & Questions";
  content: string;
  targetPlatform?: Platform | null;
  isCustom?: boolean;
  createdAt?: string;
}

export const TEMPLATE_CATEGORIES = [
  "Founder & Thought Leadership",
  "Product & Feature Launches",
  "Visual Storytelling",
  "Engagement & Questions",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const BUILT_IN_TEMPLATES: PostTemplate[] = [
  // 1. Founder & Thought Leadership
  {
    id: "ftl-1",
    title: "The Hardest Lesson Learned Building v1",
    category: "Founder & Thought Leadership",
    targetPlatform: "linkedin",
    content: `Most founders obsess over perfection. We almost killed our company doing that.

3 months ago, we postponed our launch twice because our dashboard wasn't "flawless."

Here is what actually happened when we finally shipped our messy beta:
• 4 enterprise teams signed up within 48 hours
• Nobody cared about the minor CSS glitch
• Everyone cared about the 1 feature that saved them 4 hours a week

The lesson?
Validation beats polish every single time. Ship before you feel ready.

What is a decision in your journey you wish you made faster?

#Leadership #Startups #ProductManagement #Founders #Entrepreneurship`,
  },
  {
    id: "ftl-2",
    title: "Metric Milestone Breakdown",
    category: "Founder & Thought Leadership",
    targetPlatform: "linkedin",
    content: `We just crossed 10,000 active users. Zero paid ads.

Here is the exact playbook we used to scale organically:

1. Build in public: Share real numbers, wins, and painful churn moments.
2. Direct founder outreach: Personally onboarding the first 150 power users.
3. Content that solves problems: Actionable teardowns instead of generic fluff.
4. Tight feedback loops: Shipping user requests in under 72 hours.

It wasn't overnight magic. It was 18 months of compounding micro-efforts.

To everyone who tested our early versions: thank you for believing in us.

#BuildingInPublic #SaaS #Growth #Milestones #TechStartups`,
  },
  {
    id: "ftl-3",
    title: "The Counter-Intuitive Truth About Scaling",
    category: "Founder & Thought Leadership",
    targetPlatform: "linkedin",
    content: `Unpopular opinion: Scaling too early is worse than growing too slowly.

When you add complexity before nailing repeatability:
→ Communication overhead skyrockets
→ Customer feedback gets diluted
→ Team agility grinds to a halt

Keep the team lean. Master unit economics. Let demand pull you forward.

Agree or disagree? Drop your thoughts below.

#Strategy #BusinessGrowth #StartupLife #ExecutiveMindset`,
  },

  // 2. Product & Feature Launches
  {
    id: "pfl-1",
    title: "Problem / Solution Feature Release",
    category: "Product & Feature Launches",
    targetPlatform: "linkedin",
    content: `Publishing content across LinkedIn and Instagram shouldn't require 10 open browser tabs.

Today, we're officially launching: Broadcast 2.0 🚀

Here is what's new:
✨ Unified multi-channel composer with instant live previews
✨ Direct PC drag-and-drop media pipeline
✨ Real-time publishing dispatch monitor & audit receipts
✨ Built-in AI viral hook optimizer and format converter

Ready to reclaim 5+ hours every week?
Try the interactive studio demo today — link in comments!

#ProductLaunch #SocialMediaMarketing #Automation #ProductivityTools`,
  },
  {
    id: "pfl-2",
    title: "Visual Feature Reveal (Instagram)",
    category: "Product & Feature Launches",
    targetPlatform: "instagram",
    content: `Say hello to effortless multi-channel publishing. ✨

We reimagined how creators and brands schedule visual stories and executive updates:
📱 One composer for LinkedIn & Instagram
⚡ Real-time container packaging & delivery
🎨 Drag-and-drop media straight from your computer
💡 AI-assisted viral hooks and hashtag recommendations

Swipe through to see the before and after →

Link in bio to test the studio for free.

#ProductLaunch #SocialSync #InstagramCreators #ContentCreator #CreatorTools #WorkflowHacks`,
  },
  {
    id: "pfl-3",
    title: "What's New: Release Notes & Changelog",
    category: "Product & Feature Launches",
    targetPlatform: "linkedin",
    content: `Release Notes: Broadcast v2.4 is live! 📦

Based on your community feedback, here are this week's upgrades:
1. Native PC File Fetching: Upload high-res images directly without cloud storage friction.
2. Instagram Container v20.0: Automatic 2-step media validation.
3. 1-Click Reposting: Clone any past post directly back into your composer.

Huge thank you to our beta testers for guiding this roadmap!

#Changelog #ProductUpdates #TechInnovation #SaaSRelease`,
  },

  // 3. Visual Storytelling
  {
    id: "vs-1",
    title: "Behind-The-Scenes: How We Ship",
    category: "Visual Storytelling",
    targetPlatform: "instagram",
    content: `Behind every clean interface is a mountain of discarded wireframes and late-night debugging sessions. 💻✨

Swipe to see:
1️⃣ Day 1 sketch on a blank napkin
2️⃣ The Figma prototype that almost broke us
3️⃣ Final production code running live in production

Creativity is 10% inspiration and 90% iteration.

Which stage of your creative process do you find most challenging?

#BehindTheScenes #CreatorWorkflow #DesignInspiration #UIUXDesign #MakersGonnaMake #DevLife`,
  },
  {
    id: "vs-2",
    title: "Creator Tip: The 3-Second Visual Hook",
    category: "Visual Storytelling",
    targetPlatform: "instagram",
    content: `Stop letting people scroll past your best content. 🛑

Here are 3 visual rules we use for high-converting posts:
🔹 Rule 1: Strong contrast in the first 0.5 seconds.
🔹 Rule 2: Big typography — if you can't read it on mobile, delete it.
🔹 Rule 3: Visual pacing — space out bullet points with intentional whitespace.

Save this post to reference for your next campaign! 📌

#ContentTips #VisualDesign #SocialStrategy #InstagramGrowth #MarketingTips`,
  },
  {
    id: "vs-3",
    title: "Quote Card & Mindset Anchor",
    category: "Visual Storytelling",
    targetPlatform: "linkedin",
    content: `"Simplicity is prerequisite for reliability." — Edsger W. Dijkstra

In an era where every tool tries to do 50 things poorly, we choose to do two things exceptionally well:
1. Rock-solid LinkedIn publishing.
2. Flawless Instagram visual containers.

Focus is the ultimate competitive advantage.

#Philosophy #DesignThinking #ProductStrategy #SoftwareEngineering`,
  },

  // 4. Engagement & Questions
  {
    id: "eq-1",
    title: "Open Discussion / Hot Take",
    category: "Engagement & Questions",
    targetPlatform: "linkedin",
    content: `Hot take: Scheduling your social posts weeks in advance can actually harm your organic reach IF you ignore real-time conversation.

Automation should handle the mechanics.
Human connection must handle the conversation.

How do you balance scheduled publishing with spontaneous engagement?
Drop your strategy below — reading every reply!

#SocialMediaStrategy #ThoughtLeadership #CommunityBuilding #MarketingDebate`,
  },
  {
    id: "eq-2",
    title: "Advice Request / Community Poll",
    category: "Engagement & Questions",
    targetPlatform: "instagram",
    content: `Quick question for all content creators and social leads: 👇

When creating carousel content, what drives more saves for your brand?
A) Actionable tactical steps (step 1, step 2, step 3)
B) Contrarian hot takes and mindset shifts
C) Real data teardowns and receipts

Vote A, B, or C in the comments! Let's see the consensus. 💬

#CreatorCommunity #PollTime #ContentStrategy #SocialMediaTips #CreatorEconomy`,
  },
  {
    id: "eq-3",
    title: "The Weekend Reflection Prompt",
    category: "Engagement & Questions",
    targetPlatform: "linkedin",
    content: `Friday afternoon reflection:

What is 1 win from this week you're genuinely proud of?
(Big or small — closed a deal, shipped a feature, or simply unplugged on time).

Celebrate yourself in the comments below! 👇

#FridayReflection #Wins #FounderCommunity #WorkLifeHarmony`,
  },
];

const LOCAL_TEMPLATES_KEY = "social_sync_custom_templates";

export async function listAllTemplates(): Promise<PostTemplate[]> {
  const customTemplates: PostTemplate[] = [];

  // 1. Try fetching from Supabase if configured & live
  const creds = getApiCredentials();
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("post_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        for (const row of data as any[]) {
          customTemplates.push({
            id: row.id,
            title: row.title,
            category: row.category as TemplateCategory,
            content: row.content,
            targetPlatform: row.target_platform as Platform | null,
            isCustom: true,
            createdAt: row.created_at,
          });
        }
      }
    } catch (e) {
      console.warn("Could not query post_templates from Supabase:", e);
    }
  }

  // 2. Read local storage custom templates
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        for (const item of stored) {
          if (!customTemplates.some((t) => t.id === item.id)) {
            customTemplates.push({ ...item, isCustom: true });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse custom local templates:", e);
    }
  }

  return [...customTemplates, ...BUILT_IN_TEMPLATES];
}

export async function saveCustomTemplate(template: {
  title: string;
  category: TemplateCategory;
  content: string;
  targetPlatform?: Platform | null;
}): Promise<PostTemplate> {
  const creds = getApiCredentials();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const newTemplate: PostTemplate = {
    id,
    title: template.title,
    category: template.category,
    content: template.content,
    targetPlatform: template.targetPlatform ?? null,
    isCustom: true,
    createdAt,
  };

  // If live Supabase
  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      const { data: user } = await supabase.auth.getUser();
      await supabase.from("post_templates").insert({
        id,
        user_id: user?.user?.id ?? null,
        title: template.title,
        category: template.category,
        content: template.content,
        target_platform: template.targetPlatform ?? null,
        created_at: createdAt,
      });
    } catch (e) {
      console.warn(
        "Failed saving template to Supabase, falling back to local:",
        e,
      );
    }
  }

  // Always save to localStorage for offline / sandbox persistence
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(newTemplate);
      localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Failed writing custom template to local storage:", e);
    }
  }

  return newTemplate;
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  const creds = getApiCredentials();

  if (creds.mode === "live" && isSupabaseConfigured()) {
    try {
      await supabase.from("post_templates").delete().eq("id", id);
    } catch (e) {
      console.warn("Failed deleting template from Supabase:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        const filtered = list.filter((t: any) => t.id !== id);
        localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn("Failed deleting custom template from local storage:", e);
    }
  }
}
