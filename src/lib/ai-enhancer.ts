// Smart Post Suggestions, Viral Hook Generator, and Format Converters
// Supports custom OpenAI or Google Gemini keys when supplied,
// with rich built-in contextual heuristics when running without keys.

import { getApiCredentials } from "./supabase-config";
import type { Platform } from "./platform-constraints";

export interface HookSuggestion {
  id: string;
  hook: string;
  platform: Platform;
  angle: "contrarian" | "curiosity" | "data-driven" | "story" | "actionable";
}

export interface HashtagSuggestion {
  tag: string;
  relevanceScore: number;
}

// 1. Viral Hook Generator
export async function generateViralHooks(
  topicOrDraft: string,
  platform: Platform,
): Promise<HookSuggestion[]> {
  const creds = getApiCredentials();
  const rawText =
    topicOrDraft.trim() || "modern product leadership and social media growth";

  // If user provided custom OpenAI or Gemini key, attempt live AI generation
  if (creds.aiApiKey) {
    try {
      if (creds.aiApiKey.startsWith("AIzaSy")) {
        // Gemini API
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${creds.aiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Generate 5 viral, scroll-stopping opening lines (hooks) for a ${platform} post about: "${rawText}". Output as a clean JSON array of strings only. No markdown formatting.`,
                    },
                  ],
                },
              ],
            }),
          },
        );
        if (geminiRes.ok) {
          const json = await geminiRes.json();
          const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(
              candidateText.replace(/```json|```/g, "").trim(),
            );
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.slice(0, 5).map((hook: string, idx: number) => ({
                id: `ai-hook-${idx}`,
                hook: hook.replace(/^["']|["']$/g, "").trim(),
                platform,
                angle: (
                  [
                    "contrarian",
                    "curiosity",
                    "data-driven",
                    "story",
                    "actionable",
                  ] as const
                )[idx % 5],
              }));
            }
          }
        }
      } else if (creds.aiApiKey.startsWith("sk-")) {
        // OpenAI API
        const openAiRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${creds.aiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are an elite viral copywriter for ${platform}. Output exactly 5 punchy opening lines as a valid JSON array of strings.`,
                },
                {
                  role: "user",
                  content: `Create 5 viral opening hooks for: ${rawText}`,
                },
              ],
              response_format: { type: "json_object" },
            }),
          },
        );
        if (openAiRes.ok) {
          const json = await openAiRes.json();
          const parsed = JSON.parse(
            json.choices?.[0]?.message?.content ?? "{}",
          );
          const hooks = parsed.hooks || Object.values(parsed)[0];
          if (Array.isArray(hooks) && hooks.length > 0) {
            return hooks.slice(0, 5).map((hook: string, idx: number) => ({
              id: `ai-hook-${idx}`,
              hook: String(hook).trim(),
              platform,
              angle: (
                [
                  "contrarian",
                  "curiosity",
                  "data-driven",
                  "story",
                  "actionable",
                ] as const
              )[idx % 5],
            }));
          }
        }
      }
    } catch (e) {
      console.warn("AI generation fell back to algorithmic heuristics:", e);
    }
  }

  // High-converting algorithmic hook generation tailored per platform
  const subject = extractCoreTopic(rawText);

  if (platform === "linkedin") {
    return [
      {
        id: "hook-1",
        hook: `Most people view ${subject} backwards. Here is what 7 years of execution taught me:`,
        platform: "linkedin",
        angle: "contrarian",
      },
      {
        id: "hook-2",
        hook: `I analyzed over 250 top teams doing ${subject}. The #1 differentiator wasn't what I expected:`,
        platform: "linkedin",
        angle: "data-driven",
      },
      {
        id: "hook-3",
        hook: `A mentor gave me advice on ${subject} in 2021 that I initially ignored. It was a massive mistake.`,
        platform: "linkedin",
        angle: "story",
      },
      {
        id: "hook-4",
        hook: `If you want to master ${subject} in 2026, stop doing these 3 common things immediately:`,
        platform: "linkedin",
        angle: "actionable",
      },
      {
        id: "hook-5",
        hook: `The silent truth about ${subject} that executive leaders rarely talk about publicly:`,
        platform: "linkedin",
        angle: "curiosity",
      },
    ];
  }

  // Instagram hooks
  return [
    {
      id: "hook-ig-1",
      hook: `Stop scrolling if you care about ${subject}. Here's the cheat code nobody talks about: 🛑✨`,
      platform: "instagram",
      angle: "curiosity",
    },
    {
      id: "hook-ig-2",
      hook: `3 simple shifts in ${subject} that completely changed our results this month (save this): 📌👇`,
      platform: "instagram",
      angle: "actionable",
    },
    {
      id: "hook-ig-3",
      hook: `Unpopular opinion about ${subject} that might ruffle some feathers... 🤫☕`,
      platform: "instagram",
      angle: "contrarian",
    },
    {
      id: "hook-ig-4",
      hook: `Behind the scenes: what nobody shows you about ${subject} in real life 📸👀`,
      platform: "instagram",
      angle: "story",
    },
    {
      id: "hook-ig-5",
      hook: `The exact 4-step framework we used to scale ${subject} from scratch: 🚀📱`,
      platform: "instagram",
      angle: "data-driven",
    },
  ];
}

