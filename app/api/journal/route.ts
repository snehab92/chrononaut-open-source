import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptJournalEntry, decryptJournalEntry } from "@/lib/journal/encryption-v2";

// GET - List journal entries or get single entry by date
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "30");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (date) {
      // Get single entry by date
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", date)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        return NextResponse.json({ entry: null });
      }

      // Decrypt encrypted fields before returning (v2 master key encryption)
      const decrypted = await decryptJournalEntry(data);

      return NextResponse.json({
        entry: {
          ...data,
          happened: decrypted.happened,
          feelings: decrypted.feelings,
          grateful: decrypted.grateful,
          ai_insights: decrypted.ai_insights,
        },
      });
    }

    // List entries
    const { data, error, count } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Decrypt all entries before returning
    const decryptedEntries = await Promise.all(
      (data || []).map(async (entry) => {
        const decrypted = await decryptJournalEntry(entry);
        return {
          ...entry,
          happened: decrypted.happened,
          feelings: decrypted.feelings,
          grateful: decrypted.grateful,
          ai_insights: decrypted.ai_insights,
        };
      })
    );

    return NextResponse.json({ entries: decryptedEntries, total: count });
  } catch (error) {
    console.error("Journal GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal entries" },
      { status: 500 }
    );
  }
}

// POST - Create or update journal entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      entry_date,
      // Accept plaintext fields (v2 - server-side encryption)
      happened,
      feelings,
      grateful,
      ai_insights,
      // Also accept old encrypted fields for backward compatibility
      encrypted_happened,
      encrypted_feelings,
      encrypted_grateful,
      encrypted_ai_insights,
      location_name,
      location_lat,
      location_lng,
      photo_url,
      tags,
      mood_label,
      mood_override,
      energy_rating,
      energy_override,
    } = body;

    if (!entry_date) {
      return NextResponse.json(
        { error: "entry_date is required" },
        { status: 400 }
      );
    }

    // Encrypt plaintext fields server-side (v2 - master key encryption)
    // If old encrypted fields are provided, use them (backward compatibility)
    let encryptedFields;
    if (happened || feelings || grateful || ai_insights) {
      // New v2 API: encrypt server-side
      encryptedFields = await encryptJournalEntry({
        happened,
        feelings,
        grateful,
        ai_insights,
      });
    } else {
      // Old v1 API: already encrypted client-side
      encryptedFields = {
        encrypted_happened,
        encrypted_feelings,
        encrypted_grateful,
        encrypted_ai_insights,
        encryption_version: 1,
      };
    }

    // Upsert entry (one per day per user)
    const { data, error } = await supabase
      .from("journal_entries")
      .upsert(
        {
          user_id: user.id,
          entry_date,
          encrypted_happened: encryptedFields.encrypted_happened,
          encrypted_feelings: encryptedFields.encrypted_feelings,
          encrypted_grateful: encryptedFields.encrypted_grateful,
          encrypted_ai_insights: encryptedFields.encrypted_ai_insights,
          encryption_version: encryptedFields.encryption_version,
          location_name,
          location_lat,
          location_lng,
          photo_url,
          tags: tags || [],
          mood_label,
          mood_override,
          energy_rating,
          energy_override,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,entry_date",
        }
      )
      .select()
      .single();

    if (error) throw error;

    // Decrypt before returning to client
    const decrypted = await decryptJournalEntry(data);

    return NextResponse.json({
      entry: {
        ...data,
        happened: decrypted.happened,
        feelings: decrypted.feelings,
        grateful: decrypted.grateful,
        ai_insights: decrypted.ai_insights,
      },
    });
  } catch (error) {
    console.error("Journal POST error:", error);
    return NextResponse.json(
      { error: "Failed to save journal entry" },
      { status: 500 }
    );
  }
}

// DELETE - Delete journal entry
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const date = searchParams.get("date");

    if (!id && !date) {
      return NextResponse.json(
        { error: "id or date is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("journal_entries")
      .delete()
      .eq("user_id", user.id);

    if (id) {
      query = query.eq("id", id);
    } else if (date) {
      query = query.eq("entry_date", date);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Journal DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete journal entry" },
      { status: 500 }
    );
  }
}
