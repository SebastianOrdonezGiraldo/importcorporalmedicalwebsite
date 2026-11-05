"use server";
import { headers } from "next/headers";
import { isIP } from "node:net";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  deleteCategory, deleteProduct, getCategory, getProduct, saveCategory, saveProduct, slugTaken, SlugConflictError, toggleProductVisibility,
} from "@/lib/db";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { removeIfUnused, saveUpload } from "@/lib/uploads";
import { slugify } from "@/lib/slug";
import { emptyProductDetails, readProductDetails, type ProductDetails } from "@/lib/product-details";
import { verifyLoginChallenge } from "@/lib/turnstile";

export type FormState = { error?: string; ok?: string } | undefined;

/* ---------- Session ---------- */

// Simple in-memory throttle: 8 failed attempts per IP every 15 minutes.
const attempts = new Map<string, { n: number; until: number }>();

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && a.until > now && a.n >= 8) return { error: "Demasiados intentos. Espera unos minutos." };
  if (!await verifyLoginChallenge(fd.get("cf-turnstile-response"), isIP(ip) ? ip : undefined)) {
    return { error: "No se pudo completar la verificación de seguridad. Inténtalo de nuevo." };
  }
  if (!checkPassword(String(fd.get("password") ?? ""))) {
    const cur = a && a.until > now ? a : { n: 0, until: now + 15 * 60_000 };
    attempts.set(ip, { ...cur, n: cur.n + 1 });
    return { error: "Contraseña incorrecta." };
  }
  attempts.delete(ip);
  await createSession();
  redirect("/admin/productos");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- Helpers ---------- */

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const optional = (fd: FormData, k: string, max = 80) => str(fd, k, max) || null;
const int = (fd: FormData, k: string) => {
  const n = Number.parseInt(str(fd, k), 10);
  return Number.isFinite(n) ? n : 0;
};

function refreshPublic(...paths: string[]) {
  revalidatePath("/", "layout");
  paths.forEach((p) => revalidatePath(p));
}

/* ---------- Products ---------- */

export async function saveProductAction(id: number | null, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const current = id ? getProduct({ id }) : null;
  if (id && !current) return { error: "El producto ya no existe." };

  const name = str(fd, "name", 120);
  if (!name) return { error: "El nombre es obligatorio." };
  const slug = slugify(str(fd, "slug", 120) || current?.slug || name);
  if (!slug) return { error: "El enlace (slug) no es válido." };
  if (slugTaken("products", slug, id)) return { error: new SlugConflictError(slug).message };
  const categoryId = int(fd, "categoryId") || null;
  if (categoryId && !getCategory({ id: categoryId })) return { error: "La línea elegida no existe." };

  let details: ProductDetails;
  try {
    details = fd.has("reference") ? readProductDetails(fd) : current?.details ?? emptyProductDetails();
  } catch (e) {
    return { error: (e as Error).message };
  }

  let image = current?.image ?? null;
  try {
    const uploaded = await saveUpload(fd.get("image"), slug);
    if (uploaded) image = uploaded;
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!image) return { error: "Sube una foto del producto." };

  let newId: number;
  try {
    newId = saveProduct(id, {
      slug, name, categoryId, details,
      summary: str(fd, "summary", 300),
      description: str(fd, "description", 5000),
      brand: optional(fd, "brand"),
      badge: optional(fd, "badge", 30),
      image,
      featured: fd.get("featured") === "on",
      visible: fd.get("visible") === "on",
      sortOrder: int(fd, "sortOrder"),
    });
  } catch (e) {
    if (image !== current?.image) await removeIfUnused(image);
    if (!(e instanceof SlugConflictError)) throw e;
    return { error: e.message };
  }
  if (current?.image && current.image !== image) await removeIfUnused(current.image);
  refreshPublic(`/producto/${slug}`);
  redirect(`/admin/productos?ok=${encodeURIComponent(id ? "Producto actualizado." : "Producto creado.")}#p${newId}`);
}

export async function deleteProductAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const p = getProduct({ id });
  if (!p) redirect("/admin/productos");
  deleteProduct(id);
  await removeIfUnused(p.image);
  refreshPublic();
  redirect(`/admin/productos?ok=${encodeURIComponent(`“${p.name}” eliminado.`)}`);
}

export async function toggleProductVisible(fd: FormData) {
  await requireAdmin();
  toggleProductVisibility(Number(fd.get("id")));
  refreshPublic();
  revalidatePath("/admin/productos");
}

/* ---------- Categories (líneas) ---------- */

export async function saveCategoryAction(id: number | null, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const current = id ? getCategory({ id }) : null;
  if (id && !current) return { error: "La línea ya no existe." };

  const name = str(fd, "name", 80);
  if (!name) return { error: "El nombre es obligatorio." };
  const slug = slugify(str(fd, "slug", 80) || current?.slug || name);
  if (!slug) return { error: "El enlace (slug) no es válido." };
  if (slugTaken("categories", slug, id)) return { error: new SlugConflictError(slug).message };

  let image = current?.image ?? null;
  try {
    const uploaded = await saveUpload(fd.get("image"), `linea-${slug}`);
    if (uploaded) image = uploaded;
  } catch (e) {
    return { error: (e as Error).message };
  }

  const tags = str(fd, "tags", 300).split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6);
  try {
    saveCategory(id, {
      slug, name, tags, image,
      description: str(fd, "description", 400),
      flag: optional(fd, "flag", 24),
      sortOrder: int(fd, "sortOrder"),
      visible: fd.get("visible") === "on",
    });
  } catch (e) {
    if (image !== current?.image) await removeIfUnused(image);
    if (!(e instanceof SlugConflictError)) throw e;
    return { error: e.message };
  }
  if (current?.image && current.image !== image) await removeIfUnused(current.image);
  refreshPublic(`/catalogo/${slug}`);
  redirect(`/admin/lineas?ok=${encodeURIComponent(id ? "Línea actualizada." : "Línea creada.")}`);
}

export async function deleteCategoryAction(fd: FormData) {
  await requireAdmin();
  const c = deleteCategory(Number(fd.get("id")));
  if (!c) redirect("/admin/lineas");
  await removeIfUnused(c.image);
  refreshPublic();
  const result = c.visible ? "conservan su visibilidad" : "permanecen ocultos";
  redirect(`/admin/lineas?ok=${encodeURIComponent(`Línea “${c.name}” eliminada. Sus productos quedaron sin línea y ${result}.`)}`);
}
