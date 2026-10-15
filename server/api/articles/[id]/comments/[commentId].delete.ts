import { requireAuth } from "../../../../utils/requireAuth";
import { serverSupabaseService } from "../../../../utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const articleId = getRouterParam(event, "id");
  const commentId = getRouterParam(event, "commentId");
  if (!articleId || !commentId) {
    throw createError({ statusCode: 400, message: "Λείπει το id" });
  }

  const userId = requireAuth(event);
  const isAdmin = event.context.auth?.isAdmin === true;

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

  const { error } = await supabase
    .from("article_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    console.error(
      "[articles/[id]/comments/[commentId].delete]",
      error.message,
    );
    throw createError({ statusCode: 500, message: "Κάτι πήγε στραβά" });
  }

  return { ok: true };
});
