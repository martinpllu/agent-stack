import { object, string, boolean } from "valibot"
import { createSubjects } from "@openauthjs/openauth/subject"

export const subjects = createSubjects({
  user: object({
    id: string(),
    email: string(),
    isAdmin: boolean(),
    isValidated: boolean(),
  }),
})