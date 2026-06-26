import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type ActivityContext = {
  recentlyViewed?: Array<{ id: string; name: string; category?: string }>;
  wishlist?: string[];
  cart?: string[];
  searches?: string[];
};
type ChatRequestBody = { messages?: unknown; activity?: ActivityContext };

const SYSTEM_PROMPT = `You are ShopSphere's AI Shopping Assistant — friendly, concise, and helpful.

You help shoppers:
- find products that match their needs, budget, and use case
- compare products and explain specs in plain language
- suggest alternatives if something is out of stock
- answer questions about the catalog
- analyze uploaded product images, identify what's pictured, and surface visually similar items from the catalog
- give personalized recommendations using the shopper's recent activity context

Rules:
- ALWAYS call the search_products tool for product questions/comparisons/availability. For personalized "for you" suggestions, use get_recommendations. Never invent SKUs or prices.
- When the user uploads an image: briefly describe what you see (1 sentence), then call search_products with the most distinctive descriptors (category, color, style, key features). Present each result with an honest similarity estimate as "~NN% match" based on visual and attribute alignment. If matches are weak, say so and suggest closest alternatives.
- Keep replies short (2-4 sentences) unless asked for detail. Use bullet points for comparisons.
- After a tool returns products, mention them by name and reference their price/rating. The UI renders product cards automatically — do not paste raw JSON.
- If no products match, suggest the closest alternatives from a broader search.
- Reply in the user's language.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, activity } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const contextLines: string[] = [];
        if (activity?.recentlyViewed?.length) {
          contextLines.push(
            "Recently viewed: " +
              activity.recentlyViewed
                .slice(0, 8)
                .map((v) => `${v.name}${v.category ? ` (${v.category})` : ""}`)
                .join(", "),
          );
        }
        if (activity?.wishlist?.length) contextLines.push(`Wishlist size: ${activity.wishlist.length}`);
        if (activity?.cart?.length) contextLines.push(`Cart items: ${activity.cart.length}`);
        if (activity?.searches?.length)
          contextLines.push("Recent searches: " + activity.searches.slice(0, 5).join("; "));
        const personalized = contextLines.length
          ? `\n\nShopper context:\n- ${contextLines.join("\n- ")}`
          : "";

        const result = streamText({
          model,
          system: SYSTEM_PROMPT + personalized,
          messages: await convertToModelMessages(messages as UIMessage[]),
          stopWhen: stepCountIs(50),
          tools: {
            search_products: tool({
              description:
                "Search the ShopSphere catalog. Use for any product question, recommendation, comparison, or alternative lookup.",
              inputSchema: z.object({
                query: z
                  .string()
                  .optional()
                  .describe("Free-text search across product name, brand, description."),
                category: z.string().optional().describe("Category name filter, e.g. Audio, Tech."),
                max_price: z.number().optional(),
                min_price: z.number().optional(),
                in_stock_only: z.boolean().optional(),
                limit: z.number().int().min(1).max(8).optional().default(6),
              }),
              execute: async ({ query, category, max_price, min_price, in_stock_only, limit }) => {
                let q = supabase
                  .from("products")
                  .select("id,name,brand,price,compare_at,rating,reviews,stock,image_url,description,categories(name,slug)")
                  .eq("is_active", true)
                  .limit(limit ?? 6);

                if (query && query.trim()) {
                  const term = `%${query.trim()}%`;
                  q = q.or(`name.ilike.${term},brand.ilike.${term},description.ilike.${term}`);
                }
                if (max_price != null) q = q.lte("price", max_price);
                if (min_price != null) q = q.gte("price", min_price);
                if (in_stock_only) q = q.gt("stock", 0);

                const { data, error } = await q;
                if (error) return { error: error.message, products: [] };
                const products = (data ?? []).map((p) => {
                  const cat = p.categories as { name?: string; slug?: string } | null;
                  let categoryName: string | null = null;
                  if (cat && typeof cat === "object" && "name" in cat) {
                    categoryName = (cat as { name?: string }).name ?? null;
                  }
                  return {
                    id: p.id,
                    name: p.name,
                    brand: p.brand,
                    price: Number(p.price),
                    compare_at: p.compare_at ? Number(p.compare_at) : null,
                    rating: p.rating ? Number(p.rating) : 0,
                    reviews: p.reviews ?? 0,
                    stock: p.stock,
                    image_url: p.image_url,
                    description: p.description,
                    category: categoryName,
                  };
                });
                if (category) {
                  const c = category.toLowerCase();
                  const filtered = products.filter((p) => p.category?.toLowerCase().includes(c));
                  if (filtered.length) return { products: filtered };
                }
                return { products };
              },
            }),
            get_recommendations: tool({
              description:
                "Get personalized product recommendations for the current shopper. Use when user asks for suggestions, 'for me', 'what should I buy', or similar. Pulls from categories the shopper has viewed.",
              inputSchema: z.object({
                limit: z.number().int().min(1).max(8).optional().default(6),
                exclude_ids: z.array(z.string()).optional(),
              }),
              execute: async ({ limit, exclude_ids }) => {
                const viewedCats = Array.from(
                  new Set(
                    (activity?.recentlyViewed ?? [])
                      .map((v) => v.category)
                      .filter((c): c is string => Boolean(c)),
                  ),
                );
                let q = supabase
                  .from("products")
                  .select("id,name,brand,price,compare_at,rating,reviews,stock,image_url,description,categories(name,slug)")
                  .eq("is_active", true)
                  .gt("stock", 0)
                  .order("rating", { ascending: false })
                  .limit((limit ?? 6) * 3);

                if (viewedCats.length) {
                  const { data: cats } = await supabase
                    .from("categories")
                    .select("id,name")
                    .in("name", viewedCats);
                  const catIds = (cats ?? []).map((c) => c.id);
                  if (catIds.length) q = q.in("category_id", catIds);
                }

                const { data, error } = await q;
                if (error) return { error: error.message, products: [] };
                const excluded = new Set([
                  ...(exclude_ids ?? []),
                  ...((activity?.recentlyViewed ?? []).map((v) => v.id)),
                ]);
                const products = (data ?? [])
                  .filter((p) => !excluded.has(p.id))
                  .slice(0, limit ?? 6)
                  .map((p) => {
                    const cat = p.categories as { name?: string } | null;
                    return {
                      id: p.id,
                      name: p.name,
                      brand: p.brand,
                      price: Number(p.price),
                      compare_at: p.compare_at ? Number(p.compare_at) : null,
                      rating: p.rating ? Number(p.rating) : 0,
                      reviews: p.reviews ?? 0,
                      stock: p.stock,
                      image_url: p.image_url,
                      description: p.description,
                      category: cat?.name ?? null,
                    };
                  });
                return { products, basis: viewedCats.length ? viewedCats : ["popular"] };
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});