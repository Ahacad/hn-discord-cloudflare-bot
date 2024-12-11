// Constants
const SCORE_THRESHOLD = 150;
const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

export default {
  // Scheduled task handler (runs every 10 minutes)
  async scheduled(event, env, ctx) {
    await handleCron(env);
  },

  // HTTP request handler (just returns OK)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Test endpoint to manually trigger the bot
    if (url.pathname === "/test") {
      try {
        await handleCron(env);
        return new Response("Test run completed successfully", { status: 200 });
      } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }

    // Test endpoint to process a specific story ID
    if (url.pathname.startsWith("/test-story/")) {
      const storyId = url.pathname.split("/")[2];
      try {
        await processStory(storyId, env);
        return new Response(`Processed story ${storyId}`, { status: 200 });
      } catch (error) {
        return new Response(
          `Error processing story ${storyId}: ${error.message}`,
          { status: 500 },
        );
      }
    }

    return new Response("OK");
  },
};

async function handleCron(env) {
  try {
    // Verify webhook URL is configured
    if (!env.DISCORD_WEBHOOK_URL) {
      throw new Error("DISCORD_WEBHOOK_URL environment variable not set");
    }

    // Fetch top stories from HN
    const topStories = await fetch(`${HN_API_BASE}/topstories.json`).then((r) =>
      r.json(),
    );

    // Process only the first 100 stories to stay within limits
    const storiesToCheck = topStories.slice(0, 100);

    for (const storyId of storiesToCheck) {
      await processStory(storyId, env);
    }
  } catch (error) {
    console.error("Error in cron handler:", error);
  }
}

async function processStory(storyId, env) {
  try {
    // Check if we've already processed this story
    const processed = await env.HN_POSTS.get(`story:${storyId}`);
    if (processed) {
      console.log(`Story ${storyId} already processed`);
      return;
    }

    // Fetch story details
    const story = await fetch(`${HN_API_BASE}/item/${storyId}.json`).then((r) =>
      r.json(),
    );

    // Verify story exists and meets score threshold
    if (!story || !story.score || story.score < SCORE_THRESHOLD) {
      console.log(
        `Story ${storyId} does not meet criteria (score: ${story?.score})`,
      );
      return;
    }

    // Calculate time differences
    const timeAgo = getTimeAgo(story.time * 1000);
    const delta = Date.now() - story.time * 1000;

    // Add status emoji based on time
    let statusEmoji = "";
    let embedColor = 0xff6600; // HN orange as the default color
    if (delta <= 4 * 60 * 60 * 1000) {
      // 4 hours
      statusEmoji = "🔥 ";
      embedColor = 0xff0000; // Red for new stories
    } else if (delta >= 2 * 24 * 60 * 60 * 1000) {
      // 2 days
      statusEmoji = "❄️ ";
      embedColor = 0x00bfff; // deep sky blue for cold posts
    }

    // Create Discord embed
    const embed = {
      title: story.title,
      url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      color: embedColor,
      fields: [
        {
          name: "Score",
          value: `${story.score}+`,
          inline: true,
        },
        {
          name: "Comments",
          value: `[${
            story.descendants || 0
          }+](https://news.ycombinator.com/item?id=${story.id})`,
          inline: true,
        },
      ],
      footer: { text: `Posted ${timeAgo}` },
    };

    // Add text content if present (for Ask HN, etc)
    if (story.text) {
      embed.description = story.text.replace(/<[^>]*>/g, "");
    }

    // Send to Discord
    const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `${statusEmoji}**New Popular HN Story**`,
        embeds: [embed],
      }),
    });

    if (discordResponse.ok) {
      // Mark story as processed in KV store
      // Keep for 7 days to prevent reposting while allowing eventual reposting of updated stories
      await env.HN_POSTS.put(`story:${storyId}`, "true", {
        expirationTtl: 86400 * 7,
      });
      console.log(`Successfully posted story ${storyId}`);
    } else {
      throw new Error(`Discord API error: ${await discordResponse.text()}`);
    }
  } catch (error) {
    console.error(`Error processing story ${storyId}:`, error);
  }
}

function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval !== 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
}
