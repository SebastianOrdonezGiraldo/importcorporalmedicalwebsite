import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

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
};

export type ProductWithCategory = Product & { categoryName: string | null; categorySlug: string | null };

type CategoryRow = Omit<Category, "tags" | "visible"> & { tags: string; visible: number };
type ProductRow = Omit<Product, "featured" | "visible"> & { featured: number; visible: number };

const SCHEMA = `
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
  badge       TEXT,
  image       TEXT,
  featured    INTEGER NOT NULL DEFAULT 0,
  visible     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS products_category ON products(category_id);
`;

const PRODUCT_COLS = `p.id, p.slug, p.name, p.category_id AS categoryId, p.summary, p.description, p.brand, p.badge,
  p.image, p.featured, p.visible, p.sort_order AS sortOrder, p.created_at AS createdAt, p.updated_at AS updatedAt`;
const CATEGORY_COLS = `id, slug, name, description, tags, flag, image, sort_order AS sortOrder, visible`;

function open(): Database.Database {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seedIfEmpty(db);
  return db;
}

/** First run only: load the catalog that was on the original single-file page. */
function seedIfEmpty(db: Database.Database) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM categories").get() as { n: number };
  if (n > 0) return;
  const seedDir = path.join(process.cwd(), "seed");
  const file = path.join(seedDir, "data.json");
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
    categories: { slug: string; name: string; image: string; tags: string[]; flag?: string; description?: string }[];
    products: { slug: string; name: string; category: string; image: string; summary?: string; brand?: string; badge?: string; featured?: boolean }[];
  };
  const copy = (img: string) => {
    const src = path.join(seedDir, "images", img);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(UPLOAD_DIR, img));
    return img;
  };
  const insCat = db.prepare(
    "INSERT INTO categories (slug, name, description, tags, flag, image, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insProd = db.prepare(
    `INSERT INTO products (slug, name, category_id, summary, brand, badge, image, featured, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  db.transaction(() => {
    const ids = new Map<string, number>();
    data.categories.forEach((c, i) => {
      const r = insCat.run(c.slug, c.name, c.description ?? "", JSON.stringify(c.tags), c.flag ?? null, copy(c.image), i);
      ids.set(c.slug, Number(r.lastInsertRowid));
    });
    data.products.forEach((p, i) => {
      insProd.run(p.slug, p.name, ids.get(p.category) ?? null, p.summary ?? "", p.brand ?? null, p.badge ?? null,
        copy(p.image), p.featured ? 1 : 0, i);
    });
  })();
}

const g = globalThis as unknown as { __icmDb?: Database.Database };
export function db(): Database.Database {
  if (!g.__icmDb) g.__icmDb = open();
  return g.__icmDb;
}

const toCategory = (r: CategoryRow): Category => ({ ...r, tags: safeTags(r.tags), visible: !!r.visible });
const toProduct = <T extends ProductRow>(r: T) => ({ ...r, featured: !!r.featured, visible: !!r.visible });
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
  const args = [c.slug, c.name, c.description, JSON.stringify(c.tags), c.flag, c.image, c.sortOrder, c.visible ? 1 : 0];
  if (id) {
    db().prepare(
      `UPDATE categories SET slug=?, name=?, description=?, tags=?, flag=?, image=?, sort_order=?, visible=?,
       updated_at=datetime('now') WHERE id=?`,
    ).run(...args, id);
    return id;
  }
  const r = db().prepare(
    "INSERT INTO categories (slug, name, description, tags, flag, image, sort_order, visible) VALUES (?,?,?,?,?,?,?,?)",
  ).run(...args);
  return Number(r.lastInsertRowid);
}

export function deleteCategory(id: number) {
  db().prepare("DELETE FROM categories WHERE id = ?").run(id);
}

/* ---------- Products ---------- */

type ProductQuery = { includeHidden?: boolean; categoryId?: number; featured?: boolean; search?: string; limit?: number };

export function listProducts(q: ProductQuery = {}): ProductWithCategory[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (!q.includeHidden) where.push("p.visible = 1 AND (c.id IS NULL OR c.visible = 1)");
  if (q.categoryId) { where.push("p.category_id = ?"); args.push(q.categoryId); }
  if (q.featured) where.push("p.featured = 1");
  if (q.search) {
    where.push("(p.name LIKE ? OR p.brand LIKE ? OR p.summary LIKE ?)");
    const s = `%${q.search}%`;
    args.push(s, s, s);
  }
  const sql = `SELECT ${PRODUCT_COLS}, c.name AS categoryName, c.slug AS categorySlug
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY c.sort_order, p.featured DESC, p.sort_order, p.name ${q.limit ? "LIMIT " + Math.floor(q.limit) : ""}`;
  return (db().prepare(sql).all(...args) as (ProductRow & { categoryName: string | null; categorySlug: string | null })[]).map(toProduct);
}

export function getProduct(by: { id: number } | { slug: string }): ProductWithCategory | null {
  const base = `SELECT ${PRODUCT_COLS}, c.name AS categoryName, c.slug AS categorySlug
    FROM products p LEFT JOIN categories c ON c.id = p.category_id`;
  const r = ("id" in by
    ? db().prepare(`${base} WHERE p.id = ?`).get(by.id)
    : db().prepare(`${base} WHERE p.slug = ?`).get(by.slug)) as
    | (ProductRow & { categoryName: string | null; categorySlug: string | null })
    | undefined;
  return r ? toProduct(r) : null;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export function saveProduct(id: number | null, p: ProductInput): number {
  const args = [p.slug, p.name, p.categoryId, p.summary, p.description, p.brand, p.badge, p.image,
    p.featured ? 1 : 0, p.visible ? 1 : 0, p.sortOrder];
  if (id) {
    db().prepare(
      `UPDATE products SET slug=?, name=?, category_id=?, summary=?, description=?, brand=?, badge=?, image=?,
       featured=?, visible=?, sort_order=?, updated_at=datetime('now') WHERE id=?`,
    ).run(...args, id);
    return id;
  }
  const r = db().prepare(
    `INSERT INTO products (slug, name, category_id, summary, description, brand, badge, image, featured, visible, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(...args);
  return Number(r.lastInsertRowid);
}

export function deleteProduct(id: number) {
  db().prepare("DELETE FROM products WHERE id = ?").run(id);
}

export function slugTaken(table: "products" | "categories", slug: string, exceptId: number | null): boolean {
  return !!db().prepare(`SELECT 1 FROM ${table} WHERE slug = ? AND id != ?`).get(slug, exceptId ?? 0);
}

/** True when no product or category still points at this image file. */
export function imageUnused(file: string): boolean {
  return !db().prepare("SELECT 1 FROM products WHERE image = ? UNION SELECT 1 FROM categories WHERE image = ?").get(file, file);
}
