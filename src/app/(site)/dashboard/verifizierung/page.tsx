import { redirect } from "next/navigation";

/** Die Ausweis-/Identitätsprüfung entfällt – die Echtheit wird je Sedcard geprüft (Assistent, Schritt 7 „Echtheit“). */
export default function VerificationPage() {
  redirect("/dashboard/sedcards");
}
