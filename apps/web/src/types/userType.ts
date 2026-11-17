export const USER_TYPES = {
  ADMIN: "admin",
  SEEKER: "seeker",
  PROVIDER: "provider",
} as const;

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];

export const ALL_USER_TYPES: UserType[] = Object.values(USER_TYPES);
