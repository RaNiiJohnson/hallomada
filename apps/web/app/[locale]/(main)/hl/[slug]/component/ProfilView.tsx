"use client";

import { formatMonthYear } from "@/lib/date";
import { UserType } from "@convex/betterAuth/users";
import { Briefcase, Calendar, GraduationCap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export function ProfileView({ user }: { user: UserType }) {
  const locale = useLocale();
  const t = useTranslations("profile");

  return (
    <>
      {/* === À PROPOS === */}
      {user.bio && (
        <section className="bg-card lg:rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("about")}</h2>
          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
            {user.bio}
          </p>
        </section>
      )}

      {/* === EXPÉRIENCE === */}
      {(user.experienceYears || user.roles?.length || user.arrivalDate) && (
        <section className="bg-card lg:rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("experience")}</h2>
          <div className="space-y-4">
            {user.experienceYears && (
              <div className="flex items-start gap-4">
                <div className="p-2 bg-secondary lg:rounded-lg">
                  <Briefcase className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {t("yearsExperience", { count: user.experienceYears })}
                  </h3>
                  {user.field && (
                    <p className="text-sm text-muted-foreground">
                      {user.field}
                    </p>
                  )}
                </div>
              </div>
            )}

            {user.roles && user.roles.length > 0 && (
              <div className="flex items-start gap-4">
                <div className="p-2 bg-secondary lg:rounded-lg">
                  <GraduationCap className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">{t("roles")}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.roles?.map((role: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {user.arrivalDate && (
              <div className="flex items-start gap-4">
                <div className="p-2 bg-secondary lg:rounded-lg">
                  <Calendar className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {t("since", {
                      date: formatMonthYear(
                        user.arrivalDate!,
                        locale,
                      ) as string,
                    })}
                  </h3>
                  {user.company && (
                    <p className="text-sm text-muted-foreground">
                      {t("at", { company: user.company })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* === COMPÉTENCES === */}
      {user.skills && user.skills.length > 0 && (
        <section className="bg-card lg:rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("skills")}</h2>
          <div className="flex flex-wrap gap-2">
            {user.skills?.map((skill: string, index: number) => (
              <span
                key={index}
                className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* === PARCOURS === */}
      {user.journey && user.journey.length > 0 && (
        <section className="bg-card lg:rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("journey")}</h2>
          <div className="flex flex-wrap gap-3">
            {user.journey?.map((step: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <span className="px-4 py-2 bg-secondary text-secondary-foreground lg:rounded-lg text-sm">
                  {step}
                </span>
                {index < user.journey!.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === STATUT === */}
      {user.status && user.status !== "active" && (
        <section className="bg-card lg:rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                user.status === "looking_for_job"
                  ? "bg-green-500"
                  : user.status === "on_sabbatical"
                    ? "bg-yellow-500"
                    : "bg-gray-500"
              }`}
            />
            <span className="font-medium">
              {user.status === "looking_for_job"
                ? t("status.lookingForJob")
                : user.status === "on_sabbatical"
                  ? t("status.onSabbatical")
                  : user.status === "inactive"
                    ? t("status.inactive")
                    : user.status}
            </span>
          </div>
        </section>
      )}
    </>
  );
}
