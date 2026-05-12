/**
 * Batch upload engine for meal_visual_library.
 * Groups files by base name, uploads to storage, and links to library items.
 */
import { supabase } from "@v1/integrations/supabase/client";

export interface BatchUploadReport {
  processed: number;
  linked: number;
  created: number;
  unrecognized: string[];
  conflicts: string[];
  details: { fileName: string; status: string; itemName?: string }[];
}

function extractBaseName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")        // remove extension
    .replace(/-?\d+$/, "")          // remove trailing -1, -2 etc
    .replace(/_/g, "-")
    .trim();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function displayNameFromSlug(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function guessCategoryFromName(name: string): string {
  const n = name.toLowerCase();
  if (/(cafe|pao|tapioca|aveia|leite|iogurte|ovo|cuscuz|granola|cereal|torrada)/.test(n)) return "cafe_da_manha";
  if (/(arroz|feijao|carne|frango|peixe|macarrao|batata|salada|legume|sopa)/.test(n)) return "almoco";
  if (/(fruta|castanha|barra|shake|suco|vitamina)/.test(n)) return "lanche";
  return "almoco";
}

interface GroupedFiles {
  baseName: string;
  slug: string;
  files: File[];
}

export function groupFilesByMeal(files: File[]): GroupedFiles[] {
  const map = new Map<string, GroupedFiles>();

  for (const file of files) {
    const baseName = extractBaseName(file.name);
    const slug = slugify(baseName);

    if (!map.has(slug)) {
      map.set(slug, { baseName, slug, files: [] });
    }
    map.get(slug)!.files.push(file);
  }

  return [...map.values()];
}

export async function batchUploadAndLink(
  files: File[],
  tenantId: string | null,
  userId: string | null
): Promise<BatchUploadReport> {
  const report: BatchUploadReport = {
    processed: files.length,
    linked: 0,
    created: 0,
    unrecognized: [],
    conflicts: [],
    details: [],
  };

  const groups = groupFilesByMeal(files);

  for (const group of groups) {
    // Upload all files in the group
    const uploadedUrls: string[] = [];
    for (const file of group.files) {
      const path = `${group.slug}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("meal-visual-library")
        .upload(path, file, { upsert: true });

      if (error) {
        report.details.push({ fileName: file.name, status: `Erro upload: ${error.message}` });
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("meal-visual-library")
        .getPublicUrl(path);

      uploadedUrls.push(urlData.publicUrl);
    }

    if (uploadedUrls.length === 0) continue;

    // Try to find existing item by slug, name, or alias
    let itemId: string | null = null;

    // 1. Try slug match
    const { data: slugMatch } = await supabase
      .from("meal_visual_library" as any)
      .select("id, image_url")
      .eq("slug", group.slug)
      .limit(1);

    if (slugMatch && slugMatch.length > 0) {
      itemId = (slugMatch[0] as any).id;
    }

    // 2. Try alias match
    if (!itemId) {
      const norm = normalize(group.baseName);
      const { data: aliasMatch } = await supabase
        .from("meal_visual_aliases" as any)
        .select("library_item_id")
        .eq("normalized_alias", norm)
        .limit(1);

      if (aliasMatch && aliasMatch.length > 0) {
        itemId = (aliasMatch[0] as any).library_item_id;
      }
    }

    // 3. Try ilike name match
    if (!itemId) {
      const { data: nameMatch } = await supabase
        .from("meal_visual_library" as any)
        .select("id")
        .ilike("name", `%${group.slug}%`)
        .limit(1);

      if (nameMatch && nameMatch.length > 0) {
        itemId = (nameMatch[0] as any).id;
      }
    }

    const primaryUrl = uploadedUrls[0];
    const galleryUrls = uploadedUrls.slice(1);

    if (itemId) {
      // Update existing item
      await supabase
        .from("meal_visual_library" as any)
        .update({
          image_url: primaryUrl,
          image_path: `${group.slug}/${group.files[0].name}`,
          gallery_images: galleryUrls,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", itemId);

      report.linked++;
      for (const f of group.files) {
        report.details.push({ fileName: f.name, status: "Vinculado", itemName: group.baseName });
      }
    } else {
      // Create new item
      const displayName = displayNameFromSlug(group.slug);
      const category = guessCategoryFromName(group.baseName);

      const { data: newItem, error: insertError } = await supabase
        .from("meal_visual_library" as any)
        .insert({
          slug: group.slug,
          name: group.slug,
          display_name: displayName,
          category,
          image_url: primaryUrl,
          image_path: `${group.slug}/${group.files[0].name}`,
          gallery_images: galleryUrls,
          tags: [],
          search_terms: [],
          created_by: userId,
          tenant_id: tenantId,
        } as any)
        .select("id")
        .single();

      if (insertError) {
        report.unrecognized.push(group.baseName);
        report.details.push({ fileName: group.files[0].name, status: `Erro: ${insertError.message}` });
      } else if (newItem) {
        // Auto-create alias
        const norm = normalize(group.baseName);
        await supabase.from("meal_visual_aliases" as any).insert({
          library_item_id: (newItem as any).id,
          alias: displayName.toLowerCase(),
          normalized_alias: norm,
        });

        report.created++;
        for (const f of group.files) {
          report.details.push({ fileName: f.name, status: "Criado automaticamente", itemName: displayName });
        }
      }
    }
  }

  return report;
}
