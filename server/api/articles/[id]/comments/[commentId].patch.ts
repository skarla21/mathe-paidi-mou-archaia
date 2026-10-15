import { requireAuth } from "../../../../utils/requireAuth";
import { requireVerifiedEmail } from "../../../../utils/requireVerifiedEmail";
import { serverSupabaseService } from "../../../../utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const articleId = getRouterParam(event, "id");
  const commentId = getRouterParam(event, "commentId");
  if (!articleId || !commentId) {
    throw createError({ statusCode: 400, message: "Λείπει το id" });
  }

  const isAdmin = event.context.auth?.isAdmin === true;
  const userId = isAdmin
    ? requireAuth(event)
    : await requireVerifiedEmail(event);

  const body = await readBody<{ body?: string }>(event);
  const trimmed = typeof body?.body === "string" ? body.body.trim() : "";
  if (trimmed.length < 1 || trimmed.length > 2000) {
    throw createError({
      statusCode: 400,
      message: "Το σχόλιο πρέπει να είναι από 1 έως 2000 χαρακτήρες",
    });
  }

  const supabase = serverSupabaseService();
  const { data: existing } = await supabase
    .from("article_comments")
    .select("id, user_id, article_id")
    .eq("id", commentId)
    .eq("article_id", articleId)
    .maybeSingle();

  if (!existing) throw createError({ statusCode: 404, message: "Δεν βρέθηκε" });

  if (!isAdmin && existing.user_id !== userId) {
    throw createError({ statusCode: 403, message: "Απαγορεύεται" });
  }

  const { data, error } = await supabase
    .from("article_comments")
    .update({ body: trimmed })
    .eq("id", commentId)
    .select()
    .single();

  if (error) {
    console.error("[articles/[id]/comments/[commentId].patch]", error.message);
    throw createError({ statusCode: 500, message: "Κάτι πήγε στραβά" });
  }

  return data;
});
