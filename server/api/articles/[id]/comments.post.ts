import { notifyArticleCommentCreated } from "../../../utils/adminNotifications";
import { requireVerifiedEmail } from "../../../utils/requireVerifiedEmail";
import { serverSupabaseService } from "../../../utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const userId = await requireVerifiedEmail(event);
  const articleId = getRouterParam(event, "id");
  if (!articleId) {
    throw createError({ statusCode: 400, message: "Λείπει το id άρθρου" });
  }

  const supabase = serverSupabaseService();
  const { data: article } = await supabase
    .from("articles")
    .select("id")
    .eq("id", articleId)
    .eq("published", true)
    .maybeSingle();
  if (!article) throw createError({ statusCode: 404, message: "Δεν βρέθηκε" });

  const body = await readBody<{ body?: string; parent_id?: string | null }>(
    event,
  );
  const trimmed = typeof body?.body === "string" ? body.body.trim() : "";
  if (trimmed.length < 1 || trimmed.length > 2000) {
    throw createError({
      statusCode: 400,
      message: "Το σχόλιο πρέπει να είναι από 1 έως 2000 χαρακτήρες",
    });
  }

  let parentId: string | null = null;
  if (body?.parent_id) {
    if (typeof body.parent_id !== "string") {
      throw createError({ statusCode: 400, message: "Μη έγκυρο parent_id" });
    }
    const { data: parent } = await supabase
      .from("article_comments")
      .select("id, article_id, parent_id")
      .eq("id", body.parent_id)
      .maybeSingle();
    if (!parent || parent.article_id !== articleId) {
      throw createError({
        statusCode: 400,
        message: "Μη έγκυρο σχόλιο απάντησης",
      });
    }
    if (parent.parent_id) {
      throw createError({
        statusCode: 400,
        message: "Δεν μπορείτε να απαντήσετε σε απάντηση",
      });
    }
    parentId = parent.id;
  }

  const { data, error } = await supabase
    .from("article_comments")
    .insert({
      user_id: userId,
      article_id: articleId,
      parent_id: parentId,
      body: trimmed,
    })
    .select()
    .single();

  if (error) {
    console.error("[articles/[id]/comments.post]", error.message);
    throw createError({ statusCode: 500, message: "Κάτι πήγε στραβά" });
  }

  if (data?.id) {
    try {
      await notifyArticleCommentCreated(supabase, data.id);
    } catch (e) {
      console.error("[articles/[id]/comments.post] notify", e);
    }
  }

  return data;
});