function extractCoreTopic(text: string): string {
  const cleaned = text
    .replace(/[#@\n\r\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 3);
  if (words.length === 0) return "building great products";
  if (words.length <= 4) return words.join(" ");
  return words.slice(0, 3).join(" ");
}

// 2. Format Converter
export function convertToLinkedInFormat(content: string): string {
  if (!content.trim()) return "";

  // Split into paragraphs or sentences
  const lines = content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const formattedLines: string[] = [];

  // Opening hook
  if (lines.length > 0) {
    formattedLines.push(lines[0]);
    formattedLines.push(""); // empty line for spacing
  }

  // Body: punchy single-line paragraphs with spacing
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#")) continue; // strip existing hashtags to put at bottom

    // Check if line looks like a list
    if (line.match(/^[\d\-*•]/)) {
      formattedLines.push(`• ${line.replace(/^[\d\-*•.]+\s*/, "")}`);
    } else {
      formattedLines.push(line);
      formattedLines.push("");
    }
  }

  // Ensure clean bottom spacing
  let result = formattedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Extract or generate 3-5 strategic bottom hashtags
  const existingTags = content.match(/#\w+/g) || [];
  const strategicTags =
    existingTags.length >= 3
      ? existingTags.slice(0, 5)
      : [
          "#Leadership",
          "#Productivity",
          "#Innovation",
          "#Growth",
          "#Management",
        ];

  result += `\n\n${strategicTags.join(" ")}`;
  return result;
}

export function convertToInstagramFormat(content: string): string {
  if (!content.trim()) return "";

  const lines = content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const formattedLines: string[] = [];

  // Opening visual hook with emoji
  if (lines.length > 0) {
    const first = lines[0];
    const hasEmoji = /[\p{Emoji}]/u.test(first);
    formattedLines.push(hasEmoji ? first : `${first} ✨`);
    formattedLines.push("");
  }

  // Body with clean bullets and visual spacing
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#")) continue;

    if (line.match(/^[\d\-*•]/)) {
      formattedLines.push(`🔹 ${line.replace(/^[\d\-*•.]+\s*/, "")}`);
    } else {
      formattedLines.push(line);
      formattedLines.push("");
    }
  }

  let result = formattedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Add swipe CTA if not present
  if (
    !result.toLowerCase().includes("swipe") &&
    !result.toLowerCase().includes("save")
  ) {
    result +=
      "\n\nSwipe through for the full breakdown →\nSave this for later! 📌";
  }

  // Bottom hashtags (spaced)
  const existingTags = content.match(/#\w+/g) || [];
  const igTags =
    existingTags.length >= 5
      ? existingTags.slice(0, 8)
      : [
          "#SocialSync",
          "#ContentCreator",
          "#VisualStorytelling",
          "#GrowthHacks",
          "#MarketingTips",
          "#CreatorEconomy",
        ];

  result += `\n\n.\n.\n${igTags.join(" ")}`;
  return result;
}

// 3. Hashtag Optimizer
export function suggestHashtags(
  content: string,
  platform: Platform,
): HashtagSuggestion[] {
  const lower = content.toLowerCase();
  const suggestions: HashtagSuggestion[] = [];

  const add = (tag: string, score: number) => {
    if (!suggestions.some((s) => s.tag === tag)) {
      suggestions.push({ tag, relevanceScore: score });
    }
  };

  // Keyword associations
  if (
    lower.includes("ai") ||
    lower.includes("tech") ||
    lower.includes("software") ||
    lower.includes("code")
  ) {
    add("#ArtificialIntelligence", 95);
    add("#TechInnovation", 90);
    add("#FutureOfTech", 85);
  }
  if (
    lower.includes("founder") ||
    lower.includes("startup") ||
    lower.includes("build") ||
    lower.includes("launch")
  ) {
    add("#StartupLife", 98);
    add("#BuildingInPublic", 95);
    add("#Founders", 92);
  }
  if (
    lower.includes("lead") ||
    lower.includes("team") ||
    lower.includes("management") ||
    lower.includes("culture")
  ) {
    add("#Leadership", 96);
    add("#CompanyCulture", 88);
    add("#PeopleFirst", 84);
  }
  if (
    lower.includes("growth") ||
    lower.includes("scale") ||
    lower.includes("metric") ||
    lower.includes("revenue")
  ) {
    add("#BusinessGrowth", 94);
    add("#ScaleUp", 89);
    add("#ProductStrategy", 86);
  }
  if (
    lower.includes("design") ||
    lower.includes("ui") ||
    lower.includes("ux") ||
    lower.includes("visual")
  ) {
    add("#DesignThinking", 93);
    add("#UIUX", 91);
    add("#VisualStorytelling", 87);
  }

  // Defaults per platform if content is brief
  if (platform === "linkedin") {
    add("#ProfessionalDevelopment", 82);
    add("#Productivity", 80);
    add("#BusinessStrategy", 78);
  } else {
    add("#ContentStrategy", 85);
    add("#CreatorTips", 83);
    add("#SocialMediaMarketing", 80);
  }

  return suggestions
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 8);
}

// 4. Call-To-Action (CTA) Generator
export const CTA_SUGGESTIONS: Record<
  Platform,
  { label: string; text: string }[]
> = {
  linkedin: [
    {
      label: "Open Discussion",
      text: "\n\nWhat is your perspective on this? Drop a comment below — I'd love to hear your thoughts.",
    },
    {
      label: "Share / Repost",
      text: "\n\nFound this valuable? Repost ♻️ to share it with your network.",
    },
    {
      label: "Direct Advice Question",
      text: "\n\nHow is your team handling this challenge right now? Let's discuss in the comments.",
    },
    {
      label: "Resource Link Hook",
      text: "\n\nI put together a full teardown guide. Drop a 'SEND' below and I'll send you the direct link!",
    },
    {
      label: "Follow for More",
      text: "\n\nIf you enjoyed this insight, follow me for weekly frameworks on product, scale, and leadership.",
    },
  ],
  instagram: [
    {
      label: "Save for Later",
      text: "\n\nSave this post so you can reference it when planning your next launch! 📌",
    },
    {
      label: "Share to Story",
      text: "\n\nShare this to your story if someone in your network needs to see this today! 📲✨",
    },
    {
      label: "Comment Prompt",
      text: "\n\nDrop a 🔥 below if you agree, or share your take in the comments! 👇",
    },
    {
      label: "Link in Bio",
      text: "\n\nTap the link in bio to try the studio and start publishing today! 🔗",
    },
    {
      label: "Tag a Friend",
      text: "\n\nTag a creator or founder who is currently building their audience! 👥",
    },
  ],
};
