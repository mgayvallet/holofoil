"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeFriendAction, sendFriendRequestAction } from "@/app/actions";
import { useToast } from "@/components/Toasts";

const btn = "press rounded-2xl min-h-11 px-4 font-bold text-sm disabled:opacity-50";

export function FriendButton({
  userId,
  relation,
}: {
  userId: string;
  relation: "none" | "friend" | "incoming" | "outgoing";
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast({ icon: "⚠️", title: res.error ?? "Erreur", tone: "error" });
      toast({ icon: "🤝", title: msg, tone: "success" });
      router.refresh();
    });

  if (relation === "friend") {
    return (
      <button disabled={pending} onClick={() => run(() => removeFriendAction(userId), "Ami retiré")} className={`${btn} bg-surface-2`}>
        Ami ✓ — Retirer
      </button>
    );
  }
  if (relation === "outgoing") {
    return (
      <button disabled={pending} onClick={() => run(() => removeFriendAction(userId), "Demande annulée")} className={`${btn} bg-surface-2`}>
        Demande envoyée — Annuler
      </button>
    );
  }
  return (
    <button
      disabled={pending}
      onClick={() => run(() => sendFriendRequestAction(userId), relation === "incoming" ? "Vous êtes maintenant amis !" : "Demande envoyée")}
      className={`${btn} bg-brand`}
    >
      {relation === "incoming" ? "Accepter la demande d'ami" : "Ajouter en ami"}
    </button>
  );
}
