import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicSitemapEntries } from "../server/utils/publicSitemap.ts";

globalThis.createError = (error) =>
  Object.assign(new Error(error.message), error);

function lessonPlacementRow(lessonId) {
  return {
    lesson_id: lessonId,
    order: 0,
    chapter_id: "ch-1",
    subject_id: null,
    category_id: null,
    lessons: { slug: "keimeno" },
    chapters: {
      slug: "enotita",
      subjects: { slug: "archaia", grades: { slug: "a-lykeiou" } },
    },
    subjects: null,
    categories: null,
  };
}

function createSitemapSupabase(options = {}) {
  const ranges = [];
  const publishedFilters = [];
  const inCalls = [];

  const lessonPages = options.lessonPages ?? [
    [{ id: "lesson-1" }, { id: "lesson-orphan" }],
  ];
  let lessonPageIndex = 0;

  function rangeResult(table, from) {
    if (options.rangeError?.table === table) {
      return { data: null, error: { message: options.rangeError.message } };
    }
    if (table === "lessons") {
      const batch = lessonPages[lessonPageIndex] ?? [];
      lessonPageIndex += 1;
      return { data: batch, error: null };
    }
    const defaults = {
      grades: [{ slug: "a-lykeiou" }],
      subjects: [{ slug: "archaia", grades: { slug: "a-lykeiou" } }],
      chapters: [
        {
          slug: "enotita",
          subjects: { slug: "archaia", grades: { slug: "a-lykeiou" } },
        },
      ],
      categories: [{ slug: "extra" }],
      articles: [
        {
          slug: "dimosieumeno",
          title: "Άρθρο",
          published: true,
          updated_at: "2026-01-15T12:00:00.000Z",
        },
      ],
    };
    if (from > 0) return { data: [], error: null };
    return { data: defaults[table] ?? [], error: null };
  }

  const client = {
    from(table) {
      const state = {};
      const builder = {
        select(columns) {
          state.columns = columns;
          return builder;
        },
        eq(column, value) {
          state.eq = { column, value };
          if (table === "articles") {
            publishedFilters.push({ column, value });
          }
          return builder;
        },
        order(column, options) {
          state.order = { column, options };
          return builder;
        },
        range(from, to) {
          ranges.push({ table, from, to, eq: state.eq ?? null });
          return Promise.resolve(rangeResult(table, from, to));
        },
        in(column, values) {
          inCalls.push({ table, column, values });
          if (table === "lesson_placements") {
            const rows = values
              .filter((id) => id === "lesson-1")
              .map((id) => lessonPlacementRow(id));
            return Promise.resolve({ data: rows, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        },
      };
      return builder;
    },
  };

  return { client, ranges, publishedFilters, inCalls };
}

describe("publicSitemapEntries", () => {
  it("includes catalog paths, a canonical lesson path, and published articles", async () => {
    const { client } = createSitemapSupabase();
    const entries = await publicSitemapEntries(client);
    const paths = new Set(entries.map((entry) => entry.path));
    assert.equal(paths.has("/a-lykeiou"), true);
    assert.equal(paths.has("/a-lykeiou/archaia"), true);
    assert.equal(paths.has("/a-lykeiou/archaia/enotita"), true);
    assert.equal(paths.has("/category/extra"), true);
    assert.equal(paths.has("/a-lykeiou/archaia/enotita/keimeno"), true);
    assert.equal(paths.has("/articles/dimosieumeno"), true);
    assert.equal(paths.has("/articles/unpublished"), false);
  });

  it("omits lesson paths when canonicalLessonPaths cannot build a url", async () => {
    const { client } = createSitemapSupabase();
    const entries = await publicSitemapEntries(client);
    const paths = entries.map((entry) => entry.path);
    assert.equal(
      paths.some((path) => path.includes("lesson-orphan")),
      false,
    );
  });

  it("requests the next lessons page when the first batch is full", async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `lesson-${index}`,
    }));
    const { client, ranges } = createSitemapSupabase({
      lessonPages: [fullPage, []],
    });
    await publicSitemapEntries(client);
    const lessonRanges = ranges.filter((call) => call.table === "lessons");
    assert.deepEqual(
      lessonRanges.map(({ from, to }) => ({ from, to })),
      [
        { from: 0, to: 999 },
        { from: 1000, to: 1999 },
      ],
    );
  });

  it("filters articles to published rows before paging", async () => {
    const { client, publishedFilters } = createSitemapSupabase();
    await publicSitemapEntries(client);
    assert.deepEqual(publishedFilters, [{ column: "published", value: true }]);
  });

  it("rejects with a 500 when a paged catalog query fails", async () => {
    const { client } = createSitemapSupabase({
      rangeError: { table: "subjects", message: "db down" },
    });
    await assert.rejects(
      () => publicSitemapEntries(client),
      (error) =>
        error.statusCode === 500 && error.message === "Κάτι πήγε στραβά",
    );
  });
});
