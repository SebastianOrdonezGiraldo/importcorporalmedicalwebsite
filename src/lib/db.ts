import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { emptyProductDetails, parseProductDetails, type ProductDetails } from "./product-details";
import { normalizeProductSearch } from "./product-search";

export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || "./data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  flag: string | null;
  image: string | null;
  sortOrder: number;
  visible: boolean;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  categoryId: number | null;
  summary: string;
  description: string;
  brand: string | null;
  badge: string | null;
  image: string | null;
  featured: boolean;
  visible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  details: ProductDetails;
};

export type ProductWithCategory = Product & {
  categoryName: string | null;
  categorySlug: string | null;
  categoryVisible: boolean | null;
};

type CategoryRow = Omit<Category, "tags" | "visible"> & { tags: string; visible: number };
type ProductRow = Omit<Product, "featured" | "visible" | "details"> & { featured: number; visible: number; detailsJson: string };
type ProductWithCategoryRow = ProductRow & {
  categoryName: string | null;
  categorySlug: string | null;
  categoryVisible: number | null;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS app_metadata (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '[]',
  flag        TEXT,
  image       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  visible     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  summary     TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  brand       TEXT,
  details     TEXT NOT NULL DEFAULT '{}',
  badge       TEXT,
  image       TEXT,
  featured    INTEGER NOT NULL DEFAULT 0,
  visible     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS products_category ON products(category_id);
CREATE TABLE IF NOT EXISTS product_slug_history (
  slug       TEXT PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS product_slug_history_target ON product_slug_history(product_id);
CREATE TABLE IF NOT EXISTS category_slug_history (
  slug        TEXT PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS category_slug_history_target ON category_slug_history(category_id);
`;

const PRODUCT_COLS = `p.id, p.slug, p.name, p.category_id AS categoryId, p.summary, p.description, p.brand, p.badge,
  p.image, p.featured, p.visible, p.sort_order AS sortOrder, p.created_at AS createdAt, p.updated_at AS updatedAt, p.details AS detailsJson`;
const CATEGORY_COLS = `id, slug, name, description, tags, flag, image, sort_order AS sortOrder, visible`;
type CatalogTable = "products" | "categories";
const SLUG_HISTORY = {
  products: { table: "product_slug_history", target: "product_id" },
  categories: { table: "category_slug_history", target: "category_id" },
} as const;

export class SlugConflictError extends Error {
  constructor(slug: string) {
    super(`El enlace “${slug}” ya está en uso o está reservado por su historial. Elige otro enlace.`);
    this.name = "SlugConflictError";
  }
}

function rememberSlug(conn: DatabaseSync, table: CatalogTable, slug: string, id: number) {
  const history = SLUG_HISTORY[table];
  const prior = conn.prepare(`SELECT ${history.target} AS targetId FROM ${history.table} WHERE slug = ?`).get(slug) as { targetId: number | null } | undefined;
  if (prior && prior.targetId !== id) throw new SlugConflictError(slug);
  if (!prior) conn.prepare(`INSERT INTO ${history.table} (slug, ${history.target}) VALUES (?, ?)`).run(slug, id);
}

/** Lock the current address, its reservation and the catalog write together. */
function saveWithSlugHistory(table: CatalogTable, id: number | null, slug: string, save: (conn: DatabaseSync) => number): number {
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const current = id ? conn.prepare(`SELECT slug FROM ${table} WHERE id = ?`).get(id) as { slug: string } | undefined : undefined;
    if (id && !current) throw new Error("El registro ya no existe.");
    if (slugTaken(table, slug, id)) throw new SlugConflictError(slug);
    const result = save(conn);
    if (current && current.slug !== slug) rememberSlug(conn, table, current.slug, result);
    conn.exec("COMMIT");
    return result;
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}

function historicalSlugTarget(table: CatalogTable, slug: string): number | null {
  const history = SLUG_HISTORY[table];
  const row = db().prepare(`SELECT ${history.target} AS targetId FROM ${history.table} WHERE slug = ?`).get(slug) as { targetId: number | null } | undefined;
  return row?.targetId ?? null;
}

// Uses Node's built-in SQLite (node:sqlite, Node 22.13+): no native module to compile on install.
// This set belongs to the current module revision. Fast Refresh preserves the
// global connection, but each new revision must configure and migrate it again.
const preparedConnections = new WeakSet<DatabaseSync>();

function prepareConnection(conn: DatabaseSync) {
  if (preparedConnections.has(conn)) return;
  conn.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  conn.function("icm_normalize_search", { deterministic: true }, (value) => normalizeProductSearch(typeof value === "string" ? value : ""));
  initializeCatalog(conn);
  preparedConnections.add(conn);
}

function open(): DatabaseSync {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "app.db"));
  try {
    prepareConnection(db);
    return db;
  } catch (e) {
    db.close();
    throw e;
  }
}

/** Serialize first-run detection with seeding, including across server processes. */
function initializeCatalog(db: DatabaseSync) {
  const copiedFiles: string[] = [];
  db.exec("BEGIN IMMEDIATE");
  try {
    // Older databases have no marker. Existing catalog tables mean this is an
    // upgrade, even if the administrator deliberately deleted every record.
    const existingCatalog = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name IN ('categories', 'products') LIMIT 1",
    ).get();
    db.exec(SCHEMA);
    // Upgrade existing catalogs without rewriting products or their publication state.
    const productColumns = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
    if (!productColumns.some((column) => column.name === "details")) {
      db.exec("ALTER TABLE products ADD COLUMN details TEXT NOT NULL DEFAULT '{}'");
    }
    const initialized = db.prepare("SELECT 1 FROM app_metadata WHERE key = 'catalog_initialized'").get();
    if (!initialized) {
      if (!existingCatalog) seedCatalog(db, copiedFiles);
      db.prepare("INSERT INTO app_metadata (key, value) VALUES ('catalog_initialized', ?)")
        .run(existingCatalog ? "existing" : "seeded");
    }
    db.exec("COMMIT");
  } catch (e) {
    // Files are outside SQLite's transaction. Remove only images this attempt
    // created while still holding the write lock, before another process retries.
    for (const file of copiedFiles) {
      try { fs.unlinkSync(file); } catch { /* Preserve the original initialization error. */ }
    }
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Called only for a new catalog, inside the initialization transaction. */
function seedCatalog(db: DatabaseSync, copiedFiles: string[]) {
  const seedDir = path.join(process.cwd(), "seed");
  const file = path.join(seedDir, "data.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
    categories: { slug: string; name: string; image: string; tags: string[]; flag?: string; description?: string }[];
    products: { slug: string; name: string; category: string; image: string; summary?: string; brand?: string; badge?: string; featured?: boolean }[];
  };
  const copy = (img: string) => {
    const src = path.join(seedDir, "images", img);
    const dest = path.join(UPLOAD_DIR, img);
    try {
      fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
      copiedFiles.push(dest);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    return img;
  };
  const insCat = db.prepare(
    "INSERT INTO categories (slug, name, description, tags, flag, image, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insProd = db.prepare(
    `INSERT INTO products (slug, name, category_id, summary, brand, badge, image, featured, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const ids = new Map<string, number>();
  data.categories.forEach((c, i) => {
    const r = insCat.run(c.slug, c.name, c.description ?? "", JSON.stringify(c.tags), c.flag ?? null, copy(c.image), i);
    ids.set(c.slug, Number(r.lastInsertRowid));
  });
  data.products.forEach((p, i) => {
    insProd.run(p.slug, p.name, ids.get(p.category) ?? null, p.summary ?? "", p.brand ?? null, p.badge ?? null,
      copy(p.image), p.featured ? 1 : 0, i);
  });
}

const g = globalThis as unknown as { __icmDb?: DatabaseSync };
export function db(): DatabaseSync {
  if (!g.__icmDb) g.__icmDb = open();
  else prepareConnection(g.__icmDb);
  return g.__icmDb;
}

const toCategory = (r: CategoryRow): Category => ({ ...r, tags: safeTags(r.tags), visible: !!r.visible });
const toProductWithCategory = ({ detailsJson, ...r }: ProductWithCategoryRow): ProductWithCategory => ({
  ...r, featured: !!r.featured, visible: !!r.visible,
  categoryVisible: r.categoryVisible === null ? null : !!r.categoryVisible,
  details: parseProductDetails(detailsJson),
});
function safeTags(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/* ---------- Categories ---------- */

export function listCategories(opts: { includeHidden?: boolean } = {}): (Category & { productCount: number })[] {
  const rows = db()
    .prepare(
      `SELECT ${CATEGORY_COLS},
        (SELECT COUNT(*) FROM products p WHERE p.category_id = categories.id ${opts.includeHidden ? "" : "AND p.visible = 1"}) AS productCount
       FROM categories ${opts.includeHidden ? "" : "WHERE visible = 1"} ORDER BY sort_order, name`,
    )
    .all() as (CategoryRow & { productCount: number })[];
  return rows.map((r) => ({ ...toCategory(r), productCount: r.productCount }));
}

export function getCategory(by: { id: number } | { slug: string }): Category | null {
  const r = ("id" in by
    ? db().prepare(`SELECT ${CATEGORY_COLS} FROM categories WHERE id = ?`).get(by.id)
    : db().prepare(`SELECT ${CATEGORY_COLS} FROM categories WHERE slug = ?`).get(by.slug)) as CategoryRow | undefined;
  return r ? toCategory(r) : null;
}

export type CategoryInput = Omit<Category, "id">;

export function saveCategory(id: number | null, c: CategoryInput): number {
  return saveWithSlugHistory("categories", id, c.slug, (conn) => {
    const args = [c.slug, c.name, c.description, JSON.stringify(c.tags), c.flag, c.image, c.sortOrder, c.visible ? 1 : 0];
    if (id) {
      conn.prepare(
        `UPDATE categories SET slug=?, name=?, description=?, tags=?, flag=?, image=?, sort_order=?, visible=?,
         updated_at=datetime('now') WHERE id=?`,
      ).run(...args, id);
      return id;
    }
    const r = conn.prepare(
      "INSERT INTO categories (slug, name, description, tags, flag, image, sort_order, visible) VALUES (?,?,?,?,?,?,?,?)",
    ).run(...args);
    return Number(r.lastInsertRowid);
  });
}

/** Resolve an address to its current record; callers must still check visibility. */
export function resolveCategorySlug(slug: string): Category | null {
  const current = getCategory({ slug });
  if (current) return current;
  const id = historicalSlugTarget("categories", slug);
  return id ? getCategory({ id }) : null;
}

/** Preserve public visibility when the category relationship is removed. */
export function deleteCategory(id: number): Category | null {
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const category = getCategory({ id });
    if (category) {
      rememberSlug(conn, "categories", category.slug, id);
      if (!category.visible) {
        conn.prepare("UPDATE products SET visible = 0, updated_at = datetime('now') WHERE category_id = ? AND visible = 1").run(id);
      }
      conn.prepare("DELETE FROM categories WHERE id = ?").run(id);
    }
    conn.exec("COMMIT");
    return category;
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}

/* ---------- Products ---------- */

type ProductQuery = { includeHidden?: boolean; categoryId?: number; featured?: boolean; search?: string; limit?: number };

const PUBLIC_PRODUCT_FILTER = "p.visible = 1 AND (c.id IS NULL OR c.visible = 1)";

/** Includes products without a line, using the same visibility rules as the catalog. */
export function countPublicProducts(): number {
  const row = db().prepare(`SELECT COUNT(*) AS n FROM products p
    LEFT JOIN categories c ON c.id = p.category_id WHERE ${PUBLIC_PRODUCT_FILTER}`).get() as { n: number };
  return row.n;
}

export function listProducts(q: ProductQuery = {}): ProductWithCategory[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (!q.includeHidden) where.push(PUBLIC_PRODUCT_FILTER);
  if (q.categoryId) { where.push("p.category_id = ?"); args.push(q.categoryId); }
  if (q.featured) where.push("p.featured = 1");
  const search = normalizeProductSearch(q.search ?? "");
  if (search) {
    // instr treats %, _ and other characters literally instead of as SQL wildcards.
    where.push("(instr(icm_normalize_search(p.name), ?) > 0 OR instr(icm_normalize_search(p.brand), ?) > 0 OR instr(icm_normalize_search(p.summary), ?) > 0)");
    args.push(search, search, search);
  }
  const sql = `SELECT ${PRODUCT_COLS}, c.name AS categoryName, c.slug AS categorySlug, c.visible AS categoryVisible
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY c.sort_order, p.featured DESC, p.sort_order, p.name ${q.limit ? "LIMIT " + Math.floor(q.limit) : ""}`;
  return (db().prepare(sql).all(...args) as ProductWithCategoryRow[]).map(toProductWithCategory);
}

export function getProduct(by: { id: number } | { slug: string }): ProductWithCategory | null {
  const base = `SELECT ${PRODUCT_COLS}, c.name AS categoryName, c.slug AS categorySlug, c.visible AS categoryVisible
    FROM products p LEFT JOIN categories c ON c.id = p.category_id`;
  const r = ("id" in by
    ? db().prepare(`${base} WHERE p.id = ?`).get(by.id)
    : db().prepare(`${base} WHERE p.slug = ?`).get(by.slug)) as
    | ProductWithCategoryRow
    | undefined;
  return r ? toProductWithCategory(r) : null;
}

export function resolveProductSlug(slug: string): ProductWithCategory | null {
  const current = getProduct({ slug });
  if (current) return current;
  const id = historicalSlugTarget("products", slug);
  return id ? getProduct({ id }) : null;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt" | "details"> & { details?: ProductDetails };

export function saveProduct(id: number | null, p: ProductInput): number {
  return saveWithSlugHistory("products", id, p.slug, (conn) => {
    const details = p.details ?? (id ? getProduct({ id })?.details : null) ?? emptyProductDetails();
    const args = [p.slug, p.name, p.categoryId, p.summary, p.description, p.brand, p.badge, p.image,
      p.featured ? 1 : 0, p.visible ? 1 : 0, p.sortOrder, JSON.stringify(details)];
    if (id) {
      conn.prepare(
        `UPDATE products SET slug=?, name=?, category_id=?, summary=?, description=?, brand=?, badge=?, image=?,
         featured=?, visible=?, sort_order=?, details=?, updated_at=datetime('now') WHERE id=?`,
      ).run(...args, id);
      return id;
    }
    const r = conn.prepare(
      `INSERT INTO products (slug, name, category_id, summary, description, brand, badge, image, featured, visible, sort_order, details)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(...args);
    return Number(r.lastInsertRowid);
  });
}

export function deleteProduct(id: number) {
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const product = conn.prepare("SELECT slug FROM products WHERE id = ?").get(id) as { slug: string } | undefined;
    if (product) {
      rememberSlug(conn, "products", product.slug, id);
      conn.prepare("DELETE FROM products WHERE id = ?").run(id);
    }
    conn.exec("COMMIT");
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}

/** Change only the individual flag; a hidden category continues to block publication. */
export function toggleProductVisibility(id: number) {
  db().prepare("UPDATE products SET visible = 1 - visible, updated_at = datetime('now') WHERE id = ?").run(id);
}

export function slugTaken(table: CatalogTable, slug: string, exceptId: number | null): boolean {
  const history = SLUG_HISTORY[table];
  // Historical addresses remain reserved after deletion. Reusing them can route
  // shared links to the wrong item or create loops in cached permanent redirects.
  return !!db().prepare(`SELECT 1 FROM ${table} WHERE slug = ? AND id != ?
    UNION ALL SELECT 1 FROM ${history.table} WHERE slug = ? LIMIT 1`).get(slug, exceptId ?? 0, slug);
}

/** True when no product or category still points at this image file. */
export function imageUnused(file: string): boolean {
  return !db().prepare("SELECT 1 FROM products WHERE image = ? UNION SELECT 1 FROM categories WHERE image = ?").get(file, file);
}
