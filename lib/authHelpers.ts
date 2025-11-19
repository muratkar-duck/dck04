import { type SupabaseClient, type User } from "@supabase/supabase-js";

export type UserRole = "writer" | "producer";

export const roleRedirectMap: Record<UserRole, string> = {
  writer: "/dashboard/writer",
  producer: "/dashboard/producer",
};

export const getDashboardPathForRole = (role?: string) => {
  if (role && roleRedirectMap[role as UserRole]) {
    return roleRedirectMap[role as UserRole];
  }

  console.warn(
    "Kullanıcı rolü bulunamadı veya geçersiz, writer dashboard'a yönlendiriliyor.",
    role
  );

  return "/dashboard/writer";
};

export const syncUserProfileAndRole = async (
  supabase: SupabaseClient,
  user: User
): Promise<UserRole> => {
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, email, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Supabase users select hatası:", profileError);
  }

  const resolvedRole =
    (profile?.role as UserRole | undefined) ||
    (user.user_metadata?.role as UserRole | undefined) ||
    "writer";

  if (!profile) {
    const { error: upsertError } = await supabase
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email ?? undefined,
          username: (user.user_metadata?.username as string | undefined) ?? undefined,
          role: resolvedRole,
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      const lowerDetails = upsertError.details?.toLowerCase() ?? "";
      const lowerMessage = upsertError.message?.toLowerCase() ?? "";
      const isUniqueViolation =
        upsertError.code === "23505" ||
        lowerDetails.includes("duplicate") ||
        lowerMessage.includes("duplicate");

      console.error("Supabase users upsert hatası:", upsertError.message || upsertError);

      if (!isUniqueViolation) {
        throw new Error(
          "Profiliniz oluşturulurken bir sorun oluştu, lütfen tekrar deneyin."
        );
      }
    }
  }

  if (user.user_metadata?.role !== resolvedRole) {
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        role: resolvedRole,
      },
    });

    if (metadataError) {
      console.error("Supabase user metadata güncelleme hatası:", metadataError);
    }
  }

  return resolvedRole;
};
